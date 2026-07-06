import type { TemplateResult } from 'lit-html'
import { FileSource } from '@upup/core'
import type { UploaderContext } from '../lib/types'
import { clientDriveUploader } from './client-drive-uploader'
import { serverModeDriveUploader } from './server-mode-drive-uploader'

export function googleDriveUploader(ctx: UploaderContext): TemplateResult {
    return ctx.mode === 'server'
        ? serverModeDriveUploader(ctx, {
              provider: 'google-drive',
              onBack: () => {
                  ctx.setActiveSource(undefined)
              },
          })
        : clientDriveUploader(ctx, FileSource.GOOGLE_DRIVE)
}
