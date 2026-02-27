import type { Translations } from '../types'

export const zh_CN: Translations = {
    cancel: '取消',
    done: '完成',
    loading: '加载中...',

    myDevice: '本地文件',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: '链接',
    camera: '相机',

    dragFileOr: '拖拽文件或',
    dragFilesOr: '拖拽文件或',
    browseFiles: '浏览文件',
    or: '或',
    selectAFolder: '选择文件夹',
    maxFileSizeAllowed_one: '最大允许 {{size}} {{unit}} 的文件',
    maxFileSizeAllowed_other: '最大允许 {{size}} {{unit}} 的文件',

    addDocumentsHere: '在此添加文档，最多可上传 {{limit}} 个文件',
    builtBy: '由',

    removeAllFiles: '删除所有文件',
    addingMoreFiles: '正在添加更多文件',
    filesSelected_one: '已选择 {{count}} 个文件',
    filesSelected_other: '已选择 {{count}} 个文件',
    addMore: '添加更多',

    uploadFiles_one: '上传 {{count}} 个文件',
    uploadFiles_other: '上传 {{count}} 个文件',

    removeFile: '删除文件',
    clickToPreview: '点击预览',
    zeroBytes: '0 字节',
    bytes: '字节',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    previewError: '错误：{{message}}',

    noAcceptedFilesFound: '未找到可接受的文件',
    selectThisFolder: '选择此文件夹',
    addFiles_one: '添加 {{count}} 个文件',
    addFiles_other: '添加 {{count}} 个文件',

    logOut: '退出登录',
    search: '搜索',

    enterFileUrl: '输入文件链接',
    fetch: '获取',

    capture: '拍照',
    switchToCamera: '切换到{{side}}摄像头',
    addImage: '添加图片',

    front: '前置',
    back: '后置',

    poweredBy: 'Powered by',
    multipleFilesNotAllowed: '不允许上传多个文件',
    failedToGetUploadUrl: '获取上传 URL 失败',
    statusError: '状态：{{status}}（{{statusText}}）。详情：{{details}}',
    networkErrorDuringUpload:
        '上传时发生网络错误 - 状态：{{status}}（{{statusText}}）',
    missingRequiredConfiguration: '缺少必需的配置：{{missing}}',
    invalidProvider: '无效的提供者：{{provider}}。有效选项：{{validOptions}}',
    invalidTokenEndpoint:
        '无效的 tokenEndpoint URL：{{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize 必须大于 0',
    invalidAcceptFormat:
        '无效的 accept 格式：{{accept}}。请使用 MIME 类型、*/*、* 或扩展名（例如 .fbx）',

    unauthorizedAccess: '未经授权访问提供者',
    presignedUrlInvalid: '预签名 URL 已过期或无效',
    temporaryCredentialsInvalid: '临时凭证已失效',
    corsMisconfigured: 'CORS 配置阻止文件上传',
    fileTooLarge: '文件超出最大大小限制',
    invalidFileType: '文件类型不被允许',
    storageQuotaExceeded: '存储配额已超出',
    signedUrlGenerationFailed: '生成签名上传 URL 失败',
    uploadFailedWithCode: '上传失败，错误代码：{{code}}',
    uploadFailed: '上传失败：{{message}}',

    // Dropbox-specific
    dropboxSessionExpired: '您的 Dropbox 会话已过期。请重新验证以继续。',
    dropboxMissingPermissions:
        '您的 Dropbox 应用缺少所需权限。请在 Dropbox 开发者控制台添加以下作用域：files.metadata.read, account_info.read',
    failedToRefreshExpiredToken: '刷新已过期 token 失败',

    // Upup UI messages
    allowedLimitSurpassed: '已超出允许的限制！',
    fileUnsupportedType: '{{name}} 的类型不受支持！',
    fileTooLargeName: '{{name}} 大于 {{size}} {{unit}}！',
    filePreviouslySelected: '{{name}} 已被选择过',
    fileWithUrlPreviouslySelected: '具有此 URL 的文件：{{url}} 已被选择过',
    errorCompressingFile: '压缩 {{name}} 时出错',

    // Integration / Auth errors
    clientIdRequired: '需要 Client ID...',
    popupBlocked: '弹出窗口被阻止',
    dropboxClientIdMissing: '缺少 Dropbox clientId',
    dropboxAuthFailed: 'Dropbox 验证失败',
    genericErrorDetails: '错误：{{details}}',
    errorProcessingFiles: '处理文件时出错：{{message}}',
    errorSelectingFolder: '选择文件夹时出错：{{message}}',
    graphClientNotInitialized: 'Graph 客户端未初始化',
    dropboxNoAccessToken: '未提供用于 Dropbox 下载的访问令牌',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed: '静默令牌获取失败：{{details}}',
    msalInitializationFailed: 'MSAL 初始化失败：{{details}}',
    silentTokenAcquisitionProceeding:
        '静默令牌获取失败，继续交互式登录{{details}}',
    signInFailed: '登录失败：{{message}}',
    handleSignInFailed: '处理登录失败：{{message}}',
    signOutFailed: '登出失败：{{message}}',
}
