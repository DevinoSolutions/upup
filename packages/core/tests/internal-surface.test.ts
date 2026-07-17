import { describe, it, expect } from 'vitest'
import * as coreInternal from '@upupjs/core/internal'

/**
 * Pins @upupjs/core/internal's runtime value export list (F-142). This is the
 * other half of the public-api.test.ts pin: that test locks the curated
 * public `.` entry from silently re-growing; this one locks the `./internal`
 * seam from silently shrinking (or losing a name sibling packages depend on
 * after the Phase D migration) or growing to leak something that should
 * have stayed private to core's own src tree.
 */
const EXPECTED_INTERNAL_VALUE_EXPORTS: string[] = [
    'BrowserRuntime',
    'CrashRecoveryManager',
    'DEFAULT_MAX_FILE_SIZE',
    'DEFAULT_SOURCES',
    'DirectUpload',
    'DragDropController',
    'DriveBrowserController',
    'EventEmitter',
    'FileManager',
    'IndexedDBStorage',
    'MIME_EXTENSION_MAP',
    'PREVIEW_MAX_TEXT_SIZE',
    'PREVIEW_TEXT_TRUNCATE_LENGTH',
    'PipelineEngine',
    'PluginManager',
    'SSEProcessor',
    'ServerModeDriveController',
    'ThemeStore',
    'TokenEndpointCredentials',
    'UploadManager',
    'UploaderOrchestrator',
    'b64EncodeUnicode',
    'bindDriveEvents',
    'blobToUploadFile',
    'buildFallbackChain',
    'bytesToSize',
    'checkFileSize',
    'clearAllSessions',
    'cn',
    'collectDroppedFiles',
    'createChildController',
    'createMotionGate',
    'createTransientUiState',
    'createUploaderController',
    'dataURLtoBlob',
    'deriveFetchedFileName',
    'extensionFromMime',
    'fileAppendParams',
    'fileCanPreviewText',
    'fileFingerprint',
    'fileGetExtension',
    'fileGetIsImage',
    'fileGetIsPdf',
    'fileGetIsText',
    'fileIs3D',
    'fileNameFromContentDisposition',
    'getDir',
    'isUploadActive',
    'isUploadIdle',
    'loadGoogleIdentityServices',
    'loadSession',
    'normalizeSource',
    'normalizeUploaderOptions',
    'removeSession',
    'resolveMessage',
    'revokeAndReplace',
    'revokeFileUrl',
    'sanitizeFileName',
    'saveSession',
    'searchDriveFiles',
    'sizeToBytes',
    'sourceNameKeys',
    'tokensToVarRefs',
    'updateSessionProgress',
].sort()

describe('@upupjs/core/internal surface (pin test)', () => {
    it('runtime value export list matches the curated, checked-in list', () => {
        const actual = Object.keys(coreInternal).sort()
        expect(actual).toEqual(EXPECTED_INTERNAL_VALUE_EXPORTS)
    })
})
