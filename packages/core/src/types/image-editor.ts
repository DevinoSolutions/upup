import type { UploadFile } from './upload-file'

export type ImageEditorOptions = {
  enabled?: boolean
  display?: 'inline' | 'modal'
  autoOpen?: 'never' | 'single' | 'always'
  output?: {
    mimeType?: string
    quality?: number
    fileName?: (original: File) => string
  }
  tabs?: ('Adjust' | 'Annotate' | 'Filters' | 'Finetune' | 'Resize' | 'Watermark')[]
  tools?: ('Crop' | 'Rotate' | 'Flip' | 'Brightness' | 'Contrast' | 'HSV' | 'Blur' | 'Text' | 'Line' | 'Rect' | 'Ellipse' | 'Polygon' | 'Pen' | 'Arrow' | 'Image')[]
  onOpen?: (file: UploadFile) => void
  onCancel?: (file: UploadFile) => void
  onSave?: (editedFile: UploadFile, originalFile: UploadFile) => void
}

export type ResolvedImageEditorOptions = Required<
  Pick<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>
> &
  Omit<ImageEditorOptions, 'enabled' | 'autoOpen' | 'display'>

export type ImageCompressionOptions = {
  quality?: number
  maxWidth?: number
  maxHeight?: number
  mimeType?: string
  convertSize?: number
}

export type ThumbnailGeneratorOptions = {
  thumbnailWidth?: number
  thumbnailHeight?: number
  thumbnailType?: string
  waitForThumbnailsBeforeUpload?: boolean
}
