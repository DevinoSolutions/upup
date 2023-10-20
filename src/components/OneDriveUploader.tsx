import { Dispatch, FC, SetStateAction } from 'react'
import { useLoadOdAPI } from 'hooks'
import {
    BaseConfigs,
    OneDriveConfigs,
    OneDriveResponse,
    OneDriveValue,
} from 'types'
import styled from 'styled-components'

const OneDriveButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffff;
    color: #4a5568;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
    transition:
        background-color 0.3s ease-in-out,
        color 0.3s ease-in-out;

    &:hover {
        background-color: #f0f4f8;
        color: #2d3748;
    }

    img {
        width: 1.25rem;
        height: 1.25rem;
        margin-right: 0.5rem;
        fill: currentColor;
    }
`
const OneDriveLogo = styled.img`
    width: 20px;
    height: 20px;
    margin-right: 8px;
`
interface Props {
    baseConfigs: BaseConfigs
    oneDriveConfigs: OneDriveConfigs
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: Dispatch<SetStateAction<string>>
}

/**
 * Upload files from One Drive to S3 bucket
 * @param oneDriveConfigs one drive configs
 * @param setFilesFromParent return the files to the parent component
 * @constructor
 */
const OneDriveUploader: FC<Props> = ({
    baseConfigs: { multiple: multiSelect },
    oneDriveConfigs,
    setFiles,
    setView,
}: Props) => {
    const { isLoaded } = useLoadOdAPI()
    const { onedrive_client_id: clientId, redirectUri } = oneDriveConfigs

    /**
     * Process the response from the one drive
     * @param oneDriveResponse one drive response
     */
    const processResponse = (oneDriveResponse: OneDriveResponse) => {
        /**
         * Loop through the files array and download the files
         */
        Promise.allSettled(
            oneDriveResponse.value.map(async (oneDriveValue: OneDriveValue) => {
                /**
                 * Download the file from the one drive
                 */
                const response = await fetch(
                    oneDriveValue['@microsoft.graph.downloadUrl'],
                )
                /**
                 * Convert the file to blob
                 */
                const blob = await response.blob()

                /**
                 * Create a new file from the blob then send it to the parent component
                 */
                setFiles(oldFiles => [
                    ...oldFiles,
                    new File([blob], oneDriveValue.name, {
                        type: oneDriveValue.file.mimeType,
                    }),
                ])
                setView('internal')
            }),
        )
    }

    /**
     * Open the one drive picker
     */
    const openPicker = () => {
        /**
         * One Drive options
         */
        const odOptions = {
            clientId,
            action: 'download',
            multiSelect,
            openInNewWindow: true,
            advanced: {
                redirectUri,
                filter: '.jpg,.png,.pdf,.docx,.xlsx,.pptx',
                queryParameters: 'select=id,name,size,file,folder',
                scopes: 'files.readwrite.all',
            },
            success: (response: OneDriveResponse) => {
                /**
                 * Process the response from the one drive picker after the user selected the files
                 **/
                processResponse(response)
            },
            cancel: () => {
                console.warn('User cancelled')
            },
            error: (e: any) => {
                console.error(e)
            },
        }
        /**
         * Open the one drive picker with the options above
         * @see https://docs.microsoft.com/en-us/onedrive/developer/controls/file-pickers/js-v72/open-file-picker
         */
        ;(window as any).OneDrive.open(odOptions)
    }

    return (
        <div>
            {isLoaded && (
                // one drive button with logo and text
                <OneDriveButton onClick={openPicker}>
                    <OneDriveLogo
                        src="https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/svg/onedrive_32x1.svg"
                        alt="One Drive Logo"
                    />
                    One Drive
                </OneDriveButton>
            )}
        </div>
    )
}

export default OneDriveUploader
