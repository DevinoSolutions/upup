# @useupup/angular

Angular 19+ standalone file uploader with cloud-drive sources (Google Drive,
OneDrive, Dropbox, Box), resumable uploads, theming, and ICU i18n. A native port
of the canonical [upup](https://github.com/DevinoSolutions/upup) React UI,
DOM-identical to it.

Requires Angular 19+ (`@angular/core`, `@angular/common`, and `rxjs` are peer
dependencies).

## Install

```sh
npm i @useupup/angular
```

## Usage (Client Mode)

`UpupUploaderComponent` is a **standalone** component (selector `upup-uploader`).
Add it to a standalone component's `imports` (or an `NgModule`'s `imports`). It
takes a single `config` input. Client Mode uploads directly from the browser to
your storage; your server only issues short-lived upload credentials at
`uploadEndpoint`.

```ts
import { Component } from '@angular/core'
import { UpupUploaderComponent } from '@useupup/angular'

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [UpupUploaderComponent],
    template: `<upup-uploader
        [config]="{ provider: 'aws', uploadEndpoint: '/api/upload-token' }"
    />`,
})
export class AppComponent {}
```

Load the stylesheet once globally — add `@useupup/angular/styles` to the `styles`
array in `angular.json`, or `@import '@useupup/angular/styles';` in your global
`styles.css`. `uploadEndpoint` is your own route returning a presigned upload URL
— see the quickstart for a ready-made handler. Wire completion via the config's
`onFileUploadComplete` callback or the component's `(uploadAllComplete)` output.

## Server Mode

For credential isolation and server-proxied cloud drives, add
[`@useupup/server`](https://www.npmjs.com/package/@useupup/server) and set the mode:

```html
<upup-uploader
    [config]="{ mode: 'server', serverUrl: '/api/upup', provider: 'aws' }"
/>
```

## Also exported

`UpupStore` and the `createUpupUpload` / `toSignalStore` helpers for driving the
uploader from your own Angular state, plus the `FileSource`, `StorageProvider`,
and `UploadStatus` enums.

## Links

- [Angular quickstart](https://useupup.com/documentation/quickstarts/angular)
- [Documentation](https://useupup.com/documentation/)
- [Source & monorepo](https://github.com/DevinoSolutions/upup)

## License

MIT
