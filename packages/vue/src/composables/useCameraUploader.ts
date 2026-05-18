import { computed, onUnmounted, ref } from 'vue'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/root-context'

export enum FacingMode {
    Environment = 'environment',
    User = 'user',
}

export default function useCameraUploader() {
    const { core } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const { setActiveAdapter } = useUploaderSource()
    const { translations } = useUploaderI18n()
    const props = useUploaderOptions()
    const theme = useUploaderTheme()

    const videoRef = ref<HTMLVideoElement | null>(null)
    const capturedUrl = ref('')
    const facingMode = ref<FacingMode>(FacingMode.Environment)
    const stream = ref<MediaStream | null>(null)

    const newCameraSide = computed(() =>
        facingMode.value === FacingMode.Environment ? 'front' : 'back',
    )

    async function startCamera() {
        try {
            if (stream.value) {
                stream.value.getTracks().forEach(t => t.stop())
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode.value },
            })
            stream.value = mediaStream
            if (videoRef.value) {
                videoRef.value.srcObject = mediaStream
                videoRef.value.play()
            }
        } catch {
            // camera unavailable — leave stream null
        }
    }

    function stopCamera() {
        if (stream.value) {
            stream.value.getTracks().forEach(t => t.stop())
            stream.value = null
        }
        if (videoRef.value) {
            videoRef.value.srcObject = null
        }
    }

    function capture() {
        if (!videoRef.value) return

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.value.videoWidth
        canvas.height = videoRef.value.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoRef.value, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')
        capturedUrl.value = dataUrl
        core?.emit('camera-capture', { dataUrl })
    }

    function clearUrl() {
        capturedUrl.value = ''
    }

    async function handleFetchImage() {
        if (!capturedUrl.value) return

        const response = await fetch(capturedUrl.value)
        const blob = await response.blob()
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setFiles([file])
        capturedUrl.value = ''
        setActiveAdapter(undefined)
        core?.emit('camera-confirm', { file })
    }

    function handleCameraSwitch() {
        facingMode.value =
            facingMode.value === FacingMode.Environment
                ? FacingMode.User
                : FacingMode.Environment
    }

    onUnmounted(() => {
        stopCamera()
    })

    return {
        videoRef,
        capturedUrl,
        facingMode,
        newCameraSide,
        startCamera,
        stopCamera,
        capture,
        clearUrl,
        handleFetchImage,
        handleCameraSwitch,
        translations,
        props,
        theme,
    }
}
