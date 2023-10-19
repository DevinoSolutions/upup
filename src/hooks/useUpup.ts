import { Dispatch, SetStateAction, useEffect } from 'react'
import { CloudStorageConfigs } from 'types/CloudStorageConfigs'
import { GoogleConfigs } from 'types/GoogleConfigs'
import { BaseConfigs } from 'types/BaseConfigs'
import { OneDriveConfigs } from 'types/OneDriveConfigs'
import { S3Configs } from 'types/S3Configs'

const space_secret = process.env.SPACE_SECRET
const space_key = process.env.SPACE_KEY
const space_endpoint = process.env.SPACE_ENDPOINT
const space_region = process.env.SPACE_REGION
const document_space = process.env.SPACE_DOCUMENTS
const image_space = process.env.SPACE_IMAGES
const onedrive_client_id = process.env.ONEDRIVE_CLIENT_ID
const google_client_id = process.env.GOOGLE_CLIENT_ID
const google_app_id = process.env.GOOGLE_APP_ID
const google_api_key = process.env.GOOGLE_API_KEY

/**
 * specify the type of file to accept
 * @param accept
 */
interface Props {
    accept?: string
    multiple?: boolean
    setFiles?: Dispatch<SetStateAction<File[]>>
    limit?: number
    onFileClick?: (file: File) => void
    mini?: boolean
    onFilesChange?: (files: File[]) => Promise<File[]>
}

/**
 * @param props
 */
export const useUpup: (props?: Props) => {
    cloudStorageConfigs: CloudStorageConfigs
    googleConfigs: GoogleConfigs
    baseConfigs: BaseConfigs
    oneDriveConfigs: OneDriveConfigs
} = (
    props: Props = {
        accept: '*',
        setFiles: () => {},
        multiple: false,
        mini: false,
    },
) => {
    const {
        accept,
        setFiles,
        multiple,
        limit,
        onFileClick,
        mini,
        onFilesChange,
    } = props

    // const handler = new XhrHttpHandler({})
    //
    // handler.on(XhrHttpHandler.EVENTS.UPLOAD_PROGRESS, (xhr: ProgressEvent) => {
    //     const progress = Math.round((xhr.loaded / xhr.total) * 100)
    //     console.log(
    //         progress === 100
    //             ? '%cUPLOAD COMPLETE'
    //             : `%cUpload Progress : ${progress}%`,
    //         `color: ${progress === 100 ? '#00ff00' : '#ff9600'}`,
    //     )
    // })

    /**
     * Throw an error if any of the required environment variables are missing
     */
    useEffect(() => {
        const requiredEnvVars = {
            SPACE_SECRET: !!space_secret,
            SPACE_KEY: !!space_key,
            SPACE_ENDPOINT: !!space_endpoint,
            SPACE_REGION: !!space_region,
            SPACE_DOCUMENTS: !!document_space,
            SPACE_IMAGES: !!image_space,
            ONEDRIVE_CLIENT_ID: !!onedrive_client_id,
            GOOGLE_CLIENT_ID: !!google_client_id,
            GOOGLE_APP_ID: !!google_app_id,
            GOOGLE_API_KEY: !!google_api_key,
        }

        const missingEnvVars = Object.entries(requiredEnvVars)
            .filter(([_, value]) => !value)
            .map(([key, _]) => key)

        if (missingEnvVars.length > 0) {
            throw new Error(
                `Missing environment variables: ${missingEnvVars.join(', ')}`,
            )
        }
    }, [])

    const s3Configs: S3Configs = {
        region: space_region,
        endpoint: space_endpoint,
        credentials: {
            accessKeyId: space_key,
            secretAccessKey: space_secret,
        },
    }

    const baseConfigs: BaseConfigs = {
        onChange: (files: File[]) => (setFiles ? setFiles(files) : () => {}),
        multiple,
        accept,
        limit,
        onFileClick,
        mini,
        onFilesChange,
    }

    const cloudStorageConfigs: CloudStorageConfigs = {
        bucket: accept !== 'image/*' ? document_space : image_space,
        s3Configs,
    }

    const googleConfigs: GoogleConfigs = {
        google_api_key,
        google_app_id,
        google_client_id,
    }

    const oneDriveConfigs: OneDriveConfigs = {
        onedrive_client_id,
        redirectUri: window.location.href,
    }

    return {
        baseConfigs,
        cloudStorageConfigs,
        googleConfigs,
        oneDriveConfigs,
    }
}
