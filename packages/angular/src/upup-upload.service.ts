import { Injectable, OnDestroy } from '@angular/core'
import { UpupCore, type CoreOptions, type UploadFile } from '@upup/core'

@Injectable({
  providedIn: 'root',
})
export class UpupUploadService implements OnDestroy {
  private core?: UpupCore

  connect(options: CoreOptions) {
    this.destroy()
    this.core = new UpupCore(options)
    return this.core
  }

  get instance() {
    return this.core
  }

  get files(): UploadFile[] {
    return this.core ? [...this.core.files.values()] : []
  }

  addFiles(files: File[]) {
    this.requireCore().addFiles(files)
  }

  removeFile(id: string) {
    this.requireCore().removeFile(id)
  }

  removeAll() {
    this.requireCore().removeAll()
  }

  upload() {
    return this.requireCore().upload()
  }

  destroy() {
    this.core?.destroy()
    this.core = undefined
  }

  ngOnDestroy() {
    this.destroy()
  }

  private requireCore() {
    if (!this.core) {
      throw new Error('Call connect() before using UpupUploadService.')
    }
    return this.core
  }
}
