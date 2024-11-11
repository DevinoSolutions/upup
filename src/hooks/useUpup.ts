import { Dispatch, SetStateAction, useEffect } from 'react'
import { BaseConfigs } from 'types/BaseConfigs'
import { CloudStorageConfigs } from 'types/CloudStorageConfigs'
import { S3Configs } from 'types/S3Configs'

const space_secret = process.env.SPACE_SECRET
const space_key = process.env.SPACE_KEY
const space_endpoint = process.env.SPACE_ENDPOINT
const space_region = process.env.SPACE_REGION
const document_space = process.env.SPACE_DOCUMENTS
const image_space = process.env.SPACE_IMAGES

/**
 * @param props
 * @returns
 * @description
 * This hook is used to set up the configs for the Upup component.
 * It also checks if the required environment variables are present.
 * If any of the required environment variables are missing, it throws an error.
 *
 */

type Props = BaseConfigs & {
    setFiles?: Dispatch<SetStateAction<File[]>>
}

/**
 * @param props
 */
export const useUpup: (props?: Props) => {
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
} = (
    props: Props = {
        accept: '*',
        setFiles: () => {},
        multiple: false,
        mini: false,
    },
) => {
    const { accept, setFiles } = props

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
        ...props,
        onChange: (files: File[]) => (setFiles ? setFiles(files) : () => {}),
    }

    const cloudStorageConfigs: CloudStorageConfigs = {
        bucket: accept !== 'image/*' ? document_space : image_space,
        s3Configs,
    }

    return {
        baseConfigs,
        cloudStorageConfigs,
    }
}
