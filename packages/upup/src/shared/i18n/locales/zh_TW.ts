import type { Translations } from '../types'

export const zh_TW: Translations = {
    cancel: '取消',
    done: '完成',
    loading: '載入中...',

    myDevice: '我的裝置',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: '連結',
    camera: '相機',

    dragFileOr: '拖曳檔案或',
    dragFilesOr: '拖曳檔案或',
    browseFiles: '瀏覽檔案',
    or: '或',
    selectAFolder: '選擇資料夾',
    maxFileSizeAllowed_one: '最大允許 {{size}} {{unit}} 的檔案',
    maxFileSizeAllowed_other: '最大允許 {{size}} {{unit}} 的檔案',

    addDocumentsHere: '在此新增文件，最多可上傳 {{limit}} 個檔案',
    builtBy: '開發者',

    removeAllFiles: '移除所有檔案',
    addingMoreFiles: '正在新增更多檔案',
    filesSelected_one: '已選擇 {{count}} 個檔案',
    filesSelected_other: '已選擇 {{count}} 個檔案',
    addMore: '新增更多',

    uploadFiles_one: '上傳 {{count}} 個檔案',
    uploadFiles_other: '上傳 {{count}} 個檔案',

    removeFile: '移除檔案',
    clickToPreview: '點擊預覽',
    zeroBytes: '0 位元組',
    bytes: '位元組',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    previewError: '錯誤：{{message}}',

    noAcceptedFilesFound: '找不到可接受的檔案',
    selectThisFolder: '選擇此資料夾',
    addFiles_one: '新增 {{count}} 個檔案',
    addFiles_other: '新增 {{count}} 個檔案',

    logOut: '登出',
    search: '搜尋',

    enterFileUrl: '輸入檔案連結',
    fetch: '取得',

    capture: '拍照',
    switchToCamera: '切換至{{side}}鏡頭',
    addImage: '新增圖片',

    front: '前置',
    back: '後置',

    poweredBy: 'Powered by',
    multipleFilesNotAllowed: '不允許上傳多個檔案',
    failedToGetUploadUrl: '取得上傳 URL 失敗',
    statusError: '狀態：{{status}}（{{statusText}}）。詳細資訊：{{details}}',
    networkErrorDuringUpload:
        '上傳期間發生網路錯誤 - 狀態：{{status}}（{{statusText}}）',
    missingRequiredConfiguration: '缺少必要設定：{{missing}}',
    invalidProvider: '無效的提供者：{{provider}}。有效選項：{{validOptions}}',
    invalidTokenEndpoint:
        '無效的 tokenEndpoint URL：{{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize 必須大於 0',
    invalidAcceptFormat:
        '無效的 accept 格式：{{accept}}。請使用 MIME 類型、*/*、* 或副檔名（例如 .fbx）',

    unauthorizedAccess: '未經授權訪問提供者',
    presignedUrlInvalid: '預簽名 URL 已過期或無效',
    temporaryCredentialsInvalid: '臨時憑證已失效',
    corsMisconfigured: 'CORS 設定阻止檔案上傳',
    fileTooLarge: '檔案超過最大大小限制',
    invalidFileType: '檔案類型不被允許',
    storageQuotaExceeded: '儲存配額已超出',
    signedUrlGenerationFailed: '生成簽名上傳 URL 失敗',
    uploadFailedWithCode: '上傳失敗，錯誤代碼：{{code}}',
    uploadFailed: '上傳失敗：{{message}}',

    // Dropbox-specific
    dropboxSessionExpired: '您的 Dropbox 會話已過期。請重新驗證以繼續。',
    dropboxMissingPermissions:
        '您的 Dropbox 應用缺少所需權限。請在 Dropbox 開發者控制台新增以下作用域：files.metadata.read, account_info.read',
    failedToRefreshExpiredToken: '刷新已過期的 token 失敗',

    // Upup UI messages
    allowedLimitSurpassed: '已超出允許的限制！',
    fileUnsupportedType: '{{name}} 的類型不受支援！',
    fileTooLargeName: '{{name}} 大於 {{size}} {{unit}}！',
    filePreviouslySelected: '{{name}} 先前已被選取',
    fileWithUrlPreviouslySelected: '具有此 URL 的檔案：{{url}} 先前已被選取',
    errorCompressingFile: '壓縮 {{name}} 時發生錯誤',

    // Integration / Auth errors
    clientIdRequired: '需要 Client ID...',
    popupBlocked: '彈出視窗被阻擋',
    dropboxClientIdMissing: '缺少 Dropbox clientId',
    dropboxAuthFailed: 'Dropbox 驗證失敗',
    genericErrorDetails: '錯誤：{{details}}',
    errorProcessingFiles: '處理檔案時發生錯誤：{{message}}',
    errorSelectingFolder: '選取資料夾時發生錯誤：{{message}}',
    graphClientNotInitialized: 'Graph 用戶端尚未初始化',
    dropboxNoAccessToken: '未提供 Dropbox 下載的存取權杖',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed: '靜默令牌取得失敗：{{details}}',
    msalInitializationFailed: 'MSAL 初始化失敗：{{details}}',
    silentTokenAcquisitionProceeding:
        '靜默令牌取得失敗，繼續互動式登入{{details}}',
    signInFailed: '登入失敗：{{message}}',
    handleSignInFailed: '處理登入失敗：{{message}}',
    signOutFailed: '登出失敗：{{message}}',
}
