import { Component, inject } from '@angular/core'
import { UpupStore } from '../upup-store.service'
import { ClientOneDriveUploaderComponent } from './client-one-drive-uploader.component'
import { ServerModeDriveUploaderComponent } from './server-mode-drive-uploader.component'

/**
 * OneDriveUploaderComponent — Angular port of OneDriveUploader.svelte.
 *
 * Routes by store.mode:
 *   'server' → ServerModeDriveUploaderComponent(provider="one-drive")
 *   'client' → ClientOneDriveUploaderComponent
 *
 * Mirrors svelte:
 *   {#if mode === 'server'}
 *     <ServerModeDriveUploader provider="one-drive" onBack={...} />
 *   {:else}
 *     <ClientOneDriveUploader />
 *   {/if}
 */
@Component({
    selector: 'upup-one-drive-uploader',
    standalone: true,
    imports: [
        ClientOneDriveUploaderComponent,
        ServerModeDriveUploaderComponent,
    ],
    template: `
        @if (store.mode === 'server') {
            <upup-server-mode-drive-uploader
                provider="one-drive"
                [onBack]="handleBack"
            />
        } @else {
            <upup-client-one-drive-uploader />
        }
    `,
})
export class OneDriveUploaderComponent {
    readonly store = inject(UpupStore)

    readonly handleBack = (): void => {
        this.store.setActiveSource(undefined)
    }
}
