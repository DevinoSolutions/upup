import { tv } from './create-recipe'

export const notifierRecipe = tv({
  slots: {
    root: 'upup-absolute upup-bottom-2 upup-left-2 upup-right-2 upup-flex upup-flex-col upup-gap-1',
    message: 'upup-rounded-md upup-px-3 upup-py-2 upup-text-sm',
  },
  variants: {
    type: {
      error: { message: 'upup-text-white' },
      warning: { message: '' },
      info: { message: '' },
    },
  },
})
