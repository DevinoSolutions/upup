import { describe, it, expect, beforeEach, vi } from 'vitest'
import { serverModeDriveUploader } from '../src/templates/server-mode-drive-uploader'

beforeEach(() => { vi.restoreAllMocks() })

describe('serverModeDriveUploader', () => {
  it('returns a template result and lists files from serverUrl', async () => {
    const invalidate = vi.fn()
    const ctx = {
      serverUrl: 'http://localhost:53060',
      theme: { getSnapshot: () => ({ isDark: false, slotOverrides: {} }) },
      translations: { authenticatePrompt: 'Sign in to {provider}', signInWith: 'Sign in with {provider}' },
      invalidate,
    } as any
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ files: [{ id: '1', name: 'a.txt', isFolder: false, size: 3 }] }), { status: 200 })))
    const tpl = serverModeDriveUploader(ctx, { provider: 'google-drive', onBack: () => {} })
    expect(tpl).toBeTruthy()
    await Promise.resolve(); await Promise.resolve()
    expect(invalidate).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
