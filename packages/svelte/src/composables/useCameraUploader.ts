import { derived, writable } from 'svelte/store'
import { onDestroy } from 'svelte'
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

    // Mutable bindings — set by the component via bind:this
    let videoEl: HTMLVideoElement | null = null

    const capturedUrl = writable('')
    const facingMode = writable<FacingMode>(FacingMode.Environment)
    const stream = writable<MediaStream | null>(null)

    const newCameraSide = derived(facingMode, ($fm) =>
        $fm === FacingMode.Environment ? 'front' : 'back',
    )

    function setVideoEl(el: HTMLVideoElement | null) {
        videoEl = el
    }

    async function startCamera() {
        try {
            let currentStream: MediaStream | null = null
            stream.subscribe((s) => { currentStream = s })()
            if (currentStream) {
                (currentStream as MediaStream).getTracks().forEach((t) => t.stop())
            }
            let currentFacing: FacingMode = FacingMode.Environment
            facingMode.subscribe((f) => { currentFacing = f })()
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacing },
            })
            stream.set(mediaStream)
            if (videoEl) {
                videoEl.srcObject = mediaStream
                videoEl.play()
            }
        } catch {
            // camera unavailable — leave stream null
        }
    }

    function stopCamera() {
        stream.update((s) => {
            if (s) s.getTracks().forEach((t) => t.stop())
            return null
        })
        if (videoEl) {
            videoEl.srcObject = null
        }
    }

    function capture() {
        if (!videoEl) return

        const canvas = document.createElement('canvas')
        canvas.width = videoEl.videoWidth
        canvas.height = videoEl.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoEl, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')
        capturedUrl.set(dataUrl)
        core?.emit('camera-capture', { dataUrl })
    }

    function clearUrl() {
        capturedUrl.set('')
    }

    async function handleFetchImage() {
        let currentUrl = ''
        capturedUrl.subscribe((u) => { currentUrl = u })()
        if (!currentUrl) return

        const response = await fetch(currentUrl)
        const blob = await response.blob()
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setFiles([file])
        capturedUrl.set('')
        setActiveAdapter(undefined)
        core?.emit('camera-confirm', { file })
    }

    function handleCameraSwitch() {
        facingMode.update((fm) =>
            fm === FacingMode.Environment ? FacingMode.User : FacingMode.Environment,
        )
    }

    onDestroy(() => {
        stopCamera()
    })

    return {
        setVideoEl,
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
