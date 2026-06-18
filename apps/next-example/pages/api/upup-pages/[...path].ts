import { createUpupPagesHandler } from '@upup/next/server'
import { upupConfig } from '@/lib/upup-config'

// REQUIRED so the bridge receives the raw request body.
export const config = { api: { bodyParser: false } }

export default createUpupPagesHandler(upupConfig)
