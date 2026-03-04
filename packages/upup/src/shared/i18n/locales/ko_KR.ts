import type { Translations } from '../types'

export const ko_KR: Translations = {
    cancel: '취소',
    done: '완료',
    loading: '로딩 중...',

    myDevice: '내 기기',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: '링크',
    camera: '카메라',

    dragFileOr: '파일을 드래그하거나',
    dragFilesOr: '파일을 드래그하거나',
    browseFiles: '파일 찾아보기',
    or: '또는',
    selectAFolder: '폴더 선택',
    maxFileSizeAllowed_one: '최대 {{size}} {{unit}} 파일 허용',
    maxFileSizeAllowed_other: '최대 {{size}} {{unit}} 파일 허용',

    addDocumentsHere:
        '여기에 문서를 추가하세요. 최대 {{limit}}개 파일까지 업로드 가능합니다',
    builtBy: '제작',

    removeAllFiles: '모든 파일 삭제',
    addingMoreFiles: '파일 추가 중',
    filesSelected_one: '{{count}}개 파일 선택됨',
    filesSelected_other: '{{count}}개 파일 선택됨',
    addMore: '더 추가',

    uploadFiles_one: '{{count}}개 파일 업로드',
    uploadFiles_other: '{{count}}개 파일 업로드',

    removeFile: '파일 삭제',
    clickToPreview: '미리보기',
    zeroBytes: '0 바이트',
    bytes: '바이트',
    kb: 'KB',
    mb: 'MB',
    gb: 'GB',
    tb: 'TB',

    previewError: '오류: {{message}}',

    noAcceptedFilesFound: '허용된 파일을 찾을 수 없습니다',
    selectThisFolder: '이 폴더 선택',
    addFiles_one: '{{count}}개 파일 추가',
    addFiles_other: '{{count}}개 파일 추가',

    logOut: '로그아웃',
    search: '검색',

    enterFileUrl: '파일 URL 입력',
    fetch: '가져오기',

    capture: '촬영',
    switchToCamera: '{{side}} 카메라로 전환',
    addImage: '이미지 추가',

    front: '전면',
    back: '후면',

    poweredBy: 'Powered by',
    multipleFilesNotAllowed: '여러 파일 업로드는 허용되지 않습니다',
    failedToGetUploadUrl: '업로드 URL을 가져오지 못했습니다',
    statusError: '상태: {{status}} ({{statusText}}). 상세: {{details}}',
    networkErrorDuringUpload:
        '업로드 중 네트워크 오류 - 상태: {{status}} ({{statusText}})',
    missingRequiredConfiguration: '필수 구성 누락: {{missing}}',
    invalidProvider:
        '잘못된 제공자: {{provider}}. 유효한 옵션: {{validOptions}}',
    invalidTokenEndpoint:
        '유효하지 않은 tokenEndpoint URL: {{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'maxFileSize는 0보다 커야 합니다',
    invalidAcceptFormat:
        '잘못된 accept 형식: {{accept}}. MIME 타입, */*, * 또는 확장자 사용(예: .fbx)',

    unauthorizedAccess: '제공자에 대한 권한 없는 접근',
    presignedUrlInvalid: '사전 서명된 URL이 만료되었거나 유효하지 않습니다',
    temporaryCredentialsInvalid: '임시 자격 증명이 더 이상 유효하지 않습니다',
    corsMisconfigured: 'CORS 설정으로 인해 파일 업로드가 차단됩니다',
    fileTooLarge: '파일이 최대 크기 제한을 초과합니다',
    invalidFileType: '파일 형식이 허용되지 않습니다',
    storageQuotaExceeded: '저장소 할당량이 초과되었습니다',
    signedUrlGenerationFailed: '서명된 업로드 URL 생성에 실패했습니다',
    uploadFailedWithCode: '오류 코드로 업로드 실패: {{code}}',
    uploadFailed: '업로드 실패: {{message}}',

    // Dropbox-specific
    dropboxSessionExpired:
        'Dropbox 세션이 만료되었습니다. 계속하려면 다시 인증하세요.',
    dropboxMissingPermissions:
        'Dropbox 앱에 필요한 권한이 없습니다. Dropbox 개발자 콘솔에 다음 스코프를 추가하세요: files.metadata.read, account_info.read',
    failedToRefreshExpiredToken: '만료된 토큰 갱신에 실패했습니다',

    // Upup UI messages
    allowedLimitSurpassed: '허용된 한도를 초과했습니다!',
    fileUnsupportedType: '{{name}}는 지원되지 않는 유형입니다!',
    fileTooLargeName: '{{name}}이(가) {{size}} {{unit}}보다 큽니다!',
    filePreviouslySelected: '{{name}}이(가) 이미 선택되었습니다',
    fileWithUrlPreviouslySelected:
        '이 URL의 파일: {{url}}이(가) 이미 선택되었습니다',
    errorCompressingFile: '{{name}} 압축 중 오류 발생',

    // Integration / Auth errors
    clientIdRequired: '클라이언트 ID가 필요합니다...',
    popupBlocked: '팝업 차단됨',
    dropboxClientIdMissing: 'Dropbox clientId가 없습니다',
    dropboxAuthFailed: 'Dropbox 인증 실패',
    genericErrorDetails: '오류: {{details}}',
    errorProcessingFiles: '파일 처리 오류: {{message}}',
    errorSelectingFolder: '폴더 선택 오류: {{message}}',
    graphClientNotInitialized: 'Graph 클라이언트가 초기화되지 않았습니다',
    dropboxNoAccessToken:
        'Dropbox 다운로드를 위한 액세스 토큰이 제공되지 않았습니다',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed: '무음 토큰 획득 실패: {{details}}',
    msalInitializationFailed: 'MSAL 초기화 실패: {{details}}',
    silentTokenAcquisitionProceeding:
        '무음 토큰 획득 실패로 대화형 로그인 진행{{details}}',
    signInFailed: '로그인 실패: {{message}}',
    handleSignInFailed: '로그인 처리 실패: {{message}}',
    signOutFailed: '로그아웃 실패: {{message}}',
}
