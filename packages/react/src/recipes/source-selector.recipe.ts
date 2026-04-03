import { tv } from './create-recipe'

export const sourceSelectorRecipe = tv({
  slots: {
    root: 'upup-flex upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6',
    adapterList: 'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-2',
    adapterButton: 'upup-flex upup-items-center upup-gap-2 upup-rounded-md upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-transition-colors upup-border',
    adapterButtonIcon: 'upup-h-5 upup-w-5',
    adapterButtonText: 'upup-text-sm',
    browseText: 'upup-text-sm upup-font-semibold upup-cursor-pointer',
    dragText: 'upup-text-sm',
  },
})
