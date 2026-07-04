import { Component, inject, OnInit, OnDestroy } from "@angular/core";
import { GoogleDriveService } from "../services/google-drive.service";
import { DriveAuthFallbackComponent } from "./shared/drive-auth-fallback.component";
import { DriveBrowserComponent } from "./shared/drive-browser.component";

/**
 * Angular port of ClientGoogleDriveUploader.svelte.
 *
 * Wires up GoogleDriveService → DriveAuthFallback (when not authed) or
 * DriveBrowser (when authed). All state lives in the service; this component
 * only routes between the two views.
 *
 * GIS auth (Google): shows fallback when !token && (authCancelled || isAuthReady).
 * The fallback button calls retryAuth() — no popup is triggered directly here.
 */
@Component({
  selector: "upup-client-google-drive-uploader",
  standalone: true,
  providers: [GoogleDriveService],
  imports: [DriveAuthFallbackComponent, DriveBrowserComponent],
  template: `
    @if (!svc.token() && (svc.authCancelled() || svc.isAuthReady())) {
      <upup-drive-auth-fallback
        providerName="Google Drive"
        [onRetry]="retryAuth"
        [error]="svc.error"
        slotName="google-drive-uploader"
      />
    } @else {
      <upup-drive-browser
        [driveFiles]="svc.googleFiles"
        [user]="svc.user"
        [handleSignOut]="handleSignOut"
        slotName="google-drive-uploader"
        [path]="svc.path"
        [setPath]="setPath"
        [isClickLoading]="svc.isClickLoading"
        [handleClick]="handleClick"
        [selectedFiles]="svc.selectedFiles"
        [showLoader]="svc.showLoader"
        [handleSubmit]="handleSubmit"
        [handleCancelDownload]="handleCancelDownload"
        [onSelectCurrentFolder]="onSelectCurrentFolder"
        [error]="svc.error"
        [hasMore]="svc.hasMore"
        [isLoadingMore]="svc.isLoadingMore"
        [loadMore]="loadMore"
      />
    }
  `,
})
export class ClientGoogleDriveUploaderComponent implements OnInit, OnDestroy {
  readonly svc = inject(GoogleDriveService);

  ngOnInit(): void {
    this.svc.init();
  }
  ngOnDestroy(): void {
    this.svc.destroy();
  }

  // Bound handlers passed as inputs to DriveBrowser / DriveAuthFallback
  readonly retryAuth = () => {
    this.svc.retryAuth();
  };
  readonly handleSignOut = () => {
    this.svc.handleSignOut();
  };
  readonly setPath = (path: Parameters<GoogleDriveService["setPath"]>[0]) => {
    this.svc.setPath(path);
  };
  readonly handleClick = (
    file: Parameters<GoogleDriveService["handleClick"]>[0],
  ) => {
    this.svc.handleClick(file);
  };
  readonly handleSubmit = () => this.svc.handleSubmit();
  readonly handleCancelDownload = () => {
    this.svc.handleCancelDownload();
  };
  readonly onSelectCurrentFolder = () => {
    this.svc.onSelectCurrentFolder();
  };
  readonly loadMore = () => this.svc.loadMore();
}
