'use client'

import { UpupUploader } from '@useupup/react'
import '@useupup/react/styles'

export default function Uploader() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
