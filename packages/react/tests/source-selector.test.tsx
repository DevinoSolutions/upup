import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SourceSelector from '../src/components/source-selector'
import { UploaderContext } from '../src/context/uploader-context'
import { mockUploaderContext } from './helpers/mock-context'

// Mock react-icons
vi.mock('react-icons/tb', () => ({
  TbUpload: () => <span data-testid="upload-icon">Upload</span>,
}))

// Mock useAdapterSelector
vi.mock('../src/hooks/use-adapter-selector', () => ({
  default: () => ({
    chosenAdapters: [
      { id: 'local', Icon: () => <span>Local</span> },
      { id: 'camera', Icon: () => <span>Camera</span> },
    ],
    handleAdapterClick: vi.fn(),
    handleInputFileChange: vi.fn(),
    localInputRef: { current: null },
  }),
}))

describe('SourceSelector', () => {
  it('renders tablist with aria-label', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const tablist = screen.getByRole('tablist')
    expect(tablist.getAttribute('aria-label')).toBe('Upload sources')
  })

  it('renders a tab for each adapter', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBeGreaterThan(0)
  })

  it('marks active source tab as aria-selected=true', () => {
    const ctx = mockUploaderContext({ activeSource: 'camera' as any })
    render(
      <UploaderContext.Provider value={ctx}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const tabs = screen.getAllByRole('tab')
    const selectedTab = tabs.find(
      t => t.getAttribute('aria-selected') === 'true',
    )
    expect(selectedTab).toBeTruthy()
  })

  it('has a hidden file input with aria-label', () => {
    render(
      <UploaderContext.Provider value={mockUploaderContext()}>
        <SourceSelector />
      </UploaderContext.Provider>,
    )
    const input = screen.getByTestId('upup-file-input')
    expect(input.getAttribute('aria-label')).toBe('Choose files to upload')
  })
})
