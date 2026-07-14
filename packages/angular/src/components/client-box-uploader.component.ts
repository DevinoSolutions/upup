import { Component, inject, OnInit, OnDestroy } from '@angular/core'
import { BoxService } from '../services/box.service'
import { DriveAuthFallbackComponent } from './shared/drive-auth-fallback.component'
import { DriveBrowserComponent } from './shared/drive-browser.component'

/**
 * Angular port of ClientBoxUploader.svelte.
 *
 * Popup auth: shows fallback when !isAuthenticated && !token && !isLoading.
 */
@Component({
    selector: 'upup-client-box-uploader',
    standalone: true,
    providers: [BoxService],
    imports: [DriveAuthFallbackComponent, DriveBrowserComponent],
    template: `
        @if (!svc.isAuthenticated() && !svc.token() && !svc.isLoading()) {
            <upup-drive-auth-fallback
                providerName="Box"
                [onRetry]="authenticate"
                slotName="box-uploader"
            />
        } @else {
            <upup-drive-browser
                [driveFiles]="svc.boxFiles"
                [user]="svc.user"
                [handleSignOut]="handleSignOut"
                slotName="box-uploader"
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
export class ClientBoxUploaderComponent implements OnInit, OnDestroy {
    readonly svc = inject(BoxService)

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
    readonly setPath = (path: Parameters<BoxService['setPath']>[0]): void => {
        this.svc.setPath(path)
    }
    readonly handleClick = (
        file: Parameters<BoxService['handleClick']>[0],
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
