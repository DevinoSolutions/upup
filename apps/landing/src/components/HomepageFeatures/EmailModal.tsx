'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import * as gtag from '@/lib/gtag'
import { submitAndRecordProviderInterest } from './notify-signup'
import { FaTimes, FaSpinner } from 'react-icons/fa'
import type { EmailModalProps } from './types'

// Tab stops inside the dialog. The honeypot carries tabIndex -1, so it is
// never part of the cycle.
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

const EmailModal: React.FC<EmailModalProps> = ({
    isOpen,
    onClose,
    integrationName,
    isCustom = false,
    triggerRef,
}) => {
    const [email, setEmail] = useState('')
    const [customToolName, setCustomToolName] = useState('')
    const [website, setWebsite] = useState('') // honeypot
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [failed, setFailed] = useState(false)
    // One id per submission lifecycle so a retry is idempotent server-side;
    // regenerated only after a confirmed success (same rule as SupportForm).
    const feedbackIdRef = useRef<string>('')
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose
    // Bumped on every close. A submit captures it before awaiting; if it has
    // moved by the time the request settles, the dialog that started the
    // submit is gone (closed, possibly reopened) and the result must not
    // touch the UI. The request itself is never aborted: the sign-up is real.
    const closeGenRef = useRef(0)
    const isOpenRef = useRef(isOpen)
    isOpenRef.current = isOpen
    const headingId = React.useId()

    useEffect(
        () => () => {
            if (closeTimer.current) clearTimeout(closeTimer.current)
        },
        [],
    )

    const resetAfterSuccess = useCallback(() => {
        setEmail('')
        setCustomToolName('')
        setWebsite('')
        setIsSubmitted(false)
    }, [])

    // Modal behaviour while open: focus the first field (after mount, so it
    // holds under reduced motion too), keep Tab inside, close on Escape, and
    // hand focus back to whatever opened the dialog.
    useEffect(() => {
        if (!isOpen) return
        // Not every browser focuses a button on click (Safari, Firefox on
        // macOS), so prefer the element the click handler recorded.
        const trigger =
            triggerRef?.current ??
            (document.activeElement as HTMLElement | null)
        const dialog = dialogRef.current
        dialog?.querySelector<HTMLElement>('input:not([aria-hidden])')?.focus()

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (e.defaultPrevented) return
                // Consume the key so a layer underneath (the navbar's mobile
                // menu) stays open.
                e.preventDefault()
                onCloseRef.current()
                return
            }
            if (e.key !== 'Tab' || !dialog) return
            const stops = [
                ...dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
            ].filter(
                el =>
                    el.tabIndex >= 0 &&
                    !(el as HTMLButtonElement | HTMLInputElement).disabled,
            )
            const first = stops[0]
            const last = stops[stops.length - 1]
            const active = document.activeElement
            if (!first) {
                e.preventDefault()
                dialog.focus()
            } else if (
                !dialog.contains(active) ||
                !stops.includes(active as HTMLElement)
            ) {
                // Outside the dialog, or on a control that is not a stop (the
                // submit button while it is disabled mid-submit, the honeypot).
                e.preventDefault()
                ;(e.shiftKey ? last : first).focus()
            } else if (e.shiftKey && active === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && active === last) {
                e.preventDefault()
                first.focus()
            }
        }
        // Capture phase: a bubble listener registered earlier (the navbar's
        // mobile-menu Escape) would otherwise run first and close both layers.
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
            document.removeEventListener('keydown', onKeyDown, true)
            closeGenRef.current += 1
            // Detach from any in-flight submit so a reopen starts enabled.
            setIsSubmitting(false)
            // A pending success timer must not outlive the dialog it belongs
            // to; apply its reset now so a reopen starts from the form.
            if (closeTimer.current) {
                clearTimeout(closeTimer.current)
                closeTimer.current = null
                resetAfterSuccess()
            }
            trigger?.focus()
        }
    }, [isOpen, triggerRef, resetAfterSuccess])

    const providerName = isCustom ? customToolName : integrationName

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || (isCustom && !customToolName) || isSubmitting) return

        setIsSubmitting(true)
        setFailed(false)
        if (!feedbackIdRef.current) feedbackIdRef.current = crypto.randomUUID()

        // Google Analytics records WHICH provider was asked for, never who
        // asked. PostHog (after a confirmed sign-up) gets the submission id as
        // the person id; no email or derivative of one ever reaches it.
        gtag.event({
            action: 'provider_email_submit',
            event_category: 'providers',
            event_label: isCustom ? `Custom: ${customToolName}` : providerName,
        })

        // Calls the route, then records the sign-up and its source (UTM, referrer,
        // landing page) in the browser only on a confirmed server success.
        const closeGen = closeGenRef.current
        const ok = await submitAndRecordProviderInterest({
            email,
            providerName,
            isCustom,
            feedbackId: feedbackIdRef.current,
            website,
        })

        if (closeGen !== closeGenRef.current) {
            // Settled after the dialog was dismissed: no success panel, no
            // close timer, no failure UI. A recorded sign-up still leaves the
            // next open fresh (unless it is already open on new input).
            if (ok) {
                feedbackIdRef.current = ''
                if (!isOpenRef.current) resetAfterSuccess()
            }
            return
        }
        setIsSubmitting(false)

        if (!ok) {
            // Keep every field and the same feedbackId so Retry is idempotent.
            setFailed(true)
            return
        }

        setIsSubmitted(true)
        feedbackIdRef.current = ''
        closeTimer.current = setTimeout(() => {
            closeTimer.current = null
            onClose()
            resetAfterSuccess()
        }, 2000)
    }

    return (
        <AnimatePresence>
            {isOpen ? (
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <m.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={headingId}
                        tabIndex={-1}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-black/5 dark:border-white/10 focus:outline-none"
                        onClick={e => e.stopPropagation()}
                    >
                        {!isSubmitted ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <h3
                                        id={headingId}
                                        className="text-xl font-bold text-gray-900 dark:text-white"
                                    >
                                        {isCustom
                                            ? 'Request Custom Provider'
                                            : `Get notified for ${integrationName}`}
                                    </h3>
                                    <button
                                        type="button"
                                        aria-label="Close"
                                        onClick={onClose}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <FaTimes className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>

                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {isCustom
                                        ? "Tell us which storage provider you'd like us to integrate with upup and we'll notify you when it's ready."
                                        : `We'll send you an email as soon as the ${integrationName} integration is ready for beta testing.`}
                                </p>

                                <form onSubmit={handleSubmit}>
                                    {isCustom && (
                                        <input
                                            type="text"
                                            value={customToolName}
                                            onChange={e =>
                                                setCustomToolName(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Provider name (e.g., MinIO, Wasabi, IBM Cloud)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-fast mb-4"
                                            required
                                        />
                                    )}

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-fast mb-4"
                                        required
                                    />

                                    {/* Honeypot: hidden from users + assistive tech;
                                    bots that fill it are silently dropped by the
                                    API. Same field name the support form uses. */}
                                    <input
                                        type="text"
                                        name="website"
                                        value={website}
                                        onChange={e =>
                                            setWebsite(e.target.value)
                                        }
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
                                    />

                                    {failed && (
                                        <p
                                            role="alert"
                                            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400"
                                        >
                                            Something went wrong recording that.
                                            Your details are still here — try
                                            again.
                                        </p>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-xl border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-3 bg-primary hover:opacity-90 text-white font-semibold rounded-xl transition-opacity duration-fast disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <FaSpinner className="w-4 h-4 animate-spin" />
                                                    {isCustom
                                                        ? 'Requesting...'
                                                        : 'Subscribing...'}
                                                </>
                                            ) : isCustom ? (
                                                'Request Provider'
                                            ) : (
                                                'Notify me'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <m.div
                                role="status"
                                className="text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                        <m.svg
                                            className="w-4 h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </m.svg>
                                    </div>
                                </div>
                                <h3
                                    id={headingId}
                                    className="text-xl font-bold text-gray-900 dark:text-white mb-2"
                                >
                                    You&apos;re all set!
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {`We’ll email you when ${providerName} integration is ready.`}
                                </p>
                            </m.div>
                        )}
                    </m.div>
                </m.div>
            ) : null}
        </AnimatePresence>
    )
}

export default EmailModal
