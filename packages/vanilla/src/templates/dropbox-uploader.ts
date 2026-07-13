import type { TemplateResult } from 'lit-html'
import { FileSource } from '@upupjs/core'
import type { UploaderContext } from '../lib/types'
import { clientDriveUploader } from './client-drive-uploader'
import { serverModeDriveUploader } from './server-mode-drive-uploader'

export function dropboxUploader(ctx: UploaderContext): TemplateResult {
    return ctx.mode === 'server'
        ? serverModeDriveUploader(ctx, {
              provider: 'dropbox',
              onBack: () => {
                  ctx.setActiveSource(undefined)
              },
          })
        : clientDriveUploader(ctx, FileSource.DROPBOX)
}
