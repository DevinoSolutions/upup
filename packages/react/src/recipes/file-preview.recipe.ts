import { tv } from './create-recipe'

export const filePreviewRecipe = tv({
  slots: {
    root: 'upup-flex upup-items-center upup-gap-3 upup-rounded-md upup-p-2',
    thumbnail: 'upup-flex-shrink-0 upup-overflow-hidden upup-rounded-md',
    info: 'upup-flex upup-flex-1 upup-flex-col upup-overflow-hidden',
    name: 'upup-text-sm upup-font-medium upup-truncate',
    size: 'upup-text-xs',
    previewButton: 'upup-rounded-md upup-p-1 upup-transition-colors',
    deleteButton: 'upup-rounded-md upup-p-1 upup-transition-colors',
  },
  variants: {
    single: {
      true: {
        root: 'upup-flex-col upup-items-center upup-text-center',
        thumbnail: 'upup-h-32 upup-w-32',
      },
      false: {
        root: 'upup-flex-row',
        thumbnail: 'upup-h-10 upup-w-10',
      },
    },
  },
  defaultVariants: {
    single: false,
  },
})
