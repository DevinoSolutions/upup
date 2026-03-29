import { createUpupHandler } from '@upup/server/next'

const handlers = createUpupHandler({
  storage: {
    type: 'backblaze',
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET!,
  },
})

export const { GET, POST, PUT, DELETE } = handlers
