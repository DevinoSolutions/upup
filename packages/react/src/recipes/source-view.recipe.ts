import { tv } from 'tailwind-variants'

export const sourceViewRecipe = tv({
    slots: {
        root: 'upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]',
        header: 'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
        cancelButton:
            'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
    },
    variants: {
        dark: {
            true: {
                header: 'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]',
                cancelButton:
                    'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type SourceViewSlots = keyof ReturnType<typeof sourceViewRecipe>
