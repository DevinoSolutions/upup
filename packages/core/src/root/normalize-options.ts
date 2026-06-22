import { normalizeSource, DEFAULT_SOURCES, DEFAULT_MAX_FILE_SIZE, getDir } from '../orchestrator/helpers'
import { resolveAccept } from '../utils/accept-presets'
import { createTranslator } from '../i18n/create-translator'
import { enUS } from '../i18n/locales/en-US'
import { flattenTranslatorToUiTranslations } from '../i18n/ui-translations'
import type { FileSource } from '../types/file-source'
import type { LocaleBundle, Translator } from '../i18n/types'
import type { ResolvedImageEditorOptions } from '../types/image-editor'
import type { CoreOptions } from '../core'
import type { NormalizedRootOptions, RootControllerOptions, RootResolved } from './types'

export function normalizeRootOptions(options: RootControllerOptions): NormalizedRootOptions {
  const acceptProp = (options.allowedFileTypes as string | string[] | undefined) ?? '*'
  const mini = options.mini ?? false
  const resolvedSources = options.sources
    ? (options.sources.map((s) => normalizeSource(s)).filter(Boolean) as FileSource[])
    : DEFAULT_SOURCES
  const resolvedLimit = options.maxFiles ?? options.restrictions?.maxNumberOfFiles ?? 10
  const resolvedMode = options.mode ?? (options.serverUrl && !options.uploadEndpoint ? 'server' : 'client')
  const maxFileSize = options.maxFileSize ?? options.restrictions?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  const accept = resolveAccept(
    options.restrictions?.allowedFileTypes
      ? options.restrictions.allowedFileTypes.join(',')
      : (typeof acceptProp === 'string' ? acceptProp : acceptProp.join(',')),
  )
  const limit = mini ? 1 : Math.max(resolvedLimit, 1)
  const multiple = mini ? false : limit > 1
  const folderUploadAllowDrop = options.folderUpload?.allowDrop ?? false
  const folderPickerButtonVisible = options.folderUpload?.showSelectFolderButton ?? false

  const imageEditor: ResolvedImageEditorOptions = (() => {
    const ie = options.imageEditor
    if (ie === true) return { enabled: true, autoOpen: 'never', display: 'inline' }
    if (typeof ie === 'object' && ie !== null) {
      const o = ie as Partial<ResolvedImageEditorOptions> & { enabled?: boolean }
      return { ...o, enabled: o.enabled ?? true, autoOpen: o.autoOpen ?? 'never', display: o.display ?? 'inline' }
    }
    return { enabled: false, autoOpen: 'never', display: 'inline' }
  })()

  // -- core cloud-drive mapping (orchestrator shape) --
  const cd = options.cloudDrives
  const coreCloudDrives = cd
    ? {
        googleDrive: cd.googleDrive,
        oneDrive: cd.oneDrive ? { clientId: cd.oneDrive.clientId, authority: cd.oneDrive.redirectUri } : undefined,
        dropbox: cd.dropbox ? { appKey: cd.dropbox.clientId } : undefined,
      }
    : undefined

  // -- framework-facing cloud-config maps (canonical: redirectUri ?? '') --
  const googleDriveConfigs = cd?.googleDrive
    ? { google_client_id: cd.googleDrive.clientId, google_api_key: cd.googleDrive.apiKey, google_app_id: cd.googleDrive.appId }
    : undefined
  const oneDriveConfigs = cd?.oneDrive ? { onedrive_client_id: cd.oneDrive.clientId, redirectUri: cd.oneDrive.redirectUri ?? '' } : undefined
  const dropboxConfigs = cd?.dropbox ? { dropbox_client_id: cd.dropbox.clientId, dropbox_redirect_uri: cd.dropbox.redirectUri ?? '' } : undefined
  const boxConfigs = cd?.box ? { box_client_id: cd.box.clientId, box_redirect_uri: cd.box.redirectUri ?? '' } : undefined

  // -- i18n --
  const i18n = options.i18n
  const localeCandidate = i18n?.locale as unknown
  const bundle = i18n?.bundle ?? (
    localeCandidate && typeof localeCandidate === 'object' && 'code' in localeCandidate && 'messages' in localeCandidate
      ? (localeCandidate as LocaleBundle)
      : undefined
  )
  const fallbackCandidate = i18n?.fallbackLocale as unknown
  const fallbackBundle =
    fallbackCandidate && typeof fallbackCandidate === 'object' && 'code' in fallbackCandidate && 'messages' in fallbackCandidate
      ? (fallbackCandidate as LocaleBundle)
      : undefined
  const translator: Translator = createTranslator({ bundle: bundle ?? enUS, fallback: fallbackBundle ?? enUS, overrides: i18n?.overrides })
  const translations = flattenTranslatorToUiTranslations(translator)
  const lang = bundle?.code ?? (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
  const dir = (bundle?.dir ?? getDir(i18n?.locale as string | LocaleBundle | undefined)) as 'ltr' | 'rtl'

  const resolved: RootResolved = {
    mini, sources: resolvedSources, allowedFileTypes: accept, limit, maxFileSize, multiple,
    mode: resolvedMode, serverUrl: options.serverUrl,
    folderUploadAllowDrop, folderPickerButtonVisible, imageEditor, resumable: options.resumable,
    translator, translations, lang, dir,
    googleDriveConfigs, oneDriveConfigs, dropboxConfigs, boxConfigs,
  }

  const coreOptions: CoreOptions = {
    uploadEndpoint: options.uploadEndpoint || undefined,
    serverUrl: options.serverUrl,
    provider: options.provider,
    mode: resolvedMode,
    allowedFileTypes: accept,
    limit,
    maxFileSize,
    minFileSize: options.minFileSize ?? options.restrictions?.minFileSize,
    maxTotalFileSize: options.maxTotalFileSize ?? options.restrictions?.maxTotalFileSize,
    maxRetries: options.maxRetries,
    onBeforeFileAdded: options.onBeforeFileAdded,
    imageCompression: options.imageCompression,
    thumbnailGenerator: options.thumbnailGenerator,
    checksumVerification: options.checksumVerification,
    webWorker: options.webWorker,
    heicConversion: options.heicConversion,
    stripExifData: options.stripExifData,
    contentDeduplication: options.contentDeduplication,
    crashRecovery: options.crashRecovery,
    maxConcurrentUploads: options.maxConcurrentUploads,
    metadata: options.metadata,
    cors: options.cors,
    resumable: options.resumable,
    cloudDrives: coreCloudDrives,
  } as CoreOptions

  return { coreOptions, resolved }
}
