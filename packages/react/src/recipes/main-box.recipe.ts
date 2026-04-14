import { tv } from 'tailwind-variants'

export const mainBoxRecipe = tv({
    slots: {
        root: 'upup-relative upup-flex-1 upup-overflow-hidden upup-rounded-lg',
        offlineBanner:
            'upup-absolute upup-inset-x-0 upup-top-0 upup-z-20 upup-px-3 upup-py-1.5 upup-text-center upup-text-xs upup-font-medium upup-text-white upup-bg-yellow-500',
    },
    variants: {
        dark: {
            true: {
                offlineBanner: 'upup-bg-yellow-600',
            },
        },
        hasBorder: {
            true: {
                root: 'upup-border upup-border-[#1849D6]',
            },
        },
        isDragging: {
            true: {},
            false: {
                root: 'upup-border-dashed',
            },
        },
        isDraggingOver: {
            true: {
                root: 'upup-bg-[#E7ECFC] upup-backdrop-blur-sm',
            },
        },
    },
    compoundVariants: [
        {
            hasBorder: true,
            dark: true,
            class: {
                root: 'upup-border-[#30C5F7] dark:upup-border-[#30C5F7]',
            },
        },
        {
            isDraggingOver: true,
            dark: true,
            class: {
                root: 'upup-bg-[#045671] upup-backdrop-blur-sm dark:upup-bg-[#045671]',
            },
        },
    ],
    defaultVariants: {
        dark: false,
        hasBorder: false,
        isDragging: false,
        isDraggingOver: false,
    },
})

export type MainBoxSlots = keyof ReturnType<typeof mainBoxRecipe>
