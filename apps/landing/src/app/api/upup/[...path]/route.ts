import { createUpupNextHandler } from "@upup/server/next";
import { env } from "@/lib/env";

export const { GET, POST, PUT, DELETE } = createUpupNextHandler({
  storage: {
    type: "backblaze",
    bucket: env.S3_BUCKET!,
    region: env.S3_REGION!,
    accessKeyId: env.S3_KEY_ID!,
    secretAccessKey: env.S3_SECRET!,
    endpoint: env.S3_ENDPOINT!,
  },
  uploadTokenSecret: env.UPUP_UPLOAD_TOKEN_SECRET,
  // Demo app: single shared anonymous namespace. Real apps set getUserId instead.
  allowAnonymous: true,
  allowAnonymousUploads: true,
  providers: {
    googleDrive: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: "",
    },
    dropbox: {
      appKey: env.DROPBOX_CLIENT_ID,
      appSecret: env.DROPBOX_APP_SECRET,
    },
    oneDrive: {
      clientId: env.ONEDRIVE_CLIENT_ID,
      clientSecret: "",
    },
  },
});
