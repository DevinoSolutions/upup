import React, { useState } from 'react'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/UploaderContext'
import useFetchFileByUrl from '../hooks/useFetchFileByUrl'
import { cn } from '@useupup/core/internal'
import SourceViewContainer from './shared/SourceViewContainer'

export default function UrlUploader(): React.ReactElement | null {
    const { core } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const { setActiveSource } = useUploaderSource()
    const { translations: tr } = useUploaderI18n()
    const {
        icons: { LoaderIcon },
    } = useUploaderOptions()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const [url, setUrl] = useState('')
    const { loading, fetchImage } = useFetchFileByUrl()

    const handleFormSubmit = async (
        e: React.SyntheticEvent<HTMLFormElement>,
    ) => {
        e.preventDefault()
        core?.emit('url-submit', { url })
        const file = await fetchImage(url)
        if (file) {
            Object.assign(file, {
                url,
            })
            setFiles([file])
            setUrl('')
            setActiveSource(undefined)
        }
    }

    return (
        <SourceViewContainer
            data-testid="upup-url-uploader"
            data-upup-slot="url-uploader"
        >
            <form
                onSubmit={e => {
                    void handleFormSubmit(e)
                }}
                className="upup-px-3 upup-py-2"
            >
                <input
                    type="url"
                    name="upup-url"
                    aria-label={tr.enterFileUrl}
                    placeholder={tr.enterFileUrl}
                    className={cn(
                        'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
                        {
                            'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                                dark,
                        },
                        slotClasses.urlInput,
                    )}
                    value={url}
                    onChange={e => {
                        setUrl(e.currentTarget.value)
                    }}
                />
                <button
                    className={cn(
                        'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                        {
                            'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]':
                                dark,
                        },
                        slotClasses.urlFetchButton,
                    )}
                    type="submit"
                    disabled={!url}
                >
                    {loading ? <LoaderIcon /> : tr.fetch}
                </button>
            </form>
        </SourceViewContainer>
    )
}
