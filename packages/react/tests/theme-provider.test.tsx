import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UpupThemeProvider } from '../src/theme/UpupThemeProvider'

describe('UpupThemeProvider', () => {
  it('renders children', () => {
    const { getByTestId } = render(
      <UpupThemeProvider>
        <div data-testid="child" />
      </UpupThemeProvider>
    )
    expect(getByTestId('child')).toBeTruthy()
  })

  it('sets data-theme="light" by default', () => {
    const { container } = render(
      <UpupThemeProvider>
        <div />
      </UpupThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-theme')).toBe('light')
  })

  it('sets data-theme="dark" when mode=dark', () => {
    const { container } = render(
      <UpupThemeProvider theme={{ mode: 'dark' }}>
        <div />
      </UpupThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-theme')).toBe('dark')
  })

  it('injects CSS variables on the wrapper element', () => {
    const { container } = render(
      <UpupThemeProvider>
        <div />
      </UpupThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--upup-color-surface')).toBeTruthy()
    expect(wrapper.style.getPropertyValue('--upup-color-primary')).toBeTruthy()
  })

  it('applies token overrides', () => {
    const { container } = render(
      <UpupThemeProvider theme={{ tokens: { color: { primary: '#ff0000' } } }}>
        <div />
      </UpupThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--upup-color-primary')).toBe('#ff0000')
  })

  it('handles system mode without throwing', () => {
    const { container } = render(
      <UpupThemeProvider theme={{ mode: 'system' }}>
        <div />
      </UpupThemeProvider>
    )
    const wrapper = container.firstChild as HTMLElement
    const theme = wrapper.getAttribute('data-theme')
    // system resolves to either 'light' or 'dark', never 'system'
    expect(theme === 'light' || theme === 'dark').toBe(true)
  })
})
