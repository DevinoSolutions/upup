import ShouldRender from 'components/ShouldRender'
import { useConfigContext } from 'context/config-context'
import { memo, useMemo } from 'react'
import { TbFile, TbFolder } from 'react-icons/tb'
import { OneDriveFile } from 'types'
import { cn, handleImgError } from 'utils'

type Props = {
    file: OneDriveFile
    handleClick: (file: OneDriveFile) => void
    selectedFiles: OneDriveFile[]
    folderLoading?: string
    fileSelecting?: string
}

export default memo(function OneDriveItem({
    file,
    handleClick,
    selectedFiles,
    folderLoading,
    fileSelecting,
}: Props) {
    const { accept } = useConfigContext()
    const isFolder = useMemo(() => file.isFolder, [file.isFolder])
    const isFileSelected = useMemo(
        () => selectedFiles.some(f => f.id === file.id),
        [selectedFiles, file.id],
    )
    const isFileAccepted = useMemo(
        () =>
            accept !== '*' && !isFolder
                ? accept?.includes(file.name.split('.').pop()!)
                : true,
        [accept, isFolder, file.name],
    )
    const isLoading = useMemo(
        () => folderLoading === file.id || fileSelecting === file.id,
        [folderLoading, fileSelecting, file.id],
    )

    if (!isFileAccepted && !isFolder) return null

    return (
        <div
            key={file.id}
            className={cn(
                `mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md bg-[#e9ecef00] p-1 py-2 duration-100 hover:bg-[#eaeaea]`,
                {
                    fontMedium: isFolder,
                    'animate-pulse bg-[#bab4b499] hover:bg-[#bab4b499]':
                        isLoading,
                    'bg-[#bab4b499] hover:bg-[#bab4b499]': isFileSelected,
                },
            )}
            onClick={() => !isLoading && handleClick(file)}
        >
            <div className="flex items-center gap-2">
                <i className="relative text-lg">
                    <ShouldRender if={isFolder}>
                        <TbFolder />
                    </ShouldRender>
                    <ShouldRender if={!isFolder}>
                        <ShouldRender if={!!file.thumbnails}>
                            <img
                                src={file.thumbnails?.small.url}
                                alt={file.name}
                                className="h-5 w-5 rounded-md border"
                                onError={handleImgError}
                            />
                        </ShouldRender>

                        <ShouldRender if={!file.thumbnails}>
                            <TbFile />
                        </ShouldRender>
                    </ShouldRender>
                </i>
                <h1 className="text-xs">{file.name}</h1>
            </div>
        </div>
    )
})
