/**
 * Component-scoped slot definitions.
 * Each component key maps to a record of slot names -> optional className override.
 *
 * Users can pass `theme.slots` to override specific slots without
 * touching the global token system.
 */
export interface UpupThemeSlots {
    uploader: {
        root?: string
        container?: string
    }
    dropZone: {
        root?: string
    }
    sourceSelector: {
        root?: string
        sourceList?: string
        sourceButton?: string
        sourceButtonIcon?: string
        sourceButtonText?: string
        browseText?: string
        dragText?: string
    }
    sourceView: {
        root?: string
        header?: string
        cancelButton?: string
    }
    fileList: {
        root?: string
        header?: string
        cancelButton?: string
        addMoreButton?: string
        fileCount?: string
        body?: string
        footer?: string
        uploadButton?: string
        doneButton?: string
    }
    filePreview: {
        root?: string
        thumbnail?: string
        icon?: string
        info?: string
        name?: string
        size?: string
        previewButton?: string
        deleteButton?: string
    }
    progressBar: {
        root?: string
        track?: string
        fill?: string
        text?: string
    }
    notifier: {
        root?: string
        message?: string
    }
    urlUploader: {
        input?: string
        fetchButton?: string
    }
    cameraUploader: {
        previewContainer?: string
        deleteButton?: string
        captureButton?: string
        rotateButton?: string
        mirrorButton?: string
        addButton?: string
        modeToggle?: string
        videoRecordButton?: string
        videoStopButton?: string
        videoPreview?: string
        videoAddButton?: string
        videoDeleteButton?: string
    }
    audioUploader: {
        root?: string
        playbackContainer?: string
        deleteButton?: string
        addButton?: string
    }
    screenCaptureUploader: {
        root?: string
        preview?: string
        addButton?: string
        deleteButton?: string
    }
    driveBrowser: {
        root?: string
        header?: string
        searchContainer?: string
        searchInput?: string
        body?: string
        footer?: string
        itemDefault?: string
        itemSelected?: string
        itemInner?: string
        itemInnerText?: string
        addFilesButton?: string
        cancelFilesButton?: string
        logoutButton?: string
        loading?: string
    }
    driveAuthFallback: {
        root?: string
    }
    filePreviewPortal: {
        root?: string
    }
    imageEditor: {
        root?: string
        modal?: string
    }
}

/**
 * All valid slot path strings, e.g. "uploader.root", "fileList.uploadButton".
 * Useful for data-upup-slot attribute values.
 */
export type UpupSlotPath = {
    [C in keyof UpupThemeSlots]: {
        [S in keyof UpupThemeSlots[C]]: `${C & string}.${S & string}`
    }[keyof UpupThemeSlots[C]]
}[keyof UpupThemeSlots]

export type DeepPartialSlots = {
    [C in keyof UpupThemeSlots]?: Partial<UpupThemeSlots[C]>
}

/**
 * Flat shape the internal React runtime reads from. Produced by
 * `flattenSlotsToClassNames()` and kept as an implementation detail — do not
 * consume directly. Consumers override slots via `theme.slots` in v2.
 */
export type InternalFlatClassNames = Partial<Record<string, string>>

/**
 * Mapping of v2 nested slot paths → legacy internal flat className keys.
 *
 * This is the single source of truth for how `theme.slots` is projected into
 * the internal class-map that the component tree currently reads. When a flat
 * key is an array, the slot's value is applied to every listed key — used for
 * mini/multi/single variants that collapse to one v2 slot in the public API.
 */
