import { UpupUploader } from '@useupup/preact'
import '@useupup/preact/styles'

export function App() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
