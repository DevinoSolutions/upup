import { tv } from 'tailwind-variants'

export const fileItemRecipe = tv({
    slots: {
        root: 'upup-relative upup-flex upup-flex-1 upup-flex-col upup-items-start upup-gap-1 upup-bg-transparent',
    },
})

export type FileItemSlots = keyof ReturnType<typeof fileItemRecipe>
