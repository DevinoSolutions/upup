import { Component, inject } from '@angular/core'
import { cn, FileSource, sourceNameKeys } from '@upup/core'
import { UpupStore } from '../upup-store.service'
import {
    MyDeviceIconComponent,
    GoogleDriveIconComponent,
    OneDriveIconComponent,
    DropBoxIconComponent,
    BoxIconComponent,
    LinkIconComponent,
    CameraIconComponent,
    AudioIconComponent,
    ScreenCastIconComponent,
} from './icons'
import { NgComponentOutlet } from '@angular/common'

/**
 * AdapterSelector — Angular port of AdapterSelector.svelte + useAdapterSelector composable.
 *
 * Renders one tile per source in store.uiProps.sources with data-testid="upup-source-${id}".
 * Clicking a non-LOCAL tile calls store.setActiveAdapter(id).
 * LOCAL tile is intentionally no-op here (file picker is owned by the shell).
 *
 * Source tile testids (FileSource id is the suffix):
 *   upup-source-local, upup-source-googleDrive, upup-source-oneDrive,
 *   upup-source-dropbox, upup-source-box, upup-source-url,
 *   upup-source-camera, upup-source-microphone, upup-source-screen
 */

interface SourceEntry {
    id: FileSource
    label: string
    iconType: new (...args: unknown[]) => unknown
}

@Component({
    selector: 'upup-adapter-selector',
    standalone: true,
    imports: [NgComponentOutlet],
    template: `
        <div
            data-upup-slot="adapter-selector"
            [class]="containerClass"
        >
            <div [class]="listClass">
                @for (source of chosenSources; track source.id) {
                    <button
                        type="button"
                        [attr.data-testid]="'upup-source-' + source.id"
                        [class]="tileClass"
                        (click)="handleAdapterClick(source.id)"
                    >
                        <ng-container *ngComponentOutlet="source.iconType"></ng-container>
                        <span [class]="labelClass">{{ source.label }}</span>
                    </button>
                }
            </div>
        </div>
    `,
})
export class AdapterSelectorComponent {
    readonly store = inject(UpupStore)

    private static readonly ICON_MAP: Record<string, new (...args: unknown[]) => unknown> = {
        [FileSource.LOCAL]: MyDeviceIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.GOOGLE_DRIVE]: GoogleDriveIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.ONE_DRIVE]: OneDriveIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.DROPBOX]: DropBoxIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.BOX]: BoxIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.URL]: LinkIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.CAMERA]: CameraIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.MICROPHONE]: AudioIconComponent as new (...args: unknown[]) => unknown,
        [FileSource.SCREEN]: ScreenCastIconComponent as new (...args: unknown[]) => unknown,
    }

    get chosenSources(): SourceEntry[] {
        const translations = this.store.translations()
        const sources = this.store.uiProps.sources
        return sources
            .map((id) => {
                const nameKey = sourceNameKeys[id]
                const iconType = AdapterSelectorComponent.ICON_MAP[id]
                if (!iconType) return null
                return {
                    id,
                    label: (translations as Record<string, string>)[nameKey] ?? nameKey,
                    iconType,
                } as SourceEntry
            })
            .filter((s): s is SourceEntry => s !== null)
    }

    get containerClass(): string {
        const dark = this.store.isDark()
        const isAddingMore = this.store.isAddingMore()
        return cn(
            'upup-relative upup-flex upup-h-full upup-gap-3 upup-rounded-lg',
            isAddingMore
                ? 'upup-flex-col'
                : 'upup-flex-col-reverse upup-items-center upup-justify-center md:upup-flex-col md:upup-gap-14',
        )
    }

    get listClass(): string {
        return cn(
            'upup-flex upup-flex-col upup-justify-center upup-gap-1',
            'md:upup-flex-row md:upup-flex-wrap md:upup-items-center md:upup-gap-[30px] md:upup-px-[30px]',
        )
    }

    get tileClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-group upup-flex upup-items-center upup-gap-[6px]',
            'upup-border-b upup-border-gray-200 upup-px-2 upup-py-1',
            'md:upup-flex-col md:upup-justify-center md:upup-rounded-lg md:upup-border-none md:upup-p-0',
            dark ? 'upup-border-[#6D6D6D] dark:upup-border-[#6D6D6D]' : '',
        )
    }

    get labelClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-text-xs upup-text-[#0B0B0B] md:upup-text-sm',
            dark ? 'upup-text-white dark:upup-text-white' : '',
        )
    }

    /**
     * Unified tile click handler — 1:1 port of svelte useAdapterSelector.handleAdapterClick:
     *   onIntegrationClick(sourceId)
     *   core?.emit('source-click', { sourceId })
     *   if (sourceId === LOCAL) openFilePicker() else setActiveAdapter(sourceId)
     * Fires for EVERY source (including LOCAL) — no dead button.
     */
    handleAdapterClick(sourceId: FileSource): void {
        this.store.uiProps.onIntegrationClick(sourceId)
        this.store.core?.emit('source-click', { sourceId })
        if (sourceId === FileSource.LOCAL) {
            this.store.openFilePicker()
        } else {
            this.store.setActiveAdapter(sourceId)
        }
    }
}
