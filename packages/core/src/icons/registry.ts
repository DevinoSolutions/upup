import { FILE_TYPE_ICONS, type FileTypeIconName } from './file-type-icons'

export type IconName =
  | 'my-device' | 'box' | 'dropbox' | 'google-drive' | 'one-drive'
  | 'link' | 'camera' | 'audio' | 'screen-cast'
  | 'upload' | 'loader' | 'x' | 'trash' | 'layout-grid' | 'layout-list'
  | 'folder' | 'search' | 'user' | 'file'
  | 'player-play' | 'player-pause'
  | FileTypeIconName

export interface IconDef {
  /** e.g. '0 0 24 24' (stroke/filled) or '0 0 32 32' (brand). */
  viewBox: string
  /** px width/height when the renderer is given no explicit size. */
  defaultSize: number
  /** outer-<svg> presentation attrs merged onto the svg (kebab-case keys). */
  attrs?: Record<string, string>
  /** baked brand-color class merged onto the svg, e.g. 'upup-text-[#0061fe]'. */
  className?: string
  /** raw inner-SVG markup (paths/groups/defs/masks) — the single source of truth. */
  inner: string
}

const STROKE_ATTRS = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const

const FILLED_ATTRS = { fill: 'currentColor', stroke: 'none' } as const
const BRAND_FILLRULE = { fill: 'none', 'fill-rule': 'nonzero' } as const

