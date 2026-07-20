import type { UpupThemeTokens } from './types'

/**
 * Light preset — sky-family defaults matching the gradient default theme
 * (the landing "MockUploader" look brought into the product).
 *
 * Sky accent mappings (light):
 *   primary      = #0284c7  (sky-600 — text/links on light)
 *   primaryHover = #0369a1  (sky-700)
 *   borderActive = #0ea5e9  (sky-500 — drag/active border)
 *   dragBg       = #e0f2fe  (sky-100 — drag-over background)
 *   text         = #0B0B0B
 *   textMuted    = #6D6D6D
 *   surface      = #FFFFFF
 *   surfaceAlt   = #F7F7F8
 *
 * NOTE: the token layer is currently unconsumed by the components (they paint
 * via hardcoded `upup-*` classes), so these values are cosmetic-of-record — they
 * keep the token layer honest about the default without repainting the DOM today.
 */
export const lightPreset: UpupThemeTokens = {
    color: {
        surface: '#FFFFFF',
        surfaceAlt: '#F7F7F8',
        primary: '#0284c7',
        primaryHover: '#0369a1',
        text: '#0B0B0B',
        textMuted: '#6D6D6D',
        border: '#D1D5DB',
        borderActive: '#0ea5e9',
        danger: '#DC2626',
        success: '#16A34A',
        dragBg: '#e0f2fe',
        overlay: 'rgba(0, 0, 0, 0.5)',
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
    },
    shadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.07)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
    },
}

/**
 * Dark preset — sky-family defaults matching the gradient default theme
 * (close to the landing "MockUploader" mock, which is dark by design).
 *
 * Sky accent mappings (dark):
 *   primary      = #38bdf8  (sky-400 — text/links, matches the mock accent)
 *   primaryHover = #7dd3fc  (sky-300)
 *   borderActive = #38bdf8  (sky-400 — drag/active border)
 *   dragBg       = #0b2a3a  (deep sky — drag-over background)
 *   text         = #FFFFFF
 *   textMuted    = #D1D5DB
 *   surfaceAlt   = rgba(255,255,255,0.05) mapped to #252540
 *
 * NOTE: the token layer is currently unconsumed by the components (they paint
 * via hardcoded `upup-*` classes), so these values are cosmetic-of-record — they
 * keep the token layer honest about the default without repainting the DOM today.
 */
export const darkPreset: UpupThemeTokens = {
    color: {
        surface: '#1A1A2E',
        surfaceAlt: '#252540',
        primary: '#38bdf8',
        primaryHover: '#7dd3fc',
        text: '#FFFFFF',
        textMuted: '#D1D5DB',
        border: '#4B5563',
        borderActive: '#38bdf8',
        danger: '#EF4444',
        success: '#22C55E',
        dragBg: '#0b2a3a',
        overlay: 'rgba(0, 0, 0, 0.7)',
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
    },
    shadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
        md: '0 4px 6px rgba(0, 0, 0, 0.3)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
    },
}
