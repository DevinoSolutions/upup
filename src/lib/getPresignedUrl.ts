import { PreSignedUrlRequest, PreSignedUrlResponse } from 'types/PreSignedUrl'

export const getPresignedUrl = async (
    endpoint: string,
    fileData: PreSignedUrlRequest,
): Promise<PreSignedUrlResponse> => {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(fileData),
    })
    if (!response.ok)
        throw new Error(`Failed to get pre-signed URL: ${response.statusText}`)

    return response.json()
}
