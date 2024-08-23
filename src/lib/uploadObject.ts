import { PutObjectCommand } from '@aws-sdk/client-s3'
import { PutObjectRequest } from '@aws-sdk/client-s3/dist-types/models/models_0'
import { S3ClientWithSend } from './getClient'

type props = {
    client: S3ClientWithSend
    bucket: string
    key: string
    file: File
    acl?:
        | 'public-read'
        | 'private'
        | 'authenticated-read'
        | 'aws-exec-read'
        | 'bucket-owner-full-control'
        | 'bucket-owner-read'
        | 'public-read-write'
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
export const uploadObject = async ({
    client,
    bucket,
    key,
    file,
    acl = 'public-read',
}: props): Promise<UploadObjectResponse> => {
    /**
     *   Define the parameters for the object you want to upload.
     */
    const params: PutObjectRequest = {
        Bucket: bucket, // The path to the directory you want to upload the object to, starting with your Space name.
        Key: `${key}`, // Object key, referenced whenever you want to access this file later.
        Body: file, // The object's contents. This variable is an object, not a string.
        ACL: acl, // Defines ACL permissions, such as private or public.
    }

    /**
     *  Define a function that uploads your object using SDK's PutObjectCommand object and catches any errors.
     */

    const data = await client.send(new PutObjectCommand(params))
    if (data.$metadata.httpStatusCode === 200) {
        return {
            httpStatusCode: data.$metadata.httpStatusCode,
            message:
                'Successfully uploaded object: ' +
                params.Bucket +
                '/' +
                params.Key,
            key,
        }
    } else {
        return {
            httpStatusCode: data.$metadata.httpStatusCode || 500,
            message:
                'Error uploading object: ' + params.Bucket + '/' + params.Key,
        }
    }
}
