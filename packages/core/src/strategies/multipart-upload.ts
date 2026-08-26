import {
    UpupNetworkError,
    UpupConfigError,
    UpupError,
    UpupErrorCode,
    UpupStorageError,
    uploadErrorFromResponse,
    type UploadStrategy,
    type UploadCredentials,
    type UploadResult,
    type CredentialStrategy,
    type MultipartPart,
    type MultipartInitResponse,
    type MultipartResumeResponse,
    type MultipartSignPartResponse,
} from '../contracts'
import {
    fileFingerprint,
    loadSession,
    saveSession,
    removeSession,
    updateSessionProgress,
    updateSessionToken,
} from '../utils/multipart-session-store'

export interface MultipartUploadOptions {
    credentials: CredentialStrategy
    chunkSizeBytes?: number | undefined
    /**
     * Parts of this one file in flight at once. Throughput on a fast link
     * against memory and socket pressure — every in-flight part holds its own
     * chunk. Clamped to a whole number ≥ 1 — the cap is a count of live
     * requests, and a run with none in flight can never finish.
     */
    maxConcurrentParts?: number | undefined
    /**
     * Persist a resumable session (localStorage) for `File` inputs, so a page
     * reload, a pause, or a retry re-attaches to the server-side upload rather
     * than restarting it from part 1.
     *
     * Defaults to FALSE here on purpose: `resolveUploadConfig` is the single
     * place that opts the product default in (`resumable.persist ?? true`), so
     * a hand-constructed strategy keeps the historical abort-on-failure
     * semantics until it explicitly asks for persistence.
     */
    persist?: boolean | undefined
    /**
     * The serverUrl sessions belong to. A session saved against server A must
     * never be resumed against server B — its token means nothing there.
     */
    sessionScope?: string | undefined
    /**
     * Delays (ms) before each successive retry of a part whose attempt failed
     * transiently — a network-level fetch rejection, a 429, a 5xx, or a stall
     * caught by `partTimeoutMs`. Same vocabulary as the tus strategy's
     * `retryDelays`: the array length is the retry budget, `[]` disables part
     * retries. Definitive 4xx rejections are never retried.
     */
    retryDelays?: number[] | undefined
    /**
     * Watchdog budget applied to each PHASE of a part attempt separately: the
     * sign call, the source read (parts small enough to be materialized —
     * see MATERIALIZE_PART_MAX_BYTES), and the PUT, where it is an INACTIVITY
     * window reset by upload progress. A phase that neither succeeds nor
     * fails within its window is aborted and counted as a transient failure,
     * so a hung connection or a hung blob read costs one `retryDelays` slot
     * instead of hanging the whole upload forever (worst case per attempt is
     * therefore up to 3 × this value, not 1 ×). A slow-but-progressing PUT is
     * never aborted — only one with no forward motion at all.
     */
    partTimeoutMs?: number | undefined
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5 MiB
const DEFAULT_MAX_CONCURRENT = 3
const DEFAULT_RETRY_DELAYS = [0, 1000, 3000, 5000]
const DEFAULT_PART_TIMEOUT_MS = 180_000
/** Parts at or under this size are materialized to an ArrayBuffer before the
 *  PUT (the Firefox revived-blob fix in putPart); larger parts keep streaming
 *  as Blobs so huge files (partSize grows with file size past ~48 GiB via the
 *  10,000-part cap) can't turn the fix into an unbounded-heap regression. */
const MATERIALIZE_PART_MAX_BYTES = 16 * 1024 * 1024
/** S3's hard cap on parts per upload. `@upupjs/server` already sizes parts to
 *  respect it (providers/aws.ts computePartSize); this client-side floor covers
 *  servers that return no partSize, where the 5 MiB default would otherwise
 *  make any file past ~48.8 GiB fail at part 10,001. */
const MAX_PARTS = 10_000

/** What a successful re-attach hands back to the upload loop. */
type ResumedUpload = {
    token: string
    partSize: number
    parts: MultipartPart[]
    uploadedBytes: number
}

/** Reads a live AbortSignal through a call boundary so a repeat check after an
 *  `await` isn't (incorrectly) narrowed away as "always false" by TS — `.aborted`
 *  is `readonly`, but its value can genuinely change while we're awaiting. */
function isAborted(signal: AbortSignal): boolean {
    return signal.aborted
}

function isClientError(error: unknown): boolean {
    const status = error instanceof UpupError ? error.status : undefined
    return status !== undefined && status >= 400 && status < 500
}

/** The server's token-expiry rejection: `@upupjs/server`'s upload routes answer
 *  403 with `{ error: 'Invalid upload token', code: 'expired' }`, which
 *  `uploadErrorFromResponse` lifts onto `.status` / `.code`. */
function isExpiredTokenError(error: unknown): boolean {
    return (
        error instanceof UpupError &&
        error.status === 403 &&
        error.code === 'expired'
    )
}

/** A 4xx from init or complete means the server already refused or tore the
 *  upload down (size-envelope violation, upload gone) — no later resume can
 *  ever succeed against that session, so it must not survive the failure. */
function isUnresumableFailure(error: unknown): boolean {
    return (
        error instanceof UpupStorageError &&
        (error.operation === 'multipart-init' ||
            error.operation === 'multipart-complete') &&
        isClientError(error)
    )
}

/** The stall verdict `partTimeoutMs` produces. Built on the existing error
 *  vocabulary (TIMEOUT code, `retryable: true`) so the part-retry predicate
 *  and every downstream consumer classify it like any other transient fault. */
function partStallError(partNumber: number, timeoutMs: number): UpupError {
    return new UpupError(
        `Part ${partNumber} stalled: no response within ${timeoutMs}ms`,
        UpupErrorCode.TIMEOUT,
        true,
    )
}

/** A failure a later attempt could survive. Definitive rejections (a 4xx other
 *  than 429) are a verdict, not weather — retrying them only hides bugs. */
function isRetryablePartFailure(error: unknown): boolean {
    if (error instanceof UpupError) {
        return (
            error.retryable ||
            error.status === 429 ||
            (error.status !== undefined && error.status >= 500)
        )
    }
    // A stray AbortError that is neither the outer signal (rethrown before the
    // predicate runs) nor a stall (already converted) was aborted by something
    // this strategy doesn't own — leave it alone.
    if (error instanceof DOMException && error.name === 'AbortError') {
        return false
    }
    // fetch signals network-level death (connection reset, DNS, CORS) as a
    // TypeError — no verdict was reached, so a retry is legitimate.
    return error instanceof TypeError
}

/** Resolves after `ms`, or immediately when `signal` aborts — the caller
 *  re-checks the signal after waking; sleeping through an abort would only
 *  delay the inevitable throw. */
function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
        const wake = () => {
            clearTimeout(timer)
            signal.removeEventListener('abort', wake)
            resolve()
        }
        const timer = setTimeout(wake, ms)
        signal.addEventListener('abort', wake, { once: true })
    })
}

