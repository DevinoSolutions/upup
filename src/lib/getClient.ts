import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { S3Configs } from '../types/S3Configs'

export type S3ClientWithSend = S3Client & {
    send: (command: PutObjectCommand) => Promise<any>
}

let client: S3ClientWithSend | null = null

type Params = {
    configs: S3Configs
    handler?: any
}

/**
 * Get S3 client singleton instance with custom request handler
 * @param params
 */
const getClient = (params: Params): S3ClientWithSend => {
    if (client) return client
    const { configs, handler: requestHandler } = params
    const { region, endpoint, credentials } = configs
    client = new S3Client({
        region,
        endpoint,
        credentials,
        requestHandler,
    }) as S3ClientWithSend

    return client
}

export default getClient
