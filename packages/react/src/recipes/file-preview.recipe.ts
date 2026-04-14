import { tv } from 'tailwind-variants'

export const filePreviewRecipe = tv({
    slots: {
        root: 'upup-inline-block',
        thumbnail:
            'upup-relative upup-h-[145px] upup-w-[145px] upup-overflow-hidden upup-rounded-lg upup-bg-white upup-shadow-sm upup-bg-contain upup-bg-center upup-bg-no-repeat',
        deleteButton:
            'upup-absolute upup-right-1.5 upup-top-1.5 upup-z-10 upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center upup-rounded-full upup-bg-white upup-text-red-600 upup-shadow-sm hover:upup-bg-white hover:upup-text-red-700 upup-ring-1 upup-ring-black/5 disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
        editButton:
            'upup-absolute upup-right-1.5 upup-top-8 upup-z-10 upup-flex upup-h-5 upup-w-5 upup-items-center upup-justify-center upup-rounded-full upup-bg-white upup-text-blue-600 upup-shadow-sm hover:upup-bg-white hover:upup-text-blue-700 upup-ring-1 upup-ring-black/5 disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
        fileName:
            'upup-truncate upup-text-[13px] upup-font-normal upup-leading-tight upup-text-white',
        fileSize:
            'upup-mt-0.5 upup-text-[11px] upup-leading-tight upup-text-gray-400',
        previewLink:
            'upup-mt-1 upup-text-[11px] upup-font-normal upup-leading-tight upup-text-[#4A9EFF] upup-transition-all hover:upup-text-blue-300 hover:upup-underline',
    },
})

export type FilePreviewSlots = keyof ReturnType<typeof filePreviewRecipe>
