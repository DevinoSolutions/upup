import type { Translations } from '../types'

export const ar_SA: Translations = {
    cancel: 'إلغاء',
    done: 'تم',
    loading: 'جارٍ التحميل...',

    myDevice: 'جهازي',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    dropbox: 'Dropbox',
    link: 'رابط',
    camera: 'الكاميرا',
    audio: 'الصوت',
    screenCapture: 'تسجيل الشاشة',

    dragFileOr: 'اسحب الملف أو',
    dragFilesOr: 'اسحب الملفات أو',
    dragFileHere: 'اسحب الملف هنا',
    dragFilesHere: 'اسحب الملفات هنا',
    browseFiles: 'تصفح الملفات',
    or: 'أو',
    selectAFolder: 'اختر مجلداً',
    maxFileSizeAllowed_one: 'الحد الأقصى لحجم الملف {{size}} {{unit}}',
    maxFileSizeAllowed_other: 'الحد الأقصى لحجم الملفات {{size}} {{unit}}',
    minFileSizeDisplay: 'الحد الأدنى {{size}} {{unit}}',
    allowedFileTypes: 'الأنواع المسموحة: {{types}}',
    maxFileCount_one: 'حتى {{limit}} ملف',
    maxFileCount_other: 'حتى {{limit}} ملفات',
    minFileCount_one: 'مطلوب {{limit}} ملف على الأقل',
    minFileCount_other: 'مطلوب {{limit}} ملفات على الأقل',
    totalFileSizeExceeded: 'الحجم الإجمالي للملفات يتجاوز الحد الأقصى {{size}} {{unit}}',
    maxTotalFileSizeDisplay: 'الحجم الإجمالي الأقصى: {{size}} {{unit}}',

    addDocumentsHere:
        'أضف مستنداتك هنا، يمكنك رفع حتى {{limit}} ملفات كحد أقصى',
    builtBy: 'صنع بواسطة',

    removeAllFiles: 'إزالة جميع الملفات',
    addingMoreFiles: 'إضافة المزيد من الملفات',
    filesSelected_one: 'تم اختيار ملف {{count}}',
    filesSelected_other: 'تم اختيار {{count}} ملفات',
    addMore: 'إضافة المزيد',

    uploadFiles_one: 'رفع ملف {{count}}',
    uploadFiles_other: 'رفع {{count}} ملفات',

    removeFile: 'إزالة الملف',
    renameFile: 'انقر لإعادة التسمية',
    clickToPreview: 'انقر للمعاينة',
    zeroBytes: '٠ بايت',
    bytes: 'بايت',
    kb: 'ك.ب',
    mb: 'م.ب',
    gb: 'ج.ب',
    tb: 'ت.ب',

    previewError: 'خطأ: {{message}}',

    noAcceptedFilesFound: 'لم يتم العثور على ملفات مقبولة',
    selectThisFolder: 'اختر هذا المجلد',
    addFiles_one: 'إضافة ملف {{count}}',
    addFiles_other: 'إضافة {{count}} ملفات',

    logOut: 'تسجيل الخروج',
    search: 'بحث',

    enterFileUrl: 'أدخل رابط الملف',
    fetch: 'جلب',

    capture: 'التقاط',
    switchToCamera: 'التبديل إلى الكاميرا {{side}}',
    addImage: 'إضافة صورة',
    photo: 'صورة',
    video: 'فيديو',
    startVideoRecording: 'تسجيل',
    stopVideoRecording: 'إيقاف',
    cameraRecording: 'جارٍ التسجيل...',
    addVideo: 'إضافة فيديو',
    mirrorCamera: 'عكس',

    front: 'الأمامية',
    back: 'الخلفية',

    // ── AudioUploader ─────────────────────────────────────────
    startRecording: 'بدء التسجيل',
    stopRecording: 'إيقاف التسجيل',
    recording: 'جارٍ التسجيل...',
    addAudio: 'إضافة صوت',
    deleteRecording: 'حذف التسجيل',

    // ── ScreenCaptureUploader ─────────────────────────────────
    startScreenCapture: 'بدء تسجيل الشاشة',
    stopScreenCapture: 'إيقاف التسجيل',
    screenRecording: 'جارٍ تسجيل الشاشة...',
    addScreenCapture: 'إضافة تسجيل الشاشة',
    deleteScreenCapture: 'حذف التسجيل',

    poweredBy: 'مدعوم من',

    // ── Errors & Warnings ───────────────────────────────────
    multipleFilesNotAllowed: 'غير مسموح بتحميل عدة ملفات',
    failedToGetUploadUrl: 'فشل في الحصول على رابط الرفع',
    statusError: 'الحالة: {{status}} ({{statusText}}). التفاصيل: {{details}}',
    networkErrorDuringUpload:
        'خطأ في الشبكة أثناء الرفع - الحالة: {{status}} ({{statusText}})',
    missingRequiredConfiguration: 'تكوين مفقود مطلوب: {{missing}}',
    invalidProvider:
        'مزود غير صالح: {{provider}}. الخيارات الصحيحة: {{validOptions}}',
    invalidTokenEndpoint:
        'عنوان tokenEndpoint غير صالح: {{tokenEndpoint}} {{error}}',
    maxFileSizeMustBeGreater: 'يجب أن يكون حجم الملف الأقصى أكبر من 0',
    invalidAcceptFormat:
        'تنسيق القبول غير صالح: {{accept}}. استخدم أنواع MIME أو */* أو ملحقات (مثل .fbx)',

    unauthorizedAccess: 'دخول غير مصرح إلى المزود',
    presignedUrlInvalid: 'رابط التحميل المسبق انتهت صلاحيته أو غير صالح',
    temporaryCredentialsInvalid: 'البيانات المؤقتة لم تعد صالحة',
    corsMisconfigured: 'إعدادات CORS تمنع رفع الملف',
    fileTooLarge: 'حجم الملف يتجاوز الحد الأقصى',
    invalidFileType: 'نوع الملف غير مسموح',
    storageQuotaExceeded: 'تم تجاوز حصة التخزين',
    signedUrlGenerationFailed: 'فشل إنشاء رابط الرفع الموقع',
    uploadFailedWithCode: 'فشل الرفع برمز الخطأ: {{code}}',
    uploadFailed: 'فشل الرفع: {{message}}',

    // Dropbox-specific
    dropboxSessionExpired:
        'انتهت صلاحية جلسة Dropbox الخاصة بك. يرجى إعادة المصادقة للمتابعة.',
    dropboxMissingPermissions:
        'تطبيق Dropbox الخاص بك يفتقد الأذونات المطلوبة. يرجى إضافة الأذونات التالية في وحدة تحكم مطوري Dropbox: files.metadata.read, account_info.read',
    failedToRefreshExpiredToken: 'فشل تحديث الرمز المنتهي',

    // Upup UI messages
    allowedLimitSurpassed: 'تم تجاوز الحد المسموح!',
    fileUnsupportedType: '{{name}} نوعه غير مدعوم!',
    fileTooLargeName: '{{name}} أكبر من {{size}} {{unit}}!',
    fileTooSmallName: '{{name}} أصغر من {{size}} {{unit}}!',
    minFileSizeAllowed_one: 'الحد الأدنى {{size}} {{unit}} للملف مطلوب',
    minFileSizeAllowed_other: 'الحد الأدنى {{size}} {{unit}} للملفات مطلوب',
    minFileSizeMustBeGreater: 'يجب أن يكون الحد الأدنى لحجم الملف أكبر من 0',
    filePreviouslySelected: '{{name}} تم تحديده سابقاً',
    fileWithUrlPreviouslySelected: 'ملف بهذا الرابط: {{url}} تم تحديده سابقاً',
    errorCompressingFile: 'خطأ في ضغط {{name}}',
    errorCompressingImage: 'خطأ في ضغط الصورة {{name}}',
    generatingThumbnails: 'جارٍ إنشاء الصور المصغرة...',

    // Integration / Auth errors
    clientIdRequired: 'معرّف العميل مطلوب...',
    popupBlocked: 'تم حظر النافذة المنبثقة',
    dropboxClientIdMissing: 'مفقود معرف تطبيق Dropbox',
    dropboxAuthFailed: 'فشل مصادقة Dropbox',
    genericErrorDetails: 'خطأ: {{details}}',
    errorProcessingFiles: 'خطأ في معالجة الملفات: {{message}}',
    errorSelectingFolder: 'خطأ في تحديد المجلد: {{message}}',
    graphClientNotInitialized: 'عميل Graph غير مهيأ',
    dropboxNoAccessToken: 'لم يتم توفير رمز وصول لتنزيل Dropbox',

    // MSAL / OneDrive messages
    silentTokenAcquisitionFailed: 'فشل الحصول على رمز صامت: {{details}}',
    msalInitializationFailed: 'فشل تهيئة MSAL: {{details}}',
    silentTokenAcquisitionProceeding:
        'فشل الحصول على رمز صامت، المتابعة بتسجيل تفاعلي{{details}}',
    signInFailed: 'فشل تسجيل الدخول: {{message}}',
    handleSignInFailed: 'فشل معالجة تسجيل الدخول: {{message}}',
    signOutFailed: 'فشل تسجيل الخروج: {{message}}',
}
