import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type {
    BaseContextUpload,
    BaseContextRuntime,
    BaseContextSource,
    BaseContextI18n,
    BaseContextFiles,
    BaseContextUploadControls,
    BaseContextView,
    BaseContextEditor,
    BaseContextTheme,
    FileSource,
    ResolvedImageEditorOptions,
} from '@upup/core'
import { UploadStatus } from '@upup/core'
import type {
    UpupUploaderProps,
    UpupUploaderPropsIcons,
} from '../shared/types'

export { UploadStatus }

// ─── Context type shapes ───────────────────────────────────

export type ContextUpload = BaseContextUpload

export type ContextRuntime = BaseContextRuntime & {
    inputRef: Ref<HTMLInputElement | null>
}

// Vue exposes activeAdapter as a reactive ComputedRef (React uses a plain value
// + re-render). Consumers read it via `.value` in script; templates auto-unwrap.
export type ContextSource = Omit<BaseContextSource, 'activeAdapter'> & {
    activeAdapter: ComputedRef<FileSource | undefined>
}

export type ContextI18n = BaseContextI18n

export type ContextFiles = BaseContextFiles

export type ContextUploadControls = Omit<BaseContextUploadControls, 'upload'> & {
    upload: ContextUpload
}

export type ContextView = BaseContextView

export type ContextEditor = BaseContextEditor

export type ContextTheme = BaseContextTheme

export type ContextProps = Required<
    Pick<
        UpupUploaderProps,
        | 'sources'
        | 'isProcessing'
        | 'allowPreview'
        | 'mini'
        | 'onFileClick'
        | 'onIntegrationClick'
        | 'onFilesDragOver'
        | 'onFilesDragLeave'
        | 'onFilesDrop'
        | 'onWarn'
        | 'enablePaste'
        | 'onError'
        | 'showBranding'
        | 'className'
        | 'style'
        | 'disableDragDrop'
    >
> &
    Pick<UpupUploaderProps, 'maxFileSize' | 'maxRetries' | 'resumable'> & {
        allowedFileTypes: string
        limit: number
        folderUploadAllowDrop: boolean
        folderPickerButtonVisible: boolean
        multiple: boolean
        icons: Required<UpupUploaderPropsIcons>
        imageEditor: ResolvedImageEditorOptions
    }

export interface IRootContext extends
    ContextRuntime,
    ContextSource,
    ContextI18n,
    ContextFiles,
    ContextUploadControls,
    ContextView,
    ContextEditor {
    props: ContextProps
    theme: ContextTheme
}

// ─── Injection keys ────────────────────────────────────────

const RuntimeKey: InjectionKey<ContextRuntime> = Symbol('upup-runtime')
const SourceKey: InjectionKey<ContextSource> = Symbol('upup-source')
const I18nKey: InjectionKey<ContextI18n> = Symbol('upup-i18n')
const FilesKey: InjectionKey<ContextFiles> = Symbol('upup-files')
const UploadControlsKey: InjectionKey<ContextUploadControls> = Symbol('upup-upload-controls')
const ViewKey: InjectionKey<ContextView> = Symbol('upup-view')
const EditorKey: InjectionKey<ContextEditor> = Symbol('upup-editor')
const OptionsKey: InjectionKey<ContextProps> = Symbol('upup-options')
const ThemeKey: InjectionKey<ContextTheme> = Symbol('upup-theme')
const RootKey: InjectionKey<IRootContext> = Symbol('upup-root')

// ─── Provider function ─────────────────────────────────────

export function provideRootContext(value: IRootContext) {
    provide(RootKey, value)
    provide(RuntimeKey, {
        core: value.core,
        mode: value.mode,
        serverUrl: value.serverUrl,
        inputRef: value.inputRef,
        openFilePicker: value.openFilePicker,
        isOnline: value.isOnline,
    })
    provide(SourceKey, {
        activeAdapter: value.activeAdapter,
        setActiveAdapter: value.setActiveAdapter,
        oneDriveConfigs: value.oneDriveConfigs,
        googleDriveConfigs: value.googleDriveConfigs,
        dropboxConfigs: value.dropboxConfigs,
        boxConfigs: value.boxConfigs,
    })
    provide(I18nKey, {
        translations: value.translations,
        translator: value.translator,
        lang: value.lang,
        dir: value.dir,
    })
    provide(FilesKey, {
        files: value.files,
        setFiles: value.setFiles,
        dynamicallyReplaceFiles: value.dynamicallyReplaceFiles,
        resetState: value.resetState,
        dynamicUpload: value.dynamicUpload,
        handleFileRemove: value.handleFileRemove,
    })
    provide(UploadControlsKey, {
        upload: value.upload,
        handleDone: value.handleDone,
        handleCancel: value.handleCancel,
        handlePause: value.handlePause,
        handleResume: value.handleResume,
    })
    provide(ViewKey, {
        isAddingMore: value.isAddingMore,
        setIsAddingMore: value.setIsAddingMore,
        viewMode: value.viewMode,
        setViewMode: value.setViewMode,
    })
    provide(EditorKey, {
        editingFile: value.editingFile,
        openImageEditor: value.openImageEditor,
        closeImageEditor: value.closeImageEditor,
        saveImageEdit: value.saveImageEdit,
        replaceFile: value.replaceFile,
    })
    provide(OptionsKey, value.props)
    provide(ThemeKey, value.theme)
}

// ─── Consumer composables ──────────────────────────────────

function readInjection<T>(key: InjectionKey<T>, name: string): T {
    const value = inject(key)
    if (!value) throw new Error(`${name} must be used inside <UpupUploader />`)
    return value
}

export function useRootContext() { return readInjection(RootKey, 'useRootContext') }
export function useUploaderRuntime() { return readInjection(RuntimeKey, 'useUploaderRuntime') }
export function useUploaderSource() { return readInjection(SourceKey, 'useUploaderSource') }
export function useUploaderI18n() { return readInjection(I18nKey, 'useUploaderI18n') }
export function useUploaderFiles() { return readInjection(FilesKey, 'useUploaderFiles') }
export function useUploaderUploadControls() { return readInjection(UploadControlsKey, 'useUploaderUploadControls') }
export function useUploaderView() { return readInjection(ViewKey, 'useUploaderView') }
export function useUploaderEditor() { return readInjection(EditorKey, 'useUploaderEditor') }
export function useUploaderOptions() { return readInjection(OptionsKey, 'useUploaderOptions') }
export function useUploaderTheme() { return readInjection(ThemeKey, 'useUploaderTheme') }
