import { useEffect, useRef, useState } from 'react'
import { UpupUploader, UpupThemeProvider as Provider, type UpupUploaderRef } from '@upup/react'
import type { UpupThemeConfig } from '@upup/shared'

const PROVIDER_PRIMARY = '#8b5cf6'
const INSTANCE_PRIMARY = '#ef4444'

const instanceTheme: UpupThemeConfig = {
  tokens: {
    color: {
      primary: INSTANCE_PRIMARY,
    },
  },
}

export default function ThemeProvider() {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const uploaderRef1 = useRef<UpupUploaderRef>(null)
  const uploaderRef2 = useRef<UpupUploaderRef>(null)
  const [firstColor, setFirstColor] = useState<string>('')
  const [secondColor, setSecondColor] = useState<string>('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstRef.current) {
        const el = firstRef.current.querySelector('[data-upup-slot], [data-state], [data-theme]') || firstRef.current
        const style = getComputedStyle(el)
        setFirstColor(style.getPropertyValue('--upup-color-primary').trim())
      }
      if (secondRef.current) {
        const el = secondRef.current.querySelector('[data-upup-slot], [data-state], [data-theme]') || secondRef.current
        const style = getComputedStyle(el)
        setSecondColor(style.getPropertyValue('--upup-color-primary').trim())
      }
      setChecked(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const colorsAreDifferent = checked && firstColor !== secondColor && firstColor !== '' && secondColor !== ''

  return (
    <div data-testid="provider-root">
      <h1 data-testid="provider-title">Theme Provider</h1>

      <div data-testid="provider-config">
        <p data-testid="provider-config-primary">
          Provider primary: {PROVIDER_PRIMARY}
        </p>
        <p data-testid="provider-config-instance-primary">
          Instance override primary: {INSTANCE_PRIMARY}
        </p>
      </div>

      <Provider
        mode="dark"
        tokens={{ color: { primary: PROVIDER_PRIMARY } }}
      >
        <div data-testid="provider-first-wrapper" ref={firstRef}>
          <h2 data-testid="provider-first-title">
            First Uploader (inherits provider theme)
          </h2>
          <UpupUploader ref={uploaderRef1} />
        </div>

        <div data-testid="provider-second-wrapper" ref={secondRef}>
          <h2 data-testid="provider-second-title">
            Second Uploader (instance override)
          </h2>
          <UpupUploader ref={uploaderRef2} theme={instanceTheme} />
        </div>
      </Provider>

      <div data-testid="provider-results">
        <h2 data-testid="provider-results-title">Theme Detection Results</h2>
        <p data-testid="provider-results-status">
          Detection: {checked ? 'complete' : 'pending'}
        </p>
        <p data-testid="provider-results-first-color">
          First --upup-color-primary: {firstColor || '(not found)'}
        </p>
        <p data-testid="provider-results-second-color">
          Second --upup-color-primary: {secondColor || '(not found)'}
        </p>
        <p data-testid="provider-results-different">
          Colors are different: {colorsAreDifferent ? 'YES' : 'NO'}
        </p>
      </div>
    </div>
  )
}
