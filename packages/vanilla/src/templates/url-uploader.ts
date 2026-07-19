import { html, type TemplateResult } from 'lit-html'
import { cn, deriveFetchedFileName } from '@upupjs/core/internal'
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

export function urlUploader(ctx: UploaderContext): TemplateResult {
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

    const inner = html` <form
        @submit=${onSubmit}
        class="upup-flex upup-w-full upup-max-w-[380px] upup-flex-col upup-items-center upup-gap-3 upup-px-6"
    >
        <span
            class=${cn(
                'upup-flex upup-h-12 upup-w-12 upup-items-center upup-justify-center upup-rounded-2xl',
                isDark
                    ? 'upup-bg-[#38bdf8]/15 upup-text-[#38bdf8]'
                    : 'upup-bg-[#0284c7]/10 upup-text-[#0284c7]',
            )}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M9.5 14.5l5-5" />
                <path d="M11 6.5l1-1a3.6 3.6 0 0 1 5 5l-2 2" />
                <path d="M13 17.5l-1 1a3.6 3.6 0 0 1-5-5l2-2" />
            </svg>
        </span>
        <input
            type="url"
            name="upup-url"
            aria-label=${tr.enterFileUrl}
            placeholder=${tr.enterFileUrl}
            class=${cn(
                'upup-w-full upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-sm upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
                isDark
                    ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                    : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
                slot.urlInput,
            )}
            .value=${s.url}
            @input=${onInput}
        />
        <button
            class=${cn(
                'upup-fx-sheen-sweep upup-fx-press upup-w-full upup-rounded-xl upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                isDark
                    ? 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]'
                    : 'upup-bg-[#0ea5e9]',
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
