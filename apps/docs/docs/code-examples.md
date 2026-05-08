---
sidebar_position: 2
---

# Code Examples

## Local Selection

```tsx
<UpupUploader
  sources={['local', 'url']}
  onFilesSelected={(files) => console.log(files)}
/>
```

## Client Upload

```tsx
<UpupUploader
  provider="aws"
  uploadEndpoint="/api/upload-token"
  metadata={{ workspaceId: 'w_123' }}
/>
```

```ts
export async function POST(req: Request) {
  const body = await req.json()
  const presigned = await signUpload({
    name: body.name,
    type: body.type,
    size: body.size,
    metadata: body.metadata,
  })

  return Response.json({
    key: presigned.key,
    uploadUrl: presigned.uploadUrl,
    uploadHeaders: presigned.uploadHeaders,
    downloadUrl: presigned.downloadUrl,
    expiresIn: 3600,
  })
}
```

## Server Upload

```tsx
<UpupUploader mode="server" serverUrl="/api/upup" provider="aws" />
```

## Multipart

```tsx
<UpupUploader
  uploadEndpoint="/api/upload-token"
  resumable={{ protocol: 'multipart' }}
/>
```

## Tus

```tsx
<UpupUploader
  resumable={{
    protocol: 'tus',
    endpoint: 'https://uploads.example.com/files',
  }}
/>
```
