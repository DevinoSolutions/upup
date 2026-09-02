'use client'

import { UpupUploader } from '@useupup/next'
import '@useupup/next/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
