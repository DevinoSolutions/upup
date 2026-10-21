import { describe, it, expect } from 'vitest'
import { applyStepChunk, settleSteps, type ChatStep } from '../ai/chatSteps'

const call = (
    toolCallId: string | undefined,
    toolName: string,
    args?: object,
) => ({
    type: 'tool-call',
    payload: { toolCallId, toolName, args },
})
const result = (
    toolCallId: string | undefined,
    toolName: string,
    extra: Record<string, unknown> = {},
) => ({
    type: 'tool-result',
    payload: { toolCallId, toolName, result: { ok: true }, ...extra },
})
const toolError = (
    toolCallId: string | undefined,
    toolName: string,
    error: unknown,
) => ({
    type: 'tool-error',
    payload: { toolCallId, toolName, error },
})

const fold = (chunks: Array<{ type: string; payload?: unknown }>) =>
    chunks.reduce<ChatStep[]>(applyStepChunk, [])

describe('applyStepChunk', () => {
    it('turns a tool call and its result into one running-then-done step', () => {
        const running = fold([
            call('c1', 'apply-config-patch', {
                patch: { allowedFileTypes: 'images', maxFiles: 3 },
                explanation: 'Images only.',
            }),
        ])
        expect(running).toEqual([
            {
                id: 'c1',
                tool: 'apply-config-patch',
                status: 'running',
                label: 'Updating the uploader config: allowedFileTypes, maxFiles',
            },
        ])

        const done = applyStepChunk(running, result('c1', 'apply-config-patch'))
        expect(done).toEqual([
            {
                id: 'c1',
                tool: 'apply-config-patch',
                status: 'done',
                label: 'Updated the uploader config',
            },
        ])
    })

    it('knows the camelCase tool id the hook also accepts', () => {
        const [step] = fold([call('c1', 'applyConfigPatch', { patch: {} })])
        expect(step?.label).toBe('Updating the uploader config')
    })

    it('keeps one step per toolCallId however often a chunk repeats', () => {
        const once = fold([
            call('c1', 'apply-config-patch'),
            result('c1', 'apply-config-patch'),
        ])
        const again = fold([
            call('c1', 'apply-config-patch'),
            call('c1', 'apply-config-patch'),
            result('c1', 'apply-config-patch'),
            call('c1', 'apply-config-patch'),
            result('c1', 'apply-config-patch'),
        ])
        expect(again).toEqual(once)
        expect(again).toHaveLength(1)
        // A repeat returns the very same array, so it costs no render.
        expect(applyStepChunk(once, result('c1', 'apply-config-patch'))).toBe(
            once,
        )
        expect(applyStepChunk(once, call('c1', 'apply-config-patch'))).toBe(
            once,
        )
    })

    it('keeps two genuine calls as two steps, in order', () => {
        const steps = fold([
            call('a', 'apply-config-patch'),
            result('a', 'apply-config-patch'),
            call('b', 'apply-config-patch'),
        ])
        expect(steps.map(s => [s.id, s.status])).toEqual([
            ['a', 'done'],
            ['b', 'running'],
        ])
    })

    it('shows a failed step as "That change failed: <reason>"', () => {
        const [step] = fold([
            call('c1', 'apply-config-patch'),
            toolError(
                'c1',
                'apply-config-patch',
                new Error('maxFiles must be positive'),
            ),
        ])
        expect(step).toMatchObject({
            status: 'error',
            label: 'That change failed: maxFiles must be positive',
        })
    })

    it('treats an isError tool-result like a tool-error', () => {
        const [step] = fold([
            call('c1', 'apply-config-patch'),
            result('c1', 'apply-config-patch', {
                isError: true,
                result: { message: 'Invalid patch' },
            }),
        ])
        expect(step).toMatchObject({
            status: 'error',
            label: 'That change failed: Invalid patch',
        })
    })

    it('never downgrades a failed step to done', () => {
        const failed = fold([
            call('c1', 'apply-config-patch'),
            toolError('c1', 'apply-config-patch', 'nope'),
        ])
        expect(applyStepChunk(failed, result('c1', 'apply-config-patch'))).toBe(
            failed,
        )
    })

    it('adds a step for a result whose call chunk never arrived', () => {
        expect(fold([result('c9', 'apply-config-patch')])).toEqual([
            {
                id: 'c9',
                tool: 'apply-config-patch',
                status: 'done',
                label: 'Updated the uploader config',
            },
        ])
    })

    it('falls back to a generic label for a tool it has no entry for', () => {
        const running = fold([call('c1', 'lookup-thing', { q: 'x' })])
        expect(running[0]?.label).toBe('Running lookup-thing')
        expect(
            applyStepChunk(running, result('c1', 'lookup-thing'))[0]?.label,
        ).toBe('Finished lookup-thing')
        expect(fold([toolError('c2', 'lookup-thing', 'boom')])[0]?.label).toBe(
            'Could not run lookup-thing: boom',
        )
    })

    it('prints only a safe tool name, and a placeholder when it has none', () => {
        expect(fold([call('c1', 'x<script>alert(1)</script>')])[0]?.label).toBe(
            'Running xscriptalert1script',
        )
        expect(fold([call('c1', '')])[0]?.label).toBe('Running a tool')
        // Not resolved through Object.prototype.
        expect(fold([call('c1', 'constructor')])[0]?.label).toBe(
            'Running constructor',
        )
    })

    it('never leaks raw args or results into any label', () => {
        const secret = 'sk-live-SECRET-VALUE'
        const args = {
            patch: {
                serverUrl: secret,
                'weird key {"a":1}': 1,
                nested: { deep: [secret, { x: secret }] },
            },
            explanation: secret,
            query: secret,
        }
        const steps = fold([
            call('c1', 'apply-config-patch', args),
            result('c1', 'apply-config-patch', {
                result: { patch: args.patch, explanation: secret },
            }),
            call('c2', 'mystery-tool', args),
            result('c2', 'mystery-tool', { result: args }),
            call('c3', 'apply-config-patch', args),
            toolError('c3', 'apply-config-patch', {
                code: 500,
                detail: secret,
            }),
            call('c4', 'apply-config-patch', args),
            toolError('c4', 'apply-config-patch', `{"detail":"${secret}"}`),
        ])
        expect(steps).toHaveLength(4)
        for (const step of steps) {
            expect(step.label).not.toContain(secret)
            expect(step.label).not.toMatch(/[{}"]/)
        }
        // Field names are shown, and only the plain-identifier ones.
        const first = fold([call('c1', 'apply-config-patch', args)])[0]
        expect(first?.label).toBe(
            'Updating the uploader config: serverUrl, nested',
        )
    })

    it('keeps a long failure reason to one short line', () => {
        const [step] = fold([
            toolError('c1', 'apply-config-patch', `bad\n\n${'x'.repeat(500)}`),
        ])
        expect(step?.label).not.toContain('\n')
        expect(step?.label.length).toBeLessThan(180)
        expect(step?.label.endsWith('…')).toBe(true)
    })

    it('limits the field list to four names', () => {
        const patch = Object.fromEntries(
            ['a', 'b', 'c', 'd', 'e', 'f'].map(k => [k, 1]),
        )
        const [step] = fold([call('c1', 'apply-config-patch', { patch })])
        expect(step?.label).toBe('Updating the uploader config: a, b, c, d')
    })

    it('words a docs search from its query and result', () => {
        const [running] = fold([
            call('c1', 'search-docs', { query: 'presigned URLs' }),
        ])
        expect(running?.label).toBe("Searching the docs for 'presigned URLs'")
        expect(
            applyStepChunk([running!], result('c1', 'search-docs'))[0]?.label,
        ).toBe("Searched the docs for 'presigned URLs'")
        expect(applyStepChunk([], result('c2', 'search-docs'))[0]?.label).toBe(
            'Searched the docs',
        )
        expect(
            applyStepChunk(
                [running!],
                result('c1', 'search-docs', { result: { error: 'offline' } }),
            )[0],
        ).toMatchObject({
            status: 'error',
            label: 'Docs search is unavailable',
        })
    })

    it('attaches an id-less result to the latest running step of its tool', () => {
        const steps = fold([
            call(undefined, 'apply-config-patch'),
            result('', 'apply-config-patch'),
        ])
        expect(steps).toHaveLength(1)
        expect(steps[0]?.status).toBe('done')
    })

    it('ignores every other chunk type', () => {
        const empty: ChatStep[] = []
        for (const type of ['text-delta', 'finish', 'step-start', 'error'])
            expect(applyStepChunk(empty, { type, payload: {} })).toBe(empty)
    })
})

describe('settleSteps', () => {
    it('marks a step still running as stopped, and leaves settled ones alone', () => {
        const steps = fold([
            call('a', 'apply-config-patch'),
            result('a', 'apply-config-patch'),
            call('b', 'lookup-thing'),
        ])
        const settled = settleSteps(steps)
        expect(settled[0]).toBe(steps[0])
        expect(settled[1]).toMatchObject({
            status: 'error',
            label: 'Stopped before it finished: Running lookup-thing',
        })
        const quiet = settleSteps(settled)
        expect(quiet).toBe(settled)
    })
})
