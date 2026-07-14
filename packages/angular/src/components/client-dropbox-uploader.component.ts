import { Component, inject, OnInit, OnDestroy } from '@angular/core'
import { DropboxService } from '../services/dropbox.service'
import { DriveAuthFallbackComponent } from './shared/drive-auth-fallback.component'
import { DriveBrowserComponent } from './shared/drive-browser.component'

/**
 * Angular port of ClientDropboxUploader.svelte.
 *
 * Popup auth: shows fallback when !isAuthenticated && !token && !isLoading.
 */
@Component({
    selector: 'upup-client-dropbox-uploader',
    standalone: true,
    providers: [DropboxService],
    imports: [DriveAuthFallbackComponent, DriveBrowserComponent],
    template: `
        @if (!svc.isAuthenticated() && !svc.token() && !svc.isLoading()) {
            <upup-drive-auth-fallback
                providerName="Dropbox"
                [onRetry]="authenticate"
                slotName="dropbox-uploader"
            />
        } @else {
            <upup-drive-browser
                [driveFiles]="svc.dropboxFiles"
                [user]="svc.user"
                [handleSignOut]="handleSignOut"
                slotName="dropbox-uploader"
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
export class ClientDropboxUploaderComponent implements OnInit, OnDestroy {
    readonly svc = inject(DropboxService)

    ngOnInit(): void {
        this.svc.init()
    }
    ngOnDestroy(): void {
        this.svc.destroy()
    }

    readonly authenticate = (): void => {
        this.svc.authenticate()
    }
    readonly handleSignOut = (): void => {
        this.svc.logout()
    }
    readonly setPath = (
        path: Parameters<DropboxService['setPath']>[0],
    ): void => {
        this.svc.setPath(path)
    }
    readonly handleClick = (
        file: Parameters<DropboxService['handleClick']>[0],
    ): void => {
        this.svc.handleClick(file)
    }
    readonly handleSubmit = (): Promise<void> => this.svc.handleSubmit()
    readonly handleCancelDownload = (): void => {
        this.svc.handleCancelDownload()
    }
    readonly onSelectCurrentFolder = (): void => {
        this.svc.onSelectCurrentFolder()
    }
    readonly loadMore = (): Promise<void> => this.svc.loadMore()
}
