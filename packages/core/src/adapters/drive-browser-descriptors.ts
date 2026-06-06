/**
 * Per-provider configuration for the framework-agnostic AdapterBrowserController.
 * The four cloud-drive providers share ~90% of their browse logic; everything
 * that genuinely differs is captured declaratively here.
 */

export type AdapterAuthKind = 'gis' | 'popup'
export type AdapterFolderKey = 'id' | 'path'
export type AdapterSelectFolderStrategy = 'cached-children' | 'load-all'

export interface AdapterProviderDescriptor {
    /** Key passed to core.getPlugin(...). Matches the plugin's `id`/`name`. */
    pluginId: string
    /**
     * Prefix used to build event names for bindAdapterEvents(core, eventPrefix, …).
     * NOTE: one-drive emits with the 'onedrive' prefix despite its id being 'one-drive'.
     */
    eventPrefix: string
    /** Display name for the root folder. */
    rootFolderName: string
    /** Id used to detect/label the root folder in files-loaded payloads. */
    rootFolderId: string
    /** Whether a folder is addressed by `id` (most) or `path` (Dropbox). */
    folderKey: AdapterFolderKey
    /** Argument passed to plugin.loadFiles() to list the root folder. */
    loadFilesRootArg: string | undefined
    /** Which field in the files-loaded payload carries the folder identity. */
    folderIdField: 'folderId' | 'path'
    /** Auth strategy: GIS popup (Google) or plugin-driven popup (the rest). */
    auth: AdapterAuthKind
    /** How onSelectCurrentFolder gathers files. */
    selectFolder: AdapterSelectFolderStrategy
    /** Root argument for plugin.loadAllFilesInFolder() (popup providers only). */
    loadAllRootArg?: string
}

export const GOOGLE_DRIVE_DESCRIPTOR: AdapterProviderDescriptor = {
    pluginId: 'google-drive',
    eventPrefix: 'google-drive',
    rootFolderName: 'Drive',
    rootFolderId: 'root',
    folderKey: 'id',
    loadFilesRootArg: undefined,
    folderIdField: 'folderId',
    auth: 'gis',
    selectFolder: 'cached-children',
}

export const ONE_DRIVE_DESCRIPTOR: AdapterProviderDescriptor = {
    pluginId: 'one-drive',
    eventPrefix: 'onedrive',
    rootFolderName: 'OneDrive',
    rootFolderId: 'root',
    folderKey: 'id',
    loadFilesRootArg: undefined,
    folderIdField: 'folderId',
    auth: 'popup',
    selectFolder: 'load-all',
    loadAllRootArg: 'root',
}

export const DROPBOX_DESCRIPTOR: AdapterProviderDescriptor = {
    pluginId: 'dropbox',
    eventPrefix: 'dropbox',
    rootFolderName: 'Dropbox',
    rootFolderId: 'root',
    folderKey: 'path',
    loadFilesRootArg: '',
    folderIdField: 'path',
    auth: 'popup',
    selectFolder: 'load-all',
    loadAllRootArg: '',
}

export const BOX_DESCRIPTOR: AdapterProviderDescriptor = {
    pluginId: 'box',
    eventPrefix: 'box',
    rootFolderName: 'Box',
    rootFolderId: '0',
    folderKey: 'id',
    loadFilesRootArg: '0',
    folderIdField: 'folderId',
    auth: 'popup',
    selectFolder: 'load-all',
    loadAllRootArg: '0',
}
