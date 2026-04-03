import { tv } from './create-recipe'

export const dropZoneRecipe = tv({
  slots: {
    root: 'upup-relative upup-flex upup-flex-col upup-items-center upup-justify-center upup-rounded-lg upup-border-2 upup-border-dashed upup-transition-colors',
  },
  variants: {
    dragging: {
      true: { root: 'upup-border-solid' },
      false: { root: '' },
    },
  },
  defaultVariants: {
    dragging: false,
  },
})
