declare module 'upup-react-file-uploader' {
    export * from './backend/lib/aws/s3/s3-generate-presigned-url'
    export * from './backend/lib/aws/s3/s3-generate-signed-url'
    export * from './backend/lib/azure/azure-generate-sas-url'
    export * from './frontend/UpupUploader'
    export * from './shared/types'
}
