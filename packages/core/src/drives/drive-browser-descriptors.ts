/**
 * Per-provider configuration for the framework-agnostic DriveBrowserController.
 * The four cloud-drive providers share ~90% of their browse logic; everything
 * that genuinely differs is captured declaratively here.
 */

export type DriveAuthKind = 'gis' | 'popup'
export type DriveFolderKey = 'id' | 'path'
export type DriveSelectFolderStrategy = 'cached-children' | 'load-all'

export interface DriveProviderDescriptor {
    /** Key passed to core.getPlugin(...). Matches the plugin's `id`/`name`. */
    pluginId: string
    /**
     * Prefix used to build event names for bindDriveEvents(core, eventPrefix, …).
     */
    eventPrefix: string
    /** Display name for the root folder. */
    rootFolderName: string
    /** Id used to detect/label the root folder in files-loaded payloads. */
    rootFolderId: string
    /** Whether a folder is addressed by `id` (most) or `path` (Dropbox). */
    folderKey: DriveFolderKey
    /** Argument passed to plugin.loadFiles() to list the root folder. */
    loadFilesRootArg: string | undefined
    /** Which field in the files-loaded payload carries the folder identity. */
    folderIdField: 'folderId' | 'path'
    /** Auth strategy: GIS popup (Google) or plugin-driven popup (the rest). */
    auth: DriveAuthKind
    /** How onSelectCurrentFolder gathers files. */
    selectFolder: DriveSelectFolderStrategy
    /** Root argument for plugin.loadAllFilesInFolder() (popup providers only). */
    loadAllRootArg?: string
}

export const GOOGLE_DRIVE_DESCRIPTOR: DriveProviderDescriptor = {
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

export const ONE_DRIVE_DESCRIPTOR: DriveProviderDescriptor = {
    pluginId: 'one-drive',
    eventPrefix: 'one-drive',
    rootFolderName: 'OneDrive',
    rootFolderId: 'root',
    folderKey: 'id',
    loadFilesRootArg: undefined,
    folderIdField: 'folderId',
    auth: 'popup',
    selectFolder: 'load-all',
    loadAllRootArg: 'root',
}

export const DROPBOX_DESCRIPTOR: DriveProviderDescriptor = {
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

export const BOX_DESCRIPTOR: DriveProviderDescriptor = {
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
