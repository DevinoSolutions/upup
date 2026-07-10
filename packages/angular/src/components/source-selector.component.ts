import { Component, inject } from '@angular/core'
import {
    FileSource,
    formatUiMessage as t,
    pluralUiMessage as plural,
} from '@upup/core'
import { cn, sourceNameKeys } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import {
    MyDeviceIconComponent,
    GoogleDriveIconComponent,
    OneDriveIconComponent,
    DropboxIconComponent,
    BoxIconComponent,
    LinkIconComponent,
    CameraIconComponent,
    AudioIconComponent,
    ScreenCaptureIconComponent,
} from './icons'
import { IconComponent } from './icon.component'
import { NgComponentOutlet } from '@angular/common'

/**
 * SourceSelector — Angular port of SourceSelector.svelte + useSourceSelector composable.
 *
 * Renders one tile per source in store.uiProps.sources with data-testid="upup-source-${id}".
 * Clicking a non-LOCAL tile calls store.setActiveSource(id).
 * LOCAL tile is intentionally no-op here (file picker is owned by the shell).
 *
 * Below the tiles (svelte parity), the empty-state copy block renders:
 *   - the "drag your files / browse files" line (+ optional "select a folder")
 *   - the constraint sub-copy (allowed types / count / max size)
 * Plus the "adding more files" header and the mini upload variant.
 *
 * Source tile testids (FileSource id is the suffix):
 *   upup-source-local, upup-source-googleDrive, upup-source-oneDrive,
 *   upup-source-dropbox, upup-source-box, upup-source-url,
 *   upup-source-camera, upup-source-microphone, upup-source-screen
 */

interface SourceEntry {
    id: FileSource
    label: string
    iconType: new (...args: unknown[]) => unknown
}

@Component({
    selector: 'upup-source-selector',
    standalone: true,
    imports: [NgComponentOutlet, IconComponent],
    template: `
        <div
            data-testid="upup-source-selector"
            data-upup-slot="source-selector"
            [class]="containerClass"
        >
            <!-- Adding-more header (Back + label) -->
            @if (store.isAddingMore()) {
                <div [class]="headerClass">
                    <button
                        type="button"
                        [class]="headerBackButtonClass"
                        (click)="onCancelAddingMore()"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                    </button>
                    <span [class]="headerLabelClass">Adding more files</span>
                </div>
            }

            <!-- Source tiles -->
            @if (!store.uiProps.mini) {
                <div [class]="listClass">
                    @for (source of chosenSources; track source.id) {
                        <button
                            type="button"
                            [attr.data-testid]="'upup-source-' + source.id"
                            [class]="tileClass"
                            (click)="handleSourceClick(source.id)"
                        >
                            <ng-container
                                *ngComponentOutlet="
                                    source.iconType;
                                    inputs: sourceIconInputs
                                "
                            ></ng-container>
                            <span [class]="labelClass">{{ source.label }}</span>
                        </button>
                    }
                </div>
            }

            <!-- Mini upload button OR empty-state drag/browse copy -->
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
            } @else {
                <div
                    class="upup-flex upup-flex-col upup-items-center upup-gap-1 upup-px-3 upup-text-center md:upup-gap-2 md:upup-px-[30px]"
                >
                    <div
                        class="upup-flex upup-flex-wrap upup-items-center upup-justify-center upup-gap-1"
                    >
                        <span [class]="copyTextClass">{{ dragText }}</span>
                        <button
                            type="button"
                            data-testid="upup-browse-files"
                            [class]="browseButtonClass"
                            (click)="handleBrowseFilesClick()"
                        >
                            {{ store.translations().browseFiles }}
                        </button>
                        @if (store.uiProps.folderPickerButtonVisible) {
                            <span [class]="copyTextClass">
                                {{ store.translations().or }}</span
                            >
                            <button
                                type="button"
                                [class]="browseButtonClass"
                                (click)="handleSelectFolderClick()"
                            >
                                {{ store.translations().selectAFolder }}
                            </button>
                        }
                    </div>
                    @if (constraintLine) {
                        <p [class]="constraintClass">{{ constraintLine }}</p>
                    }
                </div>
            }
        </div>
    `,
})
export class SourceSelectorComponent {
    readonly store = inject(UpupStore)

    private static readonly ICON_MAP: Record<
        string,
        new (...args: unknown[]) => unknown
    > = {
        [FileSource.LOCAL]: MyDeviceIconComponent,
        [FileSource.GOOGLE_DRIVE]: GoogleDriveIconComponent,
        [FileSource.ONE_DRIVE]: OneDriveIconComponent,
        [FileSource.DROPBOX]: DropboxIconComponent,
        [FileSource.BOX]: BoxIconComponent,
        [FileSource.URL]: LinkIconComponent,
        [FileSource.CAMERA]: CameraIconComponent,
        [FileSource.MICROPHONE]: AudioIconComponent,
        [FileSource.SCREEN]: ScreenCaptureIconComponent,
    }

    get chosenSources(): SourceEntry[] {
        const translations = this.store.translations()
        const sources = this.store.uiProps.sources
        return sources
            .map(id => {
                const nameKey = sourceNameKeys[id]
                const iconType = SourceSelectorComponent.ICON_MAP[id]
                if (!iconType) return null
                return {
                    id,
                    label:
                        (translations as Record<string, string>)[nameKey] ??
                        nameKey,
                    iconType,
                }
            })
            .filter((s): s is SourceEntry => s !== null)
    }

