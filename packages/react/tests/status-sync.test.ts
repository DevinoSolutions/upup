import { describe, it, expect } from 'vitest'
import { UpupCore } from '@upup/core'
import { UploadStatus as CoreUploadStatus } from '@upup/shared'

// v1 React status enum (duplicated here to test mapping without importing from context)
enum V1UploadStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  PAUSED = 'PAUSED',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

// The mapping used in useRootProvider's useEffect
const statusMap: Record<string, CoreUploadStatus> = {
  [V1UploadStatus.PENDING]: CoreUploadStatus.IDLE,
  [V1UploadStatus.ONGOING]: CoreUploadStatus.UPLOADING,
  [V1UploadStatus.PAUSED]: CoreUploadStatus.PAUSED,
  [V1UploadStatus.SUCCESSFUL]: CoreUploadStatus.SUCCESSFUL,
  [V1UploadStatus.FAILED]: CoreUploadStatus.FAILED,
}

describe('v1 → core status mapping', () => {
  it('maps PENDING to IDLE', () => {
    expect(statusMap[V1UploadStatus.PENDING]).toBe(CoreUploadStatus.IDLE)
  })

  it('maps ONGOING to UPLOADING', () => {
    expect(statusMap[V1UploadStatus.ONGOING]).toBe(CoreUploadStatus.UPLOADING)
  })

  it('maps PAUSED to PAUSED', () => {
    expect(statusMap[V1UploadStatus.PAUSED]).toBe(CoreUploadStatus.PAUSED)
  })

  it('maps SUCCESSFUL to SUCCESSFUL', () => {
    expect(statusMap[V1UploadStatus.SUCCESSFUL]).toBe(CoreUploadStatus.SUCCESSFUL)
  })

  it('maps FAILED to FAILED', () => {
    expect(statusMap[V1UploadStatus.FAILED]).toBe(CoreUploadStatus.FAILED)
  })

  it('covers all v1 statuses', () => {
    const v1Values = Object.values(V1UploadStatus)
    for (const v1Status of v1Values) {
      expect(statusMap[v1Status]).toBeDefined()
    }
  })
})

describe('UpupCore.syncStatusFromExternal', () => {
  it('syncs IDLE status', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    core.syncStatusFromExternal(CoreUploadStatus.IDLE)
    expect(core.status).toBe(CoreUploadStatus.IDLE)
  })

  it('syncs UPLOADING status', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    core.syncStatusFromExternal(CoreUploadStatus.UPLOADING)
    expect(core.status).toBe(CoreUploadStatus.UPLOADING)
  })

  it('syncs PAUSED status', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    core.syncStatusFromExternal(CoreUploadStatus.PAUSED)
    expect(core.status).toBe(CoreUploadStatus.PAUSED)
  })

  it('syncs SUCCESSFUL status', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    core.syncStatusFromExternal(CoreUploadStatus.SUCCESSFUL)
    expect(core.status).toBe(CoreUploadStatus.SUCCESSFUL)
  })

  it('syncs FAILED status', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    core.syncStatusFromExternal(CoreUploadStatus.FAILED)
    expect(core.status).toBe(CoreUploadStatus.FAILED)
  })

  it('status transitions correctly across lifecycle', () => {
    const core = new UpupCore({ uploadEndpoint: '/test' })
    expect(core.status).toBe(CoreUploadStatus.IDLE)

    core.syncStatusFromExternal(CoreUploadStatus.UPLOADING)
    expect(core.status).toBe(CoreUploadStatus.UPLOADING)

    core.syncStatusFromExternal(CoreUploadStatus.PAUSED)
    expect(core.status).toBe(CoreUploadStatus.PAUSED)

    core.syncStatusFromExternal(CoreUploadStatus.UPLOADING)
    expect(core.status).toBe(CoreUploadStatus.UPLOADING)

    core.syncStatusFromExternal(CoreUploadStatus.SUCCESSFUL)
    expect(core.status).toBe(CoreUploadStatus.SUCCESSFUL)

    // Reset back to idle
    core.syncStatusFromExternal(CoreUploadStatus.IDLE)
    expect(core.status).toBe(CoreUploadStatus.IDLE)
  })
})
