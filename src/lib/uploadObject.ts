import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

interface props {
    client: S3Client
    bucket: string
    key: string
    file: File
}

/**
 * Upload file to cloud provider bucket with public access permission (ACL)
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param key the final file name, usually it has timestamp prefix
 * @param file file to upload
 */
const uploadObject = async ({ client, bucket, key, file }: props) => {
    /**
     *   Define the parameters for the object you want to upload.
     */
    const params = {
        Bucket: bucket, // The path to the directory you want to upload the object to, starting with your Space name.
        Key: `${key}`, // Object key, referenced whenever you want to access this file later.
        Body: file, // The object's contents. This variable is an object, not a string.
        ACL: 'public-read', // Defines ACL permissions, such as private or public.
    }

    // Step 4: Define a function that uploads your object using SDK's PutObjectCommand object and catches any errors.
    try {
        console.log('Uploading object')
        const data = await client.send(new PutObjectCommand(params))
        return data
        // console.log('http', data)
        // if (data.httpStatusCode == 200) {
        //     console.log(
        //         'Successfully uploaded object: ' +
        //             params.Bucket +
        //             '/' +
        //             params.Key,
        //     )
        //     return params.Key
        // }
    } catch (err) {
        console.log('Error', err)
    }

    return null
}

// await client.putObject(
//     {
//         Bucket: bucket,
//         Key: `${key}`,
//         Body: file,
//         ACL: 'public-read',
//     },
//     (err: any, _data: any) => {
//         if (err) console.log(err, err.stack)
//     },
// )

export default uploadObject
