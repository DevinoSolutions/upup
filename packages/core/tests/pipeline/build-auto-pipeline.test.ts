import { describe, it, expect } from 'vitest'
import { buildAutoPipeline } from '../../src/pipeline/build-auto-pipeline'
import type { CoreOptions } from '../../src/core'

describe('buildAutoPipeline', () => {
  it('returns [] when no processing flags set', async () => {
    expect(await buildAutoPipeline({} as CoreOptions)).toEqual([])
  })

  it('includes only the heic step when only heicConversion is set', async () => {
    const steps = await buildAutoPipeline({ heicConversion: true } as CoreOptions)
    expect(steps.map(s => s.name)).toEqual(['heic'])
  })

  it('assembles steps in fixed order heic→exif→compress→thumbnail→hash', async () => {
    const steps = await buildAutoPipeline({
      heicConversion: true,
      stripExifData: true,
      imageCompression: true,
      thumbnailGenerator: true,
      checksumVerification: true,
    } as CoreOptions)
    expect(steps.map(s => s.name)).toEqual(['heic', 'exif', 'compress', 'thumbnail', 'hash'])
  })
})
