---
sidebar_position: 8
---

# Ref API

`UpupUploader` exposes the same behavior surface as `useUpupUpload`.

```tsx
const ref = useRef<UploaderRef>(null)

<UpupUploader ref={ref} uploadEndpoint="/api/upload-token" />
```

```ts
type UploaderRef = {
    useUpload(): {
        error?: string
        files: UploadFile[]
        loading: boolean
        progress: number
        upload(): Promise<UploadFile[] | undefined>
        resetState(): void
        uploadFiles(
            files: File[] | UploadFile[],
        ): Promise<UploadFile[] | undefined>
        setFiles(newFiles: File[]): void
        replaceFiles(files: File[] | UploadFile[]): void
    }
}
```

`UploaderRef` is exported from `@useupup/react`; `UploadFile` is exported from
`@useupup/core/contracts`.
