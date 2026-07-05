import { html } from 'lit-html'
import { cn, deriveFetchedFileName } from '@upup/core/internal'
import type { UploaderContext } from '../lib/types'
import { sourceViewContainer } from './shared/source-view-container'
import { icon } from './icon'

interface UrlState {
    url: string
    loading: boolean
}
const stateMap = new WeakMap<UploaderContext, UrlState>()
function urlState(ctx: UploaderContext): UrlState {
    let s = stateMap.get(ctx)
    if (!s) {
        s = { url: '', loading: false }
        stateMap.set(ctx, s)
    }
    return s
}

async function fetchImage(
    ctx: UploaderContext,
    url: string,
): Promise<File | undefined> {
    const s = urlState(ctx)
    if (s.loading) return undefined
    try {
        s.loading = true
        ctx.invalidate()
        const response = await fetch(url)
        if (!response.ok)
            throw new Error(`Failed to fetch URL: ${response.status}`)
        const blob = await response.blob()
        const fileName = deriveFetchedFileName(url, response, blob)
        const file = new File([blob], fileName, { type: blob.type })
        ctx.core.emit('url-fetch', { file })
        return file
    } catch (error) {
        const message = (error as Error).message
        ctx.onError?.(message)
        // Route through the single upload-failure channel with the typed {error} shape,
        // so the failure reaches uploadError/uploadStatus like every other upload error.
        ctx.core.emit('upload-error', {
            error: error instanceof Error ? error : new Error(message),
        })
        return undefined
    } finally {
        s.loading = false
        ctx.invalidate()
    }
}

export function urlUploader(ctx: UploaderContext) {
    const s = urlState(ctx)
    const isDark = ctx.theme.getSnapshot().isDark
    const slot = ctx.theme.getSnapshot().slotOverrides
    const tr = ctx.translations

    const onSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        ctx.core.emit('url-submit', { url: s.url })
        const file = await fetchImage(ctx, s.url)
        if (file) {
            Object.assign(file, { url: s.url })
            await ctx.setFiles([file])
            s.url = ''
            ctx.setActiveSource(undefined)
        }
    }
    const onInput = (e: Event) => {
        s.url = (e.target as HTMLInputElement).value
        ctx.invalidate()
    }

    const inner = html` <form @submit=${onSubmit} class="upup-px-3 upup-py-2">
        <input
            type="url"
            name="upup-url"
            aria-label=${tr.enterFileUrl}
            placeholder=${tr.enterFileUrl}
            class=${cn(
                'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
                {
                    'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                        isDark,
                },
                slot.urlInput,
            )}
            .value=${s.url}
            @input=${onInput}
        />
        <button
            class=${cn(
                'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                {
                    'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]':
                        isDark,
                },
                slot.urlFetchButton,
            )}
            type="submit"
            ?disabled=${!s.url}
        >
            ${s.loading ? icon('loader') : tr.fetch}
        </button>
    </form>`

    return sourceViewContainer(
        ctx,
        { dataTestid: 'upup-url-uploader', dataUpupSlot: 'url-uploader' },
        inner,
    )
}
