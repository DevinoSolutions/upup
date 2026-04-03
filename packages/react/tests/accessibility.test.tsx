import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UpupUploader } from '../src/upup-uploader'
import ProgressBar from '../src/components/progress-bar'
import DropZone from '../src/components/drop-zone'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

expect.extend(toHaveNoViolations)

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock useMainBox
vi.mock('../src/hooks/use-main-box', () => ({
  default: () => ({
    isDragging: false,
    absoluteIsDragging: false,
    absoluteHasBorder: true,
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handlePaste: vi.fn(),
  }),
}))

describe('Accessibility -- axe audit', () => {
  it('ProgressBar has no axe violations', async () => {
    const { container } = render(<ProgressBar progress={50} showValue />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('DropZone has no axe violations', async () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone>
          <p>Drop files here</p>
        </DropZone>
      </UploaderContext.Provider>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
