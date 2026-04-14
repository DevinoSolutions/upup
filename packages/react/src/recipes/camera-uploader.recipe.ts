import { tv } from 'tailwind-variants'

export const cameraUploaderRecipe = tv({
    slots: {
        root: 'upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-auto upup-px-3 upup-py-2',
        previewContainer:
            'upup-relative upup-aspect-video upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
        deleteButton:
            'upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]',
        captureButton:
            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
        rotateButton:
            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
        addButton:
            'upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
    },
    variants: {
        dark: {
            true: {
                previewContainer: 'upup-bg-white/5 dark:upup-bg-white/5',
                captureButton: 'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]',
                addButton: 'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]',
            },
        },
    },
    defaultVariants: {
        dark: false,
    },
})

export type CameraUploaderSlots = keyof ReturnType<typeof cameraUploaderRecipe>
