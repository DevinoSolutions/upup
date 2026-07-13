---
sidebar_position: 6
---

# Credentials And CORS

Client mode should only expose browser-safe values such as OAuth client IDs or
public Google Drive API keys. Storage credentials and OAuth client secrets
belong in server mode.

## CORS

For browser direct uploads, configure your bucket to allow the exact app
origins that will upload files.

```tsx
<UpupUploader
    cors={{
        dangerouslyAutoConfigure: true,
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['PUT', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }}
/>
```

`dangerouslyAutoConfigure` can mutate storage CORS policy. Keep it for local
setup and controlled admin tooling, not broad production defaults.

## Server Credentials

Use `@upupjs/server` for storage access keys, OAuth client secrets, provider
token refresh, audit logging, and server-side transfers.
