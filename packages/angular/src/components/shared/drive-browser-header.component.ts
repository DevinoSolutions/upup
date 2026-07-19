import {
    Component,
    ElementRef,
    Input,
    OnDestroy,
    ViewChild,
    inject,
} from '@angular/core'
import {
    type DriveFolder,
    type DriveUser,
    type UiTranslations,
} from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import { UpupStore } from '../../upup-store.service'
import { SourceViewHeaderExtraService } from '../../context/source-view-header-extra.service'
import { SearchIconComponent } from '../icons/search-icon.component'
import { UserIconComponent } from '../icons/user-icon.component'

/**
 * Angular port of DriveBrowserHeader.
 *
 * Boxless, merged header: breadcrumbs (only once navigated past the root — the
 * root crumb is redundant next to the provider name) + restyled search share one
 * transparent row. The account controls (avatar + log out + hairline separator)
 * are portaled into the SourceView header row, next to Back — not their own
 * strip. Only shown when `user` is set. Preserves
 * data-upup-slot="drive-browser-header".
 *
 * Portal idiom: the account controls live in a `display:contents` wrapper which
 * is appended into the header-extra host element (from
 * SourceViewHeaderExtraService) once it mounts — Angular's equivalent of React's
 * createPortal / Svelte's `portal` action.
 */
@Component({
    selector: 'upup-drive-browser-header',
    standalone: true,
    imports: [SearchIconComponent, UserIconComponent],
    template: `
        @if (user) {
            <div data-upup-slot="drive-browser-header">
                <!-- Account controls portal into the SourceView header row (next
                     to Back), separated by a hairline. -->
                @if (headerExtra?.host()) {
                    <div #extra style="display: contents">
                        <div
                            class="upup-relative upup-flex upup-h-6 upup-w-6 upup-items-center upup-justify-center upup-overflow-hidden upup-rounded-full"
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
                            [class]="logoutClass"
                            (click)="onLogout()"
                        >
                            {{ tr.logOut }}
                        </button>
                        <span
                            aria-hidden="true"
                            [class]="separatorClass"
                        ></span>
                    </div>
                }

                @if (showSearch || showBreadcrumbs) {
                    <div [class]="headerClass">
                        @if (showBreadcrumbs) {
                            <div
                                class="upup-flex upup-min-w-0 upup-shrink upup-items-center upup-gap-1"
                            >
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
                                    class="upup-absolute upup-left-2.5 upup-top-1/2 upup--translate-y-1/2 upup-text-[#939393]"
                                />
                            </div>
                        }
                    </div>
                }
            </div>
        }
    `,
})
export class DriveBrowserHeaderComponent implements OnDestroy {
    private store = inject(UpupStore)
    // Optional: provided at the <upup-uploader> level in the real app; isolated
    // drive-uploader tests mount this component without it. Mirrors svelte's
    // `useSourceViewHeaderExtra() ?? writable(null)` graceful fallback — no host
    // means the account controls simply don't portal (no crash).
    readonly headerExtra = inject(SourceViewHeaderExtraService, {
        optional: true,
    })

    @Input({ required: true }) path!: DriveFolder[]
    @Input({ required: true }) setPath!: (newPath: DriveFolder[]) => void
    @Input({ required: true }) handleSignOut!: () => void
    @Input() showSearch: boolean = false
    @Input() searchTerm: string = ''
    @Input() onSearch: (value: string) => void = () => {
        /* noop */
    }
    @Input() user: DriveUser | undefined = undefined

    /**
     * The account-controls wrapper, relocated into the header-extra host once it
     * mounts. Tracked so the moved node can be removed on destroy (mirrors
     * Svelte's portal action `destroy()`), since it no longer lives inside this
     * component's own view.
     */
    private movedNode: HTMLElement | null = null

    @ViewChild('extra')
    set extra(ref: ElementRef<HTMLElement> | undefined) {
        const node = ref?.nativeElement ?? null
        const host = this.headerExtra?.host() ?? null
        if (node && host) {
            host.appendChild(node)
            this.movedNode = node
        }
    }

    // Breadcrumbs only once the user has navigated into a folder — the root
    // crumb is redundant next to the provider name in the top row.
    get showBreadcrumbs(): boolean {
        return (this.path?.length ?? 0) > 1
    }

    get tr(): UiTranslations {
        return this.store.translations()
    }

    onLogout(): void {
        this.handleSignOut()
        this.store.setActiveSource(undefined)
    }

    ngOnDestroy(): void {
        this.movedNode?.remove()
        this.movedNode = null
    }

    get headerClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-flex upup-items-center upup-gap-2.5 upup-px-3 upup-py-2 upup-text-xs upup-font-medium upup-text-[#333]',
            dark ? 'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]' : '',
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

    get logoutClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-hover:upup-underline upup-text-xs upup-font-medium upup-text-[#0284c7]',
            dark ? 'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]' : '',
            slotClasses.driveLogoutButton,
        )
    }

    get separatorClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-h-4 upup-w-px',
            dark ? 'upup-bg-white/15' : 'upup-bg-black/15',
        )
    }

    get searchContainerClass(): string {
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-relative upup-min-w-0 upup-flex-1',
            slotClasses.driveSearchContainer,
        )
    }

    get searchInputClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-w-full upup-rounded-lg upup-px-3 upup-py-1.5 upup-pl-8 upup-text-xs upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
            dark
                ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
            slotClasses.driveSearchInput,
        )
    }

    getInputValue(event: Event): string {
        return (event.target as HTMLInputElement).value
    }
}
