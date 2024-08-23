export type S3Configs = {
    region: string
    endpoint: string
    credentials: {
        accessKeyId: string
        secretAccessKey: string
    }
    requestHandler?: any
    acl?: 'public-read' | 'private' | 'authenticated-read' | 'aws-exec-read' | 'bucket-owner-full-control' | 'bucket-owner-read' | 'public-read-write'
}
