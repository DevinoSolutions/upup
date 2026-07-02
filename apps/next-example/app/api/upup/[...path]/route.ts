import { createUpupNextHandler } from '@upup/next/server'
import { upupConfig } from '@/lib/upup-config'

// Recommended for the server-mode drive-transfer path (it streams through the
// function). Raise maxDuration toward the platform max for large files.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const { GET, POST, PUT, DELETE } = createUpupNextHandler(upupConfig)
