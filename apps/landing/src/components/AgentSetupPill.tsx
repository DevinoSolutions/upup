'use client'

import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import {
    AGENTS,
    AGENT_SETUP_TOAST,
    APP_NAME,
    agentSetupSentence,
} from '@/lib/agent-setup/config'
import { captureClientEvent } from '@/lib/analytics/capture.client'
import { useCopyToClipboard } from '@/lib/use-copy-to-clipboard'

// "Onboard your agent to upup" — Cloudflare's mechanism, one component for
// every surface (docs sidebar, homepage hero, /agent-setup/). Clicking the
// pill copies ONE sentence; the user pastes it into any coding agent, which
// fetches /agent-setup/prompt.md and does the install itself. The copied text
// has exactly one source of truth: agentSetupSentence() in the manifest.
// Each agent icon is a link to that agent's human guide.
export function AgentSetupPill({
    surface,
    className = '',
}: {
    /** Which placement fired the copy — the PostHog `surface` property. */
    surface: 'docs-sidebar' | 'docs-menu' | 'home-hero' | 'agent-setup'
    className?: string
}) {
    const { copied, copy } = useCopyToClipboard(2500)

    const onCopy = () => {
        copy(agentSetupSentence())
        captureClientEvent('agent_setup_copied', {
            app: APP_NAME,
            surface,
            agent: 'any',
        })
    }

    return (
        <div
            data-testid={`agent-setup-pill-${surface}`}
            className={`inline-flex max-w-full flex-col gap-1.5 ${className}`}
        >
            <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-black/5 bg-[var(--bg-base)] py-1 pl-3 pr-1 text-sm dark:border-white/10">
                <button
                    type="button"
                    onClick={onCopy}
                    data-testid="agent-setup-copy"
                    aria-label={`Copy the ${APP_NAME} agent-setup prompt`}
                    className="inline-flex min-w-0 items-center gap-2 font-medium text-gray-800 transition-colors hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                >
                    <span className="truncate">
                        Onboard your agent to {APP_NAME}
                    </span>
                    {copied ? (
                        <Check
                            className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400"
                            aria-hidden
                        />
                    ) : (
                        <Copy
                            className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400"
                            aria-hidden
                        />
                    )}
                </button>
                <span
                    className="mx-1 h-4 w-px shrink-0 bg-black/10 dark:bg-white/15"
                    aria-hidden
                />
                <ul className="flex shrink-0 items-center gap-0.5">
                    {AGENTS.map(agent => (
                        <li key={agent.id}>
                            <Link
                                href={`/agent-setup/${agent.id}/`}
                                title={`${agent.name} setup guide`}
                                aria-label={`${agent.name} setup guide`}
                                data-testid={`agent-setup-icon-${agent.id}`}
                                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                onClick={() =>
                                    captureClientEvent('agent_setup_opened', {
                                        app: APP_NAME,
                                        surface,
                                        agent: agent.id,
                                    })
                                }
                            >
                                {/* Light/dark variants swap via CSS so no
                                    theme context is needed on every surface. */}
                                <img
                                    src={agent.icon.light}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="h-4 w-4 dark:hidden"
                                />
                                <img
                                    src={agent.icon.dark}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="hidden h-4 w-4 dark:block"
                                />
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
            {/* The "toast": an inline live-region so it works on every page
                without a ToastContainer, and screen readers hear it. */}
            <p
                role="status"
                aria-live="polite"
                data-testid="agent-setup-toast"
                className={`pl-3 text-xs text-gray-500 transition-opacity dark:text-gray-400 ${
                    copied ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {copied ? AGENT_SETUP_TOAST : ' '}
            </p>
        </div>
    )
}
