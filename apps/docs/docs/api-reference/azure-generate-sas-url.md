---
sidebar_position: 1
---

# `azureGenerateSasUrl`

This server-side utility generates Azure Blob Storage SAS URLs for secure file uploads from the [`UpupUploader`](/docs/category/upupuploader) component. It handles Azure AD authentication and temporary credential delegation for secure direct uploads.

## Parameters

It has a single parameter. An object with the following key values:

| Parameter                         | Type   | Status   | Default Value |
| --------------------------------- | ------ | -------- | ------------- |
| [`containerName`](#containername) | string | required | N/A           |
| [`credentials`](#credentials)     | object | required | N/A           |
| [`expiresIn`](#expiresin)         | number | optional | 3600          |
| [`fileParams`](#fileparams)       | object | required | N/A           |

### `containerName`

The Azure Blob Storage container name where files will be stored.

### `credentials`

Azure AD application credentials and storage account details.
It has the following properties:

```ts
{
  tenantId: string; // Azure AD tenant ID
  clientId: string; // Azure AD client ID
  clientSecret: string; // Azure AD client secret
  storageAccount: string; // Azure storage account name
}
```

### `expiresIn`

SAS URL validity duration in seconds. Defaults to 1 hour (3600 seconds).

### `fileParams`

Specifies file metadata and validation rules passed from the client in the request body.

```ts
export interface FileParams {
  // These values are unique to each file
  name: string; // Original filename
  type: string; // MIME type
  size: number; // File size in bytes

  // These values are based on the UpupUploader props
  accept?: string; // Allowed file types
  maxFileSize?: number; // Max size in bytes
  multiple?: boolean; // Multiple files allowed
}
```

## Response Structure

```ts
interface PresignedUrlResponse {
  key: string; // Unique blob identifier for the uploaded file
  publicUrl: string; // Permanent blob URL
  uploadUrl: string; // SAS-protected upload URL
  expiresIn: number; // SAS Url validity duration in seconds
}
```

## Security Implementation

1. **User Delegation Key**  
   Uses temporary credentials with limited lifetime (1 hour) via Azure AD authentication

   ```mermaid
   sequenceDiagram
       Server->>Azure AD: Request client credentials
       Azure AD->>Server: Return access token
       Server->>Azure Storage: Get delegation key
       Azure Storage->>Server: Return temporary key
   ```

2. **SAS Permissions**  
   Grants minimal required permissions:

   - Read (r)
   - Add (a)
   - Create (c)
   - Write (w)

3. **Validation**
   - File size and type checks
   - Unique blob names using UUIDs
   - HTTPS protocol enforcement

:::warning Security Best Practices

1. Use Azure RBAC with least-privilege
2. Rotate client secrets regularly
3. Set minimum required SAS permissions
4. Store credentials in environment variables as such:

```ts
const { provider, customProps, ...fileParams } = req.body;

azureGenerateSasUrl({
  fileParams,
  containerName: process.env.AZURE_STORAGE_CONTAINER!,
  credentials: {
    tenantId: process.env.AZURE_TENANT_ID!,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    storageAccount: process.env.AZURE_STORAGE_ACCOUNT!,
  },
});
```

:::

:::tip
Check our [code examples](/docs/code-examples.md) for how to configure `azureGenerateSasUrl` for your particular back-end stack, and how to [configure your credentials with the right permissions](/docs/credentials-configuration.md)
:::
