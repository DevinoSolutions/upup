import type { TemplateResult } from 'lit-html'
import { FileSource } from '@upupjs/core'
import type { UploaderContext } from '../lib/types'
import { clientDriveUploader } from './client-drive-uploader'
import { serverModeDriveUploader } from './server-mode-drive-uploader'

export function oneDriveUploader(ctx: UploaderContext): TemplateResult {
    return ctx.mode === 'server'
        ? serverModeDriveUploader(ctx, {
              provider: 'one-drive',
              onBack: () => {
                  ctx.setActiveSource(undefined)
              },
          })
        : clientDriveUploader(ctx, FileSource.ONE_DRIVE)
}
