// src/cloudDrives.test.ts
import { describe, it, expect } from 'vitest'
import { buildCloudDrives } from './cloudDrives'

describe('buildCloudDrives', () => {
  it('maps Google env vars into the googleDrive config', () => {
    const cd = buildCloudDrives({
      VITE_GOOGLE_CLIENT_ID: 'gid',
      VITE_GOOGLE_API_KEY: 'gkey',
      VITE_GOOGLE_APP_ID: 'gapp',
    })
    expect(cd.googleDrive).toEqual({ clientId: 'gid', apiKey: 'gkey', appId: 'gapp' })
  })

  it('defaults every provider to empty strings when env is bare (so the auth screen still renders)', () => {
    const cd = buildCloudDrives({})
    expect(cd.googleDrive).toEqual({ clientId: '', apiKey: '', appId: '' })
    expect(cd.oneDrive?.clientId).toBe('')
    expect(cd.dropbox?.clientId).toBe('')
    expect(cd.box?.clientId).toBe('')
  })

  it('falls back redirectUri to the supplied origin when the env var is absent', () => {
    const cd = buildCloudDrives({ VITE_DROPBOX_CLIENT_ID: 'dbx' }, 'http://localhost:53050')
    expect(cd.dropbox).toEqual({ clientId: 'dbx', redirectUri: 'http://localhost:53050' })
  })

  it('prefers an explicit redirectUri env var over the origin fallback', () => {
    const cd = buildCloudDrives(
      { VITE_ONEDRIVE_REDIRECT_URI: 'https://app.test/callback' },
      'http://localhost:53050',
    )
    expect(cd.oneDrive?.redirectUri).toBe('https://app.test/callback')
  })

  it('trims surrounding whitespace from values', () => {
    const cd = buildCloudDrives({ VITE_BOX_CLIENT_ID: '  boxid  ' })
    expect(cd.box?.clientId).toBe('boxid')
  })
})
