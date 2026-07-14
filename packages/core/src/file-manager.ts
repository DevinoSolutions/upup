import {
    UpupError,
    UpupValidationError,
    UpupErrorCode,
    FileSource,
    UploadStatus,
    type UploadFile,
    type MaxFileSizeObject,
} from './contracts'
import {
    fileSizeInBytes,
    matchesAccept,
    validateFileRestrictions,
} from './validate-file-restrictions'

// Re-exported for backwards compatibility — relocated to validate-file-restrictions.ts
export { fileSizeInBytes, matchesAccept }

export interface FileManagerOptions {
    allowedFileTypes?: string | undefined
    limit?: number | undefined
    maxFileSize?: MaxFileSizeObject | undefined
    minFileSize?: MaxFileSizeObject | undefined
    maxTotalFileSize?: MaxFileSizeObject | undefined
    contentDeduplication?: boolean | undefined
    onBeforeFileAdded?:
        | ((
              file: File,
          ) => boolean | File | undefined | Promise<boolean | File | undefined>)
        | undefined
}

let fileIdCounter = 0

function generateFileId(): string {
    return `upup-${Date.now()}-${++fileIdCounter}`
}

async function computeContentHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // `.subtle` is typed as always-present on `Crypto`, but is genuinely absent
    // in some runtimes (older Node, restricted/partial polyfills) — widen the
    // access locally so the feature-detection stays a real runtime check.
    const subtleCrypto =
        typeof crypto !== 'undefined'
            ? (crypto as Partial<Crypto>).subtle
            : undefined
    if (subtleCrypto) {
        const hashBuffer = await subtleCrypto.digest('SHA-256', buffer)
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
    }

    let hash = 0x811c9dc5
    for (const byte of bytes) {
        hash ^= byte
        hash = Math.imul(hash, 0x01000193)
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function storedContentHash(file: UploadFile): string | undefined {
    const metadata = file.metadata as Record<string, unknown> | undefined
    return (
        (typeof metadata?.originalContentHash === 'string'
            ? metadata.originalContentHash
            : undefined) ??
        (typeof metadata?.checksum === 'string'
            ? metadata.checksum
            : undefined) ??
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- v3 removal tracked
        file.checksumSHA256 ??
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- v3 removal tracked
        file.fileHash
    )
}

/**
 * Stamp a content hash onto a file NOT yet in the state layer (freshly built
 * by nativeToUploadFile, pre-insertion). Files already stored in the manager
 * are immutable (P6) — those go through updateFile with contentHashPatch()
 * instead; never call this on a live entry.
 */
function applyContentHash(file: UploadFile, hash: string): UploadFile {
    // Keep the grandfathered top-level `fileHash` in sync (superseded by
    // metadata.originalContentHash) through a non-deprecated view.
    const fileRecord = file as unknown as Record<string, unknown>
    fileRecord.fileHash = hash
    file.metadata = {
        ...file.metadata,
        originalContentHash: hash,
    }
    return file
}

/** The same hash stamp as applyContentHash, expressed as an updateFile patch. */
function contentHashPatch(file: UploadFile, hash: string): Partial<UploadFile> {
    // Built as an untyped record so the grandfathered `fileHash` slot can be
    // written without referencing the deprecated declaration (same dodge as
    // applyContentHash).
    const patch: Record<string, unknown> = {
        fileHash: hash,
        metadata: { ...file.metadata, originalContentHash: hash },
    }
    return patch
}

function nativeToUploadFile(
    file: File,
    source: FileSource = FileSource.LOCAL,
): UploadFile {
    const url =
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(file)
            : undefined
    const extendedFile = file as File & {
        relativePath?: string
        webkitRelativePath?: string
        metadata?: Record<string, unknown>
    }
    const relativePath =
        typeof extendedFile.relativePath === 'string' &&
        extendedFile.relativePath.trim() !== ''
            ? extendedFile.relativePath
            : typeof extendedFile.webkitRelativePath === 'string' &&
                extendedFile.webkitRelativePath.trim() !== ''
              ? extendedFile.webkitRelativePath
              : undefined
    const existingMetadata =
        extendedFile.metadata &&
        typeof extendedFile.metadata === 'object' &&
        !Array.isArray(extendedFile.metadata)
            ? extendedFile.metadata
            : {}

    const uploadFile = Object.assign(file, {
        id: generateFileId(),
        source,
        status: UploadStatus.IDLE,
        metadata: {
            ...existingMetadata,
            ...(relativePath ? { relativePath } : {}),
        },
        ...(url !== undefined ? { url } : {}),
    }) as UploadFile

    if (relativePath) {
        try {
            Object.defineProperty(uploadFile, 'relativePath', {
                value: relativePath,
                configurable: true,
                enumerable: false,
                writable: true,
            })
        } catch {
            // upup-catch: defineProperty can throw on a frozen/non-configurable
            // File-like — fall back to a plain assignment attempt below.
            try {
                uploadFile.relativePath = relativePath
            } catch {
                // upup-catch: some File-like objects expose read-only path
                // metadata. Preserve it through metadata and avoid failing
                // file admission.
            }
        }
    }

    return uploadFile
}

function revokeObjectUrl(file?: UploadFile): void {
    if (
        file?.url &&
        file.url.startsWith('blob:') &&
        typeof URL !== 'undefined' &&
        typeof URL.revokeObjectURL === 'function'
    ) {
        URL.revokeObjectURL(file.url)
    }
}

export class FileManager {
    private files = new Map<string, UploadFile>()
    private options: FileManagerOptions

    constructor(options: FileManagerOptions) {
        this.options = options
    }

    updateOptions(options: Partial<FileManagerOptions>): void {
        this.options = {
            ...this.options,
            ...options,
        }
    }

    getFiles(): ReadonlyMap<string, UploadFile> {
        return new Map(this.files)
    }

    /**
     * Immutable file-status transition: produce a NEW UploadFile carrying the patch,
     * store and return it. FileManager is the sole writer of a file's status/key/metadata
     * (F-144), and the new reference lets the orchestrator's ref-diff projection track the
     * transition (F-145).
     *
     * Constraint: object-spread (`{ ...prev }`) would strip File's blob data and methods —
     * they live in internal slots / on the prototype, not as own-enumerable props — leaving
     * a plain object that breaks `xhr.send(file)` in the direct-upload strategy. So we
     * re-wrap the same backing bytes into a fresh File (a view, not a copy) and copy the
     * UploadFile fields onto it — mirroring `cloneUploadFile` (steps/image-utils.ts). Do
     * NOT "simplify" this back to a spread.
     */
    updateFile(id: string, patch: Partial<UploadFile>): UploadFile | undefined {
        const prev = this.files.get(id)
        if (!prev) return undefined
        const next = new File([prev], prev.name, {
            type: prev.type,
            lastModified: prev.lastModified,
        })
        // Object.assign only ever reads OWN enumerable properties from `prev`
        // (it never walks the prototype chain), so passing `prev` directly is
        // identical to spreading it first — without the redundant intermediate
        // plain-object copy that a spread of a File instance would produce.
        // relativePath is defined non-enumerable (nativeToUploadFile) so it is
        // copied explicitly, exactly as cloneUploadFile does. Then the patch wins.
        Object.assign(next, prev, { relativePath: prev.relativePath }, patch)
        const updated = next as UploadFile
        this.files.set(id, updated)
        return updated
    }

    private validateFile(file: File): void {
        const [violation] = validateFileRestrictions(file, this.options)
        if (violation) {
            throw new UpupValidationError(
                violation.message,
                violation.code,
                file,
            )
        }
    }

    private async collectAcceptedFiles(nativeFiles: File[]): Promise<File[]> {
        const accepted: File[] = []
        for (const nativeFile of nativeFiles) {
            let candidate = nativeFile
            if (this.options.onBeforeFileAdded) {
                const result = await this.options.onBeforeFileAdded(nativeFile)
                if (result === false) continue
                if (result instanceof File) {
                    candidate = result
                }
            }

            this.validateFile(candidate)
            accepted.push(candidate)
        }
        return accepted
    }

    private async deduplicateByContent(
        nativeFiles: File[],
        existingFiles: Iterable<UploadFile>,
    ): Promise<Array<{ file: File; hash?: string }>> {
        if (!this.options.contentDeduplication) {
            return nativeFiles.map(file => ({ file }))
        }

        const seen = new Set<string>()
        for (const existing of existingFiles) {
            const nativeExisting = existing as unknown as File
            const hash =
                storedContentHash(existing) ??
                (typeof nativeExisting.arrayBuffer === 'function'
                    ? await computeContentHash(nativeExisting)
                    : undefined)
            if (hash) {
                // Memoize the computed hash on the STORED entry immutably —
                // `existing` is a live state-layer file, so the write must go
                // through updateFile (new reference), never mutate in place
                // (P6/F-730). Entries not in the store (setFiles passes [])
                // simply skip the memoization.
                if (storedContentHash(existing) !== hash) {
                    this.updateFile(
                        existing.id,
                        contentHashPatch(existing, hash),
                    )
                }
                seen.add(hash)
            }
        }

        const accepted: Array<{ file: File; hash: string }> = []
        for (const file of nativeFiles) {
            const hash = await computeContentHash(file)
            if (seen.has(hash)) continue
            seen.add(hash)
            accepted.push({ file, hash })
        }

        return accepted
    }

    private assertBatchFits(
        files: File[],
        existingFiles: Iterable<UploadFile>,
        fallbackFile?: File,
    ): void {
        if (files.length === 0) return

        // files.length > 0 here, so files[0] is always defined in practice;
        // fallbackFile is the caller's second-chance value for the violation
        // error's required `file` argument.
        const violatingFile = files[0] ?? fallbackFile
        if (!violatingFile) {
            throw new UpupError(
                'assertBatchFits: no file available to attach to the violation error',
                UpupErrorCode.BAD_REQUEST,
            )
        }

        const existing = [...existingFiles]
        if (this.options.limit) {
            const remainingSlots = this.options.limit - existing.length
            if (remainingSlots <= 0 || files.length > remainingSlots) {
                throw new UpupValidationError(
                    `Adding ${files.length} files would exceed the limit of ${this.options.limit}`,
                    UpupErrorCode.LIMIT_EXCEEDED,
                    violatingFile,
                )
            }
        }

        if (this.options.maxTotalFileSize) {
            const maxTotal = fileSizeInBytes(this.options.maxTotalFileSize)
            const currentTotal = existing.reduce((sum, f) => sum + f.size, 0)
            const newTotal = files.reduce((sum, f) => sum + f.size, 0)
            if (currentTotal + newTotal > maxTotal) {
                throw new UpupValidationError(
                    'Total file size exceeds maximum',
                    UpupErrorCode.TOTAL_SIZE_EXCEEDED,
                    violatingFile,
                )
            }
        }
    }

    async addFiles(nativeFiles: File[]): Promise<UploadFile[]> {
        const acceptedNativeFiles = await this.collectAcceptedFiles(nativeFiles)
        const dedupedFiles = await this.deduplicateByContent(
            acceptedNativeFiles,
            this.files.values(),
        )
        this.assertBatchFits(
            dedupedFiles.map(item => item.file),
            this.files.values(),
            nativeFiles[0],
        )
        const accepted = dedupedFiles.map(({ file, hash }) => {
            const uploadFile = nativeToUploadFile(file)
            return hash ? applyContentHash(uploadFile, hash) : uploadFile
        })

        for (const file of accepted) {
            this.files.set(file.id, file)
        }

        return accepted
    }

    removeFile(id: string): UploadFile | undefined {
        const file = this.files.get(id)
        if (file) {
            revokeObjectUrl(file)
            this.files.delete(id)
        }
        return file
    }

    replaceFile(id: string, file: File | UploadFile): UploadFile {
        const current = this.files.get(id)
        if (!current) {
            throw new UpupError(
                `replaceFile: unknown file ID "${id}"`,
                UpupErrorCode.BAD_REQUEST,
            )
        }
        const next =
            'metadata' in file && 'source' in file && 'status' in file
                ? Object.assign(file, { id })
                : Object.assign(nativeToUploadFile(file, current.source), {
                      id,
                  })
        if (current.url !== next.url) {
            revokeObjectUrl(current)
        }
        this.files.set(id, next)
        return next
    }

    removeAll(): void {
        for (const file of this.files.values()) {
            revokeObjectUrl(file)
        }
        this.files.clear()
    }

    /** Bulk-apply pipeline-produced files (already UploadFile with status/key set). */
    applyProcessed(files: UploadFile[]): void {
        for (const file of files) {
            this.files.set(file.id, file)
        }
    }

    /** Re-instate a prior snapshot: clear and repopulate from entries. */
    restore(entries: [string, UploadFile][]): void {
        this.files.clear()
        for (const [id, file] of entries) {
            this.files.set(id, file)
        }
    }

    async setFiles(nativeFiles: File[]): Promise<UploadFile[]> {
        const acceptedNativeFiles = await this.collectAcceptedFiles(nativeFiles)
        const dedupedFiles = await this.deduplicateByContent(
            acceptedNativeFiles,
            [],
        )
        this.assertBatchFits(
            dedupedFiles.map(item => item.file),
            [],
            nativeFiles[0],
        )
        const accepted = dedupedFiles.map(({ file, hash }) => {
            const uploadFile = nativeToUploadFile(file)
            return hash ? applyContentHash(uploadFile, hash) : uploadFile
        })
        for (const file of this.files.values()) {
            revokeObjectUrl(file)
        }
        this.files.clear()
        for (const file of accepted) {
            this.files.set(file.id, file)
        }
        return accepted
    }

    reorderFiles(fileIds: string[]): void {
        if (fileIds.length !== this.files.size) {
            throw new UpupError(
                `reorderFiles: expected ${this.files.size} IDs but received ${fileIds.length}`,
                UpupErrorCode.BAD_REQUEST,
            )
        }

        const newMap = new Map<string, UploadFile>()
        for (const id of fileIds) {
            const file = this.files.get(id)
            if (!file) {
                throw new UpupError(
                    `reorderFiles: unknown file ID "${id}"`,
                    UpupErrorCode.BAD_REQUEST,
                )
            }
            newMap.set(id, file)
        }
        this.files = newMap
    }
}
