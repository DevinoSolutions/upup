type UploadObjectResponse = {
    httpStatusCode: number
    message: string
    key?: string
}

/**
 * Use pre-signed URL to upload file to cloud provider bucket
 * @param presignedUrl pre-signed URL
 * @param fields additional fields required by the pre-signed URL
 * @param file file to upload
 */
export const uploadObject = async ({
    presignedUrl,
    fields,
    file,
}: {
    presignedUrl: string
    fields?: { [key: string]: string }
    file: File
}): Promise<UploadObjectResponse> => {
    try {
        const formData = new FormData()

        // Add any additional fields required by the pre-signed URL
        if (fields)
            Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value)
            })
        formData.append('file', file)

        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: fields ? formData : file,
        })

        if (!response.ok)
            throw new Error(`Upload failed: ${response.statusText}`)

        return {
            httpStatusCode: response.status,
            message: 'Successfully uploaded object',
            key: fields?.key,
        }
    } catch (error) {
        throw new Error(`Upload failed: ${(error as Error).message}`)
    }
}
