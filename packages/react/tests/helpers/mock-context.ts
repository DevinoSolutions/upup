import { vi } from 'vitest'
import type { UploaderContextValue } from '../../src/context/uploader-context'
import type { UploadFile } from '@upup/shared'

type MockOverrides = Partial<UploaderContextValue> & {
  files?: Partial<UploadFile>[]
}

export function mockUploaderContext(
  overrides: MockOverrides = {},
): UploaderContextValue {
  const files = (overrides.files ?? []) as UploadFile[]

  return {
    // UseUpupUploadReturn
    files,
    status: (overrides.status as any) ?? 'idle',
    progress: overrides.progress ?? {
      totalFiles: files.length,
      completedFiles: 0,
      percentage: 0,
    },
    error: overrides.error ?? null,
    addFiles: overrides.addFiles ?? vi.fn(),
    removeFile: overrides.removeFile ?? vi.fn(),
    removeAll: overrides.removeAll ?? vi.fn(),
    setFiles: overrides.setFiles ?? vi.fn(),
    reorderFiles: overrides.reorderFiles ?? vi.fn(),
    upload: overrides.upload ?? vi.fn().mockResolvedValue([]),
    pause: overrides.pause ?? vi.fn(),
    resume: overrides.resume ?? vi.fn(),
    cancel: overrides.cancel ?? vi.fn(),
    retry: overrides.retry ?? vi.fn(),
    core: overrides.core ?? ({} as any),
    on: overrides.on ?? vi.fn(() => () => {}),
    ext: overrides.ext ?? {},

    // UploaderUIState
    activeSource: overrides.activeSource ?? null,
    setActiveSource: overrides.setActiveSource ?? vi.fn(),
    resolvedTheme: overrides.resolvedTheme ?? ({} as any),
    cssVars: (overrides as any).cssVars ?? {},
    mini: overrides.mini ?? false,
    icons: overrides.icons ?? ({} as any),
    enablePaste: overrides.enablePaste ?? true,
    sources: overrides.sources ?? ['local'],
    t: overrides.t ?? ((key: string, values?: any) => {
      // Simple mock translator that returns readable strings
      const parts = key.split('.')
      const lastPart = parts[parts.length - 1]
      if (lastPart === 'filesSelected' && values?.count !== undefined) {
        return `${values.count} files selected`
      }
      if (lastPart === 'uploadFiles' && values?.count !== undefined) {
        return `Upload ${values.count} file${values.count === 1 ? '' : 's'}`
      }
      if (lastPart === 'removeAllFiles') return 'Remove all files'
      if (lastPart === 'done') return 'Done'
      if (lastPart === 'dragOrBrowse') return 'Drag or browse files'
      if (lastPart === 'dragFilesOr') return 'Drag files or'
      if (lastPart === 'browseFiles') return 'Browse files'
      return key
    }),
  } as UploaderContextValue
}
