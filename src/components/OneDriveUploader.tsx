import { Dispatch, FC, SetStateAction } from 'react'
import { useLoadOdAPI } from 'hooks'
import {
    BaseConfigs,
    OneDriveConfigs,
    OneDriveResponse,
    OneDriveValue,
} from 'types'
import useOneDrive from '../hooks/useOneDrive'

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
    const { token } = useOneDrive(oneDriveConfigs)
    console.log(token)

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
                <button onClick={openPicker}>
                    <img
                        src="https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/svg/onedrive_32x1.svg"
                        alt="One Drive Logo"
                    />
                    One Drive
                </button>
            )}
        </div>
    )
}

export default OneDriveUploader
