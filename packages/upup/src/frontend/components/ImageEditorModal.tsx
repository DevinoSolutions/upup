import React, { memo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileWithParams } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import { cn } from '../lib/tailwind'

type Props = {
    file: FileWithParams
    onClose: () => void
}

/**
 * Accessible modal shell for the image editor.
 * - Focus trap: keeps focus inside the modal while open.
 * - ESC closes.
 * - Restores focus to the triggering element on close.
 * - aria-label / role="dialog".
 *
 * The actual Filerobot editor component will be lazily loaded
 * inside this shell in a later commit.
 */
export default memo(function ImageEditorModal({ file, onClose }: Props) {
    const {
        props: { dark },
    } = useRootContext()
    const overlayRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<Element | null>(null)

    // Capture the element that had focus before the modal opened
    // and restore it when the modal closes.
    useEffect(() => {
        previousFocusRef.current = document.activeElement
        return () => {
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus()
            }
        }
    }, [])

    // Auto-focus the overlay so keyboard events work immediately.
    useEffect(() => {
        overlayRef.current?.focus()
    }, [])

    // Close on ESC
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }

            // Basic focus trap: Tab cycles within the modal.
            if (e.key === 'Tab') {
                const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                )
                if (!focusable || focusable.length === 0) return
                const first = focusable[0]
                const last = focusable[focusable.length - 1]

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault()
                        last.focus()
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault()
                        first.focus()
                    }
                }
            }
        },
        [onClose],
    )

    // Prevent clicks on the inner content from closing the modal
    const handleContentClick = useCallback(
        (e: React.MouseEvent) => e.stopPropagation(),
        [],
    )

    return createPortal(
        <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Edit image: ${file.name}`}
            tabIndex={-1}
            className="upup-fixed upup-inset-0 upup-z-[2147483647] upup-flex upup-items-center upup-justify-center upup-bg-black/60 upup-outline-none"
            onClick={onClose}
            onKeyDown={handleKeyDown}
        >
            <div
                className={cn(
                    'upup-relative upup-flex upup-h-[90vh] upup-w-[90vw] upup-max-w-5xl upup-flex-col upup-overflow-hidden upup-rounded-xl upup-shadow-2xl',
                    dark ? 'upup-bg-[#232323]' : 'upup-bg-white',
                )}
                onClick={handleContentClick}
            >
                {/* Header */}
                <div
                    className={cn(
                        'upup-flex upup-items-center upup-justify-between upup-border-b upup-px-4 upup-py-3',
                        dark
                            ? 'upup-border-gray-700 upup-text-gray-200'
                            : 'upup-border-gray-200 upup-text-gray-800',
                    )}
                >
                    <h2 className="upup-text-sm upup-font-medium">
                        Edit image — {file.name}
                    </h2>
                    <button
                        type="button"
                        aria-label="Close editor"
                        className={cn(
                            'upup-flex upup-h-7 upup-w-7 upup-items-center upup-justify-center upup-rounded-full',
                            'upup-text-lg upup-leading-none upup-transition-colors',
                            dark
                                ? 'upup-text-gray-400 hover:upup-bg-gray-700 hover:upup-text-gray-200'
                                : 'upup-text-gray-500 hover:upup-bg-gray-100 hover:upup-text-gray-800',
                        )}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                {/* Editor body — placeholder for Filerobot (wired in commit 4) */}
                <div className="upup-flex upup-flex-1 upup-items-center upup-justify-center upup-p-4">
                    <img
                        src={file.url}
                        alt={file.name}
                        className="upup-max-h-full upup-max-w-full upup-rounded upup-object-contain"
                    />
                </div>
            </div>
        </div>,
        document.body,
    )
})
