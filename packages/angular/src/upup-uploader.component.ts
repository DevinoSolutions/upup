import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core'
import { FileSource, type CoreOptions } from '@upup/core'
import { defineUpupElement } from '@upup/vanilla'
import { upupAngularAttributes, type UpupAngularAttributeProps } from './upup-angular-attributes'

@Component({
  selector: 'upup-uploader-angular',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<upup-uploader #uploader><ng-content /></upup-uploader>',
})
export class UpupUploaderComponent implements AfterViewInit, OnChanges, UpupAngularAttributeProps {
  @Input() uploadEndpoint?: string
  @Input() serverUrl?: string
  @Input() mode?: CoreOptions['mode']
  @Input() sources?: FileSource[] | string
  @Input() maxFiles?: number
  @Input() accept?: string
  @Input() enablePaste?: boolean
  @Input() theme?: 'light' | 'dark'
  @Input() locale?: string
  @Input() dir?: 'ltr' | 'rtl' | 'auto'

  @ViewChild('uploader', { static: true }) private uploader?: ElementRef<HTMLElement>

  private viewReady = false

  ngAfterViewInit() {
    defineUpupElement()
    this.viewReady = true
    this.applyAttributes()
  }

  ngOnChanges() {
    if (this.viewReady) {
      this.applyAttributes()
    }
  }

  private applyAttributes() {
    const element = this.uploader?.nativeElement
    if (!element) return

    for (const [name, value] of Object.entries(upupAngularAttributes(this))) {
      if (value === undefined || value === null) {
        element.removeAttribute(name)
      } else {
        element.setAttribute(name, String(value))
      }
    }
  }
}
