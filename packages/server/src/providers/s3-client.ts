import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'
import type { UpupServerConfig } from '../config'

/**
 * Build the AWS SDK S3 client config from upup storage settings.
 * Pure + exported so it can be unit-tested without constructing a client.
 * When `endpoint` is set (MinIO / R2 / DO Spaces / on-prem) path-style
 * addressing is enabled by default — MinIO requires it.
 */
export function buildS3ClientConfig(
  storage: UpupServerConfig['storage'],
): S3ClientConfig {
  const config: S3ClientConfig = { region: storage.region }
  if (storage.accessKeyId && storage.secretAccessKey) {
    config.credentials = {
      accessKeyId: storage.accessKeyId as string,
      secretAccessKey: storage.secretAccessKey as string,
    }
  }
  if (storage.endpoint) {
    config.endpoint = storage.endpoint
    config.forcePathStyle = storage.forcePathStyle ?? true
  }
  return config
}

export function createS3Client(storage: UpupServerConfig['storage']): S3Client {
  return new S3Client(buildS3ClientConfig(storage))
}
