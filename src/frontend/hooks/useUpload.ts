import {
    ForwardedRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from 'react'
import { UpupUploaderRef } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { compressFile, sizeToBytes } from '../lib/file'
import { ProviderSDK } from '../lib/storage/provider'

type FileProgress = {
    id: string
    loaded: number
    total: number
}

type FilesProgressMap = Record<string, FileProgress>

export default function useUpload(ref: ForwardedRef<UpupUploaderRef>) {
    const [filesProgressMap, setFilesProgressMap] = useState<FilesProgressMap>(
        {} as FilesProgressMap,
    )
    const progress = useMemo(() => {
        const filesProgressMapValues = Object.values(filesProgressMap)
        if (!filesProgressMapValues.length) return 0

        const loadedValues = filesProgressMapValues.reduce(
            (a, b) => a + (b.loaded / b.total) * 100,
            0,
        )
        return loadedValues / filesProgressMapValues.length
    }, [filesProgressMap])
    const {
        files,
        props: {
            accept,
            onError,
            multiple,
            maxFileSize,
            shouldCompress,
            provider,
            tokenEndpoint,
            onFileUploadStart,
            onFileUploadProgress,
            onFilesUploadProgress,
            onFileUploadComplete,
            onFilesUploadComplete,
            onPrepareFiles,
        },
    } = useRootContext()
    const compressFiles = async (files: File[]): Promise<File[]> => {
        try {
            return await Promise.all(
                files.map(async file => {
                    const compressed = await compressFile(file)
                    return compressed
                }),
            )
        } catch (error) {
            files.forEach(file => onError(`Error compressing ${file.name}`))
            throw error
        }
    }

    useEffect(() => {
        setFilesProgressMap(
            files.reduce((a, b) => {
                a[b.name] = {
                    id: b.name,
                    loaded: 0,
                    total: b.size,
                }
                return a
            }, {} as FilesProgressMap),
        )
    }, [files.length])

    useImperativeHandle(ref, () => {
        const proceedUpload = async (fileList: File[]): Promise<string[]> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const compressedFiles = shouldCompress
                        ? await compressFiles(fileList)
                        : fileList

                    const processedFiles = onPrepareFiles
                        ? await onPrepareFiles(compressedFiles)
                        : compressedFiles

                    // Initialize SDK
                    let sdk = new ProviderSDK({
                        provider,
                        tokenEndpoint,
                        constraints: {
                            multiple,
                            accept,
                            maxFileSize: sizeToBytes(
                                maxFileSize.size,
                                maxFileSize.unit,
                            ),
                        },
                    })

                    // Upload files
                    const uploadResults = await Promise.all(
                        processedFiles.map(file =>
                            sdk.upload(file, {
                                onFileUploadStart,
                                onFileUploadProgress: (file, progress) => {
                                    setFilesProgressMap(prev => ({
                                        ...prev,
                                        [file.name]: {
                                            ...prev[file.name],
                                            loaded: progress.loaded,
                                        },
                                    }))
                                    onFileUploadProgress(file, progress)
                                },
                                onFileUploadComplete,
                                onError,
                                onFilesUploadProgress: (
                                    completedFiles: number,
                                ) =>
                                    onFilesUploadProgress(
                                        completedFiles,
                                        processedFiles.length,
                                    ),
                            }),
                        ),
                    )

                    // Extract keys from results
                    const uploadedFileKeys = uploadResults.map(
                        result => result.key,
                    )
                    onFilesUploadComplete(uploadedFileKeys)
                    resolve(uploadedFileKeys)
                } catch (error) {
                    reject(error)
                }
            })
        }

        return {
            async dynamicUploadFiles(dynamicFiles: File[]) {
                if (dynamicFiles.length > 0) return
                return await proceedUpload(dynamicFiles)
            },
            async uploadFiles() {
                if (files.length === 0) return
                return await proceedUpload(files)
            },
        } as UpupUploaderRef
    })

    return { progress }
}
