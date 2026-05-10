import React, { Suspense } from 'react'
import { useRootContext } from '../context/RootContext'
import { uploadSourceObject } from '../lib/constants'
import { cn } from '../lib/tailwind'
import DefaultLoaderIcon from './DefaultLoaderIcon'

export default function AdapterView() {
    const {
        core,
        activeAdapter,
        setActiveAdapter,
        translations: tr,
        props: { mini, isDarkTheme: dark, slotClasses },
    } = useRootContext()
    const UploadComponent =
        activeAdapter && uploadSourceObject[activeAdapter].Component
    const Icon = activeAdapter && uploadSourceObject[activeAdapter].Icon

    if (!UploadComponent || mini || !activeAdapter || !Icon) return null

    return (
        <div
            className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
            data-upup-slot="adapter-view"
        >
            <div
                className={cn(
                    'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
                    {
                        'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]':
                            dark,
                    },
                    slotClasses.adapterViewHeader,
                )}
            >
                <Icon />
                <button
                    className={cn(
                        'upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300',
                        {
                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                dark,
                        },
                        slotClasses.adapterViewCancelButton,
                    )}
                    onClick={() => {
                        core?.emit('source-view-cancel', { sourceId: activeAdapter })
                        setActiveAdapter(undefined)
                    }}
                    type="button"
                >
                    {tr.cancel}
                </button>
            </div>
            <Suspense
                fallback={
                    <div className="upup-flex upup-h-full upup-items-center upup-justify-center">
                        <DefaultLoaderIcon />
                    </div>
                }
            >
                <UploadComponent />
            </Suspense>
        </div>
    )
}
