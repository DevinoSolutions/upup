/**
 * Local domain types for Dropbox browsing. These used to be imported
 * as `{ DropboxFile, DropboxRoot, DropboxUser } from 'dropbox'` which
 * is wrong — the `dropbox` npm package (v10+) does not export any of
 * those names. They're our own flattened shapes derived from the
 * Dropbox SDK's file/user metadata, used by useDropbox + useDropboxUploader.
 */

export interface DropboxFile {
    id: string
    name: string
    path_display: string
    isFolder: boolean
    size: number
    thumbnailLink: string | null
}

export interface DropboxRoot {
    id: string
    name: string
    isFolder: true
    path_display?: string
    children: DropboxFile[]
}

export interface DropboxUser {
    name: string
    email: string
    picture?: string
    locale?: string
    given_name?: string
    family_name?: string
}
