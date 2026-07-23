'use client'

import { UpupUploader } from '@upupjs/react'
import '@upupjs/react/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
