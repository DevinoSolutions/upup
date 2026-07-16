import { Component, Input, inject, signal, computed, Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import {
    type DriveBrowserError,
    type DriveFile,
    type DriveFolder,
    type DriveUser,
    type UiTranslations,
    formatUiMessage as t,
    pluralUiMessage as plural,
} from '@upupjs/core'
import { searchDriveFiles, cn } from '@upupjs/core/internal'
import { UpupStore } from '../../upup-store.service'
import { SourceViewContainerComponent } from '../source-view-container.component'
import { DriveBrowserHeaderComponent } from './drive-browser-header.component'
import { DriveBrowserItemComponent } from './drive-browser-item.component'

/**
 * Angular port of DriveBrowser.svelte.
 *
 * The main drive file/folder browser. Driven entirely by signals passed as inputs
 * from a drive service. No business logic: navigate/select/submit all delegate
 * back to the service via the provided handler functions.
 *
 * Preserves data-testid="upup-drive-browser" and data-upup-slot={slotName}.
 */
@Component({
    selector: 'upup-drive-browser',
    standalone: true,
    imports: [
        SourceViewContainerComponent,
        NgComponentOutlet,
        DriveBrowserHeaderComponent,
        DriveBrowserItemComponent,
    ],
    template: `
        <upup-source-view-container
            [isLoading]="isLoading()"
            [slotName]="slotName"
        >
            @if (isLoading()) {
                <ng-container [ngComponentOutlet]="loader" />
            } @else {
                <div
                    data-testid="upup-drive-browser"
                    class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
                >
                    <!-- Header: breadcrumb + user + search -->
                    <upup-drive-browser-header
                        [path]="path()"
                        [setPath]="setPath"
                        [handleSignOut]="handleSignOut"
                        [showSearch]="!!items()?.length"
                        [searchTerm]="searchTerm()"
                        [onSearch]="onSearchChange"
                        [user]="user()"
                    />

                    <!-- Body: file/folder list or empty message -->
                    @if (!!path()?.length) {
                        <div [class]="bodyClass">
                            @if (!!error?.()) {
                                <p
                                    data-testid="upup-drive-error"
                                    data-upup-slot="drive-error"
                                    role="alert"
                                    class="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                                >
                                    {{ errorText }}
                                </p>
                            }
                            @if (!!displayedItems().length) {
                                <ul class="upup-p-2">
                                    @for (
                                        file of displayedItems();
                                        track file.id
                                    ) {
                                        <upup-drive-browser-item
                                            [file]="file"
                                            [handleClick]="clickHandler"
                                            [selectedFiles]="selectedFiles()"
                                        />
                                    }
                                </ul>
                            }
                            @if (!displayedItems().length && !error?.()) {
                                <div
                                    class="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center"
                                >
                                    <p class="upup-text-xs upup-opacity-70">
                                        {{ tr.noAcceptedFilesFound }}
                                    </p>
                                </div>
                            }
                            @if (!!hasMore?.()) {
                                <button
                                    data-testid="upup-drive-load-more"
                                    data-upup-slot="drive-load-more"
                                    class="upup-mx-auto upup-my-2 upup-block upup-rounded-md upup-px-3 upup-py-1.5 upup-text-sm upup-text-[#0284c7] disabled:upup-opacity-50"
                                    [disabled]="isLoadingMore?.()"
                                    (click)="loadMore?.()"
                                >
                                    {{
                                        isLoadingMore?.()
                                            ? tr.loading
                                            : tr.loadMore
                                    }}
                                </button>
                            }
                        </div>
                    }

                    <!-- Footer: select folder, add files, cancel -->
                    @if (!!selectedFiles().length || !!onSelectCurrentFolder) {
                        <div [class]="footerClass">
                            @if (onSelectCurrentFolder) {
                                <button
                                    type="button"
                                    [class]="selectFolderBtnClass"
                                    [disabled]="showLoader()"
                                    (click)="onSelectCurrentFolder!()"
                                >
                                    {{ tr.selectThisFolder }}
                                </button>
                            }
                            <button
                                type="button"
                                [class]="addFilesBtnClass"
                                [disabled]="showLoader()"
                                (click)="handleSubmit()"
                            >
                                {{ addFilesLabel }}
                            </button>
                            <button
                                type="button"
                                [class]="cancelBtnClass"
                                [disabled]="showLoader()"
                                (click)="handleCancelDownload()"
                            >
                                {{ tr.cancel }}
                            </button>
                        </div>
                    }
                </div>
            }
        </upup-source-view-container>
    `,
})
export class DriveBrowserComponent {
    private store = inject(UpupStore)

    // ── Inputs from drive service ─────────────────────────────────
    @Input({ required: true }) driveFiles!: () => DriveFolder | undefined
    @Input({ required: true }) path!: () => DriveFolder[]
    @Input({ required: true }) setPath!: (newPath: DriveFolder[]) => void
    @Input({ required: true }) user!: () => DriveUser | undefined
    @Input({ required: true }) handleSignOut!: () => void
    @Input({ required: true }) handleClick!: (file: DriveFile) => void
    @Input({ required: true }) selectedFiles!: () => DriveFile[]
    @Input({ required: true }) showLoader!: () => boolean
    @Input({ required: true }) handleSubmit!: () => Promise<void>
    @Input({ required: true }) handleCancelDownload!: () => void
    @Input({ required: true }) isClickLoading!: () => boolean
    @Input() onSelectCurrentFolder: (() => void) | undefined = undefined
    @Input() error: (() => DriveBrowserError | undefined) | undefined =
        undefined
    @Input() hasMore: (() => boolean) | undefined = undefined
    @Input() isLoadingMore: (() => boolean) | undefined = undefined
    @Input() loadMore: (() => void | Promise<void>) | undefined = undefined
    /** Maps to svelte's dataUpupSlot prop. */
    @Input() slotName: string = 'drive-browser'

    // ── Local state ───────────────────────────────────────────────
    readonly searchTerm = signal('')
    readonly onSearchChange = (v: string): void => {
        this.searchTerm.set(v)
    }

    // ── Derived ───────────────────────────────────────────────────
    // error short-circuits the perpetual loader — the exact F-123/F-124 symptom.
    readonly isLoading = computed(
        () =>
            !this.error?.() &&
            ((this.isClickLoading?.() ?? false) || !this.driveFiles?.()),
    )

    get errorText(): string {
        const err = this.error?.()
        return err ? t(this.tr.driveLoadError, { message: err.message }) : ''
    }

    get loader(): Type<unknown> {
        return this.store.uiProps.icons.LoaderIcon as Type<unknown>
    }

    readonly items = computed(() => {
        const currentFolder = this.path().at(-1)
        if (!currentFolder?.children) return []
        const accept = this.store.uiProps.allowedFileTypes
        return currentFolder.children.filter(item =>
            this.filterItems(item, accept),
        )
    })

    readonly displayedItems = computed(
        () => searchDriveFiles(this.items(), this.searchTerm()) ?? [],
    )

    get tr(): UiTranslations {
        return this.store.translations()
    }

    /** Click handler that is a noop when loading (passed to DriveBrowserItem). */
    get clickHandler(): (file: DriveFile) => void {
        return this.isClickLoading() || this.showLoader()
            ? () => {
                  /* disabled */
              }
            : this.handleClick
    }

    get addFilesLabel(): string {
        return t(plural(this.tr, 'addFiles', this.selectedFiles().length), {
            count: this.selectedFiles().length,
        })
    }

    // ── Class helpers ─────────────────────────────────────────────
    get bodyClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
            dark
                ? 'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]'
                : '',
            slotClasses.driveBody,
        )
    }

    get footerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-origin-bottom upup-items-center upup-gap-2 upup-bg-black/[0.025] upup-px-3 upup-py-2',
            dark
                ? 'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]'
                : '',
            slotClasses.driveFooter,
        )
    }

    get selectFolderBtnClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#0284c7] upup-transition-all upup-duration-300',
            dark ? 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]' : '',
        )
    }

    get addFilesBtnClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-rounded-md upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
            dark
                ? 'upup-animate-pulse upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]'
                : this.showLoader?.()
                  ? 'upup-animate-pulse'
                  : '',
            slotClasses.driveAddFilesButton,
        )
    }

    get cancelBtnClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-[#0284c7] upup-transition-all upup-duration-300',
            dark ? 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]' : '',
            slotClasses.driveCancelFilesButton,
        )
    }

    private filterItems(item: DriveFile, accept: string): boolean {
        if (item.isFolder) return true
        if (!accept || accept === '*') return true
        return accept.split(',').some(pattern => {
            const p = pattern.trim()
            if (p.startsWith('.')) return item.name.endsWith(p)
            if (p.endsWith('/*'))
                return item.mimeType.startsWith(p.replace('/*', '/'))
            return item.mimeType === p
        })
    }
}
