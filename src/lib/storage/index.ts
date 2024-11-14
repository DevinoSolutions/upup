import { Provider, StorageConfig, StorageSDK } from '../../types/StorageSDK'

const SDKMap: Record<
    Provider,
    () => Promise<{ default: new (config: StorageConfig) => StorageSDK }>
> = {
    aws: () => import('./providers/aws').then(m => ({ default: m.AWSSDK })),
    // azure: () =>
    //     import('./providers/azure').then(m => ({ default: m.AzureSDK })),
    // gcp: () => import('./providers/gcs').then(m => ({ default: m.GCSSDK })),
    // backblaze: () =>
    //     import('./providers/backblaze').then(m => ({
    //         default: m.BackblazeSDK,
    //     })),
}

export async function createStorageSDK(
    config: StorageConfig,
): Promise<StorageSDK> {
    const SDKClass = await SDKMap[config.provider]()
    return new SDKClass.default(config)
}
