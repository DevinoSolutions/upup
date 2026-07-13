---
sidebar_position: 2
---

# S3 Presign Responses

For client uploads, return a presigned object URL and any headers that were part
of the signature.

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

Do not sign browser-forbidden headers such as `Content-Length` for direct
browser `PUT` requests. If the content type is signed, return it in
`uploadHeaders` so Upup can send the exact same value.

```ts
return Response.json({
    key,
    uploadUrl,
    uploadHeaders: {
        'Content-Type': body.type || 'application/octet-stream',
    },
    downloadUrl,
    expiresIn: 3600,
})
```

Use `@upupjs/server` when you want the server package to host these routes.
