// Author: Bassem JADOUI 31/05/2023
import 'frontend/tailwind.css'

export { default as s3GeneratePresignedUrl } from 'backend/utils/aws/s3/s3-generate-presigned-url'
export { default as s3GenerateSignedUrl } from 'backend/utils/aws/s3/s3-generate-signed-url'
export { default as azureGenerateSasUrl } from 'backend/utils/azure/azure-generate-sas-url'
export { BaseConfigs } from 'frontend/types/BaseConfigs'
export { GoogleConfigs } from 'frontend/types/GoogleConfigs'
export { OneDriveConfigs } from 'frontend/types/OneDriveConfigs'
export { UPLOAD_ADAPTER, UploadAdapter } from 'frontend/types/UploadAdapter'
export { UploadFilesRef, UpupUploader } from 'UpupUploader'
