import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FileList from '../src/components/file-list'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock react-icons
vi.mock('react-icons/tb', () => ({
  TbPlayerPauseFilled: () => <span>Pause</span>,
  TbPlayerPlayFilled: () => <span>Play</span>,
}))

describe('FileList', () => {
  it('renders nothing in mini mode', () => {
    const { container } = render(
      <UploaderContext.Provider value={mockUploaderContext({ mini: true })}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders file names', () => {
    const ctx = mockUploaderContext({
      files: [
        { id: '1', name: 'photo.jpg', size: 1024 },
        { id: '2', name: 'doc.pdf', size: 2048 },
      ],
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('photo.jpg')).toBeTruthy()
    expect(screen.getByText('doc.pdf')).toBeTruthy()
  })

  it('shows file count in header', () => {
    const ctx = mockUploaderContext({
      files: [
        { id: '1', name: 'a.txt', size: 100 },
        { id: '2', name: 'b.txt', size: 200 },
      ],
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(screen.getByText('2 files selected')).toBeTruthy()
  })

  it('calls upload() on Upload button click', () => {
    const upload = vi.fn().mockResolvedValue([])
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
      upload,
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    const uploadBtn = screen.getByText('Upload 1 file')
    fireEvent.click(uploadBtn)
    expect(upload).toHaveBeenCalled()
  })

  it('has aria-live="polite" on file list container', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
    })
    const { container } = render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
  })

  it('renders file items with tabIndex for keyboard navigation', () => {
    const ctx = mockUploaderContext({
      files: [{ id: '1', name: 'a.txt', size: 100 }],
    })
    render(
      <UploaderContext.Provider value={ctx}>
        <FileList />
      </UploaderContext.Provider>,
    )
    const item = screen.getByRole('listitem')
    expect(item.getAttribute('tabindex')).toBe('0')
  })
})