const SLOT_TO_FLAT: {
    [C in keyof UpupThemeSlots]: {
        [S in keyof UpupThemeSlots[C]]: string | string[]
    }
} = {
    uploader: {
        root: 'containerFull',
        container: 'containerFull',
    },
    dropZone: {
        root: 'containerFull',
    },
    sourceSelector: {
        root: 'containerFull',
        sourceList: 'sourceButtonList',
        sourceButton: 'sourceButton',
        sourceButtonIcon: 'sourceButtonIcon',
        sourceButtonText: 'sourceButtonText',
        browseText: 'sourceButtonText',
        dragText: 'sourceButtonText',
    },
    sourceView: {
        root: 'sourceView',
        header: 'sourceViewHeader',
        cancelButton: 'sourceViewCancelButton',
    },
    fileList: {
        root: 'fileListContainer',
        header: 'containerHeader',
        cancelButton: 'containerCancelButton',
        addMoreButton: 'containerAddMoreButton',
        fileCount: 'containerHeader',
        body: [
            'fileListContainerInnerSingle',
            'fileListContainerInnerMultiple',
        ],
        footer: 'fileListFooter',
        uploadButton: 'uploadButton',
        doneButton: 'uploadDoneButton',
    },
    filePreview: {
        root: ['fileItemSingle', 'fileItemMultiple'],
        thumbnail: ['fileThumbnailSingle', 'fileThumbnailMultiple'],
        icon: 'fileIcon',
        info: 'fileInfo',
        name: 'fileName',
        size: 'fileSize',
        previewButton: 'filePreviewButton',
        deleteButton: 'fileDeleteButton',
    },
    progressBar: {
        root: 'progressBarContainer',
        track: 'progressBar',
        fill: 'progressBarInner',
        text: 'progressBarText',
    },
    notifier: {
        root: 'containerFull',
        message: 'containerFull',
    },
    urlUploader: {
        input: 'urlInput',
        fetchButton: 'urlFetchButton',
    },
    cameraUploader: {
        previewContainer: 'cameraPreviewContainer',
        deleteButton: 'cameraDeleteButton',
        captureButton: 'cameraCaptureButton',
        rotateButton: 'cameraRotateButton',
        mirrorButton: 'cameraRotateButton',
        addButton: 'cameraAddButton',
        modeToggle: 'cameraRotateButton',
        videoRecordButton: 'cameraCaptureButton',
        videoStopButton: 'cameraCaptureButton',
        videoPreview: 'cameraPreviewContainer',
        videoAddButton: 'cameraAddButton',
        videoDeleteButton: 'cameraDeleteButton',
    },
    audioUploader: {
        root: 'containerFull',
        playbackContainer: 'cameraPreviewContainer',
        deleteButton: 'cameraDeleteButton',
        addButton: 'cameraAddButton',
    },
    screenCaptureUploader: {
        root: 'containerFull',
        preview: 'cameraPreviewContainer',
        addButton: 'cameraAddButton',
        deleteButton: 'cameraDeleteButton',
    },
    driveBrowser: {
        root: 'containerFull',
        header: 'driveHeader',
        searchContainer: 'driveSearchContainer',
        searchInput: 'driveSearchInput',
        body: 'driveBody',
        footer: 'driveFooter',
        itemDefault: 'driveItemContainerDefault',
        itemSelected: 'driveItemContainerSelected',
        itemInner: 'driveItemContainerInner',
        itemInnerText: 'driveItemInnerText',
        addFilesButton: 'driveAddFilesButton',
        cancelFilesButton: 'driveCancelFilesButton',
        logoutButton: 'driveLogoutButton',
        loading: 'driveLoading',
    },
    driveAuthFallback: {
        root: 'containerFull',
    },
    filePreviewPortal: {
        root: 'filePreviewPortal',
    },
    imageEditor: {
        root: 'containerFull',
        modal: 'containerFull',
    },
}

/**
 * Project a `theme.slots` override map into the flat className shape the
 * internal React tree currently consumes. Later v2 iterations may migrate
 * components to read slot paths directly; until then, this flattener keeps
 * the public slot API wired without requiring per-component rewrites.
 *
 * Precedence inside a single call: later slot writes to the same flat key
 * win, which matches the intuitive "deepest override wins" rule.
 */
export function flattenSlotsToClassNames(
    slots: DeepPartialSlots | undefined,
): InternalFlatClassNames {
    if (!slots) return {}
    const out: InternalFlatClassNames = {}
    for (const componentKey of Object.keys(slots) as (keyof UpupThemeSlots)[]) {
        const component = slots[componentKey]
        if (!component) continue
        const mapping = SLOT_TO_FLAT[componentKey] as
            | Record<string, string | string[]>
            | undefined
        if (!mapping) continue
        for (const slotName of Object.keys(component)) {
            const value = (component as Record<string, string | undefined>)[
                slotName
            ]
            if (typeof value !== 'string' || value.length === 0) continue
            const target = mapping[slotName]
            if (!target) continue
            const keys = Array.isArray(target) ? target : [target]
            for (const key of keys) {
                out[key] = out[key] ? `${out[key]} ${value}` : value
            }
        }
    }
    return out
}
