import { tv } from './create-recipe'

export const driveBrowserRecipe = tv({
  slots: {
    root: 'upup-flex upup-flex-col upup-h-full',
    header: 'upup-flex upup-items-center upup-justify-between upup-px-4 upup-py-2',
    searchInput: 'upup-w-full upup-rounded-md upup-border upup-px-3 upup-py-1.5 upup-text-sm',
    body: 'upup-flex-1 upup-overflow-y-auto upup-px-4 upup-py-2',
    footer: 'upup-flex upup-items-center upup-justify-end upup-gap-2 upup-px-4 upup-py-2',
    itemDefault: 'upup-flex upup-items-center upup-gap-3 upup-rounded-md upup-px-3 upup-py-2 upup-cursor-pointer upup-transition-colors',
    itemSelected: 'upup-flex upup-items-center upup-gap-3 upup-rounded-md upup-px-3 upup-py-2 upup-cursor-pointer',
    itemInnerText: 'upup-text-sm upup-truncate',
    addFilesButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-semibold upup-text-white upup-transition-colors',
    cancelFilesButton: 'upup-rounded-md upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-transition-colors',
    logoutButton: 'upup-text-sm upup-font-medium upup-cursor-pointer upup-transition-colors',
    loading: 'upup-flex upup-items-center upup-justify-center upup-p-8',
  },
})
