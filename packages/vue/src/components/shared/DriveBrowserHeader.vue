<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { type DriveFolder, type DriveUser } from '@upupjs/core'
import {
    useUploaderI18n,
    useUploaderSource,
    useUploaderTheme,
} from '../../context/uploader-context'
import { useSourceViewHeaderExtra } from '../../context/source-view-header-extra'
import { cn } from '@upupjs/core/internal'
import Icon from '../Icon'

const props = defineProps<{
    path: DriveFolder[]
    setPath: (newPath: DriveFolder[]) => void
    handleSignOut: () => Promise<void>
    showSearch: boolean
    searchTerm: string
    onSearch: (value: string) => void
    user?: DriveUser | undefined
}>()

const { setActiveSource } = useUploaderSource()
const { translations: tr } = useUploaderI18n()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()

const headerExtraHostRef = useSourceViewHeaderExtra()
const headerExtraHost = computed(() => headerExtraHostRef?.value ?? null)

// Once navigated into a folder we show a Back affordance + the current folder
// name, not a full breadcrumb trail (long provider folder names blew the row
// up, and multi-level jumps weren't worth the fragility).
const navigated = computed(() => props.path.length > 1)
const currentFolder = computed(() => props.path[props.path.length - 1])
const hasFilter = computed(() => props.searchTerm.trim().length > 0)

// Collapsed/expanded search lives here; the term itself stays in DriveBrowser.
const searchOpen = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

// Focus the field the moment it expands.
watch(searchOpen, open => {
    if (open) void nextTick(() => searchInputRef.value?.focus())
})

function onLogout() {
    void props.handleSignOut()
    setActiveSource(undefined)
}
</script>

<template>
    <div v-if="props.user" data-upup-slot="drive-browser-header">
        <!-- Account controls live in the SourceView header row (portal), next
             to Back, separated by a hairline — not in their own strip. -->
        <Teleport v-if="headerExtraHost" :to="headerExtraHost">
            <div
                class="upup-relative upup-flex upup-h-6 upup-w-6 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full"
            >
                <img
                    v-if="!!props.user.picture"
                    :alt="props.user.name"
                    :src="props.user.picture"
                    class="upup-bg-center upup-object-cover"
                />
                <Icon v-else name="user" class="upup-text-xl" />
            </div>
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
            v-if="props.showSearch || navigated"
            :class="
                cn(
                    'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                    {
                        'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': dark,
                    },
                    slotClasses.driveHeader,
                )
            "
        >
            <button
                v-if="navigated"
                type="button"
                data-testid="upup-drive-back"
                data-upup-slot="drive-back"
                :aria-label="tr.overlayBack"
                :class="
                    cn(
                        'upup-fx-hover-lift upup-fx-press upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
                        dark
                            ? 'upup-text-[#e2e8f0] hover:upup-bg-white/[0.08]'
                            : 'upup-text-[#334155] hover:upup-bg-black/[0.05]',
                    )
                "
                @click="props.setPath(props.path.slice(0, -1))"
            >
                <Icon name="chevron-left" />
            </button>
            <span
                v-if="navigated && !searchOpen"
                data-upup-slot="drive-current-folder"
                :title="currentFolder?.name"
                class="upup-min-w-0 upup-flex-1 upup-truncate upup-font-medium"
            >
                {{ currentFolder?.name }}
            </span>
            <button
                v-if="navigated && props.showSearch && !searchOpen"
                type="button"
                data-testid="upup-drive-search-toggle"
                data-upup-slot="drive-search-toggle"
                :aria-label="tr.search"
                :aria-expanded="false"
                :class="
                    cn(
                        'upup-fx-hover-lift upup-fx-press upup-ml-auto upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
                        hasFilter
                            ? 'upup-text-[#0ea5e9]'
                            : dark
                              ? 'upup-text-[#94a3b8] hover:upup-bg-white/[0.08]'
                              : 'upup-text-[#64748b] hover:upup-bg-black/[0.05]',
                    )
                "
                @click="searchOpen = true"
            >
                <Icon name="search" />
            </button>
            <div
                v-if="props.showSearch && (!navigated || searchOpen)"
                :class="
                    cn(
                        'upup-relative upup-min-w-0 upup-flex-1',
                        navigated && 'upup-fx-search-expand',
                        slotClasses.driveSearchContainer,
                    )
                "
            >
                <input
                    ref="searchInputRef"
                    type="search"
                    name="upup-drive-search"
                    data-testid="upup-drive-search-input"
                    data-upup-slot="drive-search-input"
                    :aria-label="tr.search"
                    :class="
                        cn(
                            'upup-w-full upup-rounded-lg upup-px-3 upup-py-1.5 upup-pl-8 upup-text-xs upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
                            dark
                                ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                                : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
                            slotClasses.driveSearchInput,
                        )
                    "
                    :placeholder="tr.search"
                    :value="props.searchTerm"
                    @input="
                        props.onSearch(($event.target as HTMLInputElement).value)
                    "
                    @keydown.esc="searchOpen = false"
                    @blur="
                        () => {
                            if (!props.searchTerm) searchOpen = false
                        }
                    "
                />
                <Icon
                    name="search"
                    class="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]"
                />
            </div>
        </div>
    </div>
</template>
