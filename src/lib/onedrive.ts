import { Client } from '@microsoft/microsoft-graph-client'
import { OneDriveFile } from 'types'

export async function onedriveFetchFiles(
    graphClient?: Client,
    fileId = 'root',
) {
    const response = await graphClient
        ?.api(`/me/drive/items/${fileId}/children`)
        .select('id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl')
        .expand('thumbnails')
        .get()

    const files = response.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        isFolder: !!item.folder,
        children: item.folder ? [] : undefined,
        thumbnails: item.thumbnails?.[0] || null,
        '@microsoft.graph.downloadUrl': item['@microsoft.graph.downloadUrl'],
        file: item.file,
    }))

    return files
}

export const onedriveFetchFileInfo = async (
    fileId: string,
    graphClient?: Client,
    properties = '@microsoft.graph.downloadUrl',
) => graphClient?.api(`/me/drive/items/${fileId}`).select(properties).get()

export const onedriveFetchPermission = async (
    fileId: string,
    graphClient?: Client,
) =>
    graphClient?.api(`/me/drive/items/${fileId}/createLink`).post({
        type: 'view',
        scope: 'anonymous',
    })

export async function onedriveFetchUpdatedFile(
    file: OneDriveFile,
    graphClient?: Client,
) {
    const fileInfo = await onedriveFetchFileInfo(
        file.id,
        graphClient,
        'id,name,file,thumbnails,@microsoft.graph.downloadUrl',
    )

    if (!fileInfo['@microsoft.graph.downloadUrl']) {
        const permission = await onedriveFetchPermission(file.id, graphClient)

        // Convert the sharing URL to a direct download URL
        const shareUrl = permission.link.webUrl
        const downloadUrl = shareUrl.replace('redir?', 'download?')
        fileInfo['@microsoft.graph.downloadUrl'] = downloadUrl
    }

    return {
        ...file,
        '@microsoft.graph.downloadUrl':
            fileInfo['@microsoft.graph.downloadUrl'],
        thumbnails: fileInfo.thumbnails?.[0] || null,
        file: fileInfo.file,
    }
}
