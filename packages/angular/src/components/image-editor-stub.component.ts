import { Component } from '@angular/core'

/**
 * ImageEditorStubComponent — Angular port of ImageEditorStub.svelte.
 *
 * The image editor is not supported in Angular (React-only feature).
 * This stub renders nothing, mirroring the svelte stub which is an empty
 * template with only a comment:
 *   <!-- Image editor is not supported in Svelte. Use @upup/react if image editing is required. -->
 */
@Component({
    selector: 'upup-image-editor-stub',
    standalone: true,
    template: `<!-- Image editor is not supported in Angular. Use @upup/react if image editing is required. -->`,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Angular requires a class as the component host; this is an intentional no-op stub
export class ImageEditorStubComponent {}
