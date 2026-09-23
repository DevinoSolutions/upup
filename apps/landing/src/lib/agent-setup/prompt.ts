import {
    AGENTS,
    APP_NAME,
    FRAMEWORK_PACKAGES,
    SERVER_PACKAGE,
    agentContextBlock,
    agentSetupResources,
    type AgentMeta,
} from './config'
import { siteUrl } from '@/lib/site-url'

// Renders /agent-setup/prompt.md — the file a coding agent fetches after the
// user pastes the pill's sentence. Structure mirrors Cloudflare's
// developers.cloudflare.com/agent-setup/prompt.md: preamble + checklist, then
// the steps the agent runs itself. Every command and snippet here comes from
// the manifest, which in turn mirrors the framework quickstarts.

function fence(lang: string, body: string): string {
    return `\`\`\`${lang}\n${body}\n\`\`\``
}

/** The per-agent "write the context block" step, shared with the pages. */
export function agentContextInstruction(agent: AgentMeta): string {
    const header = agent.contextHeader
        ? ` Start the file with this front matter:\n\n${fence('yaml', agent.contextHeader.trim())}\n\nThen`
        : ' Then'
    return `Write the context block above into \`${agent.contextPath}\` at the project root (create the file if it does not exist; if it exists, append the block under a \`## upup\` heading without changing anything else).${header} re-read the file to confirm the block is present.`
}

export function buildAgentSetupPrompt(): string {
    const origin = siteUrl()
    const steps = [
        'Detect the project framework and package manager',
        'Install the matching @useupup/* package',
        'Mount the uploader with the recommended client-mode config',
        'Add the presigned-URL route the uploader calls',
        `Save the ${APP_NAME} context block into your agent's instructions file`,
        'Verify the project builds and report what was set up',
    ]

    const frameworkSections = FRAMEWORK_PACKAGES.map(fw => {
        const lang =
            fw.id === 'vue'
                ? 'vue'
                : fw.id === 'svelte'
                  ? 'svelte'
                  : fw.id === 'angular' || fw.id === 'vanilla'
                    ? 'ts'
                    : 'tsx'
        return [
            `### ${fw.name} — \`${fw.pkg}\``,
            '',
            `Use this section when the project has ${fw.detect}. Quickstart: ${origin}${fw.quickstart}`,
            '',
            fence('sh', `npm i ${fw.pkg}`),
            '',
            'Mount the uploader (client mode — the browser uploads straight to your storage):',
            '',
            fence(lang, fw.snippet),
        ].join('\n')
    })

    const agentSections = AGENTS.map(agent =>
        [`### ${agent.name}`, '', agentContextInstruction(agent)].join('\n'),
    )

    return [
        `# Set up ${APP_NAME} in this project`,
        '',
        `These are official instructions from ${APP_NAME} to set up an AI development environment for ${APP_NAME}, the MIT-licensed, self-hosted file uploader with native UI packages for React, Vue, Svelte, Angular, Vanilla JS, and Preact. All commands are validated by ${APP_NAME}. Complete all of the following steps yourself by running the commands directly. Do not ask the user to run any of these commands.`,
        '',
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        '',
        `${APP_NAME} is an npm library. There is no API key, hosted service, MCP server, or CLI to install — setup means installing the right package, wiring it into the project, and carrying an accurate model of the library in your instructions file.`,
        '',
        '## Step 1: Detect the framework and package manager',
        '',
        `Read \`package.json\`. Pick exactly ONE framework section from Step 2 using its detection rule (check \`next\` before \`react\`, because a Next.js project also depends on React). Use the project's package manager: \`pnpm-lock.yaml\` → pnpm, \`yarn.lock\` → yarn, \`bun.lockb\` or \`bun.lock\` → bun, otherwise npm. Translate the \`npm i\` commands below accordingly (\`pnpm add\`, \`yarn add\`, \`bun add\`).`,
        '',
        'If the project has no package.json, stop and ask the user which framework they want before continuing.',
        '',
        '## Step 2: Install and mount the package for the detected framework',
        '',
        'Requirements: Node 20+. React packages need React 19; @useupup/next needs Next.js 15+.',
        '',
        ...frameworkSections.flatMap(section => [section, '']),
        '## Step 3: Add the presigned-URL route',
        '',
        `In client mode the uploader POSTs to \`uploadEndpoint\` once per file and expects a presigned upload URL back; the browser then PUTs the bytes straight to the bucket. Add a route at \`/api/upload-token\` in the project's server framework. A ready-to-copy handler for every supported storage provider is at ${origin}/docs/code-examples/ — fetch it and adapt the route to the project. Read the bucket name, region, and credentials from environment variables; never hardcode them. If the project has no server at all (a pure static SPA), skip this step and tell the user the route is still needed before uploads work.`,
        '',
        `If the user wants uploads and cloud-drive OAuth proxied through their own server instead, install \`${SERVER_PACKAGE}\` and follow ${origin}/docs/guides/server-mode-setup/ — \`createUpupHandler\` requires an \`uploadTokenSecret\` of at least 16 characters and throws at construction without it.`,
        '',
        `## Step 4: Save the ${APP_NAME} context block`,
        '',
        `This is the compact, verified model of ${APP_NAME} that keeps later edits correct. Use the section for the agent you are running as.`,
        '',
        fence('text', agentContextBlock()),
        '',
        ...agentSections.flatMap(section => [section, '']),
        '### Other agents',
        '',
        'Write the same block into whichever project-instructions file your agent reads (for example `AGENTS.md` or `.github/copilot-instructions.md`).',
        '',
        '## Step 5: Verify',
        '',
        'Run the project\'s type-check or build (`npm run build`, or the equivalent for its package manager). Success looks like: the build completes, the `@useupup/*` package resolves, and the stylesheet import resolves. If the build fails on the styles import, the package\'s `styles` subpath needs TypeScript 5.7+ / `moduleResolution: "bundler"`; tell the user rather than removing the import.',
        '',
        '## Step 6: Report to the user',
        '',
        'Print this summary, filled in:',
        '',
        fence(
            'text',
            [
                `${APP_NAME} is set up.`,
                '- Installed: <package>@<version>',
                '- Mounted: <path to the component or file that renders the uploader>',
                '- Presign route: <path> (reads bucket/region/credentials from env)',
                '- Agent context: <instructions file> now carries the upup context block',
                'Still yours to do:',
                '- Set the storage env vars used by the presign route',
                '- Choose sources / cloud drives via the `sources` and `cloudDrives` props (see the quickstart)',
            ].join('\n'),
        ),
        '',
        '## Resources',
        '',
        ...agentSetupResources().map(
            resource => `- ${resource.label}: ${resource.href}`,
        ),
        '',
    ].join('\n')
}
