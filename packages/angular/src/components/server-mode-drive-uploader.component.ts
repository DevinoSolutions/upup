import {
  Component,
  Input,
  inject,
  OnInit,
  OnDestroy,
  Type,
} from "@angular/core";
import { NgComponentOutlet } from "@angular/common";
import { cn, errorCodeToMessageKey } from "@upup/core";
import { UpupStore } from "../upup-store.service";
import {
  ServerModeDriveService,
  type ServerModeProvider,
  type ServerDriveFile,
  PROVIDER_LABEL,
} from "../services/server-mode-drive.service";
import { DriveAuthFallbackComponent } from "./shared/drive-auth-fallback.component";
import { SourceViewContainerComponent } from "./source-view-container.component";

/**
 * Angular port of ServerModeDriveUploader.svelte.
 *
 * Routes between two views based on server list state:
 *   - 'reauth': renders DriveAuthFallback (sign-in prompt; testid upup-server-drive-browser absent)
 *   - all other states: renders the server drive browser (data-testid="upup-server-drive-browser")
 *
 * Testid `upup-server-drive-browser` MUST be preserved byte-for-byte (live-verification + guards).
 * Double-brace {{provider}} is resolved by DriveAuthFallbackComponent via core's formatUiMessage.
 *
 * Regression guards (from vanilla's server-drive.test.ts, ported to Angular):
 *   1. 401 → state.status === 'reauth' → auth fallback rendered, browser testid absent
 *   2. ngOnDestroy calls destroy() → abort controller aborted
 *   3. ngOnDestroy calls destroy() → window 'message' listener removed
 */
@Component({
  selector: "upup-server-mode-drive-uploader",
  standalone: true,
  providers: [ServerModeDriveService],
  imports: [
    DriveAuthFallbackComponent,
    SourceViewContainerComponent,
    NgComponentOutlet,
  ],
  template: `
    @if (svc.listState().status === "reauth") {
      <upup-drive-auth-fallback
        [providerName]="providerLabel"
        [onRetry]="startAuth"
        [slotName]="slotName"
      />
    } @else {
      <upup-adapter-view-container
        [isLoading]="isLoading"
        [slotName]="slotName"
      >
        @if (isLoading) {
          <ng-container [ngComponentOutlet]="loader" />
        } @else {
          <div
            data-testid="upup-server-drive-browser"
            class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
          >
            <!-- Header: provider label + search -->
            <div [class]="headerClass" data-upup-slot="drive-browser-header">
              <span class="upup-text-sm upup-font-medium">{{
                providerLabel
              }}</span>
              <input
                type="search"
                name="upup-drive-search"
                aria-label="Search"
                [value]="svc.search()"
                (input)="onSearchInput($event)"
                (keydown.enter)="onSearchEnter($event)"
                placeholder="Search..."
                [class]="searchInputClass"
              />
            </div>

            <!-- Body: file list -->
            <div class="upup-overflow-auto">
              @if (svc.listState().status === "error") {
                <p
                  data-testid="upup-drive-error"
                  data-upup-slot="drive-error"
                  role="alert"
                  [class]="errorClass"
                >
                  {{ errorMessage }}
                </p>
              }
              @for (file of displayFiles; track file.id) {
                <button
                  type="button"
                  data-upup-slot="drive-browser-item"
                  [attr.data-selected]="svc.selected().has(file.id)"
                  [class]="fileItemClass(file)"
                  (click)="onFileClick(file)"
                >
                  <span>{{ file.isFolder ? "📁" : "📄" }}</span>
                  <span class="upup-flex-1 upup-truncate">{{ file.name }}</span>
                  @if (file.size != null && !file.isFolder) {
                    <span class="upup-text-xs upup-opacity-60">{{
                      formatBytes(file.size!)
                    }}</span>
                  }
                </button>
              }
            </div>

            <!-- Footer: cancel + add files -->
            <div
              class="upup-flex upup-items-center upup-justify-between upup-gap-2 upup-border-t upup-p-3"
            >
              <button
                type="button"
                class="upup-text-sm upup-opacity-70 hover:upup-opacity-100"
                (click)="onBack()"
              >
                Cancel
              </button>
              <button
                type="button"
                [disabled]="svc.selected().size === 0 || svc.isTransferring()"
                class="upup-rounded upup-bg-blue-600 upup-px-3 upup-py-1.5 upup-text-sm upup-text-white disabled:upup-opacity-50"
                (click)="handleTransfer()"
              >
                {{ addFilesLabel }}
              </button>
            </div>
          </div>
        }
      </upup-adapter-view-container>
    }
  `,
})
export class ServerModeDriveUploaderComponent implements OnInit, OnDestroy {
  private store = inject(UpupStore);
  readonly svc = inject(ServerModeDriveService);

