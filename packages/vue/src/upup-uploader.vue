<script setup lang="ts">
import { cn } from '@upupjs/core/internal'
import type { UploaderProps } from './shared/types'
import useUploaderController from './composables/useUploaderController'
import { provideUploaderContext } from './context/uploader-context'
import UploaderPanel from './components/UploaderPanel.vue'
import ImageEditorStub from './components/ImageEditorStub.vue'

// Vue types each optional `boolean` prop as `Boolean`, so an ABSENT prop is
// coerced to `false` — which would defeat the intended `true` defaults
// (allowPreview, showBranding) and silently force main-thread processing
// (webWorker, whose contract is "unset/true = auto, false = main thread").
// React/Svelte/Angular/Vanilla all resolve these `true` when omitted; withDefaults
// restores that cross-framework parity. Every other boolean prop defaults to
// `false`, where Vue's coerce-to-false already matches the intended default.
const props = withDefaults(defineProps<UploaderProps>(), {
    allowPreview: true,
    showBranding: true,
    webWorker: true,
})
const ctx = useUploaderController(props)
provideUploaderContext(ctx)

function onInputChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files?.length) {
        ctx.setFiles(Array.from(target.files))
        target.value = ''
    }
}
</script>

<template>
    <div
        :class="`upup-scope upup-h-full upup-w-full ${props.className ?? ''}`"
        :style="props.style"
        data-testid="upup-root"
        data-upup-slot="root"
        :data-state="ctx.upload.uploadStatus.value?.toLowerCase() ?? 'idle'"
        :lang="ctx.lang"
        :dir="ctx.dir"
    >
        <div
            :class="cn('upup-w-full', {
                'upup-h-[480px] upup-max-w-[600px]': !ctx.props.mini,
                'upup-h-auto upup-max-w-[280px]': ctx.props.mini,
            })"
            :style="ctx.props.mini ? { aspectRatio: '1 / 1' } : undefined"
        >
            <section
                data-testid="upup-container"
                aria-labelledby="drop-instructions"
                :class="cn(
                    `upup-panel-sheen upup-relative ${
                        ctx.theme.isDark.value
                            ? 'upup-panel-sheen-dark upup-bg-gradient-to-b upup-from-[#141b2e] upup-to-[#0a0e1a] upup-ring-1 upup-ring-white/10 upup-shadow-[0_24px_70px_-24px_rgba(2,6,23,0.85)]'
                            : 'upup-bg-gradient-to-b upup-from-white upup-to-[#dde6f0] upup-ring-1 upup-ring-slate-200'
                    } upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-px-5 upup-py-4`,
                    {
                        [ctx.theme.slotOverrides.containerFull!]:
                            ctx.theme.slotOverrides.containerFull &&
                            !ctx.props.mini,
                        [ctx.theme.slotOverrides.containerMini!]:
                            ctx.theme.slotOverrides.containerMini &&
                            ctx.props.mini,
                    },
                )"
            >
                <slot>
                    <UploaderPanel />
                </slot>

                <ImageEditorStub v-if="ctx.props.imageEditor.enabled" />

                <!-- Branding renders INSIDE UploaderPanel now, so the idle
                     dashed frame wraps it. -->
            </section>
        </div>

        <input
            ref="ctx.inputRef"
            type="file"
            :accept="ctx.props.allowedFileTypes"
            :multiple="ctx.props.multiple"
            style="display: none"
            data-testid="upup-file-input"
            @change="onInputChange"
        />
    </div>
</template>
