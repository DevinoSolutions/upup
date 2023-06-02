import { IS3Configs } from '../lib/S3';

export interface CloudStorageConfigs {
  s3Configs: IS3Configs;
  bucket: string;
}
