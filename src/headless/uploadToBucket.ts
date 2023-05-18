import { getClient, s3Configs } from '../lib/S3'

interface props {
    config: s3Configs
    bucket: string
    key: string
    file: File
    ACL?: string
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param key the final file name, usually it has timestamp prefix
 * @param compressedFile file to upload
 */
export function uploadToBucket({ config, bucket, key, file, ACL }: props) {
    return getClient(config).putObject({
        Bucket: bucket,
        Key: key,
        Body: file,
        ACL: ACL ?? 'public-read',
    })
}
