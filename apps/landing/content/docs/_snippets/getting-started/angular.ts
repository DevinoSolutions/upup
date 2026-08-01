import { Component } from '@angular/core'
import { UpupUploaderComponent } from '@upupjs/angular'

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [UpupUploaderComponent],
    template: `<upup-uploader
        [config]="{ provider: 'aws', uploadEndpoint: '/api/upload-token' }"
    />`,
})
export class AppComponent {}
