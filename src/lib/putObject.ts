interface props {
  client: any;
  bucket: string;
  key: string;
  file: File;
}

/**
 * Upload file to cloud provider bucket with public access permission (ACL)
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param key the final file name, usually it has timestamp prefix
 * @param file file to upload
 */
export function pubObject({ client, bucket, key, file }: props) {
  client.putObject(
    {
      Bucket: bucket,
      Key: `${key}`,
      Body: file,
      ACL: 'public-read',
    },
    (err: any, _data: any) => {
      if (err) console.log(err, err.stack);
    }
  );
}
