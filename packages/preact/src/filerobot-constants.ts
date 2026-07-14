/**
 * Real Filerobot TABS/TOOLS identifiers, mirrored from
 * react-filerobot-image-editor's exported `TABS`/`TOOLS`.
 *
 * Read SYNCHRONOUSLY by the @upupjs/react chrome off the bridge's module namespace
 * (mod.TABS / mod.TOOLS) and forwarded as `defaultTabId` / `tabsIds` straight into
 * the real editor — so the VALUES must match the library exactly.
 * `src/__tests__/filerobot-constants.spec.ts` guards this with a parity assertion.
 *
 * Keyed UPPERCASE because the chrome does `TABS[tab.toUpperCase()]`, where `tab`
 * is a capitalized @upupjs/core ImageEditorOptions value ('Adjust', 'Crop', …).
 */
export const TABS = {
    ADJUST: 'Adjust',
    FINETUNE: 'Finetune',
    FILTERS: 'Filters',
    WATERMARK: 'Watermark',
    ANNOTATE: 'Annotate',
    RESIZE: 'Resize',
} as const

export const TOOLS = {
    CROP: 'Crop',
    ROTATE: 'Rotate',
    FLIP_X: 'Flip_X',
    FLIP_Y: 'Flip_Y',
    BRIGHTNESS: 'Brightness',
    CONTRAST: 'Contrast',
    HSV: 'HueSaturationValue',
    WARMTH: 'Warmth',
    BLUR: 'Blur',
    THRESHOLD: 'Threshold',
    POSTERIZE: 'Posterize',
    PIXELATE: 'Pixelate',
    NOISE: 'Noise',
    FILTERS: 'Filters',
    RECT: 'Rect',
    ELLIPSE: 'Ellipse',
    POLYGON: 'Polygon',
    TEXT: 'Text',
    LINE: 'Line',
    IMAGE: 'Image',
    ARROW: 'Arrow',
    WATERMARK: 'Watermark',
    PEN: 'Pen',
    RESIZE: 'Resize',
} as const