/** The checksum pipeline step's hash, when it ran. Read defensively: the
 *  strategy is handed `File | Blob`, and only pipeline-processed UploadFiles
 *  carry `metadata`. */
function readContentHash(file: File | Blob): string | undefined {
    const metadata = (file as { metadata?: Record<string, unknown> }).metadata
    return typeof metadata?.originalContentHash === 'string'
        ? metadata.originalContentHash
        : undefined
}

/**
 * Best-effort teardown of the persisted multipart sessions belonging to files
 * the user explicitly discarded (cancel / removeFile / removeAll). Without it,
 * `persist` mode's deliberate "don't abort on failure" would leave server-side
 * parts — and their storage bill — alive until an S3 lifecycle rule reaps them.
 *
 * Fire-and-forget by contract: never throws, never blocks the caller, and does
 * nothing at all for a file that has no session.
 */
export function abortPersistedMultipartSessions(
    files: Iterable<File | Blob>,
    credentials: Pick<CredentialStrategy, 'abortMultipartUpload'>,
): void {
    for (const file of files) {
        if (!(file instanceof File)) continue
        try {
            const fingerprint = fileFingerprint(file)
            const session = loadSession(fingerprint)
            if (!session) continue
            removeSession(fingerprint)
            void credentials
                .abortMultipartUpload?.({ token: session.token })
                .catch(() => {
                    // upup-catch: cancel cleanup is advisory — a failed abort
                    // must never surface to a user who already walked away.
                })
        } catch {
            // upup-catch: storage/credential hiccups must not break cancel
        }
    }
}

