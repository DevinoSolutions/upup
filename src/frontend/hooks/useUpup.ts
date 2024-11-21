import { BaseConfigs } from 'frontend/types/BaseConfigs'
import { GoogleConfigs } from 'frontend/types/GoogleConfigs'
import { OneDriveConfigs } from 'frontend/types/OneDriveConfigs'
import { Dispatch, SetStateAction, useEffect } from 'react'

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
    setFiles?: Dispatch<SetStateAction<File[]>>
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
        setFiles: () => {},
        multiple: false,
        mini: false,
    },
) => {
    const { setFiles } = props

    /**
     * Throw an error if any of the required environment variables are missing
     */
    useEffect(() => {
        const requiredEnvVars = {
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
        onChange: (files: File[]) => (setFiles ? setFiles(files) : () => {}),
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
