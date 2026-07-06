import { Component } from '@angular/core'

/** Renders nothing. Default placeholder for optional icon props. */
@Component({
    selector: 'upup-icon-empty',
    standalone: true,
    template: '',
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Angular requires a class as the component host; template renders nothing
export class EmptyIconComponent {}
