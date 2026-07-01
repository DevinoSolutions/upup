<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { formatUiMessage as t, cn } from '@upup/core'
import useCameraUploader from '../composables/useCameraUploader'
import SourceViewContainer from './shared/SourceViewContainer.vue'
import ShouldRender from './shared/ShouldRender.vue'

const {
    videoRef,
    capturedUrl,
    facingMode,
    newCameraSide,
    startCamera,
    capture,
    clearUrl,
    handleFetchImage,
    handleCameraSwitch,
    translations: tr,
    props: { icons: { CameraCaptureIcon, CameraDeleteIcon, CameraRotateIcon } },
    theme: { isDark: dark, slotOverrides: slotClasses },
} = useCameraUploader()

onMounted(() => {
    startCamera()
})

// Restart camera when facingMode changes
watch(facingMode, () => {
    if (!capturedUrl.value) startCamera()
})
</script>

<template>
    <SourceViewContainer data-upup-slot="camera-uploader">
        <div
            data-testid="upup-camera-uploader"
            class="upup-flex upup-h-full upup-w-full upup-flex-col upup-justify-center upup-overflow-hidden upup-px-3 upup-py-2"
        >
            <div class="upup-flex upup-min-h-0 upup-flex-1 upup-items-center upup-justify-center upup-pt-2">
                <ShouldRender :if="!!capturedUrl">
                    <div
                        :class="cn(
                            'upup-relative upup-aspect-video upup-max-h-full upup-max-w-full upup-bg-black/[0.025] upup-bg-contain upup-bg-center upup-bg-no-repeat upup-shadow-xl',
                            {
                                'upup-bg-white/5 dark:upup-bg-white/5': dark,
                            },
                            slotClasses.cameraPreviewContainer,
                        )"
                        :style="{ backgroundImage: `url(${capturedUrl})` }"
                    >
                        <button
                            @click="clearUrl"
                            :class="cn(
                                'upup-absolute upup--right-2 upup--top-2 upup-z-10 upup-rounded-full upup-bg-[#272727] upup-p-1 upup-text-xl upup-text-[#f5f5f5]',
                                slotClasses.cameraDeleteButton,
                            )"
                            type="button"
                        >
                            <component :is="CameraDeleteIcon" />
                        </button>
                    </div>
                </ShouldRender>

                <ShouldRender :if="!capturedUrl">
                    <video
                        ref="videoRef"
                        autoplay
                        muted
                        playsinline
                        class="upup-aspect-video upup-max-h-full upup-max-w-full upup-rounded-xl upup-object-contain"
                    />
                </ShouldRender>
            </div>

            <div class="upup-flex upup-shrink-0 upup-gap-4">
                <ShouldRender :if="!capturedUrl">
                    <button
                        :class="cn(
                            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-justify-center upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                            {
                                'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': dark,
                            },
                            slotClasses.cameraCaptureButton,
                        )"
                        @click="capture"
                        type="button"
                    >
                        <span><component :is="CameraCaptureIcon" /></span>
                        <span>{{ tr.capture }}</span>
                    </button>
                    <button
                        :class="cn(
                            'upup-mt-2 upup-flex upup-w-1/3 upup-flex-col upup-items-center upup-rounded-md upup-bg-gray-500 upup-p-2 upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-gray-600',
                            slotClasses.cameraRotateButton,
                        )"
                        @click="handleCameraSwitch"
                        type="button"
                    >
                        <span><component :is="CameraRotateIcon" /></span>
                        <span>
                            {{ t(tr.switchToCamera, {
                                side: newCameraSide === 'front' ? tr.front : tr.back,
                            }) }}
                        </span>
                    </button>
                </ShouldRender>

                <ShouldRender :if="!!capturedUrl">
                    <button
                        :class="cn(
                            'upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                            {
                                'upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]': dark,
                            },
                            slotClasses.cameraAddButton,
                        )"
                        @click="handleFetchImage"
                        type="button"
                    >
                        {{ tr.addImage }}
                    </button>
                </ShouldRender>
            </div>
        </div>
    </SourceViewContainer>
</template>
