import { tv } from './create-recipe'

export const fileListRecipe = tv({
  slots: {
    root: 'upup-flex upup-flex-col',
    header: 'upup-flex upup-items-center upup-justify-between upup-px-4 upup-py-2',
    cancelButton: 'upup-text-sm upup-font-medium upup-cursor-pointer',
    fileCount: 'upup-text-sm',
    body: 'upup-flex upup-flex-col upup-gap-2 upup-overflow-y-auto upup-px-4 upup-py-2',
    footer: 'upup-flex upup-items-center upup-justify-end upup-gap-2 upup-px-4 upup-py-2',
    uploadButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-semibold upup-text-white upup-transition-colors',
    doneButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-semibold upup-transition-colors',
  },
  variants: {
    hidden: {
      true: { root: 'upup-hidden' },
      false: { root: '' },
    },
    multiFile: {
      true: { body: 'upup-max-h-60' },
      false: { body: '' },
    },
  },
  defaultVariants: {
    hidden: false,
    multiFile: false,
  },
})