    get containerClass(): string {
        const isAddingMore = this.store.isAddingMore()
        return cn(
            'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
            isAddingMore
                ? 'upup-flex-col'
                : 'upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14',
        )
    }

    get listClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-flex-col upup-justify-center upup-gap-1 upup-w-full',
            'md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
            slotClasses.sourceButtonList,
        )
    }

    get tileClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-group upup-flex upup-items-center upup-gap-[6px]',
            'upup-border-b upup-border-gray-200 upup-px-2 upup-py-1',
            'md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
            dark ? 'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]' : '',
            slotClasses.sourceButton,
        )
    }

    get labelClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-text-xs upup-text-[#242634] md:upup-text-sm',
            dark ? 'upup-text-white dark:upup-text-white' : '',
            slotClasses.sourceButtonText,
        )
    }

    /** Inputs for the tile icon outlet — mirrors react's `slotClasses.sourceButtonIcon || undefined`. */
    get sourceIconInputs(): Record<string, unknown> {
        return {
            class: this.store.slotOverrides().sourceButtonIcon || undefined,
        }
    }

    // ── Empty-state copy + header (svelte SourceSelector.svelte parity) ─────────

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-shadow-bottom upup-flex upup-w-full upup-items-center upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2',
            { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
            slotClasses.containerHeader,
        )
    }

    get headerBackButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-items-center upup-gap-1 upup-text-sm upup-font-medium upup-text-blue-600',
            { 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]': dark },
            slotClasses.containerCancelButton,
        )
    }

    get headerLabelClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex-1 upup-text-center upup-text-sm upup-text-[#6D6D6D]',
            {
                'upup-text-gray-300 dark:upup-text-gray-300': dark,
            },
        )
    }

    get dragText(): string {
        const tr = this.store.translations()
        return this.store.uiProps.limit > 1 ? tr.dragFilesOr : tr.dragFileOr
    }

    get copyTextClass(): string {
        const dark = this.store.isDark()
        return cn('upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm', {
            'upup-text-white dark:upup-text-white': dark,
        })
    }

    get browseButtonClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-cursor-pointer upup-text-xs upup-font-semibold upup-text-[#0E2ADD] md:upup-text-sm',
            { 'upup-text-[#59D1F9] dark:upup-text-[#59D1F9]': dark },
        )
    }

    get constraintClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-text-center upup-text-xs upup-text-[#6D6D6D] md:upup-text-sm',
            { 'upup-text-gray-300 dark:upup-text-gray-300': dark },
        )
    }

    get miniIconClass(): string {
        const dark = this.store.isDark()
        return cn('upup-h-16 upup-w-16 md:upup-h-20 md:upup-w-20', {
            'upup-text-[#0B0B0B]': !dark,
            'upup-text-white dark:upup-text-white': dark,
        })
    }

    get miniTextClass(): string {
        const dark = this.store.isDark()
        return cn('px-6 upup-text-center upup-text-xs', {
            'upup-text-[#6D6D6D] dark:upup-text-gray-400': !dark,
            'upup-text-gray-400 dark:upup-text-gray-500': dark,
        })
    }

    /** Constraint sub-copy: humanized allowed types + count + max size (svelte parity). */
    get constraintLine(): string {
        const tr = this.store.translations()
        const { allowedFileTypes, limit, maxFileSize } = this.store.uiProps
        const parts: string[] = []
        if (
            allowedFileTypes &&
            allowedFileTypes !== '*/*' &&
            allowedFileTypes !== '*'
        ) {
            const humanized = allowedFileTypes
                .split(',')
                .map(s => s.trim())
                .map(m => {
                    if (m.startsWith('.')) return m
                    const [type, sub] = m.split('/')
                    if (type === undefined || sub === undefined) return m
                    if (sub === '*')
                        return (
                            type.charAt(0).toUpperCase() + type.slice(1) + 's'
                        )
                    return sub.toUpperCase()
                })
                .join(', ')
            parts.push(humanized + ' only')
        }
        if (limit > 1) {
            parts.push(t(tr.addDocumentsHere, { limit }))
        }
        if (maxFileSize?.size) {
            parts.push(
                t(plural(tr, 'maxFileSizeAllowed', limit), {
                    size: maxFileSize.size,
                    unit: maxFileSize.unit,
                }),
            )
        }
        return parts.join(', ')
    }

    // ── Handlers ────────────────────────────────────────────────────────────────

    /**
     * Unified tile click handler — 1:1 port of svelte useSourceSelector.handleSourceClick:
     *   onIntegrationClick(sourceId)
     *   core?.emit('source-click', { sourceId })
     *   if (sourceId === LOCAL) openFilePicker() else setActiveSource(sourceId)
     * Fires for EVERY source (including LOCAL) — no dead button.
     */
    handleSourceClick(sourceId: FileSource): void {
        this.store.uiProps.onIntegrationClick(sourceId)
        this.store.core.emit('source-click', { sourceId })
        if (sourceId === FileSource.LOCAL) {
            this.store.openFilePicker()
        } else {
            this.store.setActiveSource(sourceId)
        }
    }

    onCancelAddingMore(): void {
        this.store.setIsAddingMore(false)
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
                ) {
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
                                // upup-catch: defineProperty rejected (non-configurable
                                // slot) — fall back to a plain assign
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
