import { Component } from '@angular/core'
import { LoaderIconComponent } from './loader-icon.component'

@Component({
    selector: 'upup-default-loader-icon',
    standalone: true,
    imports: [LoaderIconComponent],
    template: `
        <upup-icon-loader
            class="upup-animate-spin upup-text-3xl upup-text-[#6D6D6D]"
        />
    `,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Angular requires a class as the component host; behavior lives in the template
export class DefaultLoaderIconComponent {}
