import { Dispatch, SetStateAction, useEffect } from 'react'
import { BaseConfigs } from 'types/BaseConfigs'
import { GoogleConfigs } from 'types/GoogleConfigs'
import { OneDriveConfigs } from 'types/OneDriveConfigs'

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
 * @param props
 * @returns
 * @description
 * This hook is used to set up the configs for the Upup component.
 * It also checks if the required environment variables are present.
 * If any of the required environment variables are missing, it throws an error.
 *
 */

type Props = BaseConfigs & {
    setSelectedFiles?: Dispatch<SetStateAction<File[]>>
}

/**
 * @param props
 */
export const useUpup: (props?: Props) => {
    googleConfigs: GoogleConfigs
    baseConfigs: BaseConfigs
    oneDriveConfigs: OneDriveConfigs
} = (
    props: Props = {
        accept: '*',
        setSelectedFiles: () => {},
        multiple: false,
        mini: false,
    },
) => {
    const { setSelectedFiles } = props

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

    const baseConfigs: BaseConfigs = {
        ...props,
        onFilesSelected: (files: File[]) =>
            setSelectedFiles ? setSelectedFiles(files) : () => {},
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
        googleConfigs,
        oneDriveConfigs,
    }
}
