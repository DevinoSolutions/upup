import {
    normalizeSource,
    DEFAULT_SOURCES,
    DEFAULT_MAX_FILE_SIZE,
    getDir,
} from '../orchestrator/helpers'
import { resolveAccept } from '../utils/accept-presets'
import { createTranslator } from '../i18n/create-translator'
import { enUS } from '../i18n/locales/en-US'
import { resolveLocaleBundle } from '../i18n/resolve-locale'
import { flattenTranslatorToUiTranslations } from '../i18n/ui-translations'
import type { FileSource } from '../types/file-source'
import type { Translator } from '../i18n/types'
import type {
    ImageEditorOptions,
    ResolvedImageEditorOptions,
} from '../types/image-editor'
import type { CoreOptions } from '../core'
import type {
    NormalizedUploaderOptions,
    UploaderControllerOptions,
    UploaderResolved,
} from './types'

export function normalizeUploaderOptions(
    options: UploaderControllerOptions,
): NormalizedUploaderOptions {
    const acceptProp =
        (options.allowedFileTypes as string | string[] | undefined) ?? '*'
    const mini = options.mini ?? false
    const animations = options.animations ?? true
    const resolvedSources = options.sources
        ? (options.sources
              .map(s => normalizeSource(s))
              .filter(Boolean) as FileSource[])
        : DEFAULT_SOURCES
    const resolvedLimit = options.maxFiles ?? 10
    const resolvedMode =
        options.mode ??
        (options.serverUrl && !options.uploadEndpoint ? 'server' : 'client')
    const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
    const accept = resolveAccept(
        typeof acceptProp === 'string' ? acceptProp : acceptProp.join(','),
    )
    const limit = mini ? 1 : Math.max(resolvedLimit, 1)
    const multiple = mini ? false : limit > 1
    const folderUploadAllowDrop = options.folderUpload?.allowDrop ?? false
    const folderPickerButtonVisible =
        options.folderUpload?.showSelectFolderButton ?? false

    const imageEditor: ResolvedImageEditorOptions = (() => {
        // Widened to include `null`: options is a public JS-reachable surface
        // and a plain-JS caller (no TS enforcement) may pass it explicitly.
        // (Cast on the initializer, not a variable annotation — a `const`'s
        // flow-narrowing tracks the initializer expression's type, not a
        // wider redundant declared type.)
        const ie = options.imageEditor as
            boolean | ImageEditorOptions | null | undefined
        // OMITTED (undefined) now defaults ON (round-8 item 1): the editor is a
        // headline feature and Filerobot is still only loaded lazily when the
        // editor is actually opened (principle 6). Explicit `false`/`null` from a
        // caller STILL disables — only the absence of the option flips.
        if (ie === undefined || ie === true)
            return { enabled: true, autoOpen: 'never', display: 'inline' }
        if (typeof ie === 'object' && ie !== null) {
            const o = ie as Partial<ResolvedImageEditorOptions> & {
                enabled?: boolean
            }
            return {
                ...o,
                enabled: o.enabled ?? true,
                autoOpen: o.autoOpen ?? 'never',
                display: o.display ?? 'inline',
            }
        }
        return { enabled: false, autoOpen: 'never', display: 'inline' }
    })()

    // -- i18n --
    const i18n = options.i18n
    const bundle = i18n?.bundle ?? resolveLocaleBundle(i18n?.locale)
    const fallbackBundle = resolveLocaleBundle(i18n?.fallbackLocale)
    const translator: Translator = createTranslator({
        bundle: bundle ?? enUS,
        fallback: fallbackBundle ?? enUS,
        overrides: i18n?.overrides,
    })
    const translations = flattenTranslatorToUiTranslations(translator)
    const lang =
        bundle?.code ??
        (typeof i18n?.locale === 'string' ? i18n.locale : 'en-US')
    const dir = bundle?.dir ?? getDir(i18n?.locale)

    const resolved: UploaderResolved = {
        mini,
        animations,
        sources: resolvedSources,
        allowedFileTypes: accept,
        limit,
        maxFileSize,
        multiple,
        mode: resolvedMode,
        serverUrl: options.serverUrl,
        folderUploadAllowDrop,
        folderPickerButtonVisible,
        imageEditor,
        resumable: options.resumable,
        translator,
        translations,
        lang,
        dir,
        cloudDrives: options.cloudDrives,
    }

    const coreOptions: CoreOptions = {
        uploadEndpoint: options.uploadEndpoint || undefined,
        serverUrl: options.serverUrl,
        provider: options.provider,
        mode: resolvedMode,
        allowedFileTypes: accept,
        limit,
        maxFileSize,
        minFileSize: options.minFileSize,
        maxTotalFileSize: options.maxTotalFileSize,
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
        cloudDrives: options.cloudDrives,
        locale: bundle,
    }

    return { coreOptions, resolved }
}
