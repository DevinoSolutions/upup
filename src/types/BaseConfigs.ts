export type BaseConfigs = {
    toBeCompressed?: boolean
    multiple?: boolean
    onChange?: (files: File[]) => void
    accept?: string
    limit?: number
}
