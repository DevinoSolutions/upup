import { Component, inject, OnInit, OnDestroy } from '@angular/core'
import { OneDriveService } from '../services/one-drive.service'
import { DriveAuthFallbackComponent } from './shared/drive-auth-fallback.component'
import { DriveBrowserComponent } from './shared/drive-browser.component'

/**
 * Angular port of ClientOneDriveUploader.svelte.
 *
 * Popup auth: shows fallback when !isAuthenticated && !token && !isLoading.
 */
@Component({
    selector: 'upup-client-one-drive-uploader',
    standalone: true,
    providers: [OneDriveService],
    imports: [DriveAuthFallbackComponent, DriveBrowserComponent],
    template: `
        @if (!svc.isAuthenticated() && !svc.token() && !svc.isLoading()) {
            <upup-drive-auth-fallback
                providerName="OneDrive"
                [onRetry]="authenticate"
                slotName="one-drive-uploader"
            />
        } @else {
            <upup-drive-browser
                [driveFiles]="svc.oneDriveFiles"
                [user]="svc.user"
                [handleSignOut]="handleSignOut"
                slotName="one-drive-uploader"
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
export class ClientOneDriveUploaderComponent implements OnInit, OnDestroy {
    readonly svc = inject(OneDriveService)

    ngOnInit(): void {
        this.svc.init()
    }
    ngOnDestroy(): void {
        this.svc.destroy()
    }

    readonly authenticate = (): void => {
        this.svc.signIn()
    }
    readonly handleSignOut = (): void => {
        this.svc.signOut()
    }
    readonly setPath = (
        path: Parameters<OneDriveService['setPath']>[0],
    ): void => {
        this.svc.setPath(path)
    }
    readonly handleClick = (
        file: Parameters<OneDriveService['handleClick']>[0],
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
