import { tv } from 'tailwind-variants'

export const driveBrowserRecipe = tv({
    slots: {
        root: 'upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto',
        body: 'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
        footer: 'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-bg-black/[0.025] upup-px-3 upup-py-2',
        addButton:
            'upup-rounded-md upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
        selectFolderButton:
            'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-blue-600 upup-transition-all upup-duration-300',
        cancelButton:
            'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
    },
    variants: {
        dark: {
            true: {
                body: 'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]',
                footer: 'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]',
                addButton: 'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]',
                selectFolderButton: 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]',
                cancelButton: 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type DriveBrowserSlots = keyof ReturnType<typeof driveBrowserRecipe>
