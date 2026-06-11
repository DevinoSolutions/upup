import { html } from 'lit-html'
import { cn, deriveFetchedFileName } from '@upup/core'
import type { RootContext } from '../lib/types'
import { adapterViewContainer } from './shared/adapter-view-container'
import { LoaderIcon } from './icons'

interface UrlState { url: string; loading: boolean }
const stateMap = new WeakMap<RootContext, UrlState>()
function urlState(ctx: RootContext): UrlState {
  let s = stateMap.get(ctx)
  if (!s) { s = { url: '', loading: false }; stateMap.set(ctx, s) }
  return s
}

async function fetchImage(ctx: RootContext, url: string): Promise<File | undefined> {
  const s = urlState(ctx)
  if (s.loading) return undefined
  try {
    s.loading = true; ctx.invalidate()
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`)
    const blob = await response.blob()
    const fileName = deriveFetchedFileName(url, response, blob)
    const file = new File([blob], fileName, { type: blob.type })
    ctx.core.emit('url-fetch', { file })
    return file
  } catch (error) {
    const message = (error as Error).message
    ctx.onError?.(message)
    ctx.core.emit('error', { message })
    return undefined
  } finally {
    s.loading = false; ctx.invalidate()
  }
}

export function urlUploader(ctx: RootContext) {
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
      ctx.setActiveAdapter(undefined)
    }
  }
  const onInput = (e: Event) => { s.url = (e.target as HTMLInputElement).value; ctx.invalidate() }

  const inner = html`
    <form @submit=${onSubmit} class="upup-px-3 upup-py-2">
      <input
        type="url" name="upup-url" aria-label=${tr.enterFileUrl} placeholder=${tr.enterFileUrl}
        class=${cn('upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none', {
          'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]': isDark,
        }, slot.urlInput)}
        .value=${s.url}
        @input=${onInput}
      />
      <button
        class=${cn('upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300', {
          'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': isDark,
        }, slot.urlFetchButton)}
        type="submit" ?disabled=${!s.url}
      >${s.loading ? LoaderIcon() : tr.fetch}</button>
    </form>`

  return adapterViewContainer(ctx, { dataTestid: 'upup-url-uploader', dataUpupSlot: 'url-uploader' }, inner)
}
