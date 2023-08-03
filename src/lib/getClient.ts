import { S3 } from '@aws-sdk/client-s3'
import { S3Configs } from '../types/S3Configs'
let client: S3 | null = null

/**
 * Get S3 client
 * @param configs S3 configs (region, endpoint...etc)
 */
export function getClient(configs: S3Configs) {
    if (client) return client
    const { region, endpoint, credentials } = configs
    client = new S3({
        region,
        endpoint,
        credentials,
    })

    return client
}
