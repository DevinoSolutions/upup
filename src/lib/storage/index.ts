import { Provider, StorageConfig, StorageSDK } from '../../types/StorageSDK'

const SDKMap: Record<
    Provider,
    () => Promise<{ default: new (config: StorageConfig) => StorageSDK }>
> = {
    aws: () => import('./providers/aws').then(m => ({ default: m.AWSSDK })),
    azure: () =>
        import('./providers/azure').then(m => ({ default: m.AzureSDK })),
    digitalocean: () =>
        import('./providers/digitalocean').then(m => ({
            default: m.DigitalOceanSDK,
        })),
}

export async function createStorageSDK(
    config: StorageConfig,
): Promise<StorageSDK> {
    const SDKClass = await SDKMap[config.provider]()
    return new SDKClass.default(config)
}
