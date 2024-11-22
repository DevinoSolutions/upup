declare module '@bassem97/upup' {
    export * from './backend/lib/aws/s3/s3-generate-presigned-url'
    export * from './backend/lib/aws/s3/s3-generate-signed-url'
    export * from './backend/lib/azure/azure-generate-sas-url'
    export * from './frontend/types/BaseConfigs'
    export * from './frontend/types/GoogleConfigs'
    export * from './frontend/types/OneDriveConfigs'
    export * from './frontend/types/UploadAdapter'
    export * from './frontend/UpupUploader'
}
