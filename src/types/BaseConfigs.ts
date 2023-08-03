export type BaseConfigs = {
    setKeys: (keys: string[]) => void
    canUpload: boolean
    toBeCompressed?: boolean
    multiple?: boolean
    onChange?: (files: File[]) => void
}
