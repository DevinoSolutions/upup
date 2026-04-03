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
    adapterList?: string
    adapterButton?: string
    adapterButtonIcon?: string
    adapterButtonText?: string
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
    fileCount?: string
    body?: string
    footer?: string
    uploadButton?: string
    doneButton?: string
  }
  filePreview: {
    root?: string
    thumbnail?: string
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
    searchInput?: string
    body?: string
    footer?: string
    itemDefault?: string
    itemSelected?: string
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
