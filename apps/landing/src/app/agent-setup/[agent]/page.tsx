import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AgentSetupPill } from '@/components/AgentSetupPill'
import Section from '@/components/ui/Section'
import SectionHeading, { GRADIENT_TEXT } from '@/components/ui/SectionHeading'
import {
    AGENT_IDS,
    AGENT_SETUP_PROMPT_PATH,
    APP_NAME,
    FRAMEWORK_PACKAGES,
    agentContextBlock,
    agentSetupResources,
    getAgent,
} from '@/lib/agent-setup/config'
import { agentContextInstruction } from '@/lib/agent-setup/prompt'
import { canonicalUrl } from '@/lib/site-url'

// Only the four agents in the manifest render; anything else 404s.
export const dynamicParams = false

export function generateStaticParams() {
    return AGENT_IDS.map(agent => ({ agent }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ agent: string }>
}): Promise<Metadata> {
    const { agent: id } = await params
    const agent = getAgent(id)
    if (!agent) return {}
    return {
        title: `Set up upup with ${agent.name}`,
        description: `What ${agent.name} installs and wires when you paste the upup agent-setup prompt: the matching @useupup package, the uploader mount, the presign route, and a verified context block in ${agent.contextPath}.`,
        alternates: { canonical: canonicalUrl(`agent-setup/${agent.id}`) },
    }
}

const CODE_BLOCK =
    'w-full overflow-x-auto rounded-xl border border-black/5 bg-black/[0.03] p-4 text-xs leading-relaxed text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200'

export default async function AgentGuidePage({
    params,
}: {
    params: Promise<{ agent: string }>
}) {
    const { agent: id } = await params
    const agent = getAgent(id)
    if (!agent) notFound()

    return (
        <div className="min-h-[70vh] bg-[var(--bg-base)]">
            <Section clearNav>
                <SectionHeading
                    as="h1"
                    align="left"
                    badge={
                        <Link href="/agent-setup/" className="hover:underline">
                            ← All agents
                        </Link>
                    }
                    title={
                        <>
                            Set up {APP_NAME} with{' '}
                            <span className={GRADIENT_TEXT}>{agent.name}</span>
                        </>
                    }
                    subtitle={`Paste the sentence below into ${agent.name}. It fetches the setup prompt and runs every step itself; this page shows what those steps are.`}
                />

                <div className="flex w-full max-w-3xl flex-col gap-10">
                    <AgentSetupPill surface="agent-setup" />

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            What you get
                        </h2>
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-300">
                            <li>
                                The right package for your framework, installed
                                with your package manager:{' '}
                                {FRAMEWORK_PACKAGES.map(fw => fw.pkg).join(
                                    ', ',
                                )}
                                .
                            </li>
                            <li>
                                The uploader mounted in client mode with the
                                recommended config, plus the presigned-URL route
                                it calls.
                            </li>
                            <li>
                                A verified {APP_NAME} context block written to{' '}
                                <code className="rounded bg-black/[0.06] px-1 py-0.5 text-xs dark:bg-white/10">
                                    {agent.contextPath}
                                </code>{' '}
                                so later edits stay correct.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Where {agent.name} saves the context
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {agentContextInstruction(agent)}
                        </p>
                        <pre className={`${CODE_BLOCK} mt-4`}>
                            <code>{agentContextBlock()}</code>
                        </pre>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Install and mount, per framework
                        </h2>
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                            The agent picks exactly one of these from your
                            package.json. The same snippets are in the prompt it
                            runs.
                        </p>
                        <div className="mt-4 space-y-6">
                            {FRAMEWORK_PACKAGES.map(fw => (
                                <div key={fw.id}>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {fw.name} —{' '}
                                        <code className="font-mono">
                                            {fw.pkg}
                                        </code>
                                    </h3>
                                    <pre className={`${CODE_BLOCK} mt-2`}>
                                        <code>{`npm i ${fw.pkg}\n\n${fw.snippet}`}</code>
                                    </pre>
                                    <Link
                                        href={fw.quickstart}
                                        className="mt-2 inline-block text-xs font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                                    >
                                        {fw.name} quickstart
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Verify
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            The agent runs your project&apos;s build or
                            type-check. Success: the build completes and both
                            the package and its <code>styles</code> import
                            resolve. It then prints what it installed, where the
                            uploader is mounted, and the storage env vars you
                            still need to set.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Resources
                        </h2>
                        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <li>
                                <a
                                    href={AGENT_SETUP_PROMPT_PATH}
                                    className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                                >
                                    The raw prompt (prompt.md)
                                </a>
                            </li>
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
                    </section>
                </div>
            </Section>
        </div>
    )
}
