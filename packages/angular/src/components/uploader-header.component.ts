import { Component, Input, inject, type Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { formatUiMessage as t, pluralUiMessage as plural } from '@upupjs/core'
import { isUploadActive, cn } from '@upupjs/core/internal'
import { UpupStore } from '../upup-store.service'
import { IconComponent } from './icon.component'

/**
 * Header bar for the file-list screen — port of shared/UploaderHeader.
 *
 * Renders the remove-all button, the file-count label, a two-segment grid|list
 * view toggle (aria-pressed; active segment shows its i18n label at md+), and a
 * dashed add-more button that opens the source overlay. Hidden entirely in mini
 * mode. `forcedList` hides the toggle when the tiles no longer fit one row;
 * `hideAddMore` suppresses the add-more control in quiet-completion mode.
 */
@Component({
    selector: 'upup-uploader-header',
    standalone: true,
    imports: [NgComponentOutlet, IconComponent],
    template: `
        @if (!store.uiProps.mini) {
            <div
                data-testid="upup-header"
                data-upup-slot="header"
                [class]="headerClass"
            >
                <button
                    [class]="cancelButtonClass"
                    (click)="handleCancel()"
                    [disabled]="isUploading || store.uiProps.isProcessing"
                >
                    {{ store.translations().removeAllFiles }}
                </button>
                <span [class]="labelClass">{{ fileCountText }}</span>
                <div
                    class="upup-col-start-3 upup-col-end-5 upup-flex upup-items-center upup-justify-end upup-gap-2 md:upup-col-start-4"
                >
                    @if (store.files().size > 1 && !forcedList) {
                        <div
                            role="group"
                            [attr.aria-label]="
                                store.translations().switchToGridView
                            "
                            data-upup-slot="view-toggle"
                            [class]="toggleGroupClass"
                        >
                            <button
                                data-testid="upup-view-toggle-grid"
                                [attr.aria-label]="
                                    store.translations().switchToGridView
                                "
                                [attr.aria-pressed]="
                                    store.viewMode() === 'grid'
                                "
                                [title]="store.translations().switchToGridView"
                                [class]="gridToggleClass"
                                (click)="store.setViewMode('grid')"
                            >
                                <upup-icon name="layout-grid" [size]="15" />
                                @if (store.viewMode() === 'grid') {
                                    <span
                                        class="upup-hidden upup-text-xs upup-font-medium upup-leading-none md:upup-inline"
                                        >{{
                                            store.translations().viewGrid
                                        }}</span
                                    >
                                }
                            </button>
                            <button
                                data-testid="upup-view-toggle-list"
                                [attr.aria-label]="
                                    store.translations().switchToListView
                                "
                                [attr.aria-pressed]="
                                    store.viewMode() === 'list'
                                "
                                [title]="store.translations().switchToListView"
                                [class]="listToggleClass"
                                (click)="store.setViewMode('list')"
                            >
                                <upup-icon name="layout-list" [size]="15" />
                                @if (store.viewMode() === 'list') {
                                    <span
                                        class="upup-hidden upup-text-xs upup-font-medium upup-leading-none md:upup-inline"
                                        >{{
                                            store.translations().viewList
                                        }}</span
                                    >
                                }
                            </button>
                        </div>
                    }
                    @if (
                        store.uiProps.limit > 1 &&
                        !isLimitReached &&
                        !hideAddMore
                    ) {
                        <button
                            data-testid="upup-add-more"
                            data-placement="header"
                            data-upup-slot="add-more"
                            [class]="addMoreButtonClass"
                            (click)="store.openSourceOverlay()"
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

    /** Passed by the parent (FileList) — called on the remove-all button click. */
    @Input() handleCancel: () => void = () => {}
    /** True when the panel forces the row list (tiles don't fit one row) — the
     *  grid/list toggle is hidden in that state. */
    @Input() forcedList = false
    /** True in quiet-completion mode after success — hides the add-more control. */
    @Input() hideAddMore = false

    get isUploading(): boolean {
        return isUploadActive(this.store.uploadStatus())
    }

    get isLimitReached(): boolean {
        return this.store.uiProps.limit === this.store.files().size
    }

    get fileCountText(): string {
        const tr = this.store.translations()
        const count = this.store.files().size
        return t(plural(tr, 'filesSelected', count), { count })
    }

    get containerAddMoreIcon(): Type<unknown> {
        return this.store.uiProps.icons.ContainerAddMoreIcon as Type<unknown>
    }

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-shadow-bottom upup-left-0 upup-right-0 upup-top-0 upup-z-10 upup-grid upup-grid-cols-4 upup-grid-rows-2 upup-items-center upup-justify-between upup-rounded-t-lg upup-bg-black/[0.025] upup-px-3 upup-py-2 md:upup-grid-rows-1',
            { 'upup-bg-white/5 dark:upup-bg-white/5': dark },
            slotClasses.containerHeader ?? '',
        )
    }

    get cancelButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-max-md upup-col-start-1 upup-col-end-3 upup-row-start-2 upup-p-1 upup-text-left upup-text-sm upup-text-[#0284c7] md:upup-col-end-2 md:upup-row-start-1',
            { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark },
            slotClasses.containerCancelButton ?? '',
        )
    }

    get labelClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-col-span-4 upup-text-center upup-text-sm upup-text-[#6D6D6D] md:upup-col-span-2',
            { 'upup-text-gray-300 dark:upup-text-gray-300': dark },
        )
    }

    get toggleGroupClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-items-center upup-gap-0.5 upup-rounded-lg upup-p-0.5',
            dark ? 'upup-bg-white/[0.06]' : 'upup-bg-black/[0.05]',
        )
    }

    private segmentClass(active: boolean): string {
        const dark = this.store.isDark()
        return cn(
            'upup-flex upup-h-6 upup-items-center upup-justify-center upup-gap-1 upup-rounded-md upup-px-1.5 upup-transition-colors',
            active
                ? 'upup-bg-[#0ea5e9] upup-text-white'
                : dark
                  ? 'upup-text-gray-300 hover:upup-bg-white/10'
                  : 'upup-text-gray-500 hover:upup-bg-black/10',
        )
    }

    get gridToggleClass(): string {
        return this.segmentClass(this.store.viewMode() === 'grid')
    }

    get listToggleClass(): string {
        return this.segmentClass(this.store.viewMode() === 'list')
    }

    get addMoreButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-fx-hover-lift upup-fx-press upup-inline-flex upup-shrink-0 upup-items-center upup-gap-1 upup-whitespace-nowrap upup-rounded-md upup-border upup-border-dashed upup-border-[#38bdf8]/50 upup-px-2 upup-py-1 upup-text-sm upup-leading-none upup-text-[#0284c7]',
            { 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]': dark },
            slotClasses.containerAddMoreButton ?? '',
        )
    }
}
