import { Component } from '@angular/core'
import { LoaderIconComponent } from './loader-icon.component'

@Component({
    selector: 'upup-default-loader-icon',
    standalone: true,
    imports: [LoaderIconComponent],
    template: `
        <upup-icon-loader class="upup-animate-spin upup-text-3xl upup-text-[#6D6D6D]" />
    `,
})
export class DefaultLoaderIconComponent {}
