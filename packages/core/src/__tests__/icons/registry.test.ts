import { describe, it, expect } from 'vitest'
import { ICONS, type IconName } from '../../icons/registry'

const EXPECTED: IconName[] = [
  // brand
  'my-device', 'box', 'dropbox', 'google-drive', 'one-drive',
  'link', 'camera', 'audio', 'screen-cast',
  // stroke
  'upload', 'loader', 'x', 'layout-grid', 'layout-list',
  'folder', 'search', 'user', 'file',
  // filled
  'player-play', 'player-pause',
]

describe('ICONS registry', () => {
  it('contains exactly the reconciled icon set', () => {
    expect(Object.keys(ICONS).sort()).toEqual([...EXPECTED].sort())
  })

  it('every entry has a non-empty viewBox and non-empty inner', () => {
    for (const [name, def] of Object.entries(ICONS)) {
      expect(def.viewBox, `${name}.viewBox`).toMatch(/^\d/)
      expect(def.inner.trim().length, `${name}.inner`).toBeGreaterThan(0)
      expect(def.defaultSize, `${name}.defaultSize`).toBeGreaterThan(0)
    }
  })

  it('does not contain culled dead icons', () => {
    for (const dead of ['facebook', 'instagram', 'unsplash', 'close']) {
      expect(ICONS).not.toHaveProperty(dead)
    }
  })

  it('brand icons use the 32 viewBox, stroke icons the 24 viewBox', () => {
    expect(ICONS['google-drive'].viewBox).toBe('0 0 32 32')
    expect(ICONS['x'].viewBox).toBe('0 0 24 24')
    expect(ICONS['x'].attrs?.stroke).toBe('currentColor')
    expect(ICONS['player-play'].attrs?.fill).toBe('currentColor')
  })
})
