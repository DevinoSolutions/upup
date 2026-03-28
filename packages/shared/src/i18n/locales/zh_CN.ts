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
    audio: '音频',
    screenCapture: '屏幕录制',

    dragFileOr: '拖拽文件或',
    dragFilesOr: '拖拽文件或',
    dragFileHere: '将文件拖到此处',
    dragFilesHere: '将文件拖到此处',
    browseFiles: '浏览文件',
    or: '或',
    selectAFolder: '选择文件夹',
    maxFileSizeAllowed_one: '最大允许 {{size}} {{unit}} 的文件',
    minFileSizeDisplay: '最小 {{size}} {{unit}}',
    allowedFileTypes: '允许的类型：{{types}}',
    maxFileCount_one: '最多 {{limit}} 个文件',
    maxFileCount_other: '最多 {{limit}} 个文件',
    minFileCount_one: '至少需要 {{limit}} 个文件',
    minFileCount_other: '至少需要 {{limit}} 个文件',
    totalFileSizeExceeded: '文件总大小超过最大限制 {{size}} {{unit}}',
    maxTotalFileSizeDisplay: '最大总大小: {{size}} {{unit}}',
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
    renameFile: '点击重命名',
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
    photo: '照片',
    video: '视频',
    startVideoRecording: '录制',
    stopVideoRecording: '停止',
    cameraRecording: '录制中...',
    addVideo: '添加视频',
    mirrorCamera: '镜像',

    front: '前置',
    back: '后置',

    // ── AudioUploader ─────────────────────────────────────────
    startRecording: '开始录音',
    stopRecording: '停止录音',
    recording: '录音中...',
    addAudio: '添加音频',
    deleteRecording: '删除录音',

    // ── ScreenCaptureUploader ─────────────────────────────────
    startScreenCapture: '开始屏幕录制',
    stopScreenCapture: '停止录制',
    screenRecording: '屏幕录制中...',
    addScreenCapture: '添加屏幕录制',
    deleteScreenCapture: '删除录制',

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
    fileTooSmallName: '{{name}} 小于 {{size}} {{unit}}！',
    minFileSizeAllowed_one: '最小需要 {{size}} {{unit}} 的文件',
    minFileSizeAllowed_other: '最小需要 {{size}} {{unit}} 的文件',
    minFileSizeMustBeGreater: 'minFileSize 必须大于 0',
    filePreviouslySelected: '{{name}} 已被选择过',
    fileWithUrlPreviouslySelected: '具有此 URL 的文件：{{url}} 已被选择过',
    errorCompressingFile: '压缩 {{name}} 时出错',
    errorCompressingImage: '压缩图片 {{name}} 时出错',
    generatingThumbnails: '正在生成缩略图...',

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
