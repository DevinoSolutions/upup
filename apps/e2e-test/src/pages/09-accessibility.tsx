import { useEffect, useRef, useState } from 'react'
import { UpupUploader, type UpupUploaderRef } from '@upup/react'

type A11yCheck = {
  label: string
  selector: string
  attribute?: string
  pass: boolean | null
}

const initialChecks: A11yCheck[] = [
  { label: 'role="region" on dropzone', selector: '[role="region"]', pass: null },
  { label: 'aria-live="polite" on file list', selector: '[aria-live="polite"]', pass: null },
  { label: 'aria-dropeffect on dropzone', selector: '[aria-dropeffect]', pass: null },
  { label: 'role="progressbar" with aria-valuenow (only when files present)', selector: '[role="progressbar"][aria-valuenow]', pass: null },
  { label: 'data-upup-slot attributes present', selector: '[data-upup-slot]', pass: null },
  { label: 'data-state attribute on root', selector: '[data-state]', pass: null },
  { label: 'data-theme attribute on root', selector: '[data-theme]', pass: null },
  { label: 'lang attribute on root', selector: '[lang]', pass: null },
  { label: 'dir attribute on root', selector: '[dir]', pass: null },
]

export default function Accessibility() {
  const containerRef = useRef<HTMLDivElement>(null)
  const uploaderRef = useRef<UpupUploaderRef>(null)
  const [checks, setChecks] = useState<A11yCheck[]>(initialChecks)
  const [ran, setRan] = useState(false)

  useEffect(() => {
    // Run checks after a short delay to let the uploader render fully
    const timer = setTimeout(() => {
      if (!containerRef.current) return

      const root = containerRef.current
      const results = initialChecks.map(check => ({
        ...check,
        pass: root.querySelector(check.selector) !== null,
      }))

      setChecks(results)
      setRan(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div data-testid="a11y-root">
      <h1 data-testid="a11y-title">Accessibility</h1>

      <div data-testid="a11y-uploader-container" ref={containerRef}>
        <UpupUploader ref={uploaderRef} uploadEndpoint="/api/upload" />
      </div>

      <div data-testid="a11y-checklist">
        <h2 data-testid="a11y-checklist-title">A11y Checklist</h2>
        <p data-testid="a11y-checklist-status">
          Status: {ran ? 'complete' : 'pending'}
        </p>
        <ul data-testid="a11y-checklist-list">
          {checks.map((check, i) => (
            <li
              key={check.label}
              data-testid={`a11y-check-${i}`}
            >
              <span data-testid={`a11y-check-${i}-result`}>
                {check.pass === null ? 'PENDING' : check.pass ? 'PASS' : 'FAIL'}
              </span>
              {' - '}
              <span data-testid={`a11y-check-${i}-label`}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
        <p data-testid="a11y-summary">
          Passed: {checks.filter(c => c.pass === true).length} / {checks.length}
        </p>
      </div>
    </div>
  )
}
