import { tv } from 'tailwind-variants'

export const fileListRecipe = tv({
    slots: {
        root: 'upup-relative upup-flex upup-h-full upup-flex-col upup-rounded-lg upup-shadow',
        scroll: 'upup-preview-scroll upup-flex upup-flex-1 upup-flex-col upup-overflow-y-auto upup-bg-black/[0.075] upup-p-3',
        footer: 'upup-shadow-top upup-flex upup-items-center upup-gap-3 upup-rounded-b-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
        uploadButton:
            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
        doneButton:
            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-lg upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
        retryButton:
            'upup-disabled:animate-pulse upup-ml-auto upup-rounded-full upup-bg-red-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white',
    },
    variants: {
        dark: {
            true: {
                scroll: 'upup-bg-white/10 dark:upup-bg-white/10',
                footer: 'upup-bg-white/5 dark:upup-bg-white/5',
                uploadButton: 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]',
                doneButton: 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]',
                retryButton: 'upup-bg-red-500 dark:upup-bg-red-500',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type FileListSlots = keyof ReturnType<typeof fileListRecipe>
