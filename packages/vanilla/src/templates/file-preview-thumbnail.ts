import { html, nothing } from 'lit-html'
import type { TemplateResult } from 'lit-html'
import {
    fileGetExtension,
    fileGetIsPdf,
    fileGetIsText,
    fileIs3D,
    cn,
} from '@useupup/core/internal'
import type { UploaderContext } from '../lib/types'
import { fileIcon } from './file-icon'

export function filePreviewThumbnail(
    ctx: UploaderContext,
    args: {
        canPreview: boolean
        fileType: string
        fileName: string
        fileUrl: string
        fileSize?: number
        allowPreview: boolean
    },
    onCanPreview: () => void,
): TemplateResult | typeof nothing {
    const { canPreview, fileType, fileName, fileUrl, allowPreview } = args
    const slot = ctx.theme.getSnapshot().slotOverrides

    const extension = fileGetExtension(fileType, fileName)
    const isPdf = fileGetIsPdf(fileType, fileName)
    const is3D = fileIs3D(extension.toLowerCase())
    // Text files render as a static doc icon (cross-framework parity).
    const isText = fileGetIsText(fileType, fileName)

    if (isPdf || is3D || isText) {
        // PDFs, 3D files, and text — static icon only
        return html` <div
            class="upup-flex upup-flex-col upup-items-center upup-gap-2"
        >
            ${fileIcon(ctx, extension, slot.fileIcon)}
        </div>`
    }

    return html` ${
        !canPreview
            ? html`
                  <object
                      data=${fileUrl}
                      width="0%"
                      height="0%"
                      name=${fileName}
                      title=${fileName}
                      type=${fileType}
                      @load=${() => {
                          onCanPreview()
                      }}
                  >
                      <p>${ctx.translations.loading}</p>
                  </object>
                  ${fileIcon(ctx, extension)}
              `
            : nothing
    }
    ${
        canPreview
            ? html`
                  ${fileIcon(
                      ctx,
                      extension,
                      cn({ 'md:upup-hidden': allowPreview }, slot.fileIcon),
                  )}
                  <div
                      class=${cn(
                          `upup-relative upup-hidden upup-h-full upup-w-full ${allowPreview ? 'md:upup-block' : ''}`,
                      )}
                  >
                      <object
                          data=${fileUrl}
                          width="100%"
                          height="100%"
                          name=${fileName}
                          title=${fileName}
                          type=${fileType}
                          class="upup-absolute upup-h-full upup-w-full"
                      >
                          <p>${ctx.translations.loading}</p>
                      </object>
                  </div>
              `
            : nothing
    }`
}
