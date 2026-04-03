import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DropZone from '../src/components/drop-zone'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock useMainBox hook
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

describe('DropZone', () => {
  it('renders with role="region"', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone />
      </UploaderContext.Provider>,
    )
    expect(container.querySelector('[role="region"]')).toBeTruthy()
  })

  it('renders children', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone>
          <span data-testid="child">Hello</span>
        </DropZone>
      </UploaderContext.Provider>,
    )
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone className="my-custom-class" />
      </UploaderContext.Provider>,
    )
    expect(
      container.querySelector('.my-custom-class'),
    ).toBeTruthy()
  })

  it('has aria-label for drop target', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone />
      </UploaderContext.Provider>,
    )
    const zone = container.querySelector('[role="region"]')
    expect(zone?.getAttribute('aria-label')).toBeTruthy()
  })

  it('has aria-dropeffect attribute', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <DropZone />
      </UploaderContext.Provider>,
    )
    const zone = container.querySelector('[role="region"]')
    expect(zone?.getAttribute('aria-dropeffect')).toBe('none')
  })
})
