import { useState, useRef, useEffect } from 'react'
import { UpupUploader } from '@upup/react'
import { lightPreset, darkPreset, type UpupThemeTokens } from '@upup/shared'

const customTokens: Partial<UpupThemeTokens> = {
  color: {
    surface: '#faf5ff',
    surfaceAlt: '#ede9fe',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    text: '#1e1b4b',
    textMuted: '#6b7280',
    border: '#c4b5fd',
    borderActive: '#7c3aed',
    danger: '#dc2626',
    success: '#16a34a',
    dragBg: '#e9d5ff',
    overlay: 'rgba(124, 58, 237, 0.5)',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    full: '9999px',
  },
}

type PresetKey = 'light' | 'dark' | 'custom'

export default function ThemeSystemPage() {
  const [activePreset, setActivePreset] = useState<PresetKey>('light')
  const [cssVars, setCssVars] = useState<Record<string, string>>({})
  const lightRef = useRef<HTMLDivElement>(null)
  const darkRef = useRef<HTMLDivElement>(null)
  const customRef = useRef<HTMLDivElement>(null)

  // Read computed CSS variables from the custom uploader
  useEffect(() => {
    const el = customRef.current
    if (!el) return
    const style = getComputedStyle(el)
    const vars: Record<string, string> = {}
    const varNames = [
      '--upup-color-primary',
      '--upup-color-background',
      '--upup-color-foreground',
      '--upup-radius-md',
      '--upup-radius-lg',
    ]
    for (const name of varNames) {
      vars[name] = style.getPropertyValue(name).trim() || '(not set)'
    }
    setCssVars(vars)
  }, [activePreset])

  const getThemeConfig = (preset: PresetKey) => {
    switch (preset) {
      case 'light':
        return { mode: 'light' as const }
      case 'dark':
        return { mode: 'dark' as const }
      case 'custom':
        return { tokens: customTokens }
    }
  }

  return (
    <div data-testid="theme-page">
      <h1 data-testid="theme-title">Theme System</h1>

      {/* Preset toggle */}
      <div data-testid="theme-controls" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          data-testid="theme-btn-light"
          onClick={() => setActivePreset('light')}
          style={{ fontWeight: activePreset === 'light' ? 'bold' : 'normal' }}
        >
          Light Preset
        </button>
        <button
          data-testid="theme-btn-dark"
          onClick={() => setActivePreset('dark')}
          style={{ fontWeight: activePreset === 'dark' ? 'bold' : 'normal' }}
        >
          Dark Preset
        </button>
        <button
          data-testid="theme-btn-custom"
          onClick={() => setActivePreset('custom')}
          style={{ fontWeight: activePreset === 'custom' ? 'bold' : 'normal' }}
        >
          Custom (Purple)
        </button>
      </div>

      <div data-testid="theme-active-preset" style={{ marginBottom: 16 }}>
        Active Preset: {activePreset}
      </div>

      {/* Three uploaders side by side */}
      <div
        data-testid="theme-uploaders-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}
      >
        {/* Light preset */}
        <div data-testid="theme-uploader-light" ref={lightRef}>
          <h3 data-testid="theme-uploader-light-label">Light</h3>
          <UpupUploader
            sources={['local']}
            theme={{ mode: 'light' }}
            uploadEndpoint="/api/upload"
          />
        </div>

        {/* Dark preset */}
        <div data-testid="theme-uploader-dark" ref={darkRef}>
          <h3 data-testid="theme-uploader-dark-label">Dark</h3>
          <UpupUploader
            sources={['local']}
            theme={{ mode: 'dark' }}
            uploadEndpoint="/api/upload"
          />
        </div>

        {/* Custom tokens + slot overrides */}
        <div data-testid="theme-uploader-custom" ref={customRef}>
          <h3 data-testid="theme-uploader-custom-label">Custom (Purple)</h3>
          <UpupUploader
            sources={['local']}
            theme={{
              tokens: customTokens,
              slots: {
                root: { className: 'custom-root-slot' },
                dropzone: { className: 'custom-dropzone-slot' },
              },
            }}
            uploadEndpoint="/api/upload"
          />
        </div>
      </div>

      {/* CSS variable values */}
      <div data-testid="theme-css-vars" style={{ marginBottom: 16 }}>
        <h3 data-testid="theme-css-vars-title">CSS Variables (from custom uploader)</h3>
        <table data-testid="theme-css-vars-table" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 12px', borderBottom: '1px solid #ddd' }}>Variable</th>
              <th style={{ textAlign: 'left', padding: '4px 12px', borderBottom: '1px solid #ddd' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cssVars).map(([name, value]) => (
              <tr key={name} data-testid={`theme-css-var-${name}`}>
                <td style={{ padding: '4px 12px', fontFamily: 'monospace' }}>{name}</td>
                <td style={{ padding: '4px 12px', fontFamily: 'monospace' }}>
                  <span data-testid={`theme-css-var-value-${name}`}>{value}</span>
                  {value.startsWith('#') && (
                    <span
                      data-testid={`theme-css-var-swatch-${name}`}
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        marginLeft: 8,
                        background: value,
                        border: '1px solid #999',
                        borderRadius: 2,
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preset token dump */}
      <div data-testid="theme-presets-section">
        <h3 data-testid="theme-presets-title">Preset Token Comparison</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div data-testid="theme-preset-light-dump">
            <h4>lightPreset.color.primary</h4>
            <code data-testid="theme-preset-light-primary">{lightPreset.color.primary}</code>
          </div>
          <div data-testid="theme-preset-dark-dump">
            <h4>darkPreset.color.primary</h4>
            <code data-testid="theme-preset-dark-primary">{darkPreset.color.primary}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
