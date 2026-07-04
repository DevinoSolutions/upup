import { Component, inject } from "@angular/core";
import { UpupStore } from "../upup-store.service";
import { ClientDropboxUploaderComponent } from "./client-dropbox-uploader.component";
import { ServerModeDriveUploaderComponent } from "./server-mode-drive-uploader.component";

/**
 * DropboxUploaderComponent — Angular port of DropboxUploader.svelte.
 *
 * Routes by store.mode:
 *   'server' → ServerModeDriveUploaderComponent(provider="dropbox")
 *   'client' → ClientDropboxUploaderComponent
 *
 * Mirrors svelte:
 *   {#if mode === 'server'}
 *     <ServerModeDriveUploader provider="dropbox" onBack={...} />
 *   {:else}
 *     <ClientDropboxUploader />
 *   {/if}
 */
@Component({
  selector: "upup-dropbox-uploader",
  standalone: true,
  imports: [ClientDropboxUploaderComponent, ServerModeDriveUploaderComponent],
  template: `
    @if (store.mode === "server") {
      <upup-server-mode-drive-uploader
        provider="dropbox"
        [onBack]="handleBack"
      />
    } @else {
      <upup-client-dropbox-uploader />
    }
  `,
})
export class DropboxUploaderComponent {
  readonly store = inject(UpupStore);

  readonly handleBack = (): void => {
    this.store.setActiveSource(undefined);
  };
}
