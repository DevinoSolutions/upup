import { describe, it, expect } from 'vitest'

// Test the cloudDrives → driveConfigs mapping logic
function mapCloudDrives(cloudDrives: any) {
  return {
    googleDrive: cloudDrives.googleDrive ? {
      google_client_id: cloudDrives.googleDrive.clientId,
      google_api_key: cloudDrives.googleDrive.apiKey,
      google_app_id: cloudDrives.googleDrive.appId,
    } : undefined,
    oneDrive: cloudDrives.oneDrive ? {
      onedrive_client_id: cloudDrives.oneDrive.clientId,
      redirectUri: cloudDrives.oneDrive.redirectUri,
    } : undefined,
    dropbox: cloudDrives.dropbox ? {
      dropbox_client_id: cloudDrives.dropbox.clientId,
      dropbox_redirect_uri: cloudDrives.dropbox.redirectUri,
    } : undefined,
  }
}

describe('cloudDrives → driveConfigs mapping', () => {
  it('maps v2 cloudDrives to v1 driveConfigs format', () => {
    const cloudDrives = {
      googleDrive: { clientId: 'gid', apiKey: 'gkey', appId: 'gapp' },
      oneDrive: { clientId: 'oid' },
      dropbox: { clientId: 'did' },
    }
    const result = mapCloudDrives(cloudDrives)
    expect(result.googleDrive).toEqual({
      google_client_id: 'gid',
      google_api_key: 'gkey',
      google_app_id: 'gapp',
    })
    expect(result.oneDrive).toEqual({
      onedrive_client_id: 'oid',
      redirectUri: undefined,
    })
    expect(result.dropbox).toEqual({
      dropbox_client_id: 'did',
      dropbox_redirect_uri: undefined,
    })
  })

  it('handles partial cloudDrives (only google)', () => {
    const cloudDrives = {
      googleDrive: { clientId: 'gid', apiKey: 'gkey', appId: 'gapp' },
    }
    const result = mapCloudDrives(cloudDrives)
    expect(result.googleDrive).toBeDefined()
    expect(result.oneDrive).toBeUndefined()
    expect(result.dropbox).toBeUndefined()
  })

  it('passes redirectUri when provided', () => {
    const cloudDrives = {
      oneDrive: { clientId: 'oid', redirectUri: 'https://example.com/cb' },
      dropbox: { clientId: 'did', redirectUri: 'https://example.com/dropbox/cb' },
    }
    const result = mapCloudDrives(cloudDrives)
    expect(result.oneDrive?.redirectUri).toBe('https://example.com/cb')
    expect(result.dropbox?.dropbox_redirect_uri).toBe('https://example.com/dropbox/cb')
  })
})
