---
sidebar_position: 6
---

# Image Editor

Enable the image editor with the `imageEditor` prop.

```tsx
<UpupUploader
  uploadEndpoint="/api/upload-token"
  imageEditor={{
    enabled: true,
    crop: true,
    rotate: true,
  }}
/>
```

Edited files flow back through core validation before upload.

```ts
type ImageEditorOptions = {
  enabled?: boolean
  crop?: boolean
  rotate?: boolean
  flip?: boolean
  annotate?: boolean
}
```
