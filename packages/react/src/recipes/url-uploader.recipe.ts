import { tv } from 'tailwind-variants'

export const urlUploaderRecipe = tv({
    slots: {
        form: 'upup-px-3 upup-py-2',
        input: 'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
        fetchButton:
            'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
    },
    variants: {
        dark: {
            true: {
                input: 'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]',
                fetchButton:
                    'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type UrlUploaderSlots = keyof ReturnType<typeof urlUploaderRecipe>