  @Input({ required: true }) provider!: ServerModeProvider;
  @Input() onBack: () => void = () => {};
  /** data-upup-slot forwarded to SourceViewContainer and DriveAuthFallback. */
  @Input() slotName: string = "";

  ngOnInit(): void {
    this.svc.init(this.provider);
    if (!this.slotName) {
      this.slotName = `drive-browser-${this.provider}`;
    }
  }

  ngOnDestroy(): void {
    this.svc.destroy();
  }

  // ── Bound handlers ────────────────────────────────────────────

  readonly startAuth = (): void => {
    this.svc.startAuth();
  };

  // ── Computed getters ──────────────────────────────────────────

  get providerLabel(): string {
    return PROVIDER_LABEL[this.provider];
  }

  get isLoading(): boolean {
    const s = this.svc.listState().status;
    return s === "loading" || s === "idle";
  }

  get loader(): Type<unknown> {
    return this.store.uiProps.icons.LoaderIcon as Type<unknown>;
  }

  get displayFiles(): ServerDriveFile[] {
    const s = this.svc.listState();
    return s.status === "ready" ? s.files : [];
  }

  get errorMessage(): string {
    const s = this.svc.listState();
    if (s.status !== "error") return "";
    return s.code && this.store.translator
      ? this.store.translator(`errors.${errorCodeToMessageKey(s.code)}`, {
          code: s.code,
        })
      : s.message;
  }

  get addFilesLabel(): string {
    if (this.svc.isTransferring()) return "Uploading...";
    const n = this.svc.selected().size;
    return `Add files${n ? ` (${n})` : ""}`;
  }

  // ── Class builders ────────────────────────────────────────────

  get headerClass(): string {
    const dark = this.store.isDark();
    return cn(
      "upup-flex upup-items-center upup-gap-2 upup-border-b upup-px-3 upup-py-2",
      dark ? "upup-border-gray-700" : "upup-border-gray-200",
    );
  }

  get searchInputClass(): string {
    const dark = this.store.isDark();
    return cn(
      "upup-ml-auto upup-rounded upup-border upup-px-2 upup-py-1 upup-text-xs",
      dark
        ? "upup-border-gray-700 upup-bg-gray-800 upup-text-gray-100"
        : "upup-border-gray-300 upup-bg-white",
    );
  }

  get errorClass(): string {
    const dark = this.store.isDark();
    return cn(
      "upup-p-4 upup-text-sm",
      dark ? "upup-text-red-400" : "upup-text-red-600",
    );
  }

  fileItemClass(file: ServerDriveFile): string {
    const dark = this.store.isDark();
    const isSelected = this.svc.selected().has(file.id);
    return cn(
      "upup-flex upup-w-full upup-items-center upup-gap-3 upup-border-b upup-px-4 upup-py-2 upup-text-left upup-text-sm",
      isSelected && "upup-bg-blue-50 dark:upup-bg-blue-900/30",
      dark
        ? "upup-border-gray-700 upup-text-gray-100 hover:upup-bg-gray-700"
        : "upup-border-gray-200 hover:upup-bg-gray-50",
    );
  }

  // ── Event handlers ────────────────────────────────────────────

  onFileClick(file: ServerDriveFile): void {
    if (file.isFolder) {
      this.svc.setFolderId(file.id);
      void this.svc.list({ folderId: file.id });
    } else {
      this.svc.toggleSelected(file.id);
    }
  }

  onSearchInput(ev: Event): void {
    this.svc.setSearch((ev.target as HTMLInputElement).value);
  }

  onSearchEnter(ev: Event): void {
    void this.svc.list({ search: (ev.target as HTMLInputElement).value });
  }

  handleTransfer(): void {
    void this.svc.transfer();
  }

  // ── Helpers ───────────────────────────────────────────────────

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
