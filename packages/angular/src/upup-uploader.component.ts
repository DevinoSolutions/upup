import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  PLATFORM_ID,
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { UpupStore } from './upup-store.service'
import type { UpupUploaderProps } from './shared/types'
import type { UploadFile } from '@upup/core'

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
  // T9: import MainBoxComponent and render <upup-main-box /> inside the root shell
  imports: [],
  template: `<div data-testid="upup-root" [attr.dir]="store.dir"></div>`,
})
export class UpupUploaderComponent implements OnInit {
  readonly store = inject(UpupStore)
  private readonly destroyRef = inject(DestroyRef)
  private readonly platformId = inject(PLATFORM_ID)
  private started = false
  private forwardUnsubs: Array<() => void> = []

  @Input() set config(value: UpupUploaderProps) {
    this.store.setConfig(value)
    if (this.started) {
      // re-init on config change (mirrors vanilla's config setter); re-wire to the NEW core
      this.store.dispose()
      this.store.init()
      this.wireOutputs()
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
    this.wireOutputs()
    this.destroyRef.onDestroy(() => {
      this.forwardUnsubs.forEach(u => u())
      this.forwardUnsubs = []
      this.store.dispose()
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
