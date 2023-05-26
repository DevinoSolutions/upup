interface props {
  client: any;
  bucket: string;
  key: string;
  compressedFile: File;
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param key the final file name, usually it has timestamp prefix
 * @param compressedFile file to upload
 */
export function pubObject({ client, bucket, key, compressedFile }: props) {
  client.putObject(
    {
      Bucket: bucket,
      Key: `${key}`,
      Body: compressedFile,
      ACL: 'public-read',
    },
    (err: any, _data: any) => {
      if (err) console.log(err, err.stack);
    }
  );
}
