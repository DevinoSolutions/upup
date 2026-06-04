import { inject, provide, shallowReactive, type InjectionKey, type Ref } from 'vue'
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

export type ContextSource = BaseContextSource

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
    provide(RuntimeKey, shallowReactive({
        get core() { return value.core },
        get mode() { return value.mode },
        get serverUrl() { return value.serverUrl },
        get inputRef() { return value.inputRef },
        get openFilePicker() { return value.openFilePicker },
        get isOnline() { return value.isOnline },
    }) as unknown as ContextRuntime)
    provide(SourceKey, shallowReactive({
        get activeAdapter() { return value.activeAdapter },
        get setActiveAdapter() { return value.setActiveAdapter },
        get oneDriveConfigs() { return value.oneDriveConfigs },
        get googleDriveConfigs() { return value.googleDriveConfigs },
        get dropboxConfigs() { return value.dropboxConfigs },
        get boxConfigs() { return value.boxConfigs },
    }) as unknown as ContextSource)
    provide(I18nKey, shallowReactive({
        get translations() { return value.translations },
        get translator() { return value.translator },
        get lang() { return value.lang },
        get dir() { return value.dir },
    }) as unknown as ContextI18n)
    provide(FilesKey, shallowReactive({
        get files() { return value.files },
        get setFiles() { return value.setFiles },
        get dynamicallyReplaceFiles() { return value.dynamicallyReplaceFiles },
        get resetState() { return value.resetState },
        get dynamicUpload() { return value.dynamicUpload },
        get handleFileRemove() { return value.handleFileRemove },
    }) as unknown as ContextFiles)
    provide(UploadControlsKey, shallowReactive({
        get upload() { return value.upload },
        get handleDone() { return value.handleDone },
        get handleCancel() { return value.handleCancel },
        get handlePause() { return value.handlePause },
        get handleResume() { return value.handleResume },
    }) as unknown as ContextUploadControls)
    provide(ViewKey, shallowReactive({
        get isAddingMore() { return value.isAddingMore },
        get setIsAddingMore() { return value.setIsAddingMore },
        get viewMode() { return value.viewMode },
        get setViewMode() { return value.setViewMode },
    }) as unknown as ContextView)
    provide(EditorKey, shallowReactive({
        get editingFile() { return value.editingFile },
        get openImageEditor() { return value.openImageEditor },
        get closeImageEditor() { return value.closeImageEditor },
        get saveImageEdit() { return value.saveImageEdit },
        get replaceFile() { return value.replaceFile },
    }) as unknown as ContextEditor)
    provide(OptionsKey, shallowReactive({
        get mini() { return value.props.mini },
        get maxRetries() { return value.props.maxRetries },
        get resumable() { return value.props.resumable },
        get onError() { return value.props.onError },
        get onIntegrationClick() { return value.props.onIntegrationClick },
        get onFileClick() { return value.props.onFileClick },
        get onFilesDragOver() { return value.props.onFilesDragOver },
        get onFilesDragLeave() { return value.props.onFilesDragLeave },
        get onFilesDrop() { return value.props.onFilesDrop },
        get onWarn() { return value.props.onWarn },
        get enablePaste() { return value.props.enablePaste },
        get sources() { return value.props.sources },
        get allowedFileTypes() { return value.props.allowedFileTypes },
        get maxFileSize() { return value.props.maxFileSize },
        get limit() { return value.props.limit },
        get isProcessing() { return value.props.isProcessing },
        get allowPreview() { return value.props.allowPreview },
        get folderUploadAllowDrop() { return value.props.folderUploadAllowDrop },
        get folderPickerButtonVisible() { return value.props.folderPickerButtonVisible },
        get showBranding() { return value.props.showBranding },
        get disableDragDrop() { return value.props.disableDragDrop },
        get className() { return value.props.className },
        get style() { return value.props.style },
        get multiple() { return value.props.multiple },
        get icons() { return value.props.icons },
        get imageEditor() { return value.props.imageEditor },
    }) as unknown as ContextProps)
    provide(ThemeKey, shallowReactive({
        get themeMode() { return value.theme.themeMode },
        get isDark() { return value.theme.isDark },
        get tokens() { return value.theme.tokens },
        get resolved() { return value.theme.resolved },
        get slotOverrides() { return value.theme.slotOverrides },
        get slots() { return value.theme.slots },
    }) as unknown as ContextTheme)
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
