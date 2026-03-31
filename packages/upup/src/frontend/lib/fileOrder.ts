import { FileWithParams } from '../../shared/types'

type FileLikeWithPath = {
    name: string
    relativePath?: string
    webkitRelativePath?: string
}

export function getFileOrderPath(file: FileLikeWithPath) {
    return file.relativePath || file.webkitRelativePath || file.name
}

export function fileHasRelativePath(file: FileLikeWithPath) {
    return !!(file.relativePath || file.webkitRelativePath)
}

export function selectionContainsFolders(files: Iterable<FileLikeWithPath>) {
    for (const file of files) {
        if (fileHasRelativePath(file)) return true
    }

    return false
}

export function sortFilesForSelection<T extends FileLikeWithPath>(files: T[]) {
    if (!selectionContainsFolders(files)) return files

    return [...files].sort((a, b) => {
        return (
            getFileOrderPath(a).localeCompare(getFileOrderPath(b)) ||
            a.name.localeCompare(b.name)
        )
    })
}

export function copyRelativePathMetadata<T extends object>(
    target: T,
    source: FileLikeWithPath,
) {
    if (!fileHasRelativePath(source)) return target

    Object.assign(target, {
        relativePath: getFileOrderPath(source),
    })

    return target as T & Pick<FileLikeWithPath, 'relativePath'>
}

export function copyPreservedFileMetadata<T extends FileWithParams>(
    target: T,
    source: FileWithParams,
    options: { preserveUrl?: boolean } = {},
) {
    target.id = source.id
    if (options.preserveUrl) {
        target.url = source.url
    }
    target.key = source.key
    target.fileHash = source.fileHash
    target.checksumSHA256 = source.checksumSHA256
    target.etag = source.etag
    target.thumbnail = source.thumbnail

    return copyRelativePathMetadata(target, source)
}

export function reorderFilesMap<T>(
    filesMap: Map<string, T>,
    sourceId: string,
    targetId: string,
) {
    if (sourceId === targetId) return filesMap

    const entries = Array.from(filesMap.entries())
    const sourceIndex = entries.findIndex(([id]) => id === sourceId)
    const targetIndex = entries.findIndex(([id]) => id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) return filesMap

    const nextEntries = [...entries]
    const [movedEntry] = nextEntries.splice(sourceIndex, 1)
    const insertionIndex = sourceIndex < targetIndex ? targetIndex : targetIndex

    nextEntries.splice(insertionIndex, 0, movedEntry)

    return new Map(nextEntries)
}
