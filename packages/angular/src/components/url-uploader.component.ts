import { Component, inject, Type } from '@angular/core'
import { NgComponentOutlet } from '@angular/common'
import { cn } from '@upup/core/internal'
import { UpupStore } from '../upup-store.service'
import { FetchFileByUrlService } from '../services/fetch-file-by-url.service'
import { SourceViewContainerComponent } from './source-view-container.component'

/**
 * URL uploader leaf — port of UrlUploader.svelte.
 *
 * Slot name : "url-uploader"
 * Testid    : "upup-url-uploader" (on the SourceViewContainer inner div)
 *
 * Svelte parity:
 *   - FetchFileByUrlService (Injectable) ↔ useFetchFileByUrl composable
 *   - store.translations() ↔ tr
 *   - store.isDark() ↔ $dark
 *   - store.slotOverrides() ↔ $slotClasses
 *   - On submit: emit('url-submit'), fetchImage → handleSetSelectedFiles, setActiveSource(undefined)
 *
 * Note: No @angular/forms dep — two-way bind via (input) + [value] instead of ngModel.
 */
@Component({
    selector: 'upup-url-uploader',
    standalone: true,
    imports: [NgComponentOutlet, SourceViewContainerComponent],
    providers: [FetchFileByUrlService],
    template: `
        <upup-source-view-container slotName="url-uploader">
            <form (ngSubmit)="handleFormSubmit()" class="upup-px-3 upup-py-2">
                <input
                    type="url"
                    name="upup-url"
                    [attr.aria-label]="store.translations().enterFileUrl"
                    [placeholder]="store.translations().enterFileUrl"
                    [value]="url"
                    (input)="url = $any($event.target).value"
                    [class]="urlInputClass"
                />
                <button
                    [class]="fetchButtonClass"
                    type="submit"
                    [disabled]="!url"
                >
                    @if (fetchSvc.loading()) {
                        <ng-container [ngComponentOutlet]="loaderIcon" />
                    } @else {
                        {{ store.translations().fetch }}
                    }
                </button>
            </form>
        </upup-source-view-container>
    `,
})
export class UrlUploaderComponent {
    readonly store = inject(UpupStore)
    readonly fetchSvc = inject(FetchFileByUrlService)

    url = ''

    get loaderIcon(): Type<unknown> {
        return this.store.uiProps.icons.LoaderIcon as Type<unknown>
    }

    get urlInputClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
            {
                'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                    dark,
            },
            slotClasses.urlInput,
        )
    }

    get fetchButtonClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
            {
                'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]':
                    dark,
            },
            slotClasses.urlFetchButton,
        )
    }

    async handleFormSubmit(): Promise<void> {
        this.store.core?.emit('url-submit', { url: this.url })
        const file = await this.fetchSvc.fetchImage(this.url)
        if (file) {
            Object.assign(file, { url: this.url })
            await this.store.handleSetSelectedFiles([file])
            this.url = ''
            this.store.setActiveSource(undefined)
        }
    }
}
