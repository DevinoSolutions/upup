import { tv } from 'tailwind-variants'

export const progressBarRecipe = tv({
    slots: {
        root: 'upup-flex upup-items-center upup-gap-2',
        track: 'upup-h-[6px] upup-flex-1 upup-overflow-hidden upup-rounded-[4px] upup-bg-[#F5F5F5]',
        fill: 'upup-h-full upup-bg-[#8EA5E7]',
        text: 'upup-text-xs upup-font-semibold',
    },
    variants: {
        dark: {
            true: {
                text: 'upup-text-white',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type ProgressBarSlots = keyof ReturnType<typeof progressBarRecipe>
