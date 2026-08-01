'use client'

import { UpupUploader } from '@upupjs/next'
import '@upupjs/next/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
