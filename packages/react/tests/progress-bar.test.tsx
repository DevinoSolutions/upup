import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBar from '../src/components/progress-bar'

describe('ProgressBar', () => {
  it('renders nothing when progress is 0', () => {
    const { container } = render(<ProgressBar progress={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders progressbar role with correct aria attributes', () => {
    render(<ProgressBar progress={42} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('42')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-label')).toBe('Upload progress')
  })

  it('shows percentage text when showValue is true', () => {
    render(<ProgressBar progress={75} showValue />)
    expect(screen.getByText('75%')).toBeTruthy()
  })

  it('does not show percentage text when showValue is false', () => {
    const { container } = render(<ProgressBar progress={75} />)
    expect(container.textContent).not.toContain('75%')
  })

  it('sets inner bar width to progress percentage', () => {
    const { container } = render(<ProgressBar progress={60} />)
    const inner = container.querySelector('[data-upup-slot="progressBar.fill"]') as HTMLElement
    expect(inner?.style.width).toBe('60%')
  })

  it('forwards ref to outer container', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(<ProgressBar progress={50} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})
