<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { formatUiMessage as t } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
  import useCameraUploader from '../composables/useCameraUploader'
  import SourceViewContainer from './shared/SourceViewContainer.svelte'

  const {
    setVideoEl,
    capturedUrl,
    facingMode,
    newCameraSide,
    startCamera,
    capture,
    clearUrl,
    handleFetchImage,
    handleCameraSwitch,
    translations: tr,
    props,
    theme,
  } = useCameraUploader()

  const { icons: { CameraCaptureIcon, CameraDeleteIcon, CameraRotateIcon } } = props
  const { isDark: dark, slotOverrides: slotClasses } = theme

  // video element bound via bind:this — set into composable
  let videoEl: HTMLVideoElement | null = $state(null)

  // Keep composable in sync with the bound element
  $effect(() => {
    setVideoEl(videoEl)
  })

  onMount(() => {
    // Start camera initially
    startCamera()

    // Restart camera when facingMode changes, but only when no capture is shown
    let isFirst = true
    const unsub = facingMode.subscribe(() => {
      if (isFirst) { isFirst = false; return }
      let currentCapturedUrl = ''
      const u = capturedUrl.subscribe((v) => { currentCapturedUrl = v })
      u()
      if (!currentCapturedUrl) startCamera()
    })

    return () => unsub()
  })
</script>

<SourceViewContainer data-upup-slot="camera-uploader">
  <div
    data-testid="upup-camera-uploader"
    class="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-hidden upup-px-3 upup-py-2"
  >
    <div class="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-pt-2">
      {#if $capturedUrl}
        <div
          class={cn(
            'upup-relative upup-aspect-video upup-max-h-full upup-max-w-full upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
            {
              'upup-bg-white/5 dark:upup-bg-white/5': $dark,
            },
            $slotClasses.cameraPreviewContainer,
          )}
          style="background-image: url({$capturedUrl})"
        >
          <button
            onclick={clearUrl}
            class={cn(
              'upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]',
              $slotClasses.cameraDeleteButton,
            )}
            type="button"
          >
            <CameraDeleteIcon />
          </button>
        </div>
      {:else}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={videoEl}
          autoplay
          muted
          playsinline
          class="upup-aspect-video upup-max-h-full upup-max-w-full upup-rounded-xl upup-object-contain"
        ></video>
      {/if}
    </div>

    <div class="upup-flex upup-shrink-0 upup-gap-4">
      {#if !$capturedUrl}
        <button
          class={cn(
            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-[#0ea5e9] upup-p-2 upup-text-white upup-transition-all upup-duration-300',
            {
              'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': $dark,
            },
            $slotClasses.cameraCaptureButton,
          )}
          onclick={capture}
          type="button"
        >
          <span><CameraCaptureIcon /></span>
          <span>{tr.capture}</span>
        </button>
        <button
          class={cn(
            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
            $slotClasses.cameraRotateButton,
          )}
          onclick={handleCameraSwitch}
          type="button"
        >
          <span><CameraRotateIcon /></span>
          <span>
            {t(tr.switchToCamera, {
              side: $newCameraSide === 'front' ? tr.front : tr.back,
            })}
          </span>
        </button>
      {:else}
        <button
          class={cn(
            'upup-mt-2 upup-w-full upup-rounded-md upup-bg-[#0ea5e9] upup-p-2 upup-text-white upup-transition-all upup-duration-300',
            {
              'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]': $dark,
            },
            $slotClasses.cameraAddButton,
          )}
          onclick={handleFetchImage}
          type="button"
        >
          {tr.addImage}
        </button>
      {/if}
    </div>
  </div>
</SourceViewContainer>