export const ICONS: Record<IconName, IconDef> = {
  // ── Brand/source (viewBox 0 0 32 32) ──
  'my-device': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    className: 'upup-text-[#2275d7]',
    inner: `
  <path d="M8.45 22.087l-1.305-6.674h17.678l-1.572 6.674H8.45zm4.975-12.412l1.083 1.765a.823.823 0 00.715.386h7.951V13.5H8.587V9.675h4.838zM26.043 13.5h-1.195v-2.598c0-.463-.336-.75-.798-.75h-8.356l-1.082-1.766A.823.823 0 0013.897 8H7.728c-.462 0-.815.256-.815.718V13.5h-.956a.97.97 0 00-.746.37.972.972 0 00-.19.81l1.724 8.565c.095.44.484.755.933.755H24c.44 0 .824-.3.929-.727l2.043-8.568a.972.972 0 00-.176-.825.967.967 0 00-.753-.38z" fill="currentcolor" fill-rule="evenodd" />
`,
  },

  'box': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    className: 'upup-text-[#0061d5]',
    inner: `
  <g fill="currentcolor" fill-rule="nonzero">
    <path d="m16.4 13.5c-1.6 0-3 0.9-3.7 2.2-0.7-1.3-2.1-2.2-3.7-2.2-1 0-1.8 0.3-2.5 0.8v-3.6c-0.1-0.3-0.5-0.7-1-0.7s-0.8 0.4-0.8 0.8v7c0 2.3 1.9 4.2 4.2 4.2 1.6 0 3-0.9 3.7-2.2 0.7 1.3 2.1 2.2 3.7 2.2 2.3 0 4.2-1.9 4.2-4.2 0.1-2.4-1.8-4.3-4.1-4.3m-7.5 6.8c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5m7.5 0c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5" />
    <path d="m27.2 20.6l-2.3-2.8 2.3-2.8c0.3-0.4 0.2-0.9-0.2-1.2s-1-0.2-1.3 0.2l-2 2.4-2-2.4c-0.3-0.4-0.9-0.4-1.3-0.2-0.4 0.3-0.5 0.8-0.2 1.2l2.3 2.8-2.3 2.8c-0.3 0.4-0.2 0.9 0.2 1.2s1 0.2 1.3-0.2l2-2.4 2 2.4c0.3 0.4 0.9 0.4 1.3 0.2 0.4-0.3 0.4-0.8 0.2-1.2" />
  </g>
`,
  },

  'dropbox': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    className: 'upup-text-[#0061fe]',
    inner: `
  <path d="M10.5 7.5L5 10.955l5.5 3.454 5.5-3.454 5.5 3.454 5.5-3.454L21.5 7.5 16 10.955zM10.5 21.319L5 17.864l5.5-3.455 5.5 3.455zM16 17.864l5.5-3.455 5.5 3.455-5.5 3.455zM16 25.925l-5.5-3.455 5.5-3.454 5.5 3.454z" fill="currentcolor" fill-rule="nonzero" />
`,
  },

  'google-drive': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    attrs: { ...BRAND_FILLRULE },
    inner: `
  <g fill-rule="nonzero" fill="none">
    <path d="M6.663 22.284l.97 1.62c.202.34.492.609.832.804l3.465-5.798H5c0 .378.1.755.302 1.096l1.361 2.278z" fill="#0066DA" />
    <path d="M16 12.09l-3.465-5.798c-.34.195-.63.463-.832.804l-6.4 10.718A2.15 2.15 0 005 18.91h6.93L16 12.09z" fill="#00AC47" />
    <path d="M23.535 24.708c.34-.195.63-.463.832-.804l.403-.67 1.928-3.228c.201-.34.302-.718.302-1.096h-6.93l1.474 2.802 1.991 2.996z" fill="#EA4335" />
    <path d="M16 12.09l3.465-5.798A2.274 2.274 0 0018.331 6h-4.662c-.403 0-.794.11-1.134.292L16 12.09z" fill="#00832D" />
    <path d="M20.07 18.91h-8.14l-3.465 5.798c.34.195.73.292 1.134.292h12.802c.403 0 .794-.11 1.134-.292L20.07 18.91z" fill="#2684FC" />
    <path d="M23.497 12.455l-3.2-5.359a2.252 2.252 0 00-.832-.804L16 12.09l4.07 6.82h6.917c0-.377-.1-.755-.302-1.096l-3.188-5.359z" fill="#FFBA00" />
  </g>
`,
  },

  'one-drive': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    attrs: { ...BRAND_FILLRULE },
    inner: `
  <g fill="none" fill-rule="nonzero">
    <path d="M13.39 12.888l4.618 2.747 2.752-1.15a4.478 4.478 0 012.073-.352 6.858 6.858 0 00-5.527-5.04 6.895 6.895 0 00-6.876 2.982l.07-.002a5.5 5.5 0 012.89.815z" fill="#0364B8" />
    <path d="M13.39 12.887v.001a5.5 5.5 0 00-2.89-.815l-.07.002a5.502 5.502 0 00-4.822 2.964 5.43 5.43 0 00.38 5.62l4.073-1.702 1.81-.757 4.032-1.685 2.105-.88-4.619-2.748z" fill="#0078D4" />
    <path d="M22.833 14.133a4.479 4.479 0 00-2.073.352l-2.752 1.15.798.475 2.616 1.556 1.141.68 3.902 2.321a4.413 4.413 0 00-.022-4.25 4.471 4.471 0 00-3.61-2.284z" fill="#1490DF" />
    <path d="M22.563 18.346l-1.141-.68-2.616-1.556-.798-.475-2.105.88L11.87 18.2l-1.81.757-4.073 1.702A5.503 5.503 0 0010.5 23h12.031a4.472 4.472 0 003.934-2.333l-3.902-2.321z" fill="#28A8EA" />
  </g>
`,
  },

  'link': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    inner: `<path d="M23.637 15.312l-2.474 2.464a3.582 3.582 0 01-.577.491c-.907.657-1.897.986-2.968.986a4.925 4.925 0 01-3.959-1.971c-.248-.329-.164-.902.165-1.149.33-.247.907-.164 1.155.164 1.072 1.478 3.133 1.724 4.618.656a.642.642 0 00.33-.328l2.473-2.463c1.238-1.313 1.238-3.366-.082-4.597a3.348 3.348 0 00-4.618 0l-1.402 1.395a.799.799 0 01-1.154 0 .79.79 0 010-1.15l1.402-1.394a4.843 4.843 0 016.843 0c2.062 1.805 2.144 5.007.248 6.896zm-8.081 5.664l-1.402 1.395a3.348 3.348 0 01-4.618 0c-1.319-1.23-1.319-3.365-.082-4.596l2.475-2.464.328-.328c.743-.492 1.567-.739 2.475-.657.906.165 1.648.574 2.143 1.314.248.329.825.411 1.155.165.33-.248.412-.822.165-1.15-.825-1.068-1.98-1.724-3.216-1.888-1.238-.247-2.556.082-3.628.902l-.495.493-2.474 2.464c-1.897 1.969-1.814 5.09.083 6.977.99.904 2.226 1.396 3.463 1.396s2.473-.492 3.463-1.395l1.402-1.396a.79.79 0 000-1.15c-.33-.328-.908-.41-1.237-.082z" fill="#FF753E" fill-rule="nonzero" />`,
  },

  'camera': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    inner: `
  <path d="M23.5 9.5c1.417 0 2.5 1.083 2.5 2.5v9.167c0 1.416-1.083 2.5-2.5 2.5h-15c-1.417 0-2.5-1.084-2.5-2.5V12c0-1.417 1.083-2.5 2.5-2.5h2.917l1.416-2.167C13 7.167 13.25 7 13.5 7h5c.25 0 .5.167.667.333L20.583 9.5H23.5zM16 11.417a4.706 4.706 0 00-4.75 4.75 4.704 4.704 0 004.75 4.75 4.703 4.703 0 004.75-4.75c0-2.663-2.09-4.75-4.75-4.75zm0 7.825c-1.744 0-3.076-1.332-3.076-3.074 0-1.745 1.333-3.077 3.076-3.077 1.744 0 3.074 1.333 3.074 3.076s-1.33 3.075-3.074 3.075z" fill="#02B383" fill-rule="nonzero" />
`,
  },

  'audio': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    className: 'upup-text-[#8030a3]',
    inner: `
  <path d="M21.143 12.297c.473 0 .857.383.857.857v2.572c0 3.016-2.24 5.513-5.143 5.931v2.64h2.572a.857.857 0 110 1.714H12.57a.857.857 0 110-1.714h2.572v-2.64C12.24 21.24 10 18.742 10 15.726v-2.572a.857.857 0 111.714 0v2.572A4.29 4.29 0 0016 20.01a4.29 4.29 0 004.286-4.285v-2.572c0-.474.384-.857.857-.857zM16 6.5a3 3 0 013 3v6a3 3 0 01-6 0v-6a3 3 0 013-3z" fill="currentcolor" fill-rule="nonzero" />
`,
  },

  'screen-cast': {
    viewBox: '0 0 32 32',
    defaultSize: 32,
    className: 'upup-text-[#2c3e50]',
    inner: `
  <g fill="currentcolor" fill-rule="evenodd">
    <path d="M24.182 9H7.818C6.81 9 6 9.742 6 10.667v10c0 .916.81 1.666 1.818 1.666h4.546V24h7.272v-1.667h4.546c1 0 1.809-.75 1.809-1.666l.009-10C26 9.742 25.182 9 24.182 9zM24 21H8V11h16v10z" />
    <circle cx="16" cy="16" r="2" />
  </g>
`,
  },

  // ── Stroke UI (viewBox 0 0 24 24) ──
  'upload': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <polyline points="7 9 12 4 17 9" />
    <line x1="12" y1="4" x2="12" y2="16" />
  `,
  },

  'loader': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  `,
  },

  'x': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  `,
  },

  // Tabler 'trash' (matches react-icons/tb TbTrash exactly) — default for icons.FileDeleteIcon.
  'trash': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <path d="M4 7l16 0" />
    <path d="M10 11l0 6" />
    <path d="M14 11l0 6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
  `,
  },

  'layout-grid': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" />
  `,
  },

  'layout-list': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <rect x="4" y="4" width="16" height="6" rx="1" /><rect x="4" y="14" width="16" height="6" rx="1" />
  `,
  },

  'folder': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
  `,
  },

  'search': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <circle cx="10" cy="10" r="7" /><line x1="21" y1="21" x2="15" y2="15" />
  `,
  },

  'user': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <path d="M12 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
  `,
  },

  'file': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...STROKE_ATTRS },
    inner: `
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  `,
  },

  // ── Filled UI (viewBox 0 0 24 24) ──
  'player-play': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...FILLED_ATTRS },
    inner: `<path d="M6 4l15 8-15 8z" />`,
  },

  'player-pause': {
    viewBox: '0 0 24 24',
    defaultSize: 24,
    attrs: { ...FILLED_ATTRS },
    inner: `
    <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
  `,
  },

  // ── File-type typed glyphs (Tabler TbFileType*) ──
  ...FILE_TYPE_ICONS,
}
