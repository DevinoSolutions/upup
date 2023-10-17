type props = {
    key: string
    file: File
    endpoint: string
    accept: string
}

type UploadObjectResponse = {
    httpStatusCode: number
    message: string
    key?: string
}

/**
 * Upload file to cloud provider bucket with public access permission (ACL)
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param key the final file name, usually it has timestamp prefix
 * @param file file to upload
 */
const uploadObject = async ({
    key,
    file,
    endpoint,
    accept,
}: props): Promise<UploadObjectResponse> => {
    const formData = new FormData()
    formData.append('files', file, key)
    formData.append('accept', accept)

    /**
     *  Define a function that uploads your object using SDK's PutObjectCommand object and catches any errors.
     */
    try {
        const data = await fetch(endpoint, { body: formData, method: 'POST' })
        const response = await data.json()
        if (response.key) {
            return {
                httpStatusCode: 200,
                message: 'File uploaded successfully',
                key: response.key,
            }
        }
    } catch (err) {
        console.error('Error', err)
    }

    return {
        httpStatusCode: 500,
        message: 'Error uploading object: ' + key,
    }
}

export default uploadObject
