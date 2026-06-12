import { Component, inject } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { ClientGoogleDriveUploaderComponent } from './client-google-drive-uploader.component'
import { ServerModeDriveUploaderComponent } from './server-mode-drive-uploader.component'

/**
 * GoogleDriveUploaderComponent — Angular port of GoogleDriveUploader.svelte.
 *
 * Routes by store.mode:
 *   'server' → ServerModeDriveUploaderComponent(provider="google-drive")
 *   'client' → ClientGoogleDriveUploaderComponent
 *
 * Mirrors svelte:
 *   {#if mode === 'server'}
 *     <ServerModeDriveUploader provider="google-drive" onBack={...} />
 *   {:else}
 *     <ClientGoogleDriveUploader />
 *   {/if}
 */
@Component({
    selector: 'upup-google-drive-uploader',
    standalone: true,
    imports: [ClientGoogleDriveUploaderComponent, ServerModeDriveUploaderComponent],
    template: `
        @if (store.mode === 'server') {
            <upup-server-mode-drive-uploader
                provider="google-drive"
                [onBack]="handleBack"
            />
        } @else {
            <upup-client-google-drive-uploader />
        }
    `,
})
export class GoogleDriveUploaderComponent {
    readonly store = inject(UpupStore)

    readonly handleBack = (): void => {
        this.store.setActiveAdapter(undefined)
    }
}
