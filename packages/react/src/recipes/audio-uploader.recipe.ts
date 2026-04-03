import { tv } from './create-recipe'

export const audioUploaderRecipe = tv({
  slots: {
    root: 'upup-flex upup-flex-col upup-items-center upup-gap-4 upup-p-4',
    playbackContainer: 'upup-w-full upup-rounded-lg upup-p-3',
    deleteButton: 'upup-rounded-md upup-p-2 upup-transition-colors',
    addButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-semibold upup-transition-colors',
  },
})
