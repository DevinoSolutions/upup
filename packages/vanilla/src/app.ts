import { html, nothing, render, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { cn } from './lib/cn'
import type { UploaderContext } from './lib/types'
import { uploaderPanel } from './templates/uploader-panel'
import { imageEditorStub } from './templates/image-editor-stub'

/** Root App template. Pure function of ctx + current store snapshots. */
export function App(ctx: UploaderContext): TemplateResult {
    const isDark = ctx.theme.getSnapshot().isDark
    const slotOverrides = ctx.theme.getSnapshot().slotOverrides
    const status = ctx.orchestrator.getSnapshot().uploadStatus
    const onInputChange = (e: Event) => {
        const target = e.target as HTMLInputElement
        if (target.files?.length) {
            void ctx.setFiles(Array.from(target.files))
            target.value = ''
        }
    }
    return html`
        <div
            class=${`upup-scope upup-h-full upup-w-full ${ctx.props.className}`}
            data-testid="upup-root"
            data-upup-slot="root"
            data-state=${status.toLowerCase()}
            lang=${ctx.lang}
            dir=${ctx.dir}
        >
            <div
                class=${cn('upup-w-full', {
                    'upup-h-[480px] upup-max-w-[600px]': !ctx.props.mini,
                    'upup-h-auto upup-max-w-[280px]': ctx.props.mini,
                })}
                style=${ctx.props.mini ? 'aspect-ratio: 1 / 1' : nothing}
            >
                <section
                    data-testid="upup-container"
                    aria-labelledby="drop-instructions"
                    class=${cn(
                        `upup-panel-sheen upup-relative ${
                            isDark
                                ? 'upup-panel-sheen-dark upup-bg-gradient-to-b upup-from-[#141b2e] upup-to-[#0a0e1a] upup-ring-1 upup-ring-white/10 upup-shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)]'
                                : 'upup-bg-gradient-to-b upup-from-white upup-to-[#dde6f0] upup-ring-1 upup-ring-slate-200'
                        } upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-px-5 upup-py-4`,
                        {
                            [slotOverrides.containerFull ?? '']:
                                !!slotOverrides.containerFull &&
                                !ctx.props.mini,
                            [slotOverrides.containerMini ?? '']:
                                !!slotOverrides.containerMini && ctx.props.mini,
                        },
                    )}
                >
                    ${uploaderPanel(ctx)}
                    ${
                        ctx.props.imageEditor.enabled
                            ? imageEditorStub()
                            : nothing
                    }
                </section>
            </div>
            <input
                ${ref(el => {
                    ctx.registerFileInput(
                        (el as HTMLInputElement | undefined) ?? null,
                    )
                })}
                type="file"
                accept=${ctx.props.allowedFileTypes}
                ?multiple=${ctx.props.multiple}
                style="display: none"
                data-testid="upup-file-input"
                @change=${onInputChange}
            />
        </div>
    `
}

/** Mounts the render loop into rootEl and toggles the dark class on the scope element. */
export function createRenderLoop(
    ctx: UploaderContext,
    rootEl: HTMLElement,
): { renderApp: () => void; invalidate: () => void; stop: () => void } {
    let scheduled = false
    let stopped = false

    const renderApp = () => {
        if (stopped) return
        render(App(ctx), rootEl)
        // toggle dark class on the scope element (same class svelte applies via tailwind darkMode:'class')
        const scope = rootEl.querySelector<HTMLElement>('.upup-scope')
        if (scope)
            scope.classList.toggle('dark', ctx.theme.getSnapshot().isDark)
    }

    const invalidate = () => {
        if (stopped) return
        if (scheduled) return
        scheduled = true
        queueMicrotask(() => {
            scheduled = false
            renderApp()
        })
    }

    const stop = () => {
        stopped = true
    }

    return { renderApp, invalidate, stop }
}
