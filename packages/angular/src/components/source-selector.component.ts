import { Component, inject } from '@angular/core'
import {
    FileSource,
    formatUiMessage as t,
    pluralUiMessage as plural,
    type IconName,
} from '@upupjs/core'
import { cn, sourceNameKeys } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { IconComponent } from './icon.component'

/**
 * SourceSelector — port of SourceSelector. Centered idle surface: a prompt line
 * (drop-here / browse / optional select-a-folder / import-from), a capped-width
 * chip grid (one chip per configured source), and an iconified limits caption.
 * The add-more sheet supplies its own chrome, so this no longer swaps in a
 * header bar. No hint animations.
 *
 * Source chip testids: upup-source-<id>. Chip + caption icons are registry
 * glyphs rendered directly via <upup-icon>.
 */

const SOURCE_ICON_NAME: Record<FileSource, IconName> = {
    [FileSource.LOCAL]: 'my-device',
    [FileSource.GOOGLE_DRIVE]: 'google-drive',
    [FileSource.ONE_DRIVE]: 'one-drive',
    [FileSource.DROPBOX]: 'dropbox',
    [FileSource.BOX]: 'box',
    [FileSource.URL]: 'link',
    [FileSource.CAMERA]: 'camera',
    [FileSource.MICROPHONE]: 'audio',
    [FileSource.SCREEN]: 'screen-capture',
}

// Canonical chip order (mirrors React's uploadSourceObject value order), filtered
// by the configured sources — NOT the sources-array order.
const SOURCE_ORDER: FileSource[] = [
    FileSource.LOCAL,
    FileSource.GOOGLE_DRIVE,
    FileSource.ONE_DRIVE,
    FileSource.DROPBOX,
    FileSource.BOX,
    FileSource.URL,
    FileSource.CAMERA,
    FileSource.MICROPHONE,
    FileSource.SCREEN,
]

interface SourceEntry {
    id: FileSource
    name: string
    iconName: IconName
}

@Component({
    selector: 'upup-source-selector',
    standalone: true,
    imports: [IconComponent],
    template: `
        <div
            data-testid="upup-source-selector"
            data-upup-slot="source-selector"
            class="upup-animate-fx-view upup-relative upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-rounded-lg upup-px-4 upup-py-6"
        >
            @if (!store.uiProps.mini) {
                <div [class]="promptClass">
                    <span>{{ store.translations().dropFilesHere }}</span>
                    <button
                        type="button"
                        data-testid="upup-browse-files"
                        [class]="linkButtonClass"
                        (click)="handleBrowseFilesClick()"
                    >
                        {{ store.translations().browseFiles }}
                    </button>
                    @if (store.uiProps.folderPickerButtonVisible) {
                        <span>{{ store.translations().or }}</span>
                        <button
                            type="button"
                            [class]="linkButtonClass"
                            (click)="handleSelectFolderClick()"
                        >
                            {{ store.translations().selectAFolder }}
                        </button>
                    }
                    <span>{{ store.translations().orImportFrom }}</span>
                </div>
                <div [class]="chipsListClass">
                    @for (source of chosenSources; track source.id) {
                        <button
                            type="button"
                            [attr.data-testid]="'upup-source-' + source.id"
                            [class]="chipClass"
                            (click)="handleSourceClick(source.id)"
                        >
                            <span [class]="chipIconBoxClass">
                                <upup-icon
                                    [name]="source.iconName"
                                    [class]="chipIconClass"
                                />
                            </span>
                            <span [class]="chipLabelClass">{{
                                source.name
                            }}</span>
                        </button>
                    }
                </div>
            }

            @if (store.uiProps.mini) {
                <button
                    type="button"
                    (click)="handleBrowseFilesClick()"
                    class="upup-flex upup-cursor-pointer upup-flex-col upup-items-center upup-justify-center upup-gap-2 upup-rounded-lg upup-p-2"
                >
                    <upup-icon
                        name="upload"
                        [size]="32"
                        [class]="miniIconClass"
                    />
                    <p [class]="miniTextClass">Drag or browse to upload</p>
                </button>
            } @else if (hasLimitsCaption) {
                <div
                    data-upup-slot="limits-caption"
                    [class]="limitsCaptionClass"
                >
                    @if (typeConstraint) {
                        <span>{{ typeConstraint }}</span>
                    }
                    @if (typeConstraint && (showFilesLimit || showSizeLimit)) {
                        <span aria-hidden="true">&middot;</span>
                    }
                    @if (showFilesLimit) {
                        <span
                            class="upup-inline-flex upup-items-center upup-gap-1.5"
                        >
                            <span aria-hidden="true" class="upup-inline-flex">
                                <upup-icon
                                    name="stacked-files"
                                    [class]="'upup-h-4 upup-w-4'"
                                />
                            </span>
                            {{ filesMaxText }}
                        </span>
                    }
                    @if (showFilesLimit && showSizeLimit) {
                        <span aria-hidden="true">&middot;</span>
                    }
                    @if (showSizeLimit) {
                        <span
                            class="upup-inline-flex upup-items-center upup-gap-1.5"
                        >
                            <span aria-hidden="true" class="upup-inline-flex">
                                <upup-icon
                                    name="storage"
                                    [class]="'upup-h-4 upup-w-4'"
                                />
                            </span>
                            {{ sizeEachText }}
                        </span>
                    }
                </div>
            }
        </div>
    `,
})
export class SourceSelectorComponent {
    readonly store = inject(UpupStore)

