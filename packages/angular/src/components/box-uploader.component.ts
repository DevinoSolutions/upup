import { Component, inject } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { ClientBoxUploaderComponent } from './client-box-uploader.component'
import { ServerModeDriveUploaderComponent } from './server-mode-drive-uploader.component'

/**
 * BoxUploaderComponent — Angular port of BoxUploader.svelte.
 *
 * Routes by store.mode:
 *   'server' → ServerModeDriveUploaderComponent(provider="box")
 *   'client' → ClientBoxUploaderComponent
 *
 * Mirrors svelte:
 *   {#if mode === 'server'}
 *     <ServerModeDriveUploader provider="box" onBack={...} />
 *   {:else}
 *     <ClientBoxUploader />
 *   {/if}
 */
@Component({
    selector: 'upup-box-uploader',
    standalone: true,
    imports: [ClientBoxUploaderComponent, ServerModeDriveUploaderComponent],
    template: `
        @if (store.mode === 'server') {
            <upup-server-mode-drive-uploader
                provider="box"
                [onBack]="handleBack"
            />
        } @else {
            <upup-client-box-uploader />
        }
    `,
})
export class BoxUploaderComponent {
    readonly store = inject(UpupStore)

    readonly handleBack = (): void => {
        this.store.setActiveSource(undefined)
    }
}
