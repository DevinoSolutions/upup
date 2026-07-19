'use client'

import { useRef, useState } from 'react'
import posthog from 'posthog-js'
import { toast } from 'react-toastify'
import { SUPPORT_TYPES, type SupportType } from '@/lib/support/schema'

type FormStatus = 'idle' | 'submitting' | 'error'

interface SupportResponseBody {
    ok: boolean
    feedbackId: string
    posthog: 'ok' | 'failed'
    email: 'ok' | 'failed' | 'not_configured'
}

const TYPE_LABELS: Record<SupportType, string> = {
    problem: 'Report a problem',
    feature_request: 'Request a feature',
    question: 'Ask a question',
    other: 'Something else',
}

const FIELD =
    'w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500'
const LABEL = 'mb-2 block text-sm font-medium text-gray-900 dark:text-white'

/** Read a PostHog id without throwing when analytics is disabled. */
function safeId(read: () => string | undefined): string | undefined {
    try {
        return read() ?? undefined
    } catch {
        return undefined
    }
}

export default function SupportForm() {
    const [type, setType] = useState<SupportType>('problem')
    const [message, setMessage] = useState('')
    const [expectedOutcome, setExpectedOutcome] = useState('')
    const [wantsReply, setWantsReply] = useState(false)
    const [email, setEmail] = useState('')
    const [website, setWebsite] = useState('') // honeypot
    const [status, setStatus] = useState<FormStatus>('idle')

    // One id per submission lifecycle: kept across retries, regenerated only
    // after a confirmed success.
    const feedbackIdRef = useRef<string>(crypto.randomUUID())
    const inFlightRef = useRef(false)

    const submit = async () => {
        if (inFlightRef.current) return

        if (!message.trim()) {
            toast.error('Please add a message before sending.')
            return
        }
        if (wantsReply && !email.trim()) {
            toast.error('Please add an email so we can reply.')
            return
        }

        inFlightRef.current = true
        setStatus('submitting')

        const payload = {
            type,
            message,
            expectedOutcome: expectedOutcome.trim() || undefined,
            wantsReply,
            email: wantsReply ? email.trim() : undefined,
            feedbackId: feedbackIdRef.current,
            posthogSessionId: safeId(() => posthog.get_session_id?.()),
            posthogDistinctId: safeId(() => posthog.get_distinct_id?.()),
            route:
                typeof window !== 'undefined'
                    ? window.location.pathname
                    : undefined,
            website,
        }

        try {
            // Trailing slash: next.config has trailingSlash:true, so the
            // bare path would 308-redirect the POST — hit the canonical URL.
            const res = await fetch('/api/upup-support/', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const body = (await res
                .json()
                .catch(() => null)) as SupportResponseBody | null

            if (res.ok && body?.ok) onSuccess(body)
            else onFailure()
        } catch {
            onFailure()
        } finally {
            inFlightRef.current = false
        }
    }

    const onSuccess = (body: SupportResponseBody) => {
        toast.success('Thanks — we got it.')
        // Analytics failure is internal (already logged server-side); the user
        // still succeeded. But a wanted reply that could not be delivered gets
        // a heads-up.
        if (wantsReply && body.email === 'failed') {
            toast.warn(
                "Recorded, but direct reply delivery failed — we'll follow up via the recorded request.",
            )
        }
        setType('problem')
        setMessage('')
        setExpectedOutcome('')
        setWantsReply(false)
        setEmail('')
        setWebsite('')
        feedbackIdRef.current = crypto.randomUUID()
        setStatus('idle')
    }

    const onFailure = () => {
        // Keep every field intact and reuse the SAME feedbackId so a retry is
        // idempotent server-side.
        toast.error(
            'Something went wrong sending your request. Your message is safe — try again.',
        )
        setStatus('error')
    }

    const submitting = status === 'submitting'

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={e => {
                e.preventDefault()
                void submit()
            }}
            noValidate
        >
            <div>
                <label htmlFor="support-type" className={LABEL}>
                    What can we help with?
                </label>
                <select
                    id="support-type"
                    className={FIELD}
                    value={type}
                    onChange={e => setType(e.target.value as SupportType)}
                >
                    {SUPPORT_TYPES.map(value => (
                        <option key={value} value={value}>
                            {TYPE_LABELS[value]}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="support-message" className={LABEL}>
                    Message
                </label>
                <textarea
                    id="support-message"
                    className={`${FIELD} min-h-32 resize-y`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={5000}
                    required
                    data-ph-mask
                    placeholder="Describe what happened, what you expected, and any steps to reproduce."
                />
            </div>

            <div>
                <label htmlFor="support-expected" className={LABEL}>
                    Expected outcome{' '}
                    <span className="font-normal text-gray-500">
                        (optional)
                    </span>
                </label>
                <textarea
                    id="support-expected"
                    className={`${FIELD} min-h-20 resize-y`}
                    value={expectedOutcome}
                    onChange={e => setExpectedOutcome(e.target.value)}
                    maxLength={2000}
                    placeholder="What should have happened instead?"
                />
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-900 dark:text-white">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/20 text-blue-600 focus:ring-blue-500/30 dark:border-white/20"
                    checked={wantsReply}
                    onChange={e => setWantsReply(e.target.checked)}
                />
                I&apos;d like a reply
            </label>

            {wantsReply && (
                <div>
                    <label htmlFor="support-email" className={LABEL}>
                        Email
                    </label>
                    <input
                        id="support-email"
                        type="email"
                        className={FIELD}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        maxLength={320}
                        required
                        data-ph-mask
                        placeholder="you@example.com"
                    />
                </div>
            )}

            {/* Honeypot: hidden from users + assistive tech; bots that fill it
                are silently dropped by the API. */}
            <input
                type="text"
                name="website"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                    {submitting ? 'Sending…' : 'Send request'}
                </button>
                {status === 'error' && (
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void submit()}
                        className="inline-flex items-center justify-center rounded-2xl border border-black/10 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-black/[0.04] disabled:opacity-60 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
                    >
                        Retry
                    </button>
                )}
            </div>
        </form>
    )
}
