<script setup lang="ts">
import { type DriveFolder, type DriveUser } from '@upup/core'
import {
    useUploaderI18n,
    useUploaderSource,
    useUploaderTheme,
} from '../../context/uploader-context'
import { cn } from '@upup/core'
import Icon from '../Icon'

const props = defineProps<{
    path: DriveFolder[]
    setPath: (newPath: DriveFolder[]) => void
    handleSignOut: () => Promise<void>
    showSearch: boolean
    searchTerm: string
    onSearch: (value: string) => void
    user?: DriveUser
}>()

const { setActiveSource } = useUploaderSource()
const { translations: tr } = useUploaderI18n()
const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
</script>

<template>
    <div v-if="props.user" data-upup-slot="drive-browser-header">
        <div
            :class="cn(
                'upup-shadow-bottom upup-grid upup-grid-cols-[1fr,auto] upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
                {
                    'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]': dark,
                },
                slotClasses.driveHeader,
            )"
        >
            <template v-if="!!props.path">
                <div class="upup-flex upup-items-center upup-gap-1">
                    <p
                        v-for="(p, i) in props.path"
                        :key="p.id"
                        :class="cn(
                            'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
                            {
                                'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]': dark,
                            },
                        )"
                        :style="{
                            maxWidth: 100 / props.path.length + '%',
                            pointerEvents: i === props.path.length - 1 ? 'none' : 'auto',
                        }"
                        @click="props.setPath(props.path.slice(0, i + 1))"
                    >
                        <span class="upup-group-hover:upup-underline upup-truncate">
                            {{ p.name }}
                        </span>
                        <template v-if="i !== props.path.length - 1">
                            {{ ' ' }}&gt;{{ ' ' }}
                        </template>
                    </p>
                </div>
            </template>
            <div class="upup-flex upup-items-center upup-gap-2">
                <div class="upup-relative upup-flex upup-h-8 upup-w-8 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full">
                    <template v-if="!!props.user.picture">
                        <img
                            :alt="props.user.name"
                            :src="props.user.picture"
                            class="upup-bg-center upup-object-cover"
                        />
                    </template>
                    <template v-if="!props.user.picture">
                        <Icon name="user" class="upup-text-xl" />
                    </template>
                </div>

                <button
                    :class="cn(
                        'upup-hover:upup-underline upup-text-blue-600',
                        {
                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark,
                        },
                        slotClasses.driveLogoutButton,
                    )"
                    @click="() => { props.handleSignOut(); setActiveSource(undefined) }"
                >
                    {{ tr.logOut }}
                </button>
            </div>
        </div>

        <template v-if="props.showSearch">
            <div
                :class="cn(
                    'upup-relative upup-h-fit upup-bg-black/[0.025] upup-px-3 upup-py-2',
                    {
                        'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]': dark,
                    },
                    slotClasses.driveSearchContainer,
                )"
            >
                <input
                    type="search"
                    name="upup-drive-search"
                    :aria-label="tr.search"
                    :class="cn(
                        'upup-h-fit upup-w-full upup-rounded-md upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-pl-8 upup-text-xs upup-outline-none upup-transition-all upup-duration-300',
                        {
                            'upup-bg-white/5 upup-text-[#6D6D6D] dark:upup-bg-white/5 dark:upup-text-[#6D6D6D]': dark,
                        },
                        slotClasses.driveSearchInput,
                    )"
                    :placeholder="tr.search"
                    :value="props.searchTerm"
                    @input="props.onSearch(($event.target as HTMLInputElement).value)"
                />
                <Icon name="search" class="upup-absolute upup-left-5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]" />
            </div>
        </template>
    </div>
</template>
