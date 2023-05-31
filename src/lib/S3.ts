import { S3 } from '@aws-sdk/client-s3';
let client: S3 | null = null;

export interface s3Configs {
  region: string;
  endpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 *
 * @param configs S3 configs (region, endpoint...etc)
 */
export function getClient(configs: s3Configs) {
  if (client) return client;
  const { region, endpoint, credentials } = configs;
  client = new S3({
    region,
    endpoint,
    credentials,
  });

  return client;
}
