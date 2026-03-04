import { NextRequest, NextResponse } from "next/server";
import {
  s3AbortMultipartUpload,
  s3CompleteMultipartUpload,
  s3GeneratePresignedPartUrl,
  s3GeneratePresignedUrl,
  s3InitiateMultipartUpload,
  s3ListMultipartParts,
} from "upup-react-file-uploader/server";

function getS3Config(req: NextRequest) {
  return {
    origin: req.headers.get("origin") ?? "",
    bucketName: process.env.S3_BUCKET!,
    s3ClientConfig: {
      region: process.env.S3_REGION!,
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET!,
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, provider, enableAutoCorsConfig } = body;
    const s3Config = getS3Config(req);

    // Legacy single-upload path (no action field)
    if (!action) {
      const { provider: _p, enableAutoCorsConfig: _e, ...fileParams } = body;
      const presigned = await s3GeneratePresignedUrl({
        ...s3Config,
        provider,
        fileParams,
        enableAutoCorsConfig,
      });
      return NextResponse.json(presigned, { status: 200 });
    }

    switch (action) {
      case "multipart:init": {
        const {
          name,
          type,
          size,
          accept,
          maxFileSize,
          multiple,
          chunkSizeBytes,
        } = body;
        const result = await s3InitiateMultipartUpload({
          ...s3Config,
          provider,
          enableAutoCorsConfig,
          fileParams: { name, type, size, accept, maxFileSize, multiple },
          chunkSizeBytes,
        });
        return NextResponse.json(result, { status: 200 });
      }

      case "multipart:signPart": {
        const { key, uploadId, partNumber, contentLength } = body;
        const result = await s3GeneratePresignedPartUrl({
          ...s3Config,
          provider,
          key,
          uploadId,
          partNumber,
          contentLength,
        });
        return NextResponse.json(result, { status: 200 });
      }

      case "multipart:listParts": {
        const { key, uploadId } = body;
        const result = await s3ListMultipartParts({
          ...s3Config,
          provider,
          key,
          uploadId,
        });
        return NextResponse.json(result, { status: 200 });
      }

      case "multipart:complete": {
        const { key, uploadId, parts } = body;
        const result = await s3CompleteMultipartUpload({
          ...s3Config,
          provider,
          key,
          uploadId,
          parts,
        });
        return NextResponse.json(result, { status: 200 });
      }

      case "multipart:abort": {
        const { key, uploadId } = body;
        const result = await s3AbortMultipartUpload({
          ...s3Config,
          provider,
          key,
          uploadId,
        });
        return NextResponse.json(result, { status: 200 });
      }

      default:
        return NextResponse.json(
          { details: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { details: (error as Error).message },
      { status: 500 },
    );
  }
}
