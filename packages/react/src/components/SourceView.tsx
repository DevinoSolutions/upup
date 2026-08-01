import React, { Suspense, useState } from 'react'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/UploaderContext'
import { SourceViewHeaderExtraContext } from '../context/SourceViewHeaderExtraContext'
import { uploadSourceObject } from '../lib/constants'
import { cn } from '@upupjs/core/internal'
import DefaultLoaderIcon from './DefaultLoaderIcon'

export default function SourceView(): React.ReactElement | null {
    const { core } = useUploaderRuntime()
    const { activeSource, setActiveSource } = useUploaderSource()
    const { translations: tr } = useUploaderI18n()
    const { mini } = useUploaderOptions()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    // Portal host for a source view's header extras (drive avatar + log out);
    // lives left of Back. `empty:hidden` keeps the flex gap from showing when
    // no view portals anything in.
    const [headerExtraHost, setHeaderExtraHost] = useState<HTMLElement | null>(
        null,
    )
    const UploadComponent =
        activeSource && uploadSourceObject[activeSource].Component
    const Icon = activeSource && uploadSourceObject[activeSource].Icon

    if (!UploadComponent || mini || !activeSource || !Icon) return null

    return (
        <div
            className="upup-animate-fx-view upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
            data-upup-slot="source-view"
        >
            {/* Transparent header on the panel gradient (no inner box): the
                provider icon + name fill the row; "Back" returns to sources. */}
            <div
                className={cn(
                    'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-px-3 upup-py-2 upup-text-sm upup-font-medium',
                    dark ? 'upup-text-[#FAFAFA]' : 'upup-text-[#0f172a]',
                    slotClasses.sourceViewHeader,
                )}
            >
                <span className="upup-flex upup-items-center upup-gap-2">
                    <Icon />
                    <span>{tr[uploadSourceObject[activeSource].nameKey]}</span>
                </span>
                <span className="upup-flex upup-items-center upup-gap-2.5">
                    <span
                        ref={setHeaderExtraHost}
                        data-upup-slot="source-view-header-extra"
                        className="upup-flex upup-items-center upup-gap-2.5 empty:upup-hidden"
                    />
                    <button
                        className={cn(
                            'upup-rounded-md upup-p-1 upup-text-[#0284c7] upup-transition-all upup-duration-300',
                            {
                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
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
                        {tr.overlayBack}
                    </button>
                </span>
            </div>
            <SourceViewHeaderExtraContext.Provider value={headerExtraHost}>
                <Suspense
                    fallback={
                        <div className="upup-flex upup-h-full upup-items-center upup-justify-center">
                            <DefaultLoaderIcon />
                        </div>
                    }
                >
                    <UploadComponent />
                </Suspense>
            </SourceViewHeaderExtraContext.Provider>
        </div>
    )
}
