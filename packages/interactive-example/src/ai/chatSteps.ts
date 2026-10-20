/**
 * The plain-word step trail for one assistant turn: what the agent did, built
 * from the stream's `tool-call` / `tool-result` / `tool-error` chunks.
 *
 * Wire shapes (@mastra/core 1.75 `stream/types.d.ts`, relayed by
 * @mastra/client-js 1.52 `processDataStream({ onChunk })`):
 *   tool-call   payload { toolCallId, toolName, args }
 *   tool-result payload { toolCallId, toolName, result, isError? }
 *   tool-error  payload { toolCallId, toolName, error }
 *
 * Labels live in STEP_LABELS, keyed by tool id, with a generic fallback for
 * unknown tools. Nothing here ever prints raw args or results: the only
 * dynamic text is a short list of config field names, a docs query and a
 * sanitised one-line failure reason.
 */

type ChatStepStatus = 'running' | 'done' | 'error'

export type ChatStep = {
    /** The tool call id (a generated one when the wire carried none). */
    id: string
    tool: string
    status: ChatStepStatus
    label: string
}

/** The slice of a stream chunk this module reads; any chunk type fits. */
type StepChunk = { type: string; payload?: unknown }

type Payload = {
    toolCallId?: unknown
    toolName?: unknown
    args?: unknown
    result?: unknown
    isError?: unknown
    error?: unknown
}

type StepLabels = {
    running: (args: unknown) => string
    done: string
    /** Prefix of the failure label; the reason, when there is one, follows. */
    failed: string
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
    typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null

/** Collapse whitespace and cap the length, so a label stays one short line. */
function oneLine(s: string, max: number): string {
    const flat = s.replace(/\s+/g, ' ').trim()
    return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

/** Top-level config field names of a patch, when they are plain identifiers. */
function patchFields(args: unknown): string {
    const patch = asRecord(asRecord(args)?.patch)
    if (!patch) return ''
    const keys = Object.keys(patch)
        .filter(k => /^[A-Za-z][\w]{0,39}$/.test(k))
        .slice(0, 4)
    return keys.length ? `: ${keys.join(', ')}` : ''
}

const CONFIG_PATCH_LABELS: StepLabels = {
    running: args => `Updating the uploader config${patchFields(args)}`,
    done: 'Updated the uploader config',
    failed: 'That change failed',
}

const STEP_LABELS: Record<string, StepLabels> = {
    'apply-config-patch': CONFIG_PATCH_LABELS,
    applyConfigPatch: CONFIG_PATCH_LABELS,
    'search-docs': {
        running: args => {
            const q = asRecord(args)?.query
            return typeof q === 'string' && q.trim()
                ? `Searching the docs for '${oneLine(q, 60)}'`
                : 'Searching the docs'
        },
        done: 'Searched the docs',
        failed: 'Docs search failed',
    },
}

/** A tool id safe to print: identifier-ish characters only, capped. */
const toolDisplayName = (tool: string) =>
    oneLine(tool.replace(/[^\w.-]/g, ''), 40) || 'a tool'

function labelsFor(tool: string): StepLabels {
    // Own keys only: a tool named "constructor" must not resolve to Object's.
    if (Object.prototype.hasOwnProperty.call(STEP_LABELS, tool))
        return STEP_LABELS[tool]!
    const name = toolDisplayName(tool)
    return {
        running: () => `Running ${name}`,
        done: `Finished ${name}`,
        failed: `Could not run ${name}`,
    }
}

/**
 * A short, human reason for a failure. JSON-looking and empty errors give no
 * reason at all rather than dumping structure at the reader.
 */
function failureReason(error: unknown): string {
    let msg = ''
    if (typeof error === 'string') msg = error
    else if (error instanceof Error) msg = error.message
    else {
        const m = asRecord(error)?.message
        if (typeof m === 'string') msg = m
    }
    msg = oneLine(msg, 140)
    return /^[{[]/.test(msg) ? '' : msg
}

const failedLabel = (labels: StepLabels, error: unknown) => {
    const reason = failureReason(error)
    return reason ? `${labels.failed}: ${reason}` : labels.failed
}

/**
 * Fold one chunk into the trail. Steps are keyed by toolCallId, so a call
 * reported more than once yields one step, and a finished step is never
 * downgraded by a late duplicate. Returns the same array when nothing changed.
 * A chunk with no id attaches to the latest running step of its tool, or
 * starts a step of its own.
 */
export function applyStepChunk(
    steps: ChatStep[],
    chunk: StepChunk,
): ChatStep[] {
    if (
        chunk.type !== 'tool-call' &&
        chunk.type !== 'tool-result' &&
        chunk.type !== 'tool-error'
    )
        return steps
    const p = (asRecord(chunk.payload) ?? {}) as Payload
    const tool = typeof p.toolName === 'string' ? p.toolName : ''
    const labels = labelsFor(tool)
    const callId =
        typeof p.toolCallId === 'string' && p.toolCallId ? p.toolCallId : ''

    let index = callId ? steps.findIndex(s => s.id === callId) : -1
    if (!callId && chunk.type !== 'tool-call') {
        for (let i = steps.length - 1; i >= 0; i--) {
            const s = steps[i]!
            if (s.tool === tool && s.status === 'running') {
                index = i
                break
            }
        }
    }
    const existing = index === -1 ? undefined : steps[index]

    if (chunk.type === 'tool-call') {
        if (existing) return steps
        return [
            ...steps,
            {
                id: callId || `step-${steps.length}`,
                tool,
                status: 'running',
                label: labels.running(p.args),
            },
        ]
    }

    let next: Pick<ChatStep, 'status' | 'label'>
    if (chunk.type === 'tool-error') {
        next = { status: 'error', label: failedLabel(labels, p.error) }
    } else {
        const result = asRecord(p.result)
        if (p.isError === true) {
            next = {
                status: 'error',
                label: failedLabel(labels, p.result),
            }
        } else if (tool === 'search-docs' && result && result.error) {
            next = { status: 'error', label: 'Docs search is unavailable' }
        } else {
            next = { status: 'done', label: labels.done }
        }
    }

    if (existing) {
        // An error is final; a duplicate result never rewrites a settled step.
        if (existing.status !== 'running') return steps
        return steps.map((s, i) => (i === index ? { ...s, ...next } : s))
    }
    return [...steps, { id: callId || `step-${steps.length}`, tool, ...next }]
}

/** Settle steps still running when the turn ends (stream cut or errored). */
export function settleSteps(steps: ChatStep[]): ChatStep[] {
    if (!steps.some(s => s.status === 'running')) return steps
    return steps.map(s =>
        s.status === 'running'
            ? {
                  ...s,
                  status: 'error' as const,
                  label: `Stopped before it finished: ${s.label}`,
              }
            : s,
    )
}
