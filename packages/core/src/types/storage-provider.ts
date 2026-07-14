export enum StorageProvider {
    AWS = 'aws',
    Azure = 'azure',
    BackBlaze = 'backblaze',
    DigitalOcean = 'digitalocean',
    CloudflareR2 = 'r2',
    Wasabi = 'wasabi',
    MinIO = 'minio',
    GCS = 'gcs',
    Supabase = 'supabase',
    Hetzner = 'hetzner',
    Linode = 'linode',
    Vultr = 'vultr',
    UpCloud = 'upcloud',
    Scaleway = 'scaleway',
    OVHcloud = 'ovhcloud',
    Alibaba = 'alibaba',
    Oracle = 'oracle',
    Contabo = 'contabo',
    Storj = 'storj',
    IDrive = 'idrive',
    Ceph = 'ceph',
}

/**
 * Providers with no S3-compatible API surface (F-657). @upupjs/server's storage
 * path (buildS3ClientConfig) always builds an @aws-sdk/client-s3 client — it
 * cannot serve a provider in this set no matter what storage.type is set to.
 * Kept next to the enum so any future non-S3 addition is an explicit,
 * greppable decision; createUpupHandler's construct-time guard is the sole
 * consumer.
 */
export const NON_S3_STORAGE_PROVIDERS: ReadonlySet<StorageProvider> = new Set([
    StorageProvider.Azure,
])
