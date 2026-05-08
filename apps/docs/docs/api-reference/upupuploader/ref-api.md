---
sidebar_position: 8
---

# Ref API

`UpupUploader` exposes the same behavior surface as `useUpupUpload`.

```tsx
const ref = useRef<UpupUploaderRef>(null)

<UpupUploader ref={ref} uploadEndpoint="/api/upload-token" />
```

```ts
type UpupUploaderRef = {
  useUpload(): {
    files: UploadFile[]
    upload(): Promise<UploadFile[] | undefined>
    resetState(): void
    setFiles(files: File[]): void
    dynamicUpload(files: File[]): Promise<UploadFile[] | undefined>
  }
}
```

`UploadFile` is exported from `@upup/core/contracts`.
