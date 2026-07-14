import { Component, Input, inject } from '@angular/core'
import { type DriveBrowserError, formatUiMessage as t } from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
import { UpupStore } from '../../upup-store.service'
import { SourceViewContainerComponent } from '../source-view-container.component'

/**
 * Angular port of DriveAuthFallback.svelte.
 *
 * Renders the "sign in" prompt when a cloud drive is not yet authenticated.
 * Uses core's `formatUiMessage` (t) with {{provider}} double-brace placeholders —
 * exactly as svelte does: t(tr.authenticatePrompt, { provider: providerName }).
 * Single-brace is WRONG; this mirrors the proven svelte pattern.
 */
@Component({
    selector: 'upup-drive-auth-fallback',
    standalone: true,
    imports: [SourceViewContainerComponent],
    template: `
        <upup-source-view-container [slotName]="slotName">
            <div
                class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-6 upup-text-center"
            >
                @if (!!error?.()) {
                    <p
                        data-testid="upup-drive-error"
                        data-upup-slot="drive-error"
                        role="alert"
                        class="upup-p-4 upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                    >
                        {{ errorText }}
                    </p>
                }
                <p [class]="promptClass">{{ authenticatePrompt }}</p>
                <button
                    type="button"
                    [class]="signInButtonClass"
                    (click)="onRetry()"
                >
                    {{ signInLabel }}
                </button>
            </div>
        </upup-source-view-container>
    `,
})
export class DriveAuthFallbackComponent {
    private store = inject(UpupStore)

    @Input({ required: true }) providerName!: string
    @Input({ required: true }) onRetry!: () => void
    @Input() error: (() => DriveBrowserError | undefined) | undefined =
        undefined
    /** Maps to svelte's dataUpupSlot prop — forwarded to SourceViewContainer slotName. */
    @Input() slotName: string = 'drive-auth-fallback'

    get errorText(): string {
        const err = this.error?.()
        const tr = this.store.translations()
        return err ? t(tr.driveLoadError, { message: err.message }) : ''
    }

    /** Resolved i18n string: "Sign in to access {{provider}}" → "Sign in to access Google Drive" */
    get authenticatePrompt(): string {
        const tr = this.store.translations()
        return t(tr.authenticatePrompt, { provider: this.providerName })
    }

    /** Resolved i18n string: "Sign in with {{provider}}" → "Sign in with Google Drive" */
    get signInLabel(): string {
        const tr = this.store.translations()
        return t(tr.signInWith, { provider: this.providerName })
    }

    get promptClass(): string {
        const dark = this.store.isDark()
        const slotClasses = this.store.slotOverrides()
        return cn(
            'upup-text-sm upup-text-[#333]',
            dark ? 'upup-text-[#FAFAFA] dark:upup-text-[#FAFAFA]' : '',
            slotClasses.sourceView,
        )
    }

    get signInButtonClass(): string {
        const dark = this.store.isDark()
        return cn(
            'upup-rounded-md upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300 hover:upup-bg-blue-700',
            dark
                ? 'upup-bg-[#30C5F7] hover:upup-bg-[#1eb4e6] dark:upup-bg-[#30C5F7] dark:hover:upup-bg-[#1eb4e6]'
                : '',
        )
    }
}
