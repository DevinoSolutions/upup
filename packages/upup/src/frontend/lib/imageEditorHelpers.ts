import { FileWithParams, ImageEditorOptions } from '../../shared/types'
import { revokeFileUrl } from './file'

type FilerobotTheme = {
    palette: Record<string, string>
    typography: {
        fontFamily: string
    }
}

/**
 * Convert a data-URL (base64 or plain) string to a Blob.
 * Works with any MIME type encoded as `data:<mime>;base64,<data>`.
 */
export function dataURLtoBlob(dataURL: string): Blob {
    const [header, base64Data] = dataURL.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
}

/**
 * Create a new FileWithParams from a Blob, preserving the identity (`id`)
 * of the original file. A fresh blob URL is created for the new file.
 *
 * @param blob      The edited image blob.
 * @param original  The original FileWithParams being replaced.
 * @param output    Optional output settings (mimeType, quality, fileName).
 * @returns A new FileWithParams with the same `id` but updated content.
 */
export function blobToFileWithParams(
    blob: Blob,
    original: FileWithParams,
    output?: ImageEditorOptions['output'],
): FileWithParams {
    const fileName = output?.fileName
        ? output.fileName(original)
        : original.name

    const file = new File([blob], fileName, {
        type: blob.type || original.type,
        lastModified: Date.now(),
    })

    // Preserve file identity so the upload pipeline sees the same entry.
    const fileWithParams = file as FileWithParams
    fileWithParams.id = original.id
    fileWithParams.url = URL.createObjectURL(file)
    fileWithParams.key = original.key
    fileWithParams.fileHash = original.fileHash
    fileWithParams.thumbnail = original.thumbnail

    return fileWithParams
}

/**
 * Replace a file in a Map<string, FileWithParams>, revoking the old blob URL
 * to prevent memory leaks.
 *
 * @param map     The current files map (not mutated — a new Map is returned).
 * @param fileId  The id of the file to replace.
 * @param newFile The replacement FileWithParams.
 * @returns A new Map with the replaced entry.
 */
export function revokeAndReplace(
    map: Map<string, FileWithParams>,
    fileId: string,
    newFile: FileWithParams,
): Map<string, FileWithParams> {
    const oldFile = map.get(fileId)
    if (oldFile) {
        revokeFileUrl(oldFile)
    }

    const next = new Map(map)

    next.set(fileId, newFile)
    return next
}

/**
 * Shared Filerobot theme used by both inline and modal editors.
 * Includes extra palette tokens because some editor buttons fall back to
 * incomplete defaults when light-mode tokens are omitted.
 */
export function getFilerobotTheme(dark: boolean): FilerobotTheme {
    return dark
        ? {
              palette: {
                  'bg-secondary': '#1a1a1a',
                  'bg-primary': '#232323',
                  'bg-primary-active': '#2d2d2d',
                  'bg-stateless': '#2d2d2d',
                  'bg-hover': '#3a3a3a',
                  'bg-active': '#3a3a3a',
                  'accent-primary': '#30C5F7',
                  'accent-primary-hover': '#6DD8FB',
                  'accent-primary-active': '#6DD8FB',
                  accent_1_2_opacity: 'rgba(48, 197, 247, 0.12)',
                  'accent-stateless': '#30C5F7',
                  'icon-primary': '#ffffff',
                  'icons-primary': '#ffffff',
                  'icons-secondary': '#d1d5db',
                  'icons-placeholder': '#9ca3af',
                  'borders-secondary': '#374151',
                  'borders-primary': '#4b5563',
                  'borders-strong': '#6b7280',
                  'borders-disabled': '#6b7280',
                  'borders-button': '#4b5563',
                  'light-shadow': 'rgba(0, 0, 0, 0.4)',
                  warning: '#f59e0b',
                  'txt-primary': '#ffffff',
                  'txt-secondary': '#d1d5db',
                  'txt-primary-invert': '#232323',
                  'txt-secondary-invert': '#1a1a1a',
                  'btn-primary-text': '#ffffff',
                  'btn-secondary-text': '#d1d5db',
                  'btn-disabled-text': '#6b7280',
                  'link-stateless': '#d1d5db',
              },
              typography: {
                  fontFamily: 'inherit',
              },
          }
        : {
              palette: {
                  'bg-secondary': '#f9fafb',
                  'bg-primary': '#ffffff',
                  'bg-primary-active': '#f3f4f6',
                  'bg-stateless': '#ffffff',
                  'bg-hover': '#eff6ff',
                  'bg-active': '#dbeafe',
                  'accent-primary': '#2563eb',
                  'accent-primary-hover': '#1d4ed8',
                  'accent-primary-active': '#1e40af',
                  accent_1_2_opacity: 'rgba(37, 99, 235, 0.12)',
                  'accent-stateless': '#2563eb',
                  'icon-primary': '#111827',
                  'icons-primary': '#111827',
                  'icons-secondary': '#4b5563',
                  'icons-placeholder': '#9ca3af',
                  'borders-secondary': '#e5e7eb',
                  'borders-primary': '#d1d5db',
                  'borders-strong': '#9ca3af',
                  'borders-disabled': '#d1d5db',
                  'borders-button': '#2563eb',
                  'light-shadow': 'rgba(15, 23, 42, 0.12)',
                  warning: '#d97706',
                  'txt-primary': '#111827',
                  'txt-secondary': '#4b5563',
                  'txt-primary-invert': '#ffffff',
                  'txt-secondary-invert': '#f9fafb',
                  'btn-primary-text': '#ffffff',
                  'btn-secondary-text': '#1d4ed8',
                  'btn-disabled-text': '#93c5fd',
                  'link-stateless': '#2563eb',
              },
              typography: {
                  fontFamily: 'inherit',
              },
          }
}

