<script setup lang="ts">
import { useUploaderEditor, useUploaderTheme } from '../context/uploader-context'
import { cn } from '@useupup/core/internal'

const { editingFile, closeImageEditor } = useUploaderEditor()
const { slotOverrides } = useUploaderTheme()
</script>

<template>
  <div
    v-if="editingFile"
    :class="cn(
      'upup-fixed upup-inset-0 upup-z-50 upup-flex upup-items-center upup-justify-center upup-bg-black/50',
      slotOverrides['image-editor']
    )"
    data-testid="upup-image-editor-stub"
    data-upup-slot="image-editor"
  >
    <div class="upup-bg-white upup-dark:bg-gray-800 upup-rounded-lg upup-p-8 upup-text-center upup-max-w-sm upup-mx-4 upup-shadow-xl">
      <div class="upup-text-4xl upup-mb-4">🖼️</div>
      <h3 class="upup-text-lg upup-font-semibold upup-text-gray-900 upup-dark:text-gray-100 upup-mb-2">
        Image Editor
      </h3>
      <p class="upup-text-sm upup-text-gray-500 upup-dark:text-gray-400 upup-mb-4">
        Image editing is coming soon for Vue. The file has been added as-is.
      </p>
      <p class="upup-text-xs upup-text-gray-400 upup-mb-6">
        {{ editingFile.name }}
      </p>
      <button
        class="upup-px-4 upup-py-2 upup-bg-blue-500 upup-text-white upup-rounded-md upup-hover:bg-blue-600 upup-transition-colors"
        data-testid="upup-image-editor-close"
        @click="closeImageEditor"
      >
        Close
      </button>
    </div>
  </div>
</template>
