import {
    copyPreservedFileMetadata,
    copyRelativePathMetadata,
    fileHasRelativePath,
    reorderFilesMap,
    selectionContainsFolders,
    sortFilesForSelection,
} from '../../frontend/lib/fileOrder'

describe('file ordering helpers', () => {
    it('detects folder-backed files from relative paths', () => {
        expect(
            fileHasRelativePath({
                name: 'photo.png',
                webkitRelativePath: 'images/photo.png',
            }),
        ).toBe(true)
        expect(fileHasRelativePath({ name: 'photo.png' })).toBe(false)
    })

    it('detects when a selection contains folder files', () => {
        expect(
            selectionContainsFolders([
                { name: 'photo.png' },
                {
                    name: 'readme.txt',
                    webkitRelativePath: 'docs/readme.txt',
                },
            ]),
        ).toBe(true)
        expect(
            selectionContainsFolders([
                { name: 'photo.png' },
                { name: 'a.txt' },
            ]),
        ).toBe(false)
    })

    it('keeps flat selections in their original order', () => {
        const files = [{ name: 'second.png' }, { name: 'first.png' }]

        expect(sortFilesForSelection(files)).toEqual(files)
    })

    it('sorts folder selections by relative path', () => {
        const files = [
            {
                name: 'photo2.png',
                webkitRelativePath: 'images/sub/photo2.png',
            },
            {
                name: 'readme.txt',
                webkitRelativePath: 'docs/readme.txt',
            },
            {
                name: 'photo.png',
                webkitRelativePath: 'images/photo.png',
            },
        ]

        expect(sortFilesForSelection(files).map(file => file.name)).toEqual([
            'readme.txt',
            'photo.png',
            'photo2.png',
        ])
    })

    it('normalizes folder metadata onto replacement files', () => {
        const target = { name: 'renamed.png' }

        copyRelativePathMetadata(target, {
            name: 'photo.png',
            webkitRelativePath: 'images/photo.png',
        })

        expect(target).toEqual({
            name: 'renamed.png',
            relativePath: 'images/photo.png',
        })
    })

    it('moves dragged entries down the list', () => {
        const filesMap = new Map([
            ['a', { name: 'alpha' }],
            ['b', { name: 'beta' }],
            ['c', { name: 'gamma' }],
        ])

        const reordered = reorderFilesMap(filesMap, 'a', 'c')

        expect(Array.from(reordered.keys())).toEqual(['b', 'c', 'a'])
    })

    it('moves dragged entries up the list', () => {
        const filesMap = new Map([
            ['a', { name: 'alpha' }],
            ['b', { name: 'beta' }],
            ['c', { name: 'gamma' }],
        ])

        const reordered = reorderFilesMap(filesMap, 'c', 'a')

        expect(Array.from(reordered.keys())).toEqual(['c', 'a', 'b'])
    })

    it('preserves file identity and folder metadata on cloned files', () => {
        const target = {
            id: 'next',
            url: 'blob:new',
            name: 'renamed.png',
        }
        const source = {
            id: 'file-1',
            url: 'blob:old',
            name: 'photo.png',
            key: 'upload-key',
            fileHash: 'hash-1',
            thumbnail: {
                file: { name: 'thumb.png' } as File,
                key: 'thumb-key',
            },
            relativePath: 'images/photo.png',
        } as any

        copyPreservedFileMetadata(target as any, source, {
            preserveUrl: true,
        })

        expect(target).toMatchObject({
            id: 'file-1',
            url: 'blob:old',
            key: 'upload-key',
            fileHash: 'hash-1',
            relativePath: 'images/photo.png',
            thumbnail: source.thumbnail,
        })
    })
})
