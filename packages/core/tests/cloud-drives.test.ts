import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('CoreOptions.cloudDrives', () => {
  it('should accept a cloudDrives nested object', () => {
    const core = new UpupCore({
      cloudDrives: {
        googleDrive: {
          clientId: 'gd-client-id',
          apiKey: 'gd-api-key',
          appId: 'gd-app-id',
        },
        oneDrive: {
          clientId: 'od-client-id',
          authority: 'https://login.microsoftonline.com/common',
        },
        dropbox: {
          appKey: 'db-app-key',
        },
      },
    })
    expect(core.options.cloudDrives?.googleDrive?.clientId).toBe('gd-client-id')
    expect(core.options.cloudDrives?.oneDrive?.clientId).toBe('od-client-id')
    expect(core.options.cloudDrives?.dropbox?.appKey).toBe('db-app-key')
    core.destroy()
  })

  it('should merge cloudDrives with flat config options (flat takes precedence)', () => {
    const core = new UpupCore({
      cloudDrives: {
        googleDrive: {
          clientId: 'nested-id',
          apiKey: 'nested-key',
          appId: 'nested-app',
        },
      },
      googleDriveConfigs: { clientId: 'flat-id' },
    })
    // Flat option takes precedence
    expect(core.options.googleDriveConfigs).toEqual({ clientId: 'flat-id' })
    core.destroy()
  })
})
