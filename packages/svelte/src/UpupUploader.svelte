<script lang="ts">
import { cn } from '@upupjs/core/internal'
import type { UploaderProps } from './shared/types'
import { createUploaderContext } from './context/create-uploader-context'
import { provideUploaderContext } from './context/uploader-context'
import ImageEditorStub from './components/ImageEditorStub.svelte'
import UploaderPanel from './components/UploaderPanel.svelte'

let props: UploaderProps = $props()
// Props are init-time configuration (mirrors Vue's `useUploaderController(props)` and
// React's one-shot context build); capturing the initial value here is intentional.
// svelte-ignore state_referenced_locally
const ctx = createUploaderContext(props)
provideUploaderContext(ctx)

const { isDark, slotOverrides } = ctx.theme
const uploadStatus = ctx.upload.uploadStatus

let inputEl: HTMLInputElement | null = null

$effect(() => {
    ctx.registerFileInput(inputEl)
})

// Re-resolve on theme-prop change (post-mount). The controller (hence its
// ThemeStore) is created once from the initial props, so a `theme` prop change
// after mount would otherwise never reach the live store. ThemeStore's
// setThemeConfig short-circuits on a structurally-equal config, so re-running
// per change costs nothing when the object is stable.
$effect(() => {
    ctx.setThemeConfig(props.theme)
})

function onInputChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files?.length) {
        ctx.setFiles(Array.from(target.files))
        target.value = ''
    }
}
</script>

<div
    class={`upup-scope upup-h-full upup-w-full ${props.className ?? ''}`}
    style={props.style as string | undefined}
    data-testid="upup-root"
    data-upup-slot="root"
    data-state={$uploadStatus?.toLowerCase() ?? 'idle'}
    lang={ctx.lang}
    dir={ctx.dir}
>
    <div
        class={cn('upup-w-full', {
            'upup-h-[480px] upup-max-w-[600px]': !ctx.props.mini,
            'upup-h-auto upup-max-w-[280px]': ctx.props.mini,
        })}
        style={ctx.props.mini ? 'aspect-ratio: 1 / 1' : undefined}
    >
        <section
            data-testid="upup-container"
            aria-labelledby="drop-instructions"
            class={cn(
                `upup-panel-sheen upup-relative ${
                    $isDark
                        ? 'upup-panel-sheen-dark upup-bg-gradient-to-b upup-from-[#141b2e] upup-to-[#0a0e1a] upup-ring-1 upup-ring-white/10 upup-shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)]'
                        : 'upup-bg-gradient-to-b upup-from-white upup-to-[#dde6f0] upup-ring-1 upup-ring-slate-200'
                } upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-px-5 upup-py-4`,
                {
                    [$slotOverrides.containerFull!]:
                        $slotOverrides.containerFull && !ctx.props.mini,
                    [$slotOverrides.containerMini!]:
                        $slotOverrides.containerMini && ctx.props.mini,
                },
            )}
        >
            <UploaderPanel />

            {#if ctx.props.imageEditor.enabled}
                <ImageEditorStub />
            {/if}

            <!-- Branding renders INSIDE UploaderPanel now, so the idle
                 dashed frame wraps it. -->
        </section>
    </div>

    <input
        bind:this={inputEl}
        type="file"
        accept={ctx.props.allowedFileTypes}
        multiple={ctx.props.multiple}
        style="display: none"
        data-testid="upup-file-input"
        onchange={onInputChange}
    />
</div>
