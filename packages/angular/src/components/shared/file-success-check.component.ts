import { Component, Input } from '@angular/core'
import { cn } from '@upupjs/core/internal'

/**
 * Completion checkmark (port of shared/FileSuccessCheck): a sky ring with a tick
 * that DRAWS in and a wrapper that POPS, shown when a file reaches
 * UploadStatus.SUCCESSFUL. Hosts (FilePreview tile, FileRow, FileHero) gate it
 * on status; the fx classes render UNCONDITIONALLY — the shared CSS
 * `data-motion="off"` kill rule is the one gate, so under motion-off the mark
 * simply appears drawn. aria-hidden: completion is conveyed textually by the
 * file list's live region + the upload announcement.
 */
@Component({
    selector: 'upup-file-success-check',
    standalone: true,
    template: `
        <span
            data-upup-slot="file-success"
            aria-hidden="true"
            [class]="spanClass"
            [style.animation-delay]="delay"
        >
            <svg
                viewBox="0 0 24 24"
                [attr.width]="size"
                [attr.height]="size"
                fill="none"
                aria-hidden="true"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="#38bdf8"
                    stroke-width="2"
                />
                <path
                    d="M7 12.5l3.2 3.2L17 8.8"
                    stroke="#38bdf8"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    pathLength="24"
                    stroke-dasharray="24"
                    class="upup-animate-fx-draw"
                    [style.animation-delay]="delay"
                />
            </svg>
        </span>
    `,
})
export class FileSuccessCheckComponent {
    /** Position in the sorted list — drives the draw/pop stagger (capped at 8). */
    @Input() index = 0
    /** Host-supplied positioning classes (absolute placement on tiles/hero). */
    @Input() className = ''
    @Input() size = 22

    get delay(): string {
        return `${Math.min(this.index, 8) * 40}ms`
    }

    get spanClass(): string {
        return cn('upup-animate-fx-pop upup-inline-flex', this.className)
    }
}
