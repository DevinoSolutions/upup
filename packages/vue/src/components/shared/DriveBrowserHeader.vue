<script setup lang="ts">
import { computed } from 'vue'
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

// Breadcrumbs only once the user has navigated into a folder — the root crumb
// ("Drive") is redundant next to the provider name in the top row.
const showBreadcrumbs = computed(() => props.path.length > 1)

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
            v-if="props.showSearch || showBreadcrumbs"
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
            <div
                v-if="showBreadcrumbs"
                class="upup-flex upup-min-w-0 upup-shrink upup-items-center upup-gap-1"
            >
                <p
                    v-for="(p, i) in props.path"
                    :key="p.id"
                    :class="
                        cn(
                            'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
                            {
                                'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                                    dark,
                            },
                        )
                    "
                    :style="{
                        maxWidth: 100 / props.path.length + '%',
                        pointerEvents:
                            i === props.path.length - 1 ? 'none' : 'auto',
                    }"
                    @click="props.setPath(props.path.slice(0, i + 1))"
                >
                    <span class="upup-group-hover:upup-underline upup-truncate">
                        {{ p.name }}
                    </span>
                    <template v-if="i !== props.path.length - 1"> &gt; </template>
                </p>
            </div>
            <div
                v-if="props.showSearch"
                :class="
                    cn(
                        'upup-relative upup-min-w-0 upup-flex-1',
                        slotClasses.driveSearchContainer,
                    )
                "
            >
                <input
                    type="search"
                    name="upup-drive-search"
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
                />
                <Icon
                    name="search"
                    class="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]"
                />
            </div>
        </div>
    </div>
</template>
