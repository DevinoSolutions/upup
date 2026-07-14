---
sidebar_position: 3
---

# Azure SAS Responses

Client uploads can use any endpoint that returns Upup's presign contract.

```ts
type PresignedUrlResponse = {
  key: string
  uploadUrl: string
  uploadHeaders?: Record<string, string>
  publicUrl?: string
  downloadUrl?: string
  expiresIn: number
}
```

Return headers that the browser must send with the signed request:

```ts
return Response.json({
  key,
  uploadUrl: sasUrl,
  uploadHeaders: {
    'x-ms-blob-type': 'BlockBlob',
    'Content-Type': body.type || 'application/octet-stream',
  },
  expiresIn: 3600,
})
```
