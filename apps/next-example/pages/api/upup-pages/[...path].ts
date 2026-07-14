import { createUpupPagesHandler } from '@upupjs/next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUpupConfig } from '@/lib/upup-config'

export const config = { api: { bodyParser: false } }

let _handler: ReturnType<typeof createUpupPagesHandler> | null = null

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    _handler ??= createUpupPagesHandler(getUpupConfig())
    return _handler(req, res)
}
