import { createUpupHandler } from "@upup/server/next";

export const { GET, POST, PUT, DELETE } = createUpupHandler({
  storage: {
    type: "backblaze",
    bucket: process.env.S3_BUCKET!,
    region: process.env.S3_REGION!,
    accessKeyId: process.env.S3_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET!,
    endpoint: process.env.S3_ENDPOINT!,
  },
  uploadTokenSecret:
    process.env.UPUP_UPLOAD_TOKEN_SECRET ?? "playground-dev-secret-not-for-prod",
  // Demo app: single shared anonymous namespace. Real apps set getUserId instead.
  allowAnonymous: true,
  providers: {
    googleDrive: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: "",
    },
    dropbox: {
      appKey: process.env.DROPBOX_CLIENT_ID || "",
      appSecret: process.env.DROPBOX_APP_SECRET || "",
    },
    oneDrive: {
      clientId: process.env.ONEDRIVE_CLIENT_ID || "",
      clientSecret: "",
    },
  },
});