export class MultipartUpload implements UploadStrategy {
    private credentials: CredentialStrategy
    private initMultipartUpload: NonNullable<
        CredentialStrategy['initMultipartUpload']
    >
    private signPart: NonNullable<CredentialStrategy['signPart']>
    private completeMultipartUpload: NonNullable<
        CredentialStrategy['completeMultipartUpload']
    >
    private resumeMultipartUpload:
        CredentialStrategy['resumeMultipartUpload'] | undefined
    private chunkSizeBytes: number
    private maxConcurrentParts: number
    private persist: boolean
    private sessionScope: string | undefined
    private retryDelays: number[]
    private partTimeoutMs: number

    constructor(options: MultipartUploadOptions) {
        const { credentials } = options
        if (
            !credentials.initMultipartUpload ||
            !credentials.signPart ||
            !credentials.completeMultipartUpload
        ) {
            throw new UpupConfigError(
                'CredentialStrategy must implement multipart methods (initMultipartUpload, signPart, completeMultipartUpload)',
            )
        }
        // Bound to the original `credentials` object — these are detached from
        // their owning instance below, and implementations (e.g. ServerCredentials)
        // rely on `this` internally (e.g. `this.post(...)`).
        this.credentials = credentials
        this.initMultipartUpload =
            credentials.initMultipartUpload.bind(credentials)
        this.signPart = credentials.signPart.bind(credentials)
        this.completeMultipartUpload =
            credentials.completeMultipartUpload.bind(credentials)
        this.resumeMultipartUpload =
            credentials.resumeMultipartUpload?.bind(credentials)
        this.chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE
        // A non-finite request (NaN from a `parseInt('')` settings input,
        // Infinity) must not become the gate value: `activeParts.length >= NaN`
        // is always false, which uncaps concurrency and fires every part at
        // once. Fall back to the default when the number isn't usable.
        const requestedConcurrency = Math.floor(
            options.maxConcurrentParts ?? DEFAULT_MAX_CONCURRENT,
        )
        this.maxConcurrentParts = Number.isFinite(requestedConcurrency)
            ? Math.max(1, requestedConcurrency)
            : DEFAULT_MAX_CONCURRENT
        this.persist = options.persist ?? false
        this.sessionScope = options.sessionScope
        this.retryDelays = options.retryDelays ?? DEFAULT_RETRY_DELAYS
        this.partTimeoutMs = options.partTimeoutMs ?? DEFAULT_PART_TIMEOUT_MS
    }

    /**
     * Each stored part must be byte-for-byte where this file's own chunking
     * would put it: exactly `partSize`, except the file's TRUE final part
     * (`partNumber === totalParts`), which must be exactly the remaining tail.
     *
     * The "highest part number we happen to hold" is NOT the exemption — the
     * server may hold a sparse prefix (say parts 1, 2, 5 of 10), and letting
     * part 5 be short would splice a short block into the MIDDLE of the object.
     * S3 only enforces the ≥5 MiB floor on non-final parts, so it would accept
     * the complete call and hand back a silently corrupt object. A part with no
     * reported `size` is unverifiable and therefore equally unusable.
     */
    private partsMatchSession(
        parts: MultipartPart[],
        partSize: number,
        fileSize: number,
    ): boolean {
        if (partSize <= 0) return false
        const totalParts = Math.ceil(fileSize / partSize)
        const finalPartSize = fileSize - (totalParts - 1) * partSize
        return parts.every(part => {
            if (typeof part.size !== 'number') return false
            if (part.partNumber < 1 || part.partNumber > totalParts) {
                return false
            }
            return part.partNumber === totalParts
                ? part.size === finalPartSize
                : part.size === partSize
        })
    }

