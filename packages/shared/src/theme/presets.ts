import type { UpupThemeTokens } from './types'

/**
 * Light preset — derived from existing hardcoded colors in the codebase.
 *
 * Mappings from old code:
 *   primary    = #1849D6  (border-[#1849D6], bg-blue-600)
 *   text       = #0B0B0B  (text-[#0B0B0B])
 *   textMuted  = #6D6D6D  (text-[#6D6D6D])
 *   dragBg     = #E7ECFC  (bg-[#E7ECFC])
 *   surface    = #FFFFFF
 *   surfaceAlt = rgba(0,0,0,0.025) mapped to #F9F9F9
 */
export const lightPreset: UpupThemeTokens = {
  color: {
    surface: '#FFFFFF',
    surfaceAlt: '#F7F7F8',
    primary: '#1849D6',
    primaryHover: '#0E2ADD',
    text: '#0B0B0B',
    textMuted: '#6D6D6D',
    border: '#D1D5DB',
    borderActive: '#1849D6',
    danger: '#DC2626',
    success: '#16A34A',
    dragBg: '#E7ECFC',
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
 * Dark preset — derived from existing dark-mode hardcoded colors.
 *
 * Mappings from old code:
 *   primary       = #30C5F7  (bg-[#30C5F7], border-[#30C5F7])
 *   primaryHover  = #59D1F9  (text-[#59D1F9])
 *   text          = #FFFFFF  (text-white)
 *   textMuted     = #D1D5DB  (text-gray-300)
 *   dragBg        = #045671  (bg-[#045671])
 *   surfaceAlt    = rgba(255,255,255,0.05)
 */
export const darkPreset: UpupThemeTokens = {
  color: {
    surface: '#1A1A2E',
    surfaceAlt: '#252540',
    primary: '#30C5F7',
    primaryHover: '#59D1F9',
    text: '#FFFFFF',
    textMuted: '#D1D5DB',
    border: '#4B5563',
    borderActive: '#30C5F7',
    danger: '#EF4444',
    success: '#22C55E',
    dragBg: '#045671',
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
