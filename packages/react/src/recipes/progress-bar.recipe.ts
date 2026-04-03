import { tv } from './create-recipe'

export const progressBarRecipe = tv({
  slots: {
    root: 'upup-flex upup-items-center upup-gap-2',
    track: 'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px]',
    fill: 'upup-h-full',
    text: 'upup-text-xs upup-font-semibold',
  },
})
