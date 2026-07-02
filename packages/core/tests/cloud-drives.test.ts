import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'

describe('CoreOptions.cloudDrives', () => {
  it('accepts and stores the camelCase nested config (all four drives)', () => {
    const core = new UpupCore({
      cloudDrives: {
        googleDrive: {
          clientId: 'gd-client-id',
          apiKey: 'gd-api-key',
          appId: 'gd-app-id',
        },
        oneDrive: {
          clientId: 'od-client-id',
          redirectUri: 'https://app.example/od_redirect',
        },
        dropbox: {
          clientId: 'db-client-id',
        },
        box: {
          clientId: 'box-client-id',
          redirectUri: 'https://app.example/box_redirect',
        },
      },
    })
    expect(core.options.cloudDrives?.googleDrive?.clientId).toBe('gd-client-id')
    expect(core.options.cloudDrives?.oneDrive?.redirectUri).toBe('https://app.example/od_redirect')
    expect(core.options.cloudDrives?.dropbox?.clientId).toBe('db-client-id')
    expect(core.options.cloudDrives?.box?.clientId).toBe('box-client-id')
    core.destroy()
  })
})
