import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { S3Configs } from '../types/S3Configs'

export type S3ClientWithSend = S3Client & {
    send: (command: PutObjectCommand) => Promise<any>
}

let client: S3ClientWithSend | null = null

/**
 * Get S3 client
 * @param configs S3 configs (region, endpoint...etc)
 * @returns S3 client
 */
export const getClient = (configs: S3Configs): S3ClientWithSend => {
    if (client) return client

    client = new S3Client(configs) as S3ClientWithSend

    return client
}
