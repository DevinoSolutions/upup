import { tv } from './create-recipe'

export const sourceViewRecipe = tv({
  slots: {
    root: 'upup-flex upup-h-full upup-flex-col',
    header: 'upup-flex upup-items-center upup-justify-between upup-px-4 upup-py-2',
    cancelButton: 'upup-text-sm upup-font-medium upup-cursor-pointer upup-transition-colors',
  },
})
