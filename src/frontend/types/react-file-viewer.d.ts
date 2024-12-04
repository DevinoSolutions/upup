declare module 'react-file-viewer' {
    interface FileViewerProps {
        fileType?: string
        filePath: string
        onError?: (error: any) => void
        unsupportedComponent?: ({ extension }: Props) => React.JSX.Element
        errorComponent?: ({ extension }: Props) => React.JSX.Element
    }

    const FileViewer: React.FC<FileViewerProps>
    export default FileViewer
}
