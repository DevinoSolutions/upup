import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// ProgressBar reads focused uploader contexts; mock the slices needed to
// render it standalone.
vi.mock('../src/context/UploaderContext', () => ({
  useUploaderTheme: () => ({
    isDark: false,
    slotOverrides: {},
    slots: undefined,
  }),
  useUploaderI18n: () => ({
    translations: { uploadProgress: 'Upload progress' },
  }),
  useUploaderUploadControls: () => ({
    upload: { uploadStatus: 'PENDING' },
  }),
  useUploaderOptions: () => ({
    icons: { LoaderIcon: () => null },
  }),
  UploadStatus: { ONGOING: 'ONGOING' },
}))

// Import after mock is set up
import ProgressBar from '../src/components/shared/ProgressBar'

describe('ProgressBar', () => {
  it('renders with role=progressbar and ARIA value attributes', () => {
    const { container } = render(<ProgressBar progress={50} />)
    const bar =
      container.querySelector('[data-upup-slot="progress-bar"]') ??
      container.querySelector('[role="progressbar"]')
    expect(bar?.getAttribute('role')).toBe('progressbar')
    expect(bar?.getAttribute('aria-valuenow')).toBe('50')
    expect(bar?.getAttribute('aria-valuemin')).toBe('0')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
    expect(bar?.getAttribute('aria-label')).toBeTruthy()
  })

  it('does not render when progress is 0', () => {
    const { container } = render(<ProgressBar progress={0} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).toBeNull()
  })

  it('has aria-valuenow=100 when progress is 100', () => {
    const { container } = render(<ProgressBar progress={100} />)
    const bar =
      container.querySelector('[data-upup-slot="progress-bar"]') ??
      container.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-valuenow')).toBe('100')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
  })

  it('has accessible label from translations', () => {
    const { container } = render(<ProgressBar progress={75} />)
    const bar = container.querySelector('[data-upup-slot="progress-bar"]')
    expect(bar?.getAttribute('aria-label')).toBe('Upload progress')
  })
})
