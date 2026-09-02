import { createUpupNextHandler } from '@useupup/next/server'
import { getUpupConfig } from '@/lib/upup-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Lazy: createUpupNextHandler validates config at construct time, which calls
// requireServerEnv. Deferring to first request keeps `next build` clean
// (Next imports route modules during build for page-data collection).
let _handler: ReturnType<typeof createUpupNextHandler> | null = null
const lazy = () => (_handler ??= createUpupNextHandler(getUpupConfig()))

export const GET = (req: Request) => lazy().GET(req)
export const POST = (req: Request) => lazy().POST(req)
export const PUT = (req: Request) => lazy().PUT(req)
export const DELETE = (req: Request) => lazy().DELETE(req)
