import { FileSource } from '@upup/core'
import type { RootContext } from '../lib/types'
import { clientDriveUploader } from './client-drive-uploader'
import { serverModeDriveUploader } from './server-mode-drive-uploader'

export function dropboxUploader(ctx: RootContext) {
  return ctx.mode === 'server'
    ? serverModeDriveUploader(ctx, { provider: 'dropbox', onBack: () => ctx.setActiveAdapter(undefined) })
    : clientDriveUploader(ctx, FileSource.DROPBOX)
}
