---
sidebar_position: 6
---

# Ref API

The UpupUploader component exposes a ref-based API that allows parent components to access upload state and control upload operations programmatically.

## `useUpload` Method

The ref exposes a `useUpload` method that returns an object with the following properties:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `files` | `Array<[FileWithProgress](#filewithprogress-interface)>` | Selected files with progress information |
| `loading` | `boolean` | Whether an upload is currently in progress |
| `progress` | `number` | Overall upload progress (0-100) |
| `error` | `string` | Current error message, if any |
| `upload` | `() => Promise<string[] \| undefined>` | Function to trigger the upload process |

## Example Usage

```tsx
import React, { useRef, useEffect } from 'react';
import { UpupUploader, UpupProvider, UpupUploaderRef } from 'upup-react-file-uploader';

export default function MyUploader() {
    const ref = useRef<UpupUploaderRef | null>(null)
    const [uploadData, setUploadData] = useState<
        ReturnType<UpupUploaderRef['useUpload']>
    >({
        files: [],
        loading: false,
        progress: 0,
        upload: async () => [],
        error: undefined,
    })

    // Track files directly instead of through a derived value
    const [files, setFiles] = useState([] as Array<FileWithProgress>)

    // Function to refresh all upload data
    const refreshUploadData = () => {
        if (!ref.current) return
        const data = ref.current.useUpload()

        setUploadData(data)
        setFiles(data.files)
    }

    // Update uploadData only when ref is initialized
    useEffect(() => {
        // Only run once when ref is set
        if (ref.current) refreshUploadData()
    }, []) // Empty dependency array to run only once after initial render

    // Set up polling for progress updates during upload
    useEffect(() => {
        if (!uploadData?.loading) return

        // Poll for progress updates during upload
        const intervalId = setInterval(refreshUploadData, 100)

        return () => clearInterval(intervalId)
    }, [uploadData?.loading])

    // Create a handler that gets fresh data before upload
    const handleUpload = async () => {
        if (!ref.current) return

        // Get the latest data right before upload
        const freshData = ref.current.useUpload()

        // Start polling for updates
        refreshUploadData()

        const result = await freshData.upload()

        // Get final state after upload completes
        setTimeout(refreshUploadData, 0)

        return result
    }

    return (
        <div
            style={{
                width: '100dvw',
                display: 'flex',
                justifyContent: 'center',
            }}
            className="flex flex-col items-center gap-3"
        >
            <UpupUploader
                {...args}
                dark={isDarkMode}
                ref={ref}
                onFilesSelected={() => {
                    // Use setTimeout to ensure we get the updated state after React has processed the file selection
                    setTimeout(refreshUploadData, 0)
                }}
                onError={() => {
                    // Use setTimeout to ensure we get the updated state after React has processed the error
                    setTimeout(refreshUploadData, 0)
                }}
                onFileUploadProgress={() => {
                    // Update progress data
                    refreshUploadData()
                }}
                onFilesUploadProgress={() => {
                    // Update progress data
                    refreshUploadData()
                }}
                onFileUploadComplete={() => {
                    // Update state after upload completes
                    setTimeout(refreshUploadData, 0)
                }}
                onFilesUploadComplete={() => {
                    // Update state after all uploads complete
                    setTimeout(refreshUploadData, 0)
                }}
            />
            <button
                className="w-fit rounded-lg bg-green-600 px-3 py-2"
                onClick={handleUpload}
                disabled={uploadData.loading}
            >
                Upload
            </button>
            <div>Files selected: {files.length}</div>
            {uploadData.loading && (
                <div>Upload progress: {uploadData.progress}%</div>
            )}
            {uploadData.error && (
                <div className="text-red-500">
                    Error: {uploadData.error}
                </div>
            )}
        </div>
    )
}
```

## `FileWithProgress` Interface

The `files` array contains objects with the following structure:

```typescript
interface FileWithProgress extends FileWithParams {
    progress: number; // Upload progress from 0-100
}

interface FileWithParams extends File {
    id: string;
    url: string;
    thumbnailLink?: string;
    [key: string]: any;
}
```

## Best Practices

1. **Check for ref existence**: Always verify that the ref is defined before calling `useUpload()`
2. **Poll for updates**: For real-time progress updates, use a polling approach with `setInterval`
3. **Clean up intervals**: Make sure to clear any intervals when components unmount
4. **Hide default buttons**: Use the `classNames` prop to hide default UI elements when building custom interfaces

:::tip
When using the ref API, you can still use the event handlers for more granular control over the upload process.
:::
