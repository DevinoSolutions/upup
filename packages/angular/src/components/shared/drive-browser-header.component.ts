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
import { ChevronLeftIconComponent } from '../icons/chevron-left-icon.component'
import { UserIconComponent } from '../icons/user-icon.component'

/**
 * Angular port of DriveBrowserHeader.
 *
 * Boxless, merged header: once navigated past the root, a ghost chevron-left
 * Back button (up one folder) + the current folder name, with the search
 * collapsed into an icon toggle that expands into the styled input. At the root
 * the full-width search shows directly. The account controls (avatar + log out +
 * hairline separator) are portaled into the SourceView header row, next to Back
 * — not their own strip. Only shown when `user` is set. Preserves
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
    imports: [SearchIconComponent, ChevronLeftIconComponent, UserIconComponent],
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

                @if (showSearch || navigated) {
                    <div [class]="headerClass">
                        @if (navigated) {
                            <button
                                type="button"
                                data-testid="upup-drive-back"
                                data-upup-slot="drive-back"
                                [attr.aria-label]="tr.overlayBack"
                                [class]="backClass"
                                (click)="setPath(path!.slice(0, -1))"
                            >
                                <upup-chevron-left-icon />
                            </button>
                        }
                        @if (navigated && !searchOpen) {
                            <span
                                data-upup-slot="drive-current-folder"
                                [attr.title]="currentFolder?.name"
                                class="upup-min-w-0 upup-flex-1 upup-truncate upup-font-medium"
                                >{{ currentFolder?.name }}</span
                            >
                        }
                        @if (navigated && showSearch && !searchOpen) {
                            <button
                                type="button"
                                data-testid="upup-drive-search-toggle"
                                data-upup-slot="drive-search-toggle"
                                [attr.aria-label]="tr.search"
                                aria-expanded="false"
                                [class]="searchToggleClass"
                                (click)="searchOpen = true"
                            >
                                <upup-search-icon />
                            </button>
                        }
                        @if (showSearch && (!navigated || searchOpen)) {
                            <div [class]="searchContainerClass">
                                <input
                                    #searchInput
                                    type="search"
                                    name="upup-drive-search"
                                    data-testid="upup-drive-search-input"
                                    data-upup-slot="drive-search-input"
                                    [attr.aria-label]="tr.search"
                                    [class]="searchInputClass"
                                    [placeholder]="tr.search"
                                    [value]="searchTerm"
                                    (input)="onSearch(getInputValue($event))"
                                    (keydown.escape)="searchOpen = false"
                                    (blur)="onSearchBlur()"
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

    // Collapsed/expanded search lives here; the term itself stays in
    // DriveBrowser.
    searchOpen = false

    /**
     * Focus the field the moment it expands. The input renders only while
     * `searchOpen`, so the query result appears exactly on the open transition —
     * mirroring React's `useEffect(focus, [searchOpen])`, using the same
     * ViewChild-setter idiom as `extra` above.
     */
    @ViewChild('searchInput')
    set searchInput(ref: ElementRef<HTMLInputElement> | undefined) {
        if (ref && this.searchOpen) ref.nativeElement.focus()
    }

    // Once navigated into a folder we show a Back affordance + the current
    // folder name, not a full breadcrumb trail (long provider folder names blew
    // the row up, and multi-level jumps weren't worth the fragility).
    get navigated(): boolean {
        return (this.path?.length ?? 0) > 1
    }

    get currentFolder(): DriveFolder | undefined {
        return this.path?.[this.path.length - 1]
    }

    get hasFilter(): boolean {
        return this.searchTerm.trim().length > 0
    }

    onSearchBlur(): void {
        // Collapse only when empty — a live filter must stay visible.
        if (!this.searchTerm) this.searchOpen = false
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

    get backClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-fx-hover-lift upup-fx-press upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
            dark
                ? 'upup-text-[#e2e8f0] hover:upup-bg-white/[0.08]'
                : 'upup-text-[#334155] hover:upup-bg-black/[0.05]',
        )
    }

    get searchToggleClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-fx-hover-lift upup-fx-press upup-ml-auto upup-flex upup-h-7 upup-w-7 upup-shrink-0 upup-items-center upup-justify-center upup-rounded-lg',
            this.hasFilter
                ? 'upup-text-[#0ea5e9]'
                : dark
                  ? 'upup-text-[#94a3b8] hover:upup-bg-white/[0.08]'
                  : 'upup-text-[#64748b] hover:upup-bg-black/[0.05]',
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
            // Enter animation only on the navigated-expanded form, never at root.
            this.navigated ? 'upup-fx-search-expand' : '',
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
