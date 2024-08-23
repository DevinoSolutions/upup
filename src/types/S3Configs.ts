export type S3Configs = {
    region: string
    endpoint: string
    credentials: {
        accessKeyId: string
        secretAccessKey: string
    }
    requestHandler?: any
    acl?: string
}
