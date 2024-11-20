import { Provider, StorageConfig, StorageSDK } from '../../types/StorageSDK'

const SDKMap: Record<
    Provider,
    () => Promise<{ default: new (config: StorageConfig) => StorageSDK }>
> = {
    [Provider.AWS]: () =>
        import('./providers/s3').then(m => ({ default: m.S3SDK })),
    [Provider.Azure]: () =>
        import('./providers/azure').then(m => ({ default: m.AzureSDK })),
    [Provider.BackBlaze]: () =>
        import('./providers/s3').then(m => ({ default: m.S3SDK })),
    [Provider.DigitalOcean]: () =>
        import('./providers/s3').then(m => ({ default: m.S3SDK })),
}

export async function createStorageSDK(
    config: StorageConfig,
): Promise<StorageSDK> {
    const SDKClass = await SDKMap[config.provider]()
    return new SDKClass.default(config)
}
