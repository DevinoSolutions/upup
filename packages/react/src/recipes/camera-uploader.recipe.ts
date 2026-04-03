import { tv } from './create-recipe'

export const cameraUploaderRecipe = tv({
  slots: {
    previewContainer: 'upup-relative upup-flex upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-lg',
    deleteButton: 'upup-rounded-md upup-p-2 upup-transition-colors',
    captureButton: 'upup-rounded-full upup-p-3 upup-transition-colors',
    rotateButton: 'upup-rounded-md upup-p-2 upup-transition-colors',
    mirrorButton: 'upup-rounded-md upup-p-2 upup-transition-colors',
    addButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-semibold upup-transition-colors',
    modeToggle: 'upup-rounded-md upup-px-3 upup-py-1 upup-text-sm upup-transition-colors',
    videoRecordButton: 'upup-rounded-full upup-p-3 upup-transition-colors',
    videoStopButton: 'upup-rounded-full upup-p-3 upup-transition-colors',
    videoPreview: 'upup-w-full upup-rounded-lg',
    videoAddButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-semibold upup-transition-colors',
    videoDeleteButton: 'upup-rounded-md upup-p-2 upup-transition-colors',
  },
})
