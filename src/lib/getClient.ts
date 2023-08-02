import { S3 } from '@aws-sdk/client-s3'
import { Is3Configs } from '../types/Is3Configs'
let client: S3 | null = null

/**
 * Get S3 client
 * @param configs S3 configs (region, endpoint...etc)
 */
export function getClient(configs: Is3Configs) {
    if (client) return client
    const { region, endpoint, credentials } = configs
    client = new S3({
        region,
        endpoint,
        credentials,
    })

    return client
}
