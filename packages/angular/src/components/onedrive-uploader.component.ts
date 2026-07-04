import { Component, inject } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { ClientOneDriveUploaderComponent } from './client-onedrive-uploader.component'
import { ServerModeDriveUploaderComponent } from './server-mode-drive-uploader.component'

/**
 * OneDriveUploaderComponent — Angular port of OneDriveUploader.svelte.
 *
 * Routes by store.mode:
 *   'server' → ServerModeDriveUploaderComponent(provider="onedrive")
 *   'client' → ClientOneDriveUploaderComponent
 *
 * Mirrors svelte:
 *   {#if mode === 'server'}
 *     <ServerModeDriveUploader provider="onedrive" onBack={...} />
 *   {:else}
 *     <ClientOneDriveUploader />
 *   {/if}
 */
@Component({
    selector: 'upup-onedrive-uploader',
    standalone: true,
    imports: [
        ClientOneDriveUploaderComponent,
        ServerModeDriveUploaderComponent,
    ],
    template: `
        @if (store.mode === 'server') {
            <upup-server-mode-drive-uploader
                provider="onedrive"
                [onBack]="handleBack"
            />
        } @else {
            <upup-client-onedrive-uploader />
        }
    `,
})
export class OneDriveUploaderComponent {
    readonly store = inject(UpupStore)

    readonly handleBack = (): void => {
        this.store.setActiveSource(undefined)
    }
}