/**
 * CSS fallbacks for hardcoded editor/library values and button states that do
 * not consistently respect the provided theme palette.
 */
export function getImageEditorCssOverrides(dark: boolean): string {
    return dark
        ? `
        /* Input background & border overrides (hardcoded in @scaleflex/ui) */
        [data-upup-theme='dark'] .SfxInput-Base {
            background-color: #2d2d2d !important;
            border-color: #4b5563 !important;
        }
        [data-upup-theme='dark'] .SfxInput-Base:focus-within {
            background-color: #353535 !important;
            border-color: #6b7280 !important;
        }
        [data-upup-theme='dark'] .SfxInput-Base:hover {
            background-color: #353535 !important;
        }
        /* Carousel gradient arrow overrides (hardcoded white in FIE) */
        [data-upup-theme='dark'] .FIE_carousel-prev-button {
            background: linear-gradient(
                90deg,
                #232323 1.56%,
                rgba(35, 35, 35, 0.89) 52.4%,
                rgba(35, 35, 35, 0.53) 76.04%,
                rgba(35, 35, 35, 0) 100%
            ) !important;
        }
        [data-upup-theme='dark'] .FIE_carousel-next-button {
            background: linear-gradient(
                270deg,
                #232323 1.56%,
                rgba(35, 35, 35, 0.89) 52.4%,
                rgba(35, 35, 35, 0.53) 76.04%,
                rgba(35, 35, 35, 0) 100%
            ) !important;
        }
        [data-upup-theme='dark'] .FIE_topbar-save-button,
        [data-upup-theme='dark'] .FIE_watermark-add-button {
            background-color: #30c5f7 !important;
            color: #ffffff !important;
            border: none !important;
        }
        [data-upup-theme='dark'] .FIE_topbar-save-button .SfxButton-Label,
        [data-upup-theme='dark'] .FIE_watermark-add-button .SfxButton-Label {
            color: #ffffff !important;
            opacity: 1 !important;
        }
        [data-upup-theme='dark'] .FIE_topbar-save-button:hover,
        [data-upup-theme='dark'] .FIE_topbar-save-button:focus-visible,
        [data-upup-theme='dark'] .FIE_watermark-add-button:hover,
        [data-upup-theme='dark'] .FIE_watermark-add-button:focus-visible {
            background-color: #6dd8fb !important;
        }
        [data-upup-theme='dark'] .FIE_topbar-save-button:active,
        [data-upup-theme='dark'] .FIE_watermark-add-button:active {
            background-color: #27b1df !important;
        }
        [data-upup-theme='dark'] .FIE_topbar-save-button:disabled,
        [data-upup-theme='dark'] .FIE_watermark-add-button:disabled {
            color: #9ca3af !important;
            background-color: rgba(48, 197, 247, 0.12) !important;
            border: 1px solid #4b5563 !important;
        }
        [data-upup-theme='dark'] .FIE_topbar-save-button:disabled .SfxButton-Label,
        [data-upup-theme='dark'] .FIE_watermark-add-button:disabled .SfxButton-Label {
            color: #9ca3af !important;
            opacity: 1 !important;
        }
        `
        : `
        [data-upup-theme='light'] .FIE_topbar-save-button,
        [data-upup-theme='light'] .FIE_watermark-add-button {
            background-color: #2563eb !important;
            color: #ffffff !important;
            border: 1px solid #2563eb !important;
        }
        [data-upup-theme='light'] .FIE_topbar-save-button .SfxButton-Label,
        [data-upup-theme='light'] .FIE_watermark-add-button .SfxButton-Label {
            color: #ffffff !important;
            opacity: 1 !important;
        }
        [data-upup-theme='light'] .FIE_topbar-save-button:hover,
        [data-upup-theme='light'] .FIE_topbar-save-button:focus-visible,
        [data-upup-theme='light'] .FIE_watermark-add-button:hover,
        [data-upup-theme='light'] .FIE_watermark-add-button:focus-visible {
            background-color: #1d4ed8 !important;
            border-color: #1d4ed8 !important;
        }
        [data-upup-theme='light'] .FIE_topbar-save-button:active,
        [data-upup-theme='light'] .FIE_watermark-add-button:active {
            background-color: #1e40af !important;
            border-color: #1e40af !important;
        }
        [data-upup-theme='light'] .FIE_topbar-save-button:disabled,
        [data-upup-theme='light'] .FIE_watermark-add-button:disabled {
            color: #93c5fd !important;
            background-color: rgba(37, 99, 235, 0.12) !important;
            border: 1px solid #bfdbfe !important;
        }
        [data-upup-theme='light'] .FIE_topbar-save-button:disabled .SfxButton-Label,
        [data-upup-theme='light'] .FIE_watermark-add-button:disabled .SfxButton-Label {
            color: #93c5fd !important;
            opacity: 1 !important;
        }
        `
}
