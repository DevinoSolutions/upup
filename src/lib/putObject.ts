
interface props{
    client: any
    bucket: string
    key: string
    compressedFile: File
}

/**
 *
 * @param client
 * @param bucket
 * @param key
 * @param compressedFile
 */
export function pubObject({client,bucket, key, compressedFile} : props) {
    client.putObject(
        {
            Bucket: bucket,
            Key: `${key}`,
            Body: compressedFile,
            ACL: 'public-read',
        },
        (err: any, _data: any) => {
            if (err) console.log(err, err.stack)
        }
    )
}
