import { tv } from 'tailwind-variants'

export const sourceSelectorRecipe = tv({
    slots: {
        root: 'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
        header: 'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
        backButton:
            'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-blue-600',
        sourceList:
            'upup-flex upup-w-full upup-flex-col upup-justify-center upup-gap-1 md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
        sourceButton:
            'upup-group upup-flex upup-items-center upup-gap-[6px] upup-border-b upup-border-gray-200 upup-px-2 upup-py-1 md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
        sourceButtonText: 'upup-text-xs upup-text-[#242634]',
        sourceButtonIcon: '',
        browseButton:
            'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD] md:upup-text-sm',
        hint: 'upup-text-center upup-text-xs upup-text-[#6D6D6D] md:upup-text-sm',
    },
    variants: {
        dark: {
            true: {
                header: 'upup-bg-white/5 dark:upup-bg-white/5',
                backButton: 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]',
                sourceButton:
                    'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]',
                sourceButtonText:
                    'upup-text-gray-300 dark:upup-text-gray-300',
                browseButton:
                    'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]',
                hint: 'upup-text-gray-300 dark:upup-text-gray-300',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type SourceSelectorSlots = keyof ReturnType<typeof sourceSelectorRecipe>
