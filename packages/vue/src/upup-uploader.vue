<script setup lang="ts">
import type { UpupUploaderProps } from './shared/types'
import useRootProvider from './composables/useRootProvider'
import { provideRootContext } from './context/root-context'
import MainBox from './components/MainBox.vue'

const props = defineProps<UpupUploaderProps>()
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
        :data-state="ctx.upload.uploadStatus?.toLowerCase() ?? 'idle'"
        :lang="ctx.lang"
        :dir="ctx.dir"
    >
        <slot>
            <MainBox />
        </slot>
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
