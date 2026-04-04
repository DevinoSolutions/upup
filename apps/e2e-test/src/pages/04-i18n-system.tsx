import { useState, useCallback, useRef } from 'react'
import { UpupUploader } from '@upup/react'
import {
  enUS,
  frFR,
  createTranslator,
  type Translator,
  type LocaleBundle,
  type UpupLocaleCode,
} from '@upup/shared'

export default function I18nSystemPage() {
  const [locale, setLocale] = useState<UpupLocaleCode>('en-US')
  const [missingKeys, setMissingKeys] = useState<string[]>([])
  const [useByo, setUseByo] = useState(false)
  const [useOverride, setUseOverride] = useState(false)
  const missingKeyLogRef = useRef<HTMLDivElement>(null)

  const handleMissingKey = useCallback((key: string) => {
    setMissingKeys(prev => [`[${new Date().toISOString().slice(11, 23)}] ${key}`, ...prev.slice(0, 29)])
  }, [])

  // BYO translator: prefixes all resolved strings with "CUSTOM:"
  const byoTranslator: Translator = useCallback(
    (key, params) => {
      // Resolve via default en-US, then prefix
      const base = createTranslator({ bundle: enUS })
      const resolved = base(key, params)
      return `CUSTOM: ${resolved}`
    },
    [],
  )

  // Build the i18n prop based on current state
  const getI18nProp = () => {
    if (useByo) {
      return { t: byoTranslator }
    }

    const bundle = locale === 'fr-FR' ? frFR : enUS

    return {
      locale: locale,
      bundle,
      onMissingKey: handleMissingKey,
      ...(useOverride
        ? {
            overrides: {
              branding: {
                builtBy: 'Custom E2E Brand',
              },
            },
          }
        : {}),
    }
  }

  return (
    <div data-testid="i18n-page">
      <h1 data-testid="i18n-title">i18n System</h1>

      {/* Controls */}
      <div data-testid="i18n-controls" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          data-testid="i18n-btn-en"
          onClick={() => { setLocale('en-US'); setUseByo(false) }}
          style={{ fontWeight: locale === 'en-US' && !useByo ? 'bold' : 'normal' }}
        >
          English (en-US)
        </button>
        <button
          data-testid="i18n-btn-fr"
          onClick={() => { setLocale('fr-FR'); setUseByo(false) }}
          style={{ fontWeight: locale === 'fr-FR' && !useByo ? 'bold' : 'normal' }}
        >
          French (fr-FR)
        </button>
        <button
          data-testid="i18n-btn-byo"
          onClick={() => setUseByo(b => !b)}
          style={{ fontWeight: useByo ? 'bold' : 'normal' }}
        >
          {useByo ? 'BYO Translator ON' : 'BYO Translator OFF'}
        </button>
        <button
          data-testid="i18n-btn-override"
          onClick={() => setUseOverride(o => !o)}
          style={{ fontWeight: useOverride ? 'bold' : 'normal' }}
        >
          {useOverride ? 'Override ON' : 'Override OFF'}
        </button>
        <button
          data-testid="i18n-btn-clear-missing"
          onClick={() => setMissingKeys([])}
        >
          Clear Missing Keys
        </button>
      </div>

      {/* Current state display */}
      <div data-testid="i18n-state" style={{ marginBottom: 16, fontSize: 14 }}>
        <div data-testid="i18n-current-locale">Locale: {locale}</div>
        <div data-testid="i18n-byo-active">BYO: {useByo ? 'active' : 'inactive'}</div>
        <div data-testid="i18n-override-active">Override: {useOverride ? 'active' : 'inactive'}</div>
      </div>

      {/* Uploader with i18n */}
      <div data-testid="i18n-uploader-wrapper" style={{ marginBottom: 16 }}>
        <UpupUploader
          key={`${locale}-${useByo}-${useOverride}`}
          sources={['local']}
          i18n={getI18nProp()}
          uploadEndpoint="/api/upload"
        />
      </div>

      {/* Missing keys log */}
      <div data-testid="i18n-missing-keys-section">
        <h3 data-testid="i18n-missing-keys-title">
          Missing Keys Log ({missingKeys.length})
        </h3>
        <div
          ref={missingKeyLogRef}
          data-testid="i18n-missing-keys-log"
          style={{
            maxHeight: 200,
            overflow: 'auto',
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            background: '#fffbe6',
          }}
        >
          {missingKeys.length === 0 && (
            <div data-testid="i18n-missing-keys-empty">No missing keys</div>
          )}
          {missingKeys.map((entry, i) => (
            <div key={i} data-testid={`i18n-missing-key-${i}`}>
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
