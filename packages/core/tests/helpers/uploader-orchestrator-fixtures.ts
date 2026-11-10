import { vi } from 'vitest'
import type { UpupCore } from '../../src/core'
import { UploaderOrchestrator } from '../../src/orchestrator/uploader-orchestrator'
import { UploadStatus } from '../../src/types/upload-status'
import { FileSource } from '../../src/types/file-source'
import type { UploadFile } from '../../src/types/upload-file'
import type { OrchestratorState } from '../../src/orchestrator/types'

interface MockCoreProgress {
    totalFiles: number
    completedFiles: number
    percentage: number
}

const idleProgress: MockCoreProgress = {
    totalFiles: 0,
    completedFiles: 0,
    percentage: 0,
}

/**
 * Build the plain mock-core object shape. Kept unbranded (not yet cast to
 * UpupCore) so callers can still freely set `progress` before the one-time
 * escape-hatch cast happens in createMockCore()/createMockCoreWithHandlers().
 */
function buildMockCore(progress: MockCoreProgress = idleProgress) {
    return {
        on: vi.fn(() => () => {}),
        addFiles: vi.fn(),
        removeFile: vi.fn(),
        removeAll: vi.fn(),
        upload: vi.fn(),
        destroy: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        retry: vi.fn(),
        emit: vi.fn(),
        replaceFile: vi.fn(),
        getPlugin: vi.fn(),
        files: new Map<string, UploadFile>(),
        progress,
    }
}

// UpupCore has private fields, so a plain mock object can only satisfy its
// type via an explicit escape-hatch cast at this one boundary.
export function createMockCore(): UpupCore {
    return buildMockCore() as unknown as UpupCore
}

/**
 * Create a mock core where `on` captures handlers by event name,
 * so tests can simulate events via `handlers[eventName](payload)`.
 */
export function createMockCoreWithHandlers(progress?: MockCoreProgress) {
    const handlers: Record<string, (payload: unknown) => void> = {}
    const unsubs: Array<() => void> = []
    const core = {
        ...buildMockCore(progress),
        on: vi.fn((event: string, handler: (payload: unknown) => void) => {
            handlers[event] = handler
            const unsub = vi.fn()
            unsubs.push(unsub)
            return unsub
        }),
    } as unknown as UpupCore
    return { core, handlers, unsubs }
}

/**
 * Test-only escape hatch: `setState` is protected on UploaderOrchestrator;
 * these tests seed state directly to set up scenarios.
 */
export function setOrchState(
    orch: UploaderOrchestrator,
    partial: Partial<OrchestratorState>,
): void {
    ;(
        orch as unknown as {
            setState: (partial: Partial<OrchestratorState>) => void
        }
    ).setState(partial)
}

/** Create a minimal UploadFile for testing. */
export function createUploadFile(
    overrides: Partial<UploadFile> & { name: string },
): UploadFile {
    const file = new File(['content'], overrides.name, {
        type: overrides.type ?? 'text/plain',
    })
    return Object.assign(file, {
        id: overrides.id ?? overrides.name,
        source: overrides.source ?? FileSource.LOCAL,
        status: overrides.status ?? UploadStatus.READY,
        metadata: overrides.metadata ?? {},
        url: overrides.url ?? `blob:http://localhost/${overrides.name}`,
    }) as UploadFile
}
