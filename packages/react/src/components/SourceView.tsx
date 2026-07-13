import React, { Suspense } from 'react'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/UploaderContext'
import { uploadSourceObject } from '../lib/constants'
import { cn } from '@upupjs/core/internal'
import DefaultLoaderIcon from './DefaultLoaderIcon'

export default function SourceView(): React.ReactElement | null {
    const { core } = useUploaderRuntime()
    const { activeSource, setActiveSource } = useUploaderSource()
    const { translations: tr } = useUploaderI18n()
    const { mini } = useUploaderOptions()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const UploadComponent =
        activeSource && uploadSourceObject[activeSource].Component
    const Icon = activeSource && uploadSourceObject[activeSource].Icon

    if (!UploadComponent || mini || !activeSource || !Icon) return null

    return (
        <div
            className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
            data-upup-slot="source-view"
        >
            <div
                className={cn(
                    'upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]',
                    {
                        'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]':
                            dark,
                    },
                    slotClasses.sourceViewHeader,
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
                        slotClasses.sourceViewCancelButton,
                    )}
                    onClick={() => {
                        core?.emit('source-view-cancel', {
                            sourceId: activeSource,
                        })
                        setActiveSource(undefined)
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
