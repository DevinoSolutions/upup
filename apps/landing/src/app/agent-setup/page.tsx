import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AgentSetupPill } from '@/components/AgentSetupPill'
import Card from '@/components/ui/Card'
import Section from '@/components/ui/Section'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'
import {
    AGENTS,
    AGENT_SETUP_PROMPT_PATH,
    APP_NAME,
    FRAMEWORK_PACKAGES,
    agentSetupResources,
    agentSetupSentence,
} from '@/lib/agent-setup/config'
import { canonicalUrl } from '@/lib/site-url'

export const metadata: Metadata = {
    title: 'Onboard your AI coding agent to upup',
    description:
        'One sentence to paste into Claude Code, Codex, Cursor, or OpenCode: the agent fetches upup’s setup prompt and installs and wires the right @useupup package itself.',
    alternates: { canonical: canonicalUrl('agent-setup') },
}

export default function AgentSetupPage() {
    return (
        <div className="min-h-[70vh] bg-[var(--bg-base)]">
            <Section clearNav>
                <SectionHeading
                    as="h1"
                    badge={
                        <>
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            For AI coding agents
                        </>
                    }
                    title={
                        <>
                            Onboard your agent to{' '}
                            <span className={GRADIENT_TEXT}>{APP_NAME}</span>
                        </>
                    }
                    subtitle="Copy one sentence, paste it into your coding agent, and it installs and wires upup into your project on its own."
                />

                <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
                    <AgentSetupPill surface="agent-setup" />
                    <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                        The pill copies exactly this:
                    </p>
                    <pre className="w-full overflow-x-auto rounded-xl border border-black/5 bg-black/[0.03] p-4 text-xs text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
                        <code>{agentSetupSentence()}</code>
                    </pre>
                    <p className="max-w-2xl text-center text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        The agent fetches{' '}
                        <a
                            href={AGENT_SETUP_PROMPT_PATH}
                            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                        >
                            {AGENT_SETUP_PROMPT_PATH}
                        </a>
                        , detects your framework, installs the matching package
                        ({FRAMEWORK_PACKAGES.map(fw => fw.pkg).join(', ')}
                        ), mounts the uploader with the recommended client-mode
                        config, adds the presigned-URL route, and saves a
                        verified {APP_NAME} context block into its own
                        instructions file.
                    </p>
                </div>

                <div className="mx-auto mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
                    {AGENTS.map(agent => (
                        <Card key={agent.id} className="p-5">
                            <Link
                                href={`/agent-setup/${agent.id}/`}
                                className="group flex h-full flex-col gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={agent.icon.light}
                                        alt=""
                                        width={20}
                                        height={20}
                                        className="h-5 w-5 dark:hidden"
                                    />
                                    <img
                                        src={agent.icon.dark}
                                        alt=""
                                        width={20}
                                        height={20}
                                        className="hidden h-5 w-5 dark:block"
                                    />
                                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {agent.name}
                                    </h2>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    What the agent installs, where it writes the{' '}
                                    {APP_NAME} context (
                                    <code className="rounded bg-black/[0.06] px-1 py-0.5 text-xs dark:bg-white/10">
                                        {agent.contextPath}
                                    </code>
                                    ), and how it verifies the result.
                                </p>
                                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {agent.name} guide
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                </span>
                            </Link>
                        </Card>
                    ))}
                </div>

                <div className="mx-auto mt-16 w-full max-w-3xl">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Resources
                    </h2>
                    <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {agentSetupResources().map(resource => (
                            <li key={resource.href}>
                                <a
                                    href={resource.href}
                                    className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                                >
                                    {resource.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </Section>
        </div>
    )
}