    get chosenSources(): SourceEntry[] {
        const translations = this.store.translations() as Record<string, string>
        const sources = this.store.uiProps.sources
        return SOURCE_ORDER.filter(id => sources.includes(id)).map(id => {
            const nameKey = sourceNameKeys[id]
            return {
                id,
                name: translations[nameKey] ?? nameKey,
                iconName: SOURCE_ICON_NAME[id],
            }
        })
    }

    // ── Limits caption ──────────────────────────────────────────────────────────

    get typeConstraint(): string | null {
        const allowed = this.store.uiProps.allowedFileTypes
        if (!allowed || allowed === '*/*' || allowed === '*') return null
        const humanized = allowed
            .split(',')
            .map(s => s.trim())
            .map(m => {
                if (m.startsWith('.')) return m
                const [type, sub] = m.split('/')
                if (!type || !sub) return m
                if (sub === '*')
                    return type.charAt(0).toUpperCase() + type.slice(1) + 's'
                return sub.toUpperCase()
            })
            .join(', ')
        return humanized + ' only'
    }

    get showFilesLimit(): boolean {
        return this.store.uiProps.limit > 1
    }

    get showSizeLimit(): boolean {
        const m = this.store.uiProps.maxFileSize
        return !!(m?.size && m?.unit)
    }

    get hasLimitsCaption(): boolean {
        return (
            !!this.typeConstraint || this.showFilesLimit || this.showSizeLimit
        )
    }

    get filesMaxText(): string {
        const tr = this.store.translations()
        const limit = this.store.uiProps.limit
        return t(plural(tr, 'filesMax', limit), { count: limit })
    }

    get sizeEachText(): string {
        const tr = this.store.translations()
        const m = this.store.uiProps.maxFileSize
        return t(tr.sizeEach, { size: m?.size ?? 0, unit: m?.unit ?? '' })
    }

    // ── Class builders ────────────────────────────────────────────────────────

