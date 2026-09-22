import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
    AGENTS,
    AGENT_IDS,
    AGENT_SETUP_PROMPT_PATH,
    FRAMEWORK_PACKAGES,
    agentContextBlock,
    agentSetupResources,
    agentSetupSentence,
} from '@/lib/agent-setup/config'
import { buildAgentSetupPrompt } from '@/lib/agent-setup/prompt'
import { buildLlmsIndex } from '@/lib/docs/llms'
import { source } from '@/lib/docs/source'
import sitemap from '@/app/sitemap'

// The agent-onboarding surface (fleet spec 2026-09-22): a pill copies ONE
// sentence, the agent fetches /agent-setup/prompt.md and runs it. Everything
// is rendered from the manifest in src/lib/agent-setup/config.ts; these pins
// keep the prompt executable — no placeholder text, every URL it names is a
// route this site actually serves — and keep the copied sentence exact.

const PRODUCTION_ORIGIN = 'https://useupup.com'

/** Every route on this site the prompt may point at, without trailing slash. */
function knownRoutes(): Set<string> {
    const routes = new Set<string>([
        '',
        '/docs',
        '/support',
        '/privacy',
        '/llms.txt',
        '/llms-full.txt',
        '/agent-setup',
        AGENT_SETUP_PROMPT_PATH,
        ...AGENT_IDS.map(id => `/agent-setup/${id}`),
        ...source.getPages().map(page => page.url.replace(/\/$/, '')),
    ])
    return routes
}

describe('agent-setup copied sentence', () => {
    it('is the one Cloudflare-shaped sentence pointing at prompt.md', () => {
        expect(agentSetupSentence()).toBe(
            'Fetch and execute the appropriate instructions to set me up for upup from https://useupup.com/agent-setup/prompt.md',
        )
    })
})

describe('agent-setup prompt.md', () => {
    const prompt = buildAgentSetupPrompt()

    it('opens with the official-instructions preamble and a numbered checklist', () => {
        expect(prompt.startsWith('# Set up upup in this project')).toBe(true)
        expect(prompt).toContain(
            'These are official instructions from upup to set up an AI development environment',
        )
        expect(prompt).toContain(
            'Do not ask the user to run any of these commands.',
        )
        expect(prompt).toMatch(
            /\n1\. .+\n2\. .+\n3\. .+\n4\. .+\n5\. .+\n6\. .+\n/,
        )
    })

    it('contains no placeholder text', () => {
        // The fleet spec's template tokens, plus the usual markers. JSX tags
        // (`<UpupUploader …>`) are real code, so a bare angle-bracket check is
        // not usable here; the completion template in Step 6 is the one place
        // `<package>`-style fill-ins are intended.
        const outsideTemplate = prompt.replace(
            /## Step 6: Report to the user[\s\S]*?## Resources/,
            '',
        )
        for (const token of [
            '<App>',
            '<app>',
            '<docs-host>',
            '<app-domain>',
            '<pkg>',
            '<package>',
            '<your',
            'TODO',
            'TBD',
            'FIXME',
            'lorem',
        ]) {
            expect(outsideTemplate, `prompt contains ${token}`).not.toContain(
                token,
            )
        }
    })

    it('installs and mounts every published UI package', () => {
        for (const fw of FRAMEWORK_PACKAGES) {
            expect(prompt).toContain(`npm i ${fw.pkg}`)
            expect(prompt).toContain(fw.snippet)
        }
        expect(prompt).toContain('@useupup/server')
    })

    it('carries the verified context block and a section per agent', () => {
        expect(prompt).toContain(agentContextBlock())
        for (const agent of AGENTS) {
            expect(prompt).toContain(`### ${agent.name}`)
            expect(prompt).toContain(`\`${agent.contextPath}\``)
        }
    })

    it('points only at URLs this site serves', () => {
        const routes = knownRoutes()
        // The quickstart URL pattern (`…/quickstarts/<react|vue|…>/`) is a
        // template the agent expands, not a route; drop it before scanning.
        const scanned = prompt.replace(
            /https:\/\/useupup\.com\/docs\/quickstarts\/<[^>]+>\//g,
            '',
        )
        const urls = [
            ...scanned.matchAll(/https:\/\/useupup\.com[^\s)`'"<>]*/g),
        ]
            .map(match => match[0])
            .map(url => url.replace(/[.,]$/, ''))
        expect(urls.length).toBeGreaterThan(5)
        const unknown = urls
            .map(url => url.slice(PRODUCTION_ORIGIN.length))
            .map(path => path.replace(/\/$/, ''))
            .filter(path => !routes.has(path))
        expect(unknown).toEqual([])
    })

    it('lists every manifest resource at the end', () => {
        for (const resource of agentSetupResources()) {
            expect(prompt).toContain(resource.href)
        }
    })
})

describe('agent-setup discovery surfaces', () => {
    it('llms.txt links prompt.md, the human guide, and the FAQ', () => {
        const index = buildLlmsIndex()
        expect(index).toContain(
            `${PRODUCTION_ORIGIN}${AGENT_SETUP_PROMPT_PATH}`,
        )
        expect(index).toContain(`${PRODUCTION_ORIGIN}/agent-setup/`)
        expect(index).toContain(`${PRODUCTION_ORIGIN}/docs/faq/`)
    })

    it('the sitemap lists the agent-setup index and every per-agent guide, not prompt.md', () => {
        const urls = sitemap().map(entry => entry.url)
        expect(urls).toContain(`${PRODUCTION_ORIGIN}/agent-setup/`)
        for (const id of AGENT_IDS) {
            expect(urls).toContain(`${PRODUCTION_ORIGIN}/agent-setup/${id}/`)
        }
        expect(urls.some(url => url.endsWith('prompt.md'))).toBe(false)
    })

    it('the docs FAQ page exists and answers every homepage FAQ', async () => {
        const faq = source.getPage(['faq'])
        expect(faq).toBeDefined()
        const raw = readFileSync(
            fileURLToPath(
                new URL('../../content/docs/faq.mdx', import.meta.url),
            ),
            'utf8',
        )
        const { faqs } = await import('@/lib/faqs')
        for (const entry of faqs) {
            expect(raw, `FAQ page is missing "${entry.question}"`).toContain(
                `## ${entry.question}`,
            )
        }
    })

    it('the ai-assistants docs page carries the same context block as the prompt', () => {
        const raw = readFileSync(
            fileURLToPath(
                new URL(
                    '../../content/docs/ai-assistants.mdx',
                    import.meta.url,
                ),
            ),
            'utf8',
        )
        expect(raw).toContain(agentContextBlock())
    })

    it('every agent icon referenced by the manifest exists in public/', () => {
        for (const agent of AGENTS) {
            for (const icon of [agent.icon.light, agent.icon.dark]) {
                const file = fileURLToPath(
                    new URL(`../../public${icon}`, import.meta.url),
                )
                expect(
                    readFileSync(file, 'utf8').startsWith('<svg'),
                    `${icon} is not an SVG`,
                ).toBe(true)
            }
        }
    })
})
