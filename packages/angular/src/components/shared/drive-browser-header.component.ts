import { Component, Input, inject } from '@angular/core'
import { type DriveFolder, type DriveUser } from '@upup/core'
import { cn } from '@upup/core/internal'
import { UpupStore } from '../../upup-store.service'
import { SearchIconComponent } from '../icons/search-icon.component'
import { UserIconComponent } from '../icons/user-icon.component'

/**
 * Angular port of DriveBrowserHeader.svelte.
 *
 * Renders the breadcrumb path, user avatar/name, sign-out button, and optional
 * search input. Only shown when `user` is set (matches svelte's {#if user} guard).
 * Preserves data-upup-slot="drive-browser-header".
 */
@Component({
    selector: 'upup-drive-browser-header',
    standalone: true,
    imports: [SearchIconComponent, UserIconComponent],
    template: `
        @if (user) {
            <div data-upup-slot="drive-browser-header">
                <div [class]="headerClass">
                    @if (!!path?.length) {
                        <div class="upup-flex upup-items-center upup-gap-1">
                            @for (p of path; track p.id; let i = $index) {
                                <p
                                    [class]="breadcrumbClass"
                                    [style.max-width]="
                                        100 / (path?.length ?? 1) + '%'
                                    "
                                    [style.pointer-events]="
                                        i === (path?.length ?? 0) - 1
                                            ? 'none'
                                            : 'auto'
                                    "
                                    (click)="setPath(path!.slice(0, i + 1))"
                                >
                                    <span
                                        class="upup-group-hover:upup-underline upup-truncate"
                                        >{{ p.name }}</span
                                    >
                                    @if (i !== (path?.length ?? 0) - 1) {
                                        &gt;
                                    }
                                </p>
                            }
                        </div>
                    }

                    <div class="upup-flex upup-items-center upup-gap-2">
                        <div
                            class="upup-relative upup-flex upup-h-8 upup-w-8 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full"
                        >
                            @if (!!user?.picture) {
                                <img
                                    [alt]="user?.name"
                                    [src]="user?.picture"
                                    class="upup-bg-center upup-object-cover"
                                />
                            }
                            @if (!user?.picture) {
                                <upup-user-icon class="upup-text-xl" />
                            }
                        </div>
                        <button
                            type="button"
                            [class]="signOutClass"
                            (click)="handleSignOut()"
                        >
                            {{ tr.logOut }}
                        </button>
                    </div>
                </div>

                @if (showSearch) {
                    <div [class]="searchContainerClass">
                        <input
                            type="search"
                            name="upup-drive-search"
                            [attr.aria-label]="tr.search"
                            [class]="searchInputClass"
                            [placeholder]="tr.search"
                            [value]="searchTerm"
                            (input)="onSearch(getInputValue($event))"
                        />
                        <upup-search-icon
                            class="upup-absolute upup-left-5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]"
                        />
                    </div>
                }
            </div>
        }
    `,
})
export class DriveBrowserHeaderComponent {
    private store = inject(UpupStore)

    @Input({ required: true }) path!: DriveFolder[]
    @Input({ required: true }) setPath!: (newPath: DriveFolder[]) => void
    @Input({ required: true }) handleSignOut!: () => void
    @Input() showSearch: boolean = false
    @Input() searchTerm: string = ''
    @Input() onSearch: (value: string) => void = () => {
        /* noop */
    }
    @Input() user: DriveUser | undefined = undefined

    get tr() {
        return this.store.translations()
    }

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-shadow-bottom upup-grid upup-grid-cols-[1fr,auto] upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
            dark
                ? 'upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]'
                : '',
            slotClasses.driveHeader,
        )
    }

    get breadcrumbClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-group upup-flex upup-shrink-0 upup-cursor-pointer upup-gap-1 upup-truncate',
            dark ? 'upup-text-[#6D6D6D] dark:upup-text-[#6D6D6D]' : '',
        )
    }

    get signOutClass(): string {
        return 'upup-text-xs upup-text-blue-600 upup-transition-all upup-duration-300 hover:upup-underline'
    }

    get searchContainerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-relative upup-h-fit upup-bg-black/[0.025] upup-px-3 upup-py-2',
            dark
                ? 'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]'
                : '',
            slotClasses.driveSearchContainer,
        )
    }

    get searchInputClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-h-fit upup-w-full upup-rounded-md upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-pl-8 upup-text-xs upup-outline-none upup-transition-all upup-duration-300',
            dark
                ? 'upup-bg-white/5 upup-text-[#6D6D6D] dark:upup-bg-white/5 dark:upup-text-[#6D6D6D]'
                : '',
            slotClasses.driveSearchInput,
        )
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value
    }
}
