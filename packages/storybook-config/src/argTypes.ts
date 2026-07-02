// src/argTypes.ts
// Hand-authored controls mirroring the playground's knobs. Prop names match
// UploaderProps exactly (packages/react|vue/src/shared/types.ts).
// MAINTENANCE: when the uploader gains a user-facing prop, add it here.

import { cloudDrivesFromEnv } from './cloudDrives'

const cat = (category: string) => ({ table: { category } })

export const VIRTUAL_ARGS = ['themeMode', 'primaryColor'] as const

export const uploaderArgTypes: Record<string, unknown> = {
  // ── Upload ──────────────────────────────────────────────
  provider: { control: 'text', description: 'Storage provider id (e.g. "aws").', ...cat('Upload') },
  mode: { control: { type: 'select' }, options: ['client', 'server'], ...cat('Upload') },
  uploadEndpoint: { control: 'text', ...cat('Upload') },
  serverUrl: { control: 'text', ...cat('Upload') },
  autoUpload: { control: 'boolean', ...cat('Upload') },
  maxConcurrentUploads: { control: { type: 'number', min: 1, max: 10 }, ...cat('Upload') },
  maxRetries: { control: { type: 'number', min: 0, max: 10 }, ...cat('Upload') },

  // ── Sources ─────────────────────────────────────────────
  sources: {
    control: { type: 'multi-select' },
    // Full UploadSource union, ordered to mirror the playground's source picker
    // (packages/interactive-example/src/categories/sources.ts). microphone=Audio,
    // screen=Screen Capture.
    options: ['local', 'googleDrive', 'oneDrive', 'dropbox', 'box', 'url', 'camera', 'microphone', 'screen'],
    description: 'Values must match the UploadSource union from @upup/core.',
    ...cat('Sources'),
  },
  enablePaste: { control: 'boolean', ...cat('Sources') },
  // Cloud-drive OAuth credentials (Google Drive / OneDrive / Dropbox / Box),
  // sourced from VITE_* env vars in render — not an interactive control.
  // See packages/storybook-config/src/cloudDrives.ts.
  cloudDrives: { control: false, description: 'OAuth configs from VITE_* env vars; see cloudDrives.ts.', ...cat('Sources') },

  // ── Limits ──────────────────────────────────────────────
  maxFiles: { control: { type: 'number', min: 1, max: 50 }, ...cat('Limits') },
  allowedFileTypes: { control: 'text', description: 'MIME patterns, extensions, or preset names.', ...cat('Limits') },

  // ── Processing ──────────────────────────────────────────
  imageCompression: { control: 'boolean', ...cat('Processing') },
  thumbnailGenerator: { control: 'boolean', ...cat('Processing') },
  checksumVerification: { control: 'boolean', ...cat('Processing') },
  heicConversion: { control: 'boolean', ...cat('Processing') },
  webWorker: { control: 'boolean', description: 'Offload the file pipeline (hash/heic/exif/thumbnail/compress) to a Web Worker. Unset/true = auto with transparent main-thread fallback; false = force the main thread.', ...cat('Processing') },
  stripExifData: { control: 'boolean', ...cat('Processing') },
  contentDeduplication: { control: 'boolean', ...cat('Processing') },

  // ── Editor (React only; ignored by Vue) ─────────────────
  imageEditor: { control: 'boolean', ...cat('Editor') },

  // ── Behavior ────────────────────────────────────────────
  disableDragDrop: { control: 'boolean', ...cat('Behavior') },
  allowPreview: { control: 'boolean', ...cat('Behavior') },
  crashRecovery: { control: 'boolean', ...cat('Behavior') },

  // ── Appearance ──────────────────────────────────────────
  mini: { control: 'boolean', ...cat('Appearance') },
  showBranding: { control: 'boolean', ...cat('Appearance') },
  className: { control: 'text', ...cat('Appearance') },
  themeMode: { control: { type: 'select' }, options: ['light', 'dark', 'system'], description: 'Virtual — mapped to theme.mode in render.', ...cat('Appearance') },
  primaryColor: { control: 'color', description: 'Virtual — mapped to theme.tokens.color.primary in render.', ...cat('Appearance') },

  // ── Events (→ Actions panel) ────────────────────────────
  onFilesSelected: { action: 'onFilesSelected', ...cat('Events') },
  onFileUploadComplete: { action: 'onFileUploadComplete', ...cat('Events') },
  onUploadComplete: { action: 'onUploadComplete', ...cat('Events') },
  onStatusChange: { action: 'onStatusChange', ...cat('Events') },
  onFileRemoved: { action: 'onFileRemoved', ...cat('Events') },
  onError: { action: 'onError', ...cat('Events') },
  onWarn: { action: 'onWarn', ...cat('Events') },
}

export const uploaderDefaultArgs: Record<string, unknown> = {
  provider: 'aws',
  uploadEndpoint: '/api/upup-mock/presign',
  mode: 'client',
  autoUpload: false,
  maxConcurrentUploads: 3,
  maxRetries: 3,
  // Mirror the playground's default source set (My Device, Link, Camera, Audio,
  // Screen Capture) so the Playground story matches the playground preview.
  sources: ['local', 'url', 'camera', 'microphone', 'screen'],
  maxFiles: 10,
  mini: false,
  showBranding: true,
  // Default to explicit 'dark' to mirror the playground's dark default look.
  // (React resolves 'system' synchronously via re-render; Vue's resolved theme
  // is a non-reactive snapshot, so 'system' diverges between the two — an
  // explicit mode renders identically in both. Users can still pick system/light.)
  themeMode: 'dark',
  primaryColor: '',
  // Wire cloud-drive OAuth from VITE_* env vars (empty → the real "Sign in"
  // screen; populated → working OAuth). Present on every story so any cloud
  // source renders its adapter instead of an empty "not ready" panel.
  cloudDrives: cloudDrivesFromEnv(),
}
