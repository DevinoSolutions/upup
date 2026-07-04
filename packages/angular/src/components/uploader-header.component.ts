import { Component, Input, inject, Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import {
    formatUiMessage as t,
    pluralUiMessage as plural,
    isUploadActive,
} from '@upup/core'
import { UpupStore } from '../upup-store.service'
import { LayoutGridIconComponent } from './icons/layout-grid-icon.component'
import { LayoutListIconComponent } from './icons/layout-list-icon.component'

/**
 * Header bar for the main upload box — port of UploaderHeader.svelte.
 *
 * Svelte original:
 *   {#if !mini} <div data-testid="upup-header" …> … </div> {/if}
 *
 * Reads (from store):
 *   - store.uiProps.mini, store.uiProps.limit, store.uiProps.isProcessing
 *   - store.uiProps.icons.ContainerAddMoreIcon
 *   - store.slotOverrides()  → containerHeader / containerCancelButton / containerAddMoreButton
 *   - store.isDark()
 *   - store.files()          → size
 *   - store.isAddingMore()
 *   - store.viewMode()
 *   - store.uploadStatus()   → isUploading
 *   - store.translations()   → tr
 *
 * Input:
 *   - handleCancel (() => void) — passed from the parent (UploaderPanel) on cancel button click.
 */
@Component({
    selector: 'upup-main-box-header',
    standalone: true,
    imports: [
        LayoutGridIconComponent,
        LayoutListIconComponent,
        NgComponentOutlet,
    ],
    template: `
        @if (!store.uiProps.mini) {
            <div
                data-testid="upup-header"
                data-upup-slot="header"
                [class]="headerClass"
            >
                <!-- Cancel / remove-all button (left) -->
                <button
                    [class]="cancelButtonClass"
                    (click)="handleCancel()"
                    [disabled]="isUploading || store.uiProps.isProcessing"
                >
                    {{ cancelText }}
                </button>

                <!-- File count / adding-more label (centre) -->
                <span [class]="labelClass">
                    @if (store.isAddingMore()) {
                        {{ store.translations().addingMoreFiles }}
                    }
                    @if (!store.isAddingMore()) {
                        {{ fileCountText }}
                    }
                </span>

                <!-- Right controls: view-mode toggle + add-more -->
                <div
                    class="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4"
                >
                    <!-- View-mode toggle (only when >1 file) -->
                    @if (store.files().size > 1) {
                        <button
                            [class]="viewModeButtonClass"
                            (click)="toggleViewMode()"
                            [title]="
                                store.viewMode() === 'grid'
                                    ? store.translations().switchToListView
                                    : store.translations().switchToGridView
                            "
                        >
                            @if (store.viewMode() === 'grid') {
                                <upup-icon-layout-list [size]="16" />
                            } @else {
                                <upup-icon-layout-grid [size]="16" />
                            }
                        </button>
                    }

                    <!-- Add-more button -->
                    @if (
                        !store.isAddingMore() &&
                        store.uiProps.limit > 1 &&
                        !isLimitReached
                    ) {
                        <button
                            [class]="addMoreButtonClass"
                            (click)="store.setIsAddingMore(true)"
                            [disabled]="
                                isUploading || store.uiProps.isProcessing
                            "
                        >
                            <ng-container
                                [ngComponentOutlet]="containerAddMoreIcon"
                            />
                            {{ store.translations().addMore }}
                        </button>
                    }
                </div>
            </div>
        }
    `,
})
export class UploaderHeaderComponent {
    readonly store = inject(UpupStore)

    /** Passed by the parent (UploaderPanel) — called when the cancel/remove-all button is clicked. */
    @Input() handleCancel: () => void = () => {}

    // ── Derived getters ────────────────────────────────────────────────────────

    get isUploading(): boolean {
        return isUploadActive(this.store.uploadStatus())
    }

    get isLimitReached(): boolean {
        return this.store.uiProps.limit === this.store.files().size
    }

    get cancelText(): string {
        const tr = this.store.translations()
        return this.store.isAddingMore() ? tr.cancel : tr.removeAllFiles
    }

    get fileCountText(): string {
        const tr = this.store.translations()
        const count = this.store.files().size
        return t(plural(tr, 'filesSelected', count), { count })
    }

    get containerAddMoreIcon(): Type<unknown> {
        return this.store.uiProps.icons.ContainerAddMoreIcon as Type<unknown>
    }

    toggleViewMode(): void {
        this.store.setViewMode(
            this.store.viewMode() === 'grid' ? 'list' : 'grid',
        )
    }

    // ── Class builders ─────────────────────────────────────────────────────────

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return [
            'upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10',
            'upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between',
            'upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 md:upup-grid-rows-1',
            dark ? 'upup-bg-white/5 dark:upup-bg-white/5' : '',
            slotClasses.containerHeader ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get cancelButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return [
            'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2',
            'upup-p-1 upup-text-left upup-text-sm upup-text-blue-600',
            'md:upup-col-end-2 md:upup-row-start-1',
            dark ? 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]' : '',
            slotClasses.containerCancelButton ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get labelClass(): string {
        const dark = this.store.isDark()
        return [
            'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
            dark ? 'upup-text-gray-300 dark:upup-text-gray-300' : '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get viewModeButtonClass(): string {
        const dark = this.store.isDark()
        return [
            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center',
            'upup-rounded upup-text-gray-500 upup-transition-colors hover:upup-bg-black/10',
            dark ? 'upup-text-gray-300 hover:upup-bg-white/10' : '',
        ]
            .filter(Boolean)
            .join(' ')
    }

    get addMoreButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return [
            'upup-flex upup-items-center upup-gap-1 upup-rounded-md upup-border',
            'upup-border-dashed upup-border-blue-400/50 upup-px-2 upup-py-1',
            'upup-text-sm upup-text-blue-600',
            dark ? 'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]' : '',
            slotClasses.containerAddMoreButton ?? '',
        ]
            .filter(Boolean)
            .join(' ')
    }
}