    get promptClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-1.5 upup-gap-y-1 upup-px-2 upup-text-center upup-text-base upup-font-medium md:upup-text-lg',
            dark
                ? 'upup-text-[#e2e8f0] dark:upup-text-[#e2e8f0]'
                : 'upup-text-[#242634]',
        )
    }

    get linkButtonClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-cursor-pointer upup-rounded upup-font-semibold focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8]',
            dark
                ? 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]'
                : 'upup-text-[#0284c7]',
        )
    }

    get chipsListClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-max-w-[420px] upup-flex-wrap upup-items-start upup-justify-center upup-gap-x-6 upup-gap-y-5',
            slotClasses.sourceButtonList ?? '',
        )
    }

    get chipClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-fx-hover-lift upup-fx-press upup-fx-icon-nudge upup-group upup-flex upup-w-[66px] upup-cursor-pointer upup-flex-col upup-items-center upup-gap-[9px] upup-rounded-[14px] focus-visible:upup-outline-none focus-visible:upup-ring-2 focus-visible:upup-ring-[#38bdf8] hover:upup-shadow-none',
            slotClasses.sourceButton ?? '',
        )
    }

    get chipIconBoxClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-h-[52px] upup-w-[52px] upup-items-center upup-justify-center upup-rounded-[14px] upup-ring-1 upup-transition-colors',
            dark
                ? 'upup-bg-white/[0.055] upup-ring-white/[0.06] group-hover:upup-bg-white/[0.09] dark:upup-bg-white/[0.055] dark:upup-ring-white/[0.06]'
                : 'upup-bg-white upup-ring-black/[0.07] group-hover:upup-bg-slate-50',
        )
    }

    get chipIconClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn('upup-h-10 upup-w-10', slotClasses.sourceButtonIcon ?? '')
    }

    get chipLabelClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-text-xs upup-leading-none',
            dark
                ? 'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]'
                : 'upup-text-[#6D6D6D]',
            slotClasses.sourceButtonText ?? '',
        )
    }

    get miniIconClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20',
            dark
                ? 'upup-text-white dark:upup-text-white'
                : 'upup-text-[#0B0B0B]',
        )
    }

    get miniTextClass(): string {
        const dark = this.store.isDark()
        return cn('px-6 upup-text-center upup-text-xs', {
            'upup-text-[#6D6D6D] dark:upup-text-gray-400': !dark,
            'upup-text-gray-400 dark:upup-text-gray-500': dark,
        })
    }

    get limitsCaptionClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-x-2.5 upup-gap-y-1 upup-px-3 upup-text-center upup-text-xs',
            dark
                ? 'upup-text-[#94a3b8] dark:upup-text-[#94a3b8]'
                : 'upup-text-[#6D6D6D]',
        )
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    handleSourceClick(sourceId: FileSource): void {
        this.store.uiProps.onIntegrationClick(sourceId)
        this.store.core.emit('source-click', { sourceId })
        if (sourceId === FileSource.LOCAL) {
            this.store.openFilePicker()
        } else {
            this.store.setActiveSource(sourceId)
        }
    }

    handleBrowseFilesClick(): void {
        const el = this.store.getFileInput()
        if (el) {
            el.removeAttribute('webkitdirectory')
            el.removeAttribute('directory')
        }
        this.store.openFilePicker()
        this.store.core.emit('browse-files', {})
    }

    async handleSelectFolderClick(): Promise<void> {
        const fsWindow = window as Window & {
            showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
        }
        if (fsWindow.showDirectoryPicker) {
            try {
                const directoryHandle = await fsWindow.showDirectoryPicker()
                const collectedFiles: File[] = []

                type IterableDirHandle = {
                    values(): AsyncIterableIterator<
                        FileSystemHandle & {
                            kind: string
                            getFile: () => Promise<File>
                        }
                    >
                }
                async function getFiles(
                    dirHandle: IterableDirHandle,
                    path = '',
                ): Promise<void> {
                    for await (const entry of dirHandle.values()) {
                        const newPath = path
                            ? `${path}/${entry.name}`
                            : entry.name
                        if (entry.kind === 'file') {
                            const pickedFile = await entry.getFile()
                            const file = new File(
                                [await pickedFile.arrayBuffer()],
                                pickedFile.name,
                                {
                                    type: pickedFile.type,
                                    lastModified: pickedFile.lastModified,
                                },
                            )
                            try {
                                Object.defineProperty(
                                    file,
                                    'webkitRelativePath',
                                    {
                                        value: newPath,
                                        configurable: true,
                                        writable: true,
                                    },
                                )
                                Object.defineProperty(file, 'relativePath', {
                                    value: newPath,
                                    configurable: true,
                                    writable: true,
                                })
                            } catch {
                                Object.assign(file, { relativePath: newPath })
                            }
                            collectedFiles.push(file)
                        } else if (entry.kind === 'directory') {
                            await getFiles(
                                entry as unknown as IterableDirHandle,
                                newPath,
                            )
                        }
                    }
                }
                await getFiles(directoryHandle as unknown as IterableDirHandle)
                if (collectedFiles.length > 0) {
                    void this.store.handleSetSelectedFiles(collectedFiles)
                    this.store.core.emit('folder-select', {
                        count: collectedFiles.length,
                    })
                    const el = this.store.getFileInput()
                    if (el) el.value = ''
                }
            } catch (error) {
                const name = error instanceof DOMException ? error.name : ''
                if (name !== 'AbortError') throw error
            }
        } else {
            const el = this.store.getFileInput()
            if (el) {
                el.setAttribute('webkitdirectory', 'true')
                el.setAttribute('directory', 'true')
            }
            this.store.openFilePicker()
            this.store.core.emit('folder-select', { count: 0 })
        }
    }
}
