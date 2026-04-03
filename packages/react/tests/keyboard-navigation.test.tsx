import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SourceSelector from '../src/components/source-selector'
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
  TbUpload: () => <span>Upload</span>,
  TbPlayerPauseFilled: () => <span>Pause</span>,
  TbPlayerPlayFilled: () => <span>Play</span>,
}))

const mockHandleAdapterClick = vi.fn()

// Mock useAdapterSelector
vi.mock('../src/hooks/use-adapter-selector', () => ({
  default: () => ({
    chosenAdapters: [
      { id: 'local', Icon: () => <span>Local</span> },
      { id: 'camera', Icon: () => <span>Camera</span> },
      { id: 'url', Icon: () => <span>URL</span> },
    ],
    handleAdapterClick: mockHandleAdapterClick,
    handleInputFileChange: vi.fn(),
    localInputRef: { current: null },
  }),
}))

describe('Keyboard Navigation', () => {
  describe('SourceSelector', () => {
    it('supports ArrowRight/ArrowLeft between tabs', async () => {
      const user = userEvent.setup()
      render(
        <UploaderContext.Provider value={mockUploaderContext()}>
          <SourceSelector />
        </UploaderContext.Provider>,
      )

      const tabs = screen.getAllByRole('tab')
      tabs[0].focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tabs[1])
      await user.keyboard('{ArrowLeft}')
      expect(document.activeElement).toBe(tabs[0])
    })

    it('wraps focus from last tab to first on ArrowRight', async () => {
      const user = userEvent.setup()
      render(
        <UploaderContext.Provider value={mockUploaderContext()}>
          <SourceSelector />
        </UploaderContext.Provider>,
      )

      const tabs = screen.getAllByRole('tab')
      tabs[tabs.length - 1].focus()
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tabs[0])
    })
  })

  describe('FileList', () => {
    it('supports ArrowDown/ArrowUp between file items', async () => {
      const user = userEvent.setup()
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

      const items = screen.getAllByRole('listitem')
      items[0].focus()
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(items[1])
    })

    it('removes file on Delete key', async () => {
      const user = userEvent.setup()
      const removeFile = vi.fn()
      const ctx = mockUploaderContext({
        files: [{ id: '1', name: 'a.txt', size: 100 }],
        removeFile,
      })
      render(
        <UploaderContext.Provider value={ctx}>
          <FileList />
        </UploaderContext.Provider>,
      )

      const item = screen.getByRole('listitem')
      item.focus()
      await user.keyboard('{Delete}')
      expect(removeFile).toHaveBeenCalledWith('1')
    })
  })
})
