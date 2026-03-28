import type { Translations } from '../types'

export const ja_JP: Translations = {
    cancel: 'キャンセル',
    done: '完了',
    loading: '読み込み中...',

    myDevice: 'マイデバイス',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: 'リンク',
    camera: 'カメラ',
    audio: 'オーディオ',
    screenCapture: '画面キャプチャ',

    dragFileOr: 'ファイルをドラッグするか、',
    dragFilesOr: 'ファイルをドラッグするか、',
    dragFileHere: 'ここにファイルをドラッグ',
    dragFilesHere: 'ここにファイルをドラッグ',
    browseFiles: '参照',
    or: 'または',
    selectAFolder: 'フォルダを選択',
    maxFileSizeAllowed_one:
        '最大 {{size}} {{unit}} のファイルがアップロード可能です',
    maxFileSizeAllowed_other:
        '最大 {{size}} {{unit}} のファイルがアップロード可能です',
    minFileSizeDisplay: '最小 {{size}} {{unit}}',
    allowedFileTypes: '許可されたタイプ: {{types}}',
    maxFileCount_one: '最大 {{limit}} ファイル',
    maxFileCount_other: '最大 {{limit}} ファイル',
    minFileCount_one: '最低{{limit}}ファイル必要です',
    minFileCount_other: '最低{{limit}}ファイル必要です',
    totalFileSizeExceeded: '合計ファイルサイズが最大 {{size}} {{unit}} を超えています',
    maxTotalFileSizeDisplay: '合計最大サイズ: {{size}} {{unit}}',

    addDocumentsHere:
        'ここにファイルをドロップするか、貼り付けるか、参照するか、以下からインポートしてください',
    builtBy: '開発元',

    removeAllFiles: 'すべて削除',
    addingMoreFiles: 'ファイルを追加中',
    filesSelected_one: '{{count}} ファイル選択済み',
    filesSelected_other: '{{count}} ファイル選択済み',
    addMore: '追加',

    uploadFiles_one: '{{count}} ファイルをアップロード',
    uploadFiles_other: '{{count}} ファイルをアップロード',

    removeFile: 'ファイルを削除',
    renameFile: 'クリックして名前を変更',
    clickToPreview: 'プレビュー',
    zeroBytes: '0 バイト',
    bytes: 'バイト',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    previewError: 'エラー: {{message}}',

    noAcceptedFilesFound: '対応するファイルが見つかりません',
    selectThisFolder: 'このフォルダを選択',
    addFiles_one: '{{count}} ファイルを追加',
    addFiles_other: '{{count}} ファイルを追加',

    logOut: 'ログアウト',
    search: '検索',

    enterFileUrl: 'ファイルのURLを入力',
    fetch: '取得',

    capture: '撮影',
    switchToCamera: '{{side}}カメラに切替',
    addImage: '画像を追加',
    photo: '写真',
    video: '動画',
    startVideoRecording: '録画',
    stopVideoRecording: '停止',
    cameraRecording: '録画中...',
    addVideo: '動画を追加',
    mirrorCamera: 'ミラー',

    front: '前面',
    back: '背面',

    // ── AudioUploader ─────────────────────────────────────────
    startRecording: '録音開始',
    stopRecording: '録音停止',
    recording: '録音中...',
    addAudio: 'オーディオを追加',
    deleteRecording: '録音を削除',

    // ── ScreenCaptureUploader ─────────────────────────────────
    startScreenCapture: '画面キャプチャ開始',
    stopScreenCapture: 'キャプチャ停止',
    screenRecording: '画面録画中...',
    addScreenCapture: '画面キャプチャを追加',
    deleteScreenCapture: '録画を削除',

    poweredBy: 'Powered by',
    multipleFilesNotAllowed: '複数ファイルのアップロードは許可されていません',
    failedToGetUploadUrl: 'アップロードURLの取得に失敗しました',
    statusError: 'ステータス：{{status}}（{{statusText}}）。詳細：{{details}}',
    networkErrorDuringUpload:
        'アップロード中のネットワークエラー - ステータス：{{status}}（{{statusText}}）',
    missingRequiredConfiguration: '必要な設定が不足しています：{{missing}}',
    invalidProvider:
        '無効なプロバイダ：{{provider}}。有効なオプション：{{validOptions}}',
    invalidTokenEndpoint:
        '無効な tokenEndpoint URL：{{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize は 0 より大きくなければなりません',
    invalidAcceptFormat:
        '無効な accept フォーマット：{{accept}}。MIME タイプ、*/*、*、または拡張子（例：.fbx）を使用してください',

    unauthorizedAccess: 'プロバイダーへのアクセスが許可されていません',
    presignedUrlInvalid: '事前署名されたURLが期限切れまたは無効です',
    temporaryCredentialsInvalid: '一時的な資格情報は無効になっています',
    corsMisconfigured: 'CORS の設定によりファイルのアップロードができません',
    fileTooLarge: 'ファイルが最大サイズを超えています',
    invalidFileType: 'ファイルタイプが許可されていません',
    storageQuotaExceeded: 'ストレージの容量制限を超えています',
    signedUrlGenerationFailed: '署名付きアップロードURLの生成に失敗しました',
    uploadFailedWithCode: 'エラーコードでアップロードに失敗しました：{{code}}',
    uploadFailed: 'アップロードに失敗しました：{{message}}',

    // Dropbox-specific
    dropboxSessionExpired:
        'Dropbox セッションの有効期限が切れました。再認証してください。',
    dropboxMissingPermissions:
        'Dropbox アプリに必要な権限が不足しています。Dropbox Developer Console に次のスコープを追加してください：files.metadata.read、account_info.read',
    failedToRefreshExpiredToken: '期限切れトークンの更新に失敗しました',

    // Upup UI messages
    allowedLimitSurpassed: '許可された上限を超えました！',
    fileUnsupportedType: '{{name}} はサポートされていないタイプです！',
    fileTooLargeName: '{{name}} は {{size}} {{unit}} より大きいです！',
    fileTooSmallName: '{{name}} は {{size}} {{unit}} より小さいです！',
    minFileSizeAllowed_one: '最小 {{size}} {{unit}} のファイルが必要です',
    minFileSizeAllowed_other: '最小 {{size}} {{unit}} のファイルが必要です',
    minFileSizeMustBeGreater: 'minFileSize は 0 より大きくなければなりません',
    filePreviouslySelected: '{{name}} は既に選択されています',
    fileWithUrlPreviouslySelected:
        'このURLのファイル：{{url}} は既に選択されています',
    errorCompressingFile: '{{name}} の圧縮中にエラーが発生しました',
    errorCompressingImage: '画像 {{name}} の圧縮中にエラーが発生しました',
    generatingThumbnails: 'サムネイルを生成中...',

    // Integration / Auth errors
    clientIdRequired: 'クライアントIDが必要です...',
    popupBlocked: 'ポップアップがブロックされました',
    dropboxClientIdMissing: 'Dropbox の clientId がありません',
    dropboxAuthFailed: 'Dropbox 認証に失敗しました',
    genericErrorDetails: 'エラー：{{details}}',
    errorProcessingFiles: 'ファイル処理エラー：{{message}}',
    errorSelectingFolder: 'フォルダ選択エラー：{{message}}',
    graphClientNotInitialized: 'Graph クライアントが初期化されていません',
    dropboxNoAccessToken:
        'Dropbox ダウンロード用のアクセストークンが提供されていません',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed:
        'サイレントなトークン取得に失敗しました：{{details}}',
    msalInitializationFailed: 'MSAL の初期化に失敗しました：{{details}}',
    silentTokenAcquisitionProceeding:
        'サイレントなトークン取得に失敗したため、対話型ログインを続行します{{details}}',
    signInFailed: 'サインインに失敗しました：{{message}}',
    handleSignInFailed: 'サインイン処理に失敗しました：{{message}}',
    signOutFailed: 'サインアウトに失敗しました：{{message}}',
}
