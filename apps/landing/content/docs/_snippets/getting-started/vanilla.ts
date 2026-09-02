import { createUploader } from '@useupup/vanilla'
import '@useupup/vanilla/styles'

const uploader = createUploader('#uploader', {
    provider: 'aws',
    uploadEndpoint: '/api/upload-token',
})

// Later, when you tear down the view:
uploader.destroy()
