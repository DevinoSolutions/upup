import { describe, it, expect } from 'vitest'
import { FileManager } from '../src/file-manager'
import { UpupErrorCode } from '../src/errors'

const makeFile = (name: string, size = 10, fill = 'x') =>
    new File([fill.repeat(size)], name, { type: 'text/plain' })

function deferred<T = void>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(r => {
        resolve = r
    })
    return { promise, resolve }
}

// Resolves to 'pending' when the promise has not settled within a short grace.
const settleOrPending = <T>(promise: Promise<T>) =>
    Promise.race([
        promise.then(
            () => 'settled' as const,
            () => 'settled' as const,
        ),
        new Promise<'pending'>(r => setTimeout(() => r('pending'), 100)),
    ])

describe('FileManager admission with async onBeforeFileAdded hooks', () => {
    it('settles when the hook itself awaits addFiles on the same manager', async () => {
        const manager: FileManager = new FileManager({
            onBeforeFileAdded: async file => {
                if (file.name === 'outer.txt') {
                    await manager.addFiles([makeFile('inner.txt')])
                }
                return true
            },
        })

        const outcome = await settleOrPending(
            manager.addFiles([makeFile('outer.txt')]),
        )

        expect(outcome).toBe('settled')
        expect(
            [...manager.getFiles().values()].map(f => f.name).sort(),
        ).toEqual(['inner.txt', 'outer.txt'])
    })

    it('admits a later batch while an earlier batch hook never settles', async () => {
        const manager = new FileManager({
            onBeforeFileAdded: file =>
                file.name === 'stuck.txt'
                    ? new Promise<boolean>(() => {})
                    : true,
        })

        void manager.addFiles([makeFile('stuck.txt')])
        const later = manager.addFiles([makeFile('ok.txt')])

        expect(await settleOrPending(later)).toBe('settled')
        expect([...manager.getFiles().values()].map(f => f.name)).toEqual([
            'ok.txt',
        ])
    })

    it('admits batches in hook-completion order when their hooks resolve in reverse', async () => {
        const gates = new Map([
            ['a.txt', deferred<boolean>()],
            ['b.txt', deferred<boolean>()],
        ])
        const manager = new FileManager({
            limit: 1,
            onBeforeFileAdded: file => gates.get(file.name)!.promise,
        })

        const first = manager.admitFiles([makeFile('a.txt')])
        const second = manager.admitFiles([makeFile('b.txt')])
        gates.get('b.txt')!.resolve(true)
        const secondOutcome = await second
        gates.get('a.txt')!.resolve(true)
        const firstOutcome = await first

        expect(secondOutcome.accepted.map(f => f.name)).toEqual(['b.txt'])
        expect(firstOutcome.accepted).toEqual([])
        expect(firstOutcome.refused.map(e => e.code)).toEqual([
            UpupErrorCode.LIMIT_EXCEEDED,
        ])
    })

    it('lets setFiles replace the selection once an addFiles whose hook finished first has landed', async () => {
        const gates = new Map([
            ['a.txt', deferred<boolean>()],
            ['b.txt', deferred<boolean>()],
        ])
        const manager = new FileManager({
            onBeforeFileAdded: file => gates.get(file.name)?.promise ?? true,
        })
        await manager.addFiles([
            makeFile('x1.txt', 10, 'p'),
            makeFile('x2.txt', 10, 'q'),
        ])
        // Hashing the stored files makes the add slower than the replace.
        manager.updateOptions({ contentDeduplication: true })

        const adding = manager.admitFiles([makeFile('a.txt', 10, 'r')])
        const replacing = manager.admitFileSet([makeFile('b.txt', 10, 's')])
        gates.get('a.txt')!.resolve(true)
        gates.get('b.txt')!.resolve(true)
        await Promise.all([adding, replacing])

        expect([...manager.getFiles().values()].map(f => f.name)).toEqual([
            'b.txt',
        ])
    })
})
