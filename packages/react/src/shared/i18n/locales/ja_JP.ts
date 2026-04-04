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

    dragFileOr: 'ファイルをドラッグするか、',
    dragFilesOr: 'ファイルをドラッグするか、',
    browseFiles: '参照',
    or: 'または',
    selectAFolder: 'フォルダを選択',
    maxFileSizeAllowed_one:
        '最大 {{size}} {{unit}} のファイルがアップロード可能です',
    maxFileSizeAllowed_other:
        '最大 {{size}} {{unit}} のファイルがアップロード可能です',

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

    front: '前面',
    back: '背面',

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
    filePreviouslySelected: '{{name}} は既に選択されています',
    fileWithUrlPreviouslySelected:
        'このURLのファイル：{{url}} は既に選択されています',
    errorCompressingFile: '{{name}} の圧縮中にエラーが発生しました',

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