    /**
     * Try to re-attach to the upload a previous session left in flight.
     * Returns `null` for every "just start fresh" outcome — a resume failure
     * must never fail an upload that a fresh init could still serve.
     */
    private async tryResume(
        fingerprint: string,
        fileSize: number,
        contentHash: string | undefined,
    ): Promise<ResumedUpload | null> {
        const resume = this.resumeMultipartUpload
        if (!resume) return null

        const session = loadSession(fingerprint)
        if (!session) return null

        // A session belongs to the server that issued its token; presenting it
        // anywhere else is at best a 403 and at worst a cross-tenant surprise.
        if (session.scope !== this.sessionScope) {
            removeSession(fingerprint)
            return null
        }
        if (
            contentHash !== undefined &&
            session.contentHash !== undefined &&
            session.contentHash !== contentHash
        ) {
            removeSession(fingerprint)
            return null
        }

        let response: MultipartResumeResponse
        try {
            response = await resume({ token: session.token })
        } catch (error) {
            // upup-catch: a resume failure must never fail an upload a fresh
            // init could still serve — the caller falls back to init. 4xx: the
            // server will never honour this session again (token rejected,
            // upload gone), so drop it. A pure network failure says nothing
            // about the session, so it survives for the next attempt.
            if (isClientError(error)) removeSession(fingerprint)
            return null
        }

        const parts = [...response.parts].sort(
            (a, b) => a.partNumber - b.partNumber,
        )
        if (!this.partsMatchSession(parts, session.partSize, fileSize)) {
            removeSession(fingerprint)
            return null
        }

        const uploadedBytes = parts.reduce(
            (sum, part) => sum + (part.size ?? 0),
            0,
        )
        updateSessionToken(fingerprint, response.token)
        updateSessionProgress(fingerprint, uploadedBytes)

        return {
            token: response.token,
            partSize: session.partSize,
            // Drop `size`: the complete call ignores it, and the wire payload
            // stays byte-identical to a non-resumed upload's.
            parts: parts.map(({ partNumber, eTag }) => ({ partNumber, eTag })),
            uploadedBytes,
        }
    }

    /**
     * Failure teardown. THE behavior change of cross-reload resume: with
     * `persist` on, an error or abort deliberately leaves the server-side
     * upload alive so the next attempt can resume into it — pause(), a dropped
     * connection, and UploadManager's own retries all re-enter `upload()` and
     * pick the session back up. Without persist this is exactly the historical
     * best-effort abort. Either way, a 4xx from init/complete kills the
     * session: the server has already torn the upload down.
     */
    private async handleUploadFailure(
        error: unknown,
        token: string,
        fingerprint: string | null,
    ): Promise<void> {
        if (fingerprint && isUnresumableFailure(error)) {
            removeSession(fingerprint)
        }
        // Skipping the abort is only justified when a later attempt can actually
        // resume into the surviving upload. Persist alone isn't enough: without
        // a bound `resumeMultipartUpload` (a custom strategy that omits it, or a
        // client hitting an old server whose resume route 404s and tryResume
        // returns null) the parts would be orphaned forever for no benefit.
        if (this.persist && this.resumeMultipartUpload) return
        await this.credentials.abortMultipartUpload?.({ token }).catch(() => {}) // Best-effort abort
    }

