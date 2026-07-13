<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatUiMessage as t } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import { useUploaderI18n, useUploaderTheme } from '../context/uploader-context'
import { fileGetIsImage, fileGetIsPdf, fileGetIsText, PREVIEW_MAX_TEXT_SIZE, PREVIEW_TEXT_TRUNCATE_LENGTH } from '@upupjs/core/internal'

const props = defineProps<{
    fileUrl: string
    fileName: string
    fileType: string
    fileSize?: number
}>()

const emit = defineEmits<{
    close: []
    stopPropagation: [e: MouseEvent]
}>()

const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
const { translations: tr } = useUploaderI18n()

const isImage = computed(() => fileGetIsImage(props.fileType))
const isPdf = computed(() => fileGetIsPdf(props.fileType, props.fileName))
const isText = computed(() => fileGetIsText(props.fileType, props.fileName))

const isOversizedText = computed(
    () =>
        isText.value &&
        props.fileSize !== undefined &&
        props.fileSize > PREVIEW_MAX_TEXT_SIZE,
)

const textContent = ref('')
const textLoading = ref(false)
const textError = ref<string>()
const isTruncated = ref(false)

function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') emit('close')
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    loadText()
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

async function loadText() {
    if (!isText.value) return
    try {
        textLoading.value = true

        if (isOversizedText.value) {
            const res = await fetch(props.fileUrl)
            const reader = res.body?.getReader()
            if (!reader) throw new Error('Cannot read file')

            const decoder = new TextDecoder()
            let result = ''
            let done = false

            while (!done && result.length < PREVIEW_TEXT_TRUNCATE_LENGTH) {
                const { value, done: streamDone } = await reader.read()
                done = streamDone
                if (value) {
                    result += decoder.decode(value, { stream: !done })
                }
            }
            reader.cancel()

            const wasTruncated = !done || result.length > PREVIEW_TEXT_TRUNCATE_LENGTH
            if (wasTruncated) {
                result = result.slice(0, PREVIEW_TEXT_TRUNCATE_LENGTH)
            }
            isTruncated.value = wasTruncated
            textContent.value = result
        } else {
            const res = await fetch(props.fileUrl)
            textContent.value = await res.text()
        }
    } catch (e) {
        textError.value = (e as Error)?.message || 'Preview error'
    } finally {
        textLoading.value = false
    }
}

function onBackdropClick() {
    emit('close')
}

function onContentClick(e: MouseEvent) {
    emit('stopPropagation', e)
    e.stopPropagation()
}
</script>

<template>
    <Teleport to="body">
        <div class="upup-scope" data-upup-slot="file-preview-portal">
            <div
                class="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/40"
                role="dialog"
                aria-modal="true"
                :aria-label="fileName"
                @click="onBackdropClick"
            >
                <div class="upup-relative upup-h-[90vh] upup-w-[90vw] upup-p-4">
                    <div
                        :class="cn(
                            'upup-absolute upup-inset-0 upup-m-4 upup-bg-white',
                            { 'upup-bg-[#232323] dark:upup-bg-[#232323]': dark },
                            slotClasses.filePreviewPortal,
                        )"
                        @click="onContentClick"
                    >
                        <button
                            type="button"
                            :aria-label="tr.cancel"
                            class="upup-absolute upup-right-3 upup-top-3 upup-z-10 upup-flex upup-size-8 upup-items-center upup-justify-center upup-rounded-full upup-bg-black/70 upup-text-sm upup-font-semibold upup-text-white upup-shadow-sm hover:upup-bg-black focus:upup-outline-none focus:upup-ring-2 focus:upup-ring-white"
                            @click="emit('close')"
                        >
                            x
                        </button>
                        <template v-if="isImage">
                            <img
                                :src="fileUrl"
                                :alt="fileName"
                                class="upup-h-full upup-w-full upup-rounded upup-object-contain"
                            />
                        </template>
                        <template v-if="isPdf">
                            <embed
                                :src="fileUrl"
                                type="application/pdf"
                                width="100%"
                                height="100%"
                                class="upup-rounded"
                                :title="fileName"
                            />
                        </template>
                        <template v-if="!isImage && !isPdf">
                            <template v-if="isText">
                                <div class="upup-h-full upup-w-full upup-overflow-auto upup-p-4 upup-font-mono upup-text-xs">
                                    <p v-if="textLoading">{{ tr.loading }}</p>
                                    <p v-if="textError">
                                        {{ t(tr.previewError, { message: textError }) }}
                                    </p>
                                    <template v-if="!textLoading && !textError">
                                        <pre class="upup-whitespace-pre-wrap">{{ textContent }}</pre>
                                        <div
                                            v-if="isTruncated"
                                            class="upup-mt-4 upup-rounded upup-border upup-border-yellow-500/30 upup-bg-yellow-500/10 upup-px-3 upup-py-2 upup-text-xs upup-text-yellow-400"
                                        >
                                            Content truncated - file is too large to preview in full.
                                        </div>
                                    </template>
                                </div>
                            </template>
                            <template v-if="!isText">
                                <object
                                    :data="fileUrl"
                                    width="100%"
                                    height="100%"
                                    :name="fileName"
                                    :type="fileType"
                                >
                                    <p>{{ tr.loading }}</p>
                                </object>
                            </template>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>
