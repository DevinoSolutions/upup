<script setup lang="ts">
import { cn } from '@upup/core'
import type { UploaderProps } from './shared/types'
import useRootProvider from './composables/useRootProvider'
import { provideRootContext } from './context/root-context'
import MainBox from './components/MainBox.vue'
import ImageEditorStub from './components/ImageEditorStub.vue'
import { devinoDark, devinoLight, logoDark, logoLight } from './assets/logos'

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
const ctx = useRootProvider(props)
provideRootContext(ctx)

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
                    `upup-shadow-wrapper upup-relative ${
                        ctx.theme.isDark.value
                            ? 'upup-bg-[#232323]'
                            : 'upup-bg-white'
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
                    <MainBox />
                </slot>

                <ImageEditorStub v-if="ctx.props.imageEditor.enabled" />

                <div
                    v-if="!ctx.props.mini && ctx.props.showBranding !== false"
                    data-testid="upup-branding"
                    class="upup-flex upup-w-full upup-flex-col upup-items-center upup-justify-between upup-gap-1 md:upup-flex-row"
                >
                    <a
                        href="https://useupup.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="upup-flex upup-items-center upup-gap-[5px]"
                    >
                        <img
                            v-if="ctx.theme.isDark.value"
                            :src="logoDark"
                            :width="61"
                            :height="13"
                            alt="logo-dark"
                        />
                        <img
                            v-else
                            :src="logoLight"
                            :width="61"
                            :height="13"
                            alt="logo-light"
                        />
                    </a>
                    <a
                        href="https://devino.ca/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
                    >
                        <span
                            :class="cn(
                                'upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm',
                                {
                                    'upup-text-gray-300 dark:upup-text-gray-300':
                                        ctx.theme.isDark.value,
                                },
                            )"
                        >
                            {{ ctx.translations.builtBy }}
                        </span>
                        <img
                            v-if="ctx.theme.isDark.value"
                            :src="devinoDark"
                            :width="61"
                            :height="13"
                            alt="logo-dark"
                        />
                        <img
                            v-else
                            :src="devinoLight"
                            :width="61"
                            :height="13"
                            alt="logo-light"
                        />
                    </a>
                </div>
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
