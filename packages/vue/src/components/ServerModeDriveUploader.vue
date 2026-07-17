<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
} from '../context/uploader-context'
import {
    useServerModeDrive,
    type ServerDriveFile,
    type ServerModeProvider,
} from '../composables/useServerModeDrive'
import SourceViewContainer from './shared/SourceViewContainer.vue'
import DriveAuthFallback from './shared/DriveAuthFallback.vue'
import { errorCodeToMessageKey } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'

const props = defineProps<{
    provider: ServerModeProvider
    onBack?: () => void
    dataUpupSlot?: string | undefined
}>()

const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    'one-drive': 'OneDrive',
    'dropbox': 'Dropbox',
    'box': 'Box',
}

const resolvedSlot = computed(() => props.dataUpupSlot ?? `drive-browser-${props.provider}`)

const { icons } = useUploaderOptions()
const { isDark: dark } = useUploaderTheme()
const { translator } = useUploaderI18n()
const { state, search, setSearch, refresh, transfer, startAuth } =
    useServerModeDrive(props.provider)

const errorText = computed(() => {
    if (state.value.status !== 'error') return ''
    return state.value.code && translator
        ? translator(`errors.${errorCodeToMessageKey(state.value.code)}`, {
              code: state.value.code,
          })
        : state.value.message
})
const selected = ref<Set<string>>(new Set())
const transferring = ref(false)

const isLoading = computed(() =>
    state.value.status === 'loading' || state.value.status === 'idle',
)
const files = computed<ServerDriveFile[]>(() =>
    state.value.status === 'ready' ? state.value.files : [],
)

function toggle(id: string) {
    const next = new Set(selected.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selected.value = next
}

async function handleTransfer() {
    transferring.value = true
    try {
        for (const file of files.value.filter(f => selected.value.has(f.id))) {
            const result = await transfer(file)
            if (result.status === 'reauth') {
                startAuth()
                return
            }
        }
        selected.value = new Set()
        props.onBack?.()
    } finally {
        transferring.value = false
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<template>
    <DriveAuthFallback
        v-if="state.status === 'reauth'"
        :provider-name="PROVIDER_LABEL[props.provider]"
        :on-retry="startAuth"
    />
    <SourceViewContainer
        v-else
        :is-loading="isLoading"
        :data-upup-slot="resolvedSlot"
    >
        <component :is="icons.LoaderIcon" v-if="isLoading" />
        <template v-else>
            <div
                data-testid="upup-server-drive-browser"
                class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
            >
                <div
                    :class="cn(
                        'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2',
                        dark ? 'upup-border-gray-700' : 'upup-border-gray-200',
                    )"
                    data-upup-slot="drive-browser-header"
                >
                    <span class="upup-text-sm upup-font-medium">
                        {{ PROVIDER_LABEL[props.provider] }}
                    </span>
                    <input
                        type="search"
                        name="upup-drive-search"
                        aria-label="Search"
                        :value="search"
                        @input="setSearch(($event.target as HTMLInputElement).value)"
                        @keydown.enter="refresh({ search: ($event.target as HTMLInputElement).value })"
                        placeholder="Search..."
                        :class="cn(
                            'upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs',
                            dark
                                ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100'
                                : 'upup-border-gray-300 upup-bg-white',
                        )"
                    />
                </div>
                <div class="upup-overflow-auto">
                    <p
                        v-if="state.status === 'error'"
                        data-testid="upup-drive-error"
                        data-upup-slot="drive-error"
                        role="alert"
                        :class="cn(
                            'upup-p-4 upup-text-sm',
                            dark ? 'upup-text-red-400' : 'upup-text-red-600',
                        )"
                    >
                        {{ errorText }}
                    </p>
                    <button
                        v-for="file in files"
                        :key="file.id"
                        type="button"
                        data-upup-slot="drive-browser-item"
                        :data-selected="selected.has(file.id)"
                        :class="cn(
                            'upup-flex upup-w-full upup-items-center upup-gap-3 upup-border-b upup-px-4 upup-py-2 upup-text-left upup-text-sm',
                            selected.has(file.id) && 'upup-bg-[#f0f9ff] dark:upup-bg-[#0c4a6e]/30',
                            dark
                                ? 'upup-border-gray-700 upup-text-gray-100 hover:upup-bg-gray-700'
                                : 'upup-border-gray-200 hover:upup-bg-gray-50',
                        )"
                        @click="file.isFolder ? refresh({ folderId: file.id }) : toggle(file.id)"
                    >
                        <span>{{ file.isFolder ? '📁' : '📄' }}</span>
                        <span class="upup-flex-1 upup-truncate">{{ file.name }}</span>
                        <span
                            v-if="file.size != null && !file.isFolder"
                            class="upup-text-xs upup-opacity-60"
                        >
                            {{ formatBytes(file.size) }}
                        </span>
                    </button>
                </div>
                <div class="upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3">
                    <button
                        type="button"
                        class="upup-text-sm upup-opacity-70 hover:upup-opacity-100"
                        @click="props.onBack?.()"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        :disabled="selected.size === 0 || transferring"
                        class="upup-rounded upup-bg-[#0ea5e9] upup-px-3 upup-py-1.5 upup-text-sm upup-text-white disabled:upup-opacity-50"
                        @click="handleTransfer()"
                    >
                        {{ transferring
                            ? 'Uploading...'
                            : `Add files${selected.size ? ` (${selected.size})` : ''}` }}
                    </button>
                </div>
            </div>
        </template>
    </SourceViewContainer>
</template>
