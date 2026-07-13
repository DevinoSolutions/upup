<script lang="ts">
import { cn } from '@upupjs/core/internal'
import type { UploaderProps } from './shared/types'
import { createUploaderContext } from './context/create-uploader-context'
import { provideUploaderContext } from './context/uploader-context'
import ImageEditorStub from './components/ImageEditorStub.svelte'
import UploaderPanel from './components/UploaderPanel.svelte'
import { devinoDark, devinoLight, logoDark, logoLight } from './assets/logos'

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
                `upup-shadow-wrapper upup-relative ${
                    $isDark ? 'upup-bg-[#232323]' : 'upup-bg-white'
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

            {#if !props.mini && props.showBranding !== false}
                <div
                    data-testid="upup-branding"
                    class="upup-flex upup-w-full upup-flex-col upup-items-center upup-justify-between upup-gap-1 md:upup-flex-row"
                >
                    <a
                        href="https://useupup.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="upup-flex upup-items-center upup-gap-[5px]"
                    >
                        {#if $isDark}
                            <img src={logoDark} width={61} height={13} alt="logo-dark" />
                        {:else}
                            <img src={logoLight} width={61} height={13} alt="logo-light" />
                        {/if}
                    </a>
                    <a
                        href="https://devino.ca/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                    >
                        <span
                            class={cn(
                                'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
                                {
                                    'upup-text-gray-300 dark:upup-text-gray-300': $isDark,
                                },
                            )}
                        >
                            {ctx.translations.builtBy}
                        </span>
                        {#if $isDark}
                            <img src={devinoDark} width={61} height={13} alt="logo-dark" />
                        {:else}
                            <img src={devinoLight} width={61} height={13} alt="logo-light" />
                        {/if}
                    </a>
                </div>
            {/if}
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
