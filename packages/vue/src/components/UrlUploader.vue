<script setup lang="ts">
import { ref } from 'vue'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/root-context'
import useFetchFileByUrl from '../composables/useFetchFileByUrl'
import { cn } from '../lib/tailwind'
import AdapterViewContainer from './shared/AdapterViewContainer.vue'

const { core } = useUploaderRuntime()
const { setFiles } = useUploaderFiles()
const { setActiveAdapter } = useUploaderSource()
const { translations: tr } = useUploaderI18n()
const { icons: { LoaderIcon } } = useUploaderOptions()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

const url = ref('')
const { loading, fetchImage } = useFetchFileByUrl()

async function handleFormSubmit(e: Event) {
    e.preventDefault()
    core?.emit('url-submit', { url: url.value })
    const file = await fetchImage(url.value)
    if (file) {
        Object.assign(file, { url: url.value })
        setFiles([file])
        url.value = ''
        setActiveAdapter(undefined)
    }
}
</script>

<template>
    <AdapterViewContainer data-testid="upup-url-uploader" data-upup-slot="url-uploader">
        <form @submit.prevent="handleFormSubmit" class="upup-px-3 upup-py-2">
            <input
                type="url"
                name="upup-url"
                :aria-label="tr.enterFileUrl"
                :placeholder="tr.enterFileUrl"
                :class="cn(
                    'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
                    {
                        'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]': dark,
                    },
                    slotClasses.urlInput,
                )"
                v-model="url"
            />
            <button
                :class="cn(
                    'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                    {
                        'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': dark,
                    },
                    slotClasses.urlFetchButton,
                )"
                type="submit"
                :disabled="!url"
            >
                <component :is="LoaderIcon" v-if="loading" />
                <template v-else>{{ tr.fetch }}</template>
            </button>
        </form>
    </AdapterViewContainer>
</template>
