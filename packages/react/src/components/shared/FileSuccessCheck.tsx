import React from 'react'
import { cn } from '@upupjs/core/internal'

type Props = {
    /** Position in the sorted list — drives the draw/pop stagger (capped at 8). */
    index?: number
    /** Host-supplied positioning classes (absolute placement on tiles/hero). */
    className?: string
    size?: number
}

/**
 * Completion checkmark (states-tour.html state E): a sky ring with a tick that
 * DRAWS in and a wrapper that POPS, shown when a file reaches
 * UploadStatus.SUCCESSFUL. Hosts (FilePreview tile, FileRow, FileHero) gate it
 * on status; the fx classes render UNCONDITIONALLY — the shared CSS
 * `data-motion="off"` kill rule is the one gate, so under motion-off the mark
 * simply appears drawn (no draw/pop). aria-hidden: completion is already
 * conveyed textually by the file list's live region + the upload announcement.
 */
export default function FileSuccessCheck({
    index = 0,
    className,
    size = 22,
}: Readonly<Props>): React.ReactElement {
    const delay = `${Math.min(index, 8) * 40}ms`
    return (
        <span
            data-upup-slot="file-success"
            aria-hidden="true"
            className={cn('upup-animate-fx-pop upup-inline-flex', className)}
            style={{ animationDelay: delay }}
        >
            <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                fill="none"
                aria-hidden="true"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="#38bdf8"
                    strokeWidth="2"
                />
                <path
                    d="M7 12.5l3.2 3.2L17 8.8"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={24}
                    strokeDasharray={24}
                    className="upup-animate-fx-draw"
                    style={{ animationDelay: delay }}
                />
            </svg>
        </span>
    )
}
