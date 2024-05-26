
/**
 * Check if the file type matche the accepted file types.
 * @param {File} file - The file to check.
 * @param {string } acceptedFiles - Accepted file types. Can be file extensions ('jpg') or MIME types ('image/jpeg') 
 * @returns {boolean} - True if the file type is accepted, false otherwise.
 */
export function checkFileType(file: File, acceptedFiles: string) {
    if (!file || !acceptedFiles || acceptedFiles === '*') {
        return true; 
    }

    const acceptedFilesArray = Array.isArray(acceptedFiles)
        ? acceptedFiles
        : acceptedFiles.split(',');

    const { name: fileName, type: mimeType } = file;
    const extension = fileName ? fileName.split('.').pop()?.toLowerCase() : '';

    return acceptedFilesArray.some(type => {
        type = type.trim().toLowerCase();
        if (type.startsWith('.')) {
            // Check by file extension
            return type.slice(1) === extension;
        } else {
            // Check by MIME type
            const baseMimeType = mimeType.split('/')[0];
            return type === mimeType || type === `${baseMimeType}/*`;
        }
    });
}

