type WebkitEntry = {
    isFile?: boolean
    isDirectory?: boolean
    fullPath?: string
    name?: string
    file?: (
        resolve: (file: File) => void,
        reject?: (error: unknown) => void,
    ) => void
    createReader?: () => {
        readEntries: (
            resolve: (entries: WebkitEntry[]) => void,
            reject?: (error: unknown) => void,
        ) => void
    }
}

type FileSystemHandleLike = {
    kind?: 'file' | 'directory'
    name?: string
    getFile?: () => Promise<File>
    entries?: () => AsyncIterable<[string, FileSystemHandleLike]>
}

export type DroppedFilesResult = {
    files: File[]
    skippedDirectory: boolean
}

function setRelativePath(file: File, path: string): void {
    try {
        Object.defineProperty(file, 'relativePath', {
            value: path.replace(/^\//, ''),
            configurable: true,
            enumerable: false,
            writable: true,
        })
    } catch {
        // Best effort: File is immutable in some runtimes.
    }
}

function fileFromWebkitEntry(entry: WebkitEntry): Promise<File[]> {
    return new Promise<File[]>((resolve, reject) => {
        entry.file?.(file => {
            setRelativePath(file, entry.fullPath || `/${file.name}`)
            resolve([file])
        }, reject)
    })
}

async function traverseWebkitEntry(
    entry: WebkitEntry,
    allowFolderDrop: boolean,
    state: { skippedDirectory: boolean },
): Promise<File[]> {
    if (entry.isFile) return fileFromWebkitEntry(entry)
    if (!entry.isDirectory) return []
    if (!allowFolderDrop) {
        state.skippedDirectory = true
        return []
    }

    const reader = entry.createReader?.()
    if (!reader) return []
    const entries = await new Promise<WebkitEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
    })
    const nested = await Promise.all(
        entries.map(child =>
            traverseWebkitEntry(child, allowFolderDrop, state),
        ),
    )
    return nested.flat()
}

async function traverseHandle(
    handle: FileSystemHandleLike,
    allowFolderDrop: boolean,
    state: { skippedDirectory: boolean },
    path = '',
): Promise<File[]> {
    if (handle.kind === 'file' && handle.getFile) {
        const file = await handle.getFile()
        setRelativePath(file, path + file.name)
        return [file]
    }
    if (handle.kind !== 'directory') return []
    if (!allowFolderDrop) {
        state.skippedDirectory = true
        return []
    }
    if (!handle.entries) return []

    const out: File[] = []
    for await (const [name, child] of handle.entries()) {
        out.push(
            ...(await traverseHandle(
                child,
                allowFolderDrop,
                state,
                path + name + '/',
            )),
        )
    }
    return out
}

export async function collectDroppedFiles(
    dataTransfer: Pick<DataTransfer, 'items' | 'files'>,
    allowFolderDrop: boolean,
): Promise<DroppedFilesResult> {
    const items = Array.from(dataTransfer.items || [])
    const state = { skippedDirectory: false }
    const firstItem = items[0] as DataTransferItem | undefined
    const supportsWebkitEntries =
        typeof (firstItem as any)?.webkitGetAsEntry === 'function'

    if (supportsWebkitEntries) {
        const entries = items
            .map(
                item =>
                    (item as any).webkitGetAsEntry?.() as WebkitEntry | null,
            )
            .filter((entry): entry is WebkitEntry => Boolean(entry))
        const nested = await Promise.all(
            entries.map(entry =>
                traverseWebkitEntry(entry, allowFolderDrop, state),
            ),
        )
        const files = nested.flat()
        if (files.length > 0 || state.skippedDirectory) {
            return { files, skippedDirectory: state.skippedDirectory }
        }
    }

    const supportsHandles =
        'getAsFileSystemHandle' in (firstItem || ({} as DataTransferItem))
    if (supportsHandles) {
        const handles = await Promise.all(
            items.map(
                async item => await (item as any).getAsFileSystemHandle?.(),
            ),
        )
        const nested = await Promise.all(
            handles
                .filter((handle): handle is FileSystemHandleLike =>
                    Boolean(handle),
                )
                .map(handle => traverseHandle(handle, allowFolderDrop, state)),
        )
        const files = nested.flat()
        if (files.length > 0 || state.skippedDirectory) {
            return { files, skippedDirectory: state.skippedDirectory }
        }
    }

    return {
        files: Array.from(dataTransfer.files || []),
        skippedDirectory: false,
    }
}
