import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { S3Configs } from '../types/S3Configs'

export type S3ClientWithSend = S3Client & {
    send: (command: PutObjectCommand) => Promise<unknown>
}

let client: S3ClientWithSend | null = null

/**
 * Get S3 client
 * @param configs S3 configs (region, endpoint...etc)
 * @returns S3 client
 */
const getClient = (configs: S3Configs): S3ClientWithSend => {
    if (client) return client
    const { region, endpoint, credentials } = configs
    client = new S3Client({
        region,
        endpoint,
        credentials,
    }) as S3ClientWithSend

    return client
}

export default getClient
