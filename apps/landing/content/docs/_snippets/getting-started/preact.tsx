import { UpupUploader } from '@upupjs/preact'
import '@upupjs/preact/styles'

export function App() {
    return <UpupUploader provider="aws" uploadEndpoint="/api/upload-token" />
}
