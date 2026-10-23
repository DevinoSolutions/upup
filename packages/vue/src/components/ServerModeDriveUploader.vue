<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderSource,
    useUploaderTheme,
} from '../context/uploader-context'
import { useSourceViewHeaderExtra } from '../context/source-view-header-extra'
import {
    useServerModeDrive,
    type ServerDriveFile,
    type ServerModeProvider,
} from '../composables/useServerModeDrive'
import SourceViewContainer from './shared/SourceViewContainer.vue'
import DriveAuthFallback from './shared/DriveAuthFallback.vue'
import { errorCodeToMessageKey } from '@useupup/core'
import { cn } from '@useupup/core/internal'

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
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
const { translator, translations: tr } = useUploaderI18n()
const { setActiveSource } = useUploaderSource()
const headerExtraHostRef = useSourceViewHeaderExtra()
const headerExtraHost = computed(() => headerExtraHostRef?.value ?? null)
const { state, search, setSearch, refresh, transfer, startAuth, signOut } =
    useServerModeDrive(props.provider)

function onLogout() {
    void signOut().then(ok => {
        if (ok) setActiveSource(undefined)
    })
}

// A failed transfer stays in this view: its message shows in the same
// drive-error slot as a list error and the file list is kept for a retry.
const transferError = ref<{ message: string; code?: string | undefined } | null>(null)
const shownError = computed(() =>
    state.value.status === 'error' ? state.value : transferError.value,
)
const errorText = computed(() => {
    const e = shownError.value
    if (!e) return ''
    return e.code && translator
        ? translator(`errors.${errorCodeToMessageKey(e.code)}`, {
              code: e.code,
              message: e.message,
          })
        : e.message
})
const selected = ref<Set<string>>(new Set())
const transferring = ref(false)
// Leaving the current listing (folder, search) or the view clears a stale transfer error.
function navigate(opts: { folderId?: string; search?: string }) {
    transferError.value = null
    return refresh(opts)
}
function cancel() {
    transferError.value = null
    props.onBack?.()
}

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
    transferError.value = null
    try {
        for (const file of files.value.filter(f => selected.value.has(f.id))) {
            const result = await transfer(file)
            if (result.status === 'reauth') {
                startAuth()
                return
            }
            if (result.status === 'error') {
                transferError.value = result
                return
            }
            toggle(file.id)
        }
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
            <Teleport v-if="headerExtraHost" :to="headerExtraHost">
                <button
                    :class="
                        cn(
                            'upup-hover:upup-underline upup-text-xs upup-font-medium upup-text-[#0284c7]',
                            {
                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark,
                            },
                            slotClasses.driveLogoutButton,
                        )
                    "
                    @click="onLogout"
                >
                    {{ tr.logOut }}
                </button>
                <span
                    aria-hidden="true"
                    :class="
                        cn(
                            'upup-h-4 upup-w-px',
                            dark ? 'upup-bg-white/15' : 'upup-bg-black/15',
                        )
                    "
                />
            </Teleport>
            <div
                data-testid="upup-server-drive-browser"
                class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
            >
                <div
                    :class="cn(
                        'upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2.5',
                        dark
                            ? 'upup-border-white/[0.06] upup-text-[#e2e8f0]'
                            : 'upup-border-black/[0.06] upup-text-gray-800',
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
                        @keydown.enter="navigate({ search: ($event.target as HTMLInputElement).value })"
                        placeholder="Search…"
                        :class="cn(
                            'upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs',
                            dark
                                ? 'upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100'
                                : 'upup-border-gray-300 upup-bg-white',
                        )"
                    />
                </div>
                <div class="upup-overflow-auto upup-p-2">
                    <p
                        v-if="shownError"
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
                            'upup-fx-hover-lift upup-mb-1.5 upup-flex upup-w-full upup-items-center upup-gap-3 upup-rounded-[11px] upup-px-3 upup-py-2.5 upup-text-left upup-text-sm upup-ring-1',
                            selected.has(file.id)
                                ? 'upup-bg-[#0ea5e9]/10 upup-ring-[#38bdf8]/35'
                                : dark
                                  ? 'upup-bg-white/[0.04] upup-text-[#e2e8f0] upup-ring-white/[0.06] hover:upup-bg-white/[0.07]'
                                  : 'upup-bg-black/[0.03] upup-text-gray-800 upup-ring-black/[0.06] hover:upup-bg-black/[0.05]',
                        )"
                        @click="file.isFolder ? navigate({ folderId: file.id }) : toggle(file.id)"
                    >
                        <span
                            class="upup-flex upup-h-[30px] upup-w-[30px] upup-flex-none upup-items-center upup-justify-center upup-rounded-[8px] upup-bg-white/[0.05]"
                            aria-hidden="true"
                        >
                            <svg
                                v-if="file.isFolder"
                                viewBox="0 0 24 24"
                                width="17"
                                height="17"
                                fill="none"
                                stroke="#38bdf8"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            </svg>
                            <svg
                                v-else
                                viewBox="0 0 24 24"
                                width="17"
                                height="17"
                                fill="none"
                                :stroke="dark ? '#94a3b8' : '#64748b'"
                                stroke-width="1.6"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                                <path d="M14 3v4h4" />
                            </svg>
                        </span>
                        <span class="upup-flex-1 upup-truncate">{{ file.name }}</span>
                        <span
                            v-if="file.size != null && !file.isFolder"
                            class="upup-text-xs upup-opacity-60"
                        >
                            {{ formatBytes(file.size) }}
                        </span>
                    </button>
                </div>
                <div
                    :class="cn(
                        'upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3',
                        dark ? 'upup-border-white/[0.06]' : 'upup-border-black/[0.06]',
                    )"
                >
                    <button
                        type="button"
                        class="upup-text-sm upup-opacity-70 hover:upup-opacity-100"
                        @click="cancel()"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        :disabled="selected.size === 0 || transferring"
                        class="upup-fx-press upup-rounded-lg upup-bg-[#0ea5e9] upup-px-3 upup-py-1.5 upup-text-sm upup-font-medium upup-text-white hover:upup-bg-[#0284c7] disabled:upup-opacity-50"
                        @click="handleTransfer()"
                    >
                        {{ transferring
                            ? 'Uploading…'
                            : `Add files${selected.size ? ` (${selected.size})` : ''}` }}
                    </button>
                </div>
            </div>
        </template>
    </SourceViewContainer>
</template>
