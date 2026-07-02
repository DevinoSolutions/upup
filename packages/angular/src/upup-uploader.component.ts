import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { cn } from '@upup/core'
import { UpupStore } from './upup-store.service'
import type { UploaderProps } from './shared/types'
import type { UploadFile } from '@upup/core'
import { UploaderPanelComponent } from './components/uploader-panel.component'
import { ImageEditorStubComponent } from './components/image-editor-stub.component'
import { devinoDark, devinoLight, logoDark, logoLight } from './assets/logos'

const FORWARDED: ReadonlyArray<
  readonly [string, 'filesAdded' | 'fileRemoved' | 'uploadProgress' | 'uploadAllComplete' | 'error']
> = [
  ['files-added', 'filesAdded'],
  ['file-removed', 'fileRemoved'],
  ['upload-progress', 'uploadProgress'],
  ['upload-all-complete', 'uploadAllComplete'],
  ['error', 'error'],
]

@Component({
  selector: 'upup-uploader',
  standalone: true,
  providers: [UpupStore],
  imports: [UploaderPanelComponent, ImageEditorStubComponent],
  template: `
    <div
      class="upup-scope upup-h-full upup-w-full"
      [class]="store.uiProps?.className ?? ''"
      [style]="store.uiProps?.style ?? {}"
      data-testid="upup-root"
      data-upup-slot="root"
      [attr.data-state]="(store.uploadStatus?.() ?? 'idle').toLowerCase()"
      [attr.lang]="store.lang ?? null"
      [attr.dir]="store.dir"
    >
      @if (storeReady) {
      <div
        [class]="sizingClass()"
        [style]="store.uiProps?.mini ? 'aspect-ratio: 1 / 1' : null"
      >
        <section
          data-testid="upup-container"
          aria-labelledby="drop-instructions"
          [class]="containerClass()"
        >
          <upup-main-box />

          @if (store.uiProps?.imageEditor?.enabled) {
            <upup-image-editor-stub />
          }

          @if (!store.uiProps?.mini && store.uiProps?.showBranding !== false) {
            <div
              data-testid="upup-branding"
              class="upup-flex upup-w-full upup-flex-col upup-items-center upup-justify-between upup-gap-1 md:upup-flex-row"
            >
              <a
                href="https://useupup.com/"
                target="_blank"
                rel="noopener noreferrer"
                class="upup-flex upup-items-center upup-gap-[5px]"
              >
                @if (store.isDark?.()) {
                  <img [src]="logoDark" width="61" height="13" alt="logo-dark" />
                } @else {
                  <img [src]="logoLight" width="61" height="13" alt="logo-light" />
                }
              </a>
              <a
                href="https://devino.ca/"
                target="_blank"
                rel="noopener noreferrer"
                class="upup-flex upup-flex-row upup-items-center upup-justify-end upup-gap-1"
              >
                <span [class]="builtByClass()">
                  {{ store.translations?.().builtBy }}
                </span>
                @if (store.isDark?.()) {
                  <img [src]="devinoDark" width="61" height="13" alt="logo-dark" />
                } @else {
                  <img [src]="devinoLight" width="61" height="13" alt="logo-light" />
                }
              </a>
            </div>
          }
        </section>
      </div>

      } <!-- /storeReady -->

      <input
        #fileInput
        type="file"
        [attr.accept]="store.uiProps?.allowedFileTypes ?? null"
        [attr.multiple]="store.uiProps?.multiple ? '' : null"
        style="display: none"
        data-testid="upup-file-input"
        (change)="onInputChange($event)"
      />
    </div>
  `,
})
export class UpupUploaderComponent implements OnInit, AfterViewInit {
  readonly store = inject(UpupStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly platformId = inject(PLATFORM_ID)
  private started = false
  private forwardUnsubs: Array<() => void> = []
  /** True only after the store has been initialized (browser only). Gate for template rendering. */
  storeReady = false

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>

  // Expose logo data-URIs to the template
  readonly logoDark = logoDark
  readonly logoLight = logoLight
  readonly devinoDark = devinoDark
  readonly devinoLight = devinoLight

  @Input() set config(value: UploaderProps) {
    this.store.setConfig(value)
    if (this.started) {
      // re-init on config change (mirrors vanilla's config setter); re-wire to the NEW core
      this.store.destroy()
      this.store.init()
      this.storeReady = true
      this.wireOutputs()
      // Re-register file input after re-init (destroy clears the cached inputEl)
      if (this.fileInputRef?.nativeElement) {
        this.store.registerFileInput(this.fileInputRef.nativeElement)
      }
    }
  }

  @Output() filesAdded = new EventEmitter<UploadFile[]>()
  @Output() fileRemoved = new EventEmitter<UploadFile>()
  @Output() uploadProgress = new EventEmitter<{ fileId: string; loaded: number; total: number }>()
  @Output() uploadAllComplete = new EventEmitter<UploadFile[]>()
  @Output() error = new EventEmitter<{ error: Error }>()

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return // SSR-safe: no init on the server
    this.store.init()
    this.started = true
    this.storeReady = true
    this.wireOutputs()
    this.destroyRef.onDestroy(() => {
      this.forwardUnsubs.forEach(u => u())
      this.forwardUnsubs = []
      this.store.destroy()
    })
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return
    if (this.fileInputRef?.nativeElement) {
      this.store.registerFileInput(this.fileInputRef.nativeElement)
    }
  }

  onInputChange(e: Event): void {
    const t = e.target as HTMLInputElement
    if (t.files?.length) {
      void this.store.handleSetSelectedFiles(Array.from(t.files))
      t.value = ''
    }
  }

  // ── Computed class helpers ────────────────────────────────────────────────
  sizingClass(): string {
    const mini = this.store.uiProps?.mini
    return cn('upup-w-full', {
      'upup-h-[480px] upup-max-w-[600px]': !mini,
      'upup-h-auto upup-max-w-[280px]': !!mini,
    })
  }

  containerClass(): string {
    const dark = this.store.isDark?.() ?? false
    const mini = this.store.uiProps?.mini
    const slotOverrides = this.store.slotOverrides?.() ?? {}

    return cn(
      `upup-shadow-wrapper upup-relative ${
        dark ? 'upup-bg-[#232323]' : 'upup-bg-white'
      } upup-flex upup-h-full upup-w-full upup-select-none upup-flex-col upup-gap-3 upup-overflow-hidden upup-rounded-2xl upup-px-5 upup-py-4`,
      {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [slotOverrides['containerFull']!]: !!(slotOverrides['containerFull'] && !mini),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [slotOverrides['containerMini']!]: !!(slotOverrides['containerMini'] && mini),
      },
    )
  }

  builtByClass(): string {
    return cn('upup-mr-0.5 upup-text-xs upup-leading-5 upup-text-[#6D6D6D] md:upup-text-sm', {
      'upup-text-gray-300 dark:upup-text-gray-300': this.store.isDark?.() ?? false,
    })
  }

  private wireOutputs(): void {
    this.forwardUnsubs.forEach(u => u())
    this.forwardUnsubs = []
    for (const [evt, out] of FORWARDED) {
      this.forwardUnsubs.push(
        this.store.core.on(evt, (payload: unknown) => {
          ;(this[out] as EventEmitter<unknown>).emit(payload)
        }),
      )
    }
  }
}