    /**
     * PUT one signed part over XMLHttpRequest, under an INACTIVITY watchdog.
     *
     * The watchdog resets on every `upload` progress event and fires only after
     * `partTimeoutMs` with no forward motion at all. That distinction is the
     * point: `fetch()` for a PUT resolves only once the whole body is sent, so a
     * flat ceiling on total time aborts a large part on a slow-but-healthy link
     * (a 5 MiB part under ~233 kbit/s crosses the 180s default) even though it
     * is uploading fine. An inactivity timer kills the connection the watchdog
     * was built for — one that has genuinely stopped moving bytes — without
     * penalizing the slow one. Mirrors the XHR PUT in direct-upload.ts.
     *
     * Resolves with the part's ETag. Rejects with: the retryable stall on
     * inactivity (`partStallError`) — covering both the slice READ and the PUT;
     * a retryable `UPLOAD_FAILED` when the slice read itself rejects;
     * `UpupNetworkError('Upload aborted')` when
     * the caller's signal aborts; a retryable `TypeError` on a network-level
     * failure (the shape `fetch` produced, which `isRetryablePartFailure`
     * already classifies); or an `uploadErrorFromResponse` on a non-2xx — its
     * body read synchronously from `xhr.responseText`, so the whole request
     * including the error body stays inside the one abort/inactivity window (the
     * old `await response.text()` ran AFTER the watchdog was cleared and could
     * hang a half-dead connection forever on the body read).
     */
    private async putPart(
        signed: MultipartSignPartResponse,
        chunk: Blob,
        partNumber: number,
        signal: AbortSignal,
    ): Promise<string> {
        // Materialize the slice to an ArrayBuffer BEFORE handing it to XHR.
        // Firefox streams a Blob body lazily during send(); when the Blob is a
        // slice of a File revived from IndexedDB after a page reload, that lazy
        // read can stall — the request headers go out but the body never does,
        // so the store times out the part (observed as a 503 storm on both
        // MinIO and Backblaze B2, Firefox-only, reload-resume-only; the same
        // revived blob READS fine via arrayBuffer(), so only the lazy XHR
        // streaming path is affected). Reading the bytes up front turns a
        // broken source into a clean rejection instead of a hanging bodyless
        // request: a read REJECTION (Firefox NotReadableError on an
        // evicted/stale blob) is a retryable failure that costs one
        // `retryDelays` slot — the retry re-slices the SAME File, so it
        // recovers only if the backing store does — and a read that never
        // settles falls under the same `partTimeoutMs` inactivity budget as
        // the PUT. The caller's signal joins the race so pause/cancel/destroy
        // interrupt a hung read immediately instead of waiting the budget out.
        //
        // Size-gated: partSize GROWS with file size (the 10,000-part cap
        // raises it past 5 MiB above ~48 GiB), and per the XHR spec send()
        // copies a BufferSource — so materializing an arbitrarily large part
        // would trade this Firefox-only stall for an unbounded-heap
        // regression in every browser. Oversized parts keep the streaming
        // Blob path (the pre-fix behavior); at the ceiling the transient cost
        // is bounded by maxConcurrentParts × 2 × MATERIALIZE_PART_MAX_BYTES.
        if (isAborted(signal)) {
            throw new UpupNetworkError('Upload aborted')
        }
        let body: ArrayBuffer | Blob = chunk
        if (chunk.size <= MATERIALIZE_PART_MAX_BYTES) {
            let readTimer: ReturnType<typeof setTimeout> | undefined
            let onReadAbort: (() => void) | undefined
            body = await Promise.race([
                chunk.arrayBuffer().catch((cause: unknown) => {
                    const readErr = new UpupError(
                        `Part ${partNumber} source read failed: ${
                            cause instanceof Error
                                ? cause.message
                                : String(cause)
                        }`,
                        UpupErrorCode.UPLOAD_FAILED,
                        true,
                    )
                    throw readErr
                }),
                new Promise<never>((_, reject) => {
                    readTimer = setTimeout(() => {
                        reject(partStallError(partNumber, this.partTimeoutMs))
                    }, this.partTimeoutMs)
                }),
                new Promise<never>((_, reject) => {
                    onReadAbort = () => {
                        const abortErr = new UpupNetworkError('Upload aborted')
                        reject(abortErr)
                    }
                    signal.addEventListener('abort', onReadAbort, {
                        once: true,
                    })
                }),
            ]).finally(() => {
                clearTimeout(readTimer)
                if (onReadAbort) {
                    signal.removeEventListener('abort', onReadAbort)
                }
            })
        }
        if (isAborted(signal)) {
            throw new UpupNetworkError('Upload aborted')
        }
        return new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            let stalled = false
            let watchdog: ReturnType<typeof setTimeout> | undefined

            const armWatchdog = () => {
                clearTimeout(watchdog)
                watchdog = setTimeout(() => {
                    stalled = true
                    xhr.abort()
                }, this.partTimeoutMs)
            }
            const forwardAbort = () => {
                xhr.abort()
            }
            const cleanup = () => {
                clearTimeout(watchdog)
                signal.removeEventListener('abort', forwardAbort)
            }

            // Any forward motion proves the connection is alive: restart the
            // inactivity window instead of letting it count down against a
            // healthy upload.
            xhr.upload.addEventListener('progress', () => {
                armWatchdog()
            })

            xhr.addEventListener('load', () => {
                cleanup()
                if (xhr.status >= 200 && xhr.status < 300) {
                    const eTag =
                        xhr.getResponseHeader('ETag') ?? `"part-${partNumber}"`
                    resolve(eTag)
                    return
                }
                const err = uploadErrorFromResponse({
                    status: xhr.status,
                    statusText: xhr.statusText,
                    body: xhr.responseText,
                    kind: 'storage',
                    operation: 'multipart-sign-part',
                })
                reject(err)
            })

            xhr.addEventListener('error', () => {
                cleanup()
                // A network-level failure reaches no verdict — the same thing
                // `fetch` surfaces as a TypeError, which the retry predicate
                // treats as retryable.
                const err = new TypeError('Network error during part upload')
                reject(err)
            })

            xhr.addEventListener('abort', () => {
                cleanup()
                // The watchdog's own abort is a retryable stall; any other abort
                // is the caller cancelling the whole upload.
                if (stalled && !isAborted(signal)) {
                    const stallErr = partStallError(
                        partNumber,
                        this.partTimeoutMs,
                    )
                    reject(stallErr)
                    return
                }
                const abortErr = new UpupNetworkError('Upload aborted')
                reject(abortErr)
            })

            signal.addEventListener('abort', forwardAbort, { once: true })

            xhr.open('PUT', signed.uploadUrl)
            for (const [key, value] of Object.entries(
                signed.uploadHeaders ?? {},
            )) {
                xhr.setRequestHeader(key, value)
            }
            // Arm before send so a connection that stalls before its first
            // progress event still trips the watchdog.
            armWatchdog()
            xhr.send(body)
        })
    }

    async upload(
        file: File | Blob,
        _credentials: UploadCredentials,
        options: {
            onProgress: (loaded: number, total: number) => void
            signal: AbortSignal
        },
    ): Promise<UploadResult> {
        const fileSize = file.size
        const fileName = file instanceof File ? file.name : 'blob'
        const fileType = file.type || 'application/octet-stream'

        // Persistence is a File-only story: the fingerprint that finds this
        // upload again after a reload is name:size:lastModified:type, none of
        // which a bare Blob carries.
        const fingerprint =
            this.persist && file instanceof File ? fileFingerprint(file) : null
        const contentHash = readContentHash(file)

        // 1. Re-attach to an in-flight upload, or initiate a new one
        const resumed = fingerprint
            ? await this.tryResume(fingerprint, fileSize, contentHash)
            : null

        let currentToken: string
        let partSize: number
        const completedParts: MultipartPart[] = []
        let totalUploaded = 0

        if (resumed) {
            currentToken = resumed.token
            partSize = resumed.partSize
            completedParts.push(...resumed.parts)
            totalUploaded = resumed.uploadedBytes
            // Jump the progress bar to the offset we are actually resuming
            // from, before a single byte moves.
            options.onProgress(totalUploaded, fileSize)
        } else {
            let init: MultipartInitResponse
            try {
                init = await this.initMultipartUpload({
                    name: fileName,
                    size: fileSize,
                    type: fileType,
                })
            } catch (error) {
                // Nothing exists server-side to abort; only the stale session
                // (if any) needs clearing on a definitive rejection.
                if (fingerprint && isClientError(error)) {
                    removeSession(fingerprint)
                }
                throw error
            }

            if (!init.token) {
                throw new UpupNetworkError(
                    'Multipart init did not return an upload token (server too old or misconfigured)',
                )
            }
            currentToken = init.token
            // The server's partSize wins when present. The MAX_PARTS floor
            // applies to the local fallback only — raising a server-chosen
            // size here would desync from whatever bookkeeping produced it.
            partSize =
                init.partSize ||
                Math.max(this.chunkSizeBytes, Math.ceil(fileSize / MAX_PARTS))

            if (fingerprint) {
                saveSession(fingerprint, {
                    token: currentToken,
                    key: init.key,
                    partSize,
                    updatedAt: Date.now(),
                    uploadedBytes: 0,
                    ...(this.sessionScope !== undefined
                        ? { scope: this.sessionScope }
                        : {}),
                    ...(contentHash !== undefined ? { contentHash } : {}),
                })
            }
        }

        const totalParts = Math.ceil(fileSize / partSize)

        // Mid-flight token refresh. The 1h token TTL is shorter than plenty of
        // real uploads, so a sign-part/complete call can legitimately outlive
        // its own credential. One shared refresh serves all concurrent part
        // uploaders: the first to see the 403 rotates the token, the rest
        // either await that same promise or find `currentToken` already fresh.
        let refreshInFlight: Promise<string | null> | null = null

        const refreshToken = async (
            staleToken: string,
        ): Promise<string | null> => {
            const resume = this.resumeMultipartUpload
            if (!resume) return null
            if (currentToken !== staleToken) return currentToken

            const pending =
                refreshInFlight ??
                resume({ token: staleToken })
                    .then(response => {
                        currentToken = response.token
                        if (fingerprint) {
                            updateSessionToken(fingerprint, response.token)
                        }
                        return response.token
                    })
                    .catch(() => null)
                    .finally(() => {
                        refreshInFlight = null
                    })
            refreshInFlight = pending
            return pending
        }

        /** Run a token-authenticated call; on an expired-token 403, rotate the
         *  token through resume and retry exactly once. */
        const withTokenRefresh = async <T>(
            call: (token: string) => Promise<T>,
        ): Promise<T> => {
            const attemptToken = currentToken
            try {
                return await call(attemptToken)
            } catch (error) {
                if (!isExpiredTokenError(error)) throw error
                const freshToken = await refreshToken(attemptToken)
                if (!freshToken) throw error
                return call(freshToken)
            }
        }

        try {
            // 2. Upload the parts storage does not already hold, with
            //    concurrency control
            const alreadyUploaded = new Set(
                completedParts.map(part => part.partNumber),
            )
            const partQueue = Array.from(
                { length: totalParts },
                (_, i) => i + 1,
            ).filter(partNumber => !alreadyUploaded.has(partNumber))
            const activeParts: Promise<void>[] = []

            /** One sign+PUT attempt. Hangs are impossible by construction: the
             *  sign call races the watchdog (its transport offers no abort), and
             *  the PUT (see putPart) runs under an inactivity watchdog that
             *  aborts it after `partTimeoutMs` with no upload progress. */
            const attemptPart = async (partNumber: number): Promise<void> => {
                const start = (partNumber - 1) * partSize
                const end = Math.min(start + partSize, fileSize)
                const chunk = file.slice(start, end)

                // Sign the part
                let signTimer: ReturnType<typeof setTimeout> | undefined
                const signed = await Promise.race([
                    withTokenRefresh(token =>
                        this.signPart({
                            token,
                            partNumber,
                        }),
                    ),
                    new Promise<never>((_, reject) => {
                        signTimer = setTimeout(() => {
                            reject(
                                partStallError(partNumber, this.partTimeoutMs),
                            )
                        }, this.partTimeoutMs)
                    }),
                ]).finally(() => {
                    clearTimeout(signTimer)
                })

                if (isAborted(options.signal)) {
                    throw new UpupNetworkError('Upload aborted')
                }

                // Upload the chunk over XHR (mirrors direct-upload.ts) so
                // upload-progress events feed the watchdog. putPart makes it an
                // INACTIVITY timer rather than a flat ceiling on total upload
                // time: a slow-but-steady link is never aborted, a genuinely
                // hung connection still is.
                const eTag = await this.putPart(
                    signed,
                    chunk,
                    partNumber,
                    options.signal,
                )
                completedParts.push({ partNumber, eTag })

                totalUploaded += end - start
                options.onProgress(totalUploaded, fileSize)
                if (fingerprint) {
                    updateSessionProgress(fingerprint, totalUploaded)
                }
            }

            const uploadPart = async (partNumber: number): Promise<void> => {
                for (let attempt = 0; ; attempt++) {
                    if (isAborted(options.signal)) {
                        throw new UpupNetworkError('Upload aborted')
                    }
                    try {
                        await attemptPart(partNumber)
                        return
                    } catch (error) {
                        // The user's abort always wins, whatever error shape
                        // it surfaced as mid-flight.
                        if (isAborted(options.signal)) throw error
                        const delay = this.retryDelays[attempt]
                        if (
                            delay === undefined ||
                            !isRetryablePartFailure(error)
                        ) {
                            throw error
                        }
                        await abortableDelay(delay, options.signal)
                    }
                }
            }

            // Process parts with concurrency limit
            for (const partNumber of partQueue) {
                if (options.signal.aborted) break

                const partPromise = uploadPart(partNumber).then(() => {
                    const idx = activeParts.indexOf(partPromise)
                    if (idx !== -1) void activeParts.splice(idx, 1)
                })
                activeParts.push(partPromise)

                if (activeParts.length >= this.maxConcurrentParts) {
                    await Promise.race(activeParts)
                }
            }

            // Wait for remaining parts
            await Promise.all(activeParts)

            // An abort that lands before any part starts — while tryResume is
            // in flight, or between the resume/init and the first iteration —
            // breaks the loop above on its first pass with `completedParts`
            // holding only the parts the server already stored. Completing here
            // would assemble a TRUNCATED object and return it as SUCCESS; init
            // signs `smin: 0`, so the server cannot reject the short upload.
            // Route the abort into the failure path (catch → handleUploadFailure
            // → rethrow) so the run records a failure and preserves the session.
            if (isAborted(options.signal)) {
                throw new UpupNetworkError('Upload aborted')
            }

            // 3. Complete multipart upload
            completedParts.sort((a, b) => a.partNumber - b.partNumber)

            const result = await withTokenRefresh(token =>
                this.completeMultipartUpload({
                    token,
                    parts: completedParts,
                }),
            )

            if (fingerprint) removeSession(fingerprint)

            return {
                key: result.key,
                publicUrl: result.publicUrl,
                downloadUrl: result.downloadUrl,
                etag: result.etag,
            }
        } catch (error) {
            await this.handleUploadFailure(error, currentToken, fingerprint)
            throw error
        }
    }
}
