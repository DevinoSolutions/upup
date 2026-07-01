<script lang="ts">
  import { formatUiMessage as t, cn } from '@upup/core'
  import { useUploaderI18n, useUploaderTheme } from '../../context/root-context'
  import SourceViewContainer from './SourceViewContainer.svelte'

  const {
    providerName,
    onRetry,
    dataUpupSlot = 'drive-auth-fallback',
  }: {
    providerName: string
    onRetry: () => void
    dataUpupSlot?: string
  } = $props()

  const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
  const { translations: tr } = useUploaderI18n()
</script>

<SourceViewContainer data-upup-slot={dataUpupSlot}>
  <div class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center">
    <p
      class={cn(
        'upup-text-sm upup-text-[#333]',
        {
          'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]': $dark,
        },
        $slotClasses.sourceView,
      )}
    >
      {t(tr.authenticatePrompt, { provider: providerName })}
    </p>
    <button
      type="button"
      class={cn(
        'upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
        {
          'upup-bg-[#30C5F7] hover:upup-bg-[#1eb4e6] dark:upup-bg-[#30C5F7] dark:hover:upup-bg-[#1eb4e6]': $dark,
        },
      )}
      onclick={onRetry}
    >
      {t(tr.signInWith, { provider: providerName })}
    </button>
  </div>
</SourceViewContainer>
