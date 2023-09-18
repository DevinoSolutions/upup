import { S3Client } from '@aws-sdk/client-s3'
import { S3Configs } from '../types/S3Configs'

let client: S3Client | null = null

/**
 * Get S3 client
 * @param configs S3 configs (region, endpoint...etc)
 * @returns S3 client
 */
const getClient = (configs: S3Configs): S3Client => {
    if (client) return client
    const { region, endpoint, credentials } = configs
    client = new S3Client({
        region,
        endpoint,
        credentials,
    })

    return client
}

export default getClient
