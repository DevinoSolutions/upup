import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { FRAMEWORKS, type FrameworkId } from '@/lib/frameworks'
import Section from '@/components/ui/Section'
import SectionHeading, {
    GRADIENT_TEXT,
    H3_HEADING,
} from '@/components/ui/SectionHeading'
import { ICON_CHIP } from '@/components/ui/recipes'
import { FRAMEWORK_GUIDES } from './content'

// The framework-specific block of a /<framework>/ page: a component-doc style
// quickstart (install → render → cloud drives), a few framework notes, an
// honest comparison against that framework's usual uploaders, and a docs
// reading list. It renders ONLY on framework pages — the home page is the
// same layout without it — and is a server component so all of it ships in
// the HTML. Copy and competitor rows live in ./content.

const LINK_CLASS =
    'text-primary underline-offset-2 hover:underline dark:text-primary-dark'

function CodeWindow({ file, code }: Readonly<{ file: string; code: string }>) {
    // The window chrome matches the hero's FrameworkSnippets panel.
    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white text-left dark:border-white/10 dark:bg-gray-900">
            <div className="flex items-center gap-3 border-b border-black/5 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                    {file}
                </span>
            </div>
            <pre className="overflow-x-auto p-4">
                <code className="block whitespace-pre font-mono text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
                    {code}
                </code>
            </pre>
        </div>
    )
}

interface Step {
    title: string
    body: ReactNode
    file: string
    code: string
}

export default function FrameworkGuide({
    framework,
}: Readonly<{ framework: FrameworkId }>) {
    const fw = FRAMEWORKS[framework]
    const guide = FRAMEWORK_GUIDES[framework]

    const steps: Step[] = [
        {
            title: 'Install the package',
            body: (
                <>
                    One package, <code>{fw.pkg}</code>, brings the UI and the
                    upload engine. pnpm, Yarn and Bun work the same way.
                </>
            ),
            file: 'Terminal',
            code: `npm i ${fw.pkg}`,
        },
        {
            title: 'Render the uploader',
            body: (
                <>
                    Add it with its stylesheet and point it at your upload
                    endpoint: a route that returns a short-lived presigned URL
                    for each file. The{' '}
                    <Link href="/docs/code-examples/" className={LINK_CLASS}>
                        code examples
                    </Link>{' '}
                    include a ready-made handler.
                </>
            ),
            file: fw.file,
            code: fw.code,
        },
        {
            title: 'Add cloud drives and sources',
            body: (
                <>
                    List the sources you want and add the client IDs from each
                    provider&apos;s developer console. Google Drive, OneDrive,
                    Dropbox and Box are browsed inside the uploader panel.
                </>
            ),
            file: guide.drivesFile,
            code: guide.drivesCode,
        },
    ]

    const includes = [
        'Drag-and-drop dropzone, file picker, previews and progress',
        'Google Drive, OneDrive, Dropbox and Box imports',
        'Camera, screen capture and link imports',
        'Resumable uploads with tus or S3 multipart',
        'Presigned uploads to S3, R2, MinIO and other S3-compatible storage',
        'Server mode with an HMAC-signed trust model (@useupup/server)',
        ...(fw.hasImageEditor
            ? ['Image editor: crop, rotate and annotate before upload']
            : []),
        'ICU i18n, theming and dark mode',
        'MIT license, no license key',
    ]

    return (
        <>
            <Section id="quickstart">
                <SectionHeading
                    title={
                        <>
                            {fw.name} file uploader{' '}
                            <span className={`block ${GRADIENT_TEXT}`}>
                                in 3 steps
                            </span>
                        </>
                    }
                    subtitle={`Install ${fw.pkg}, render the component, and turn on the sources you need. In client mode files go straight from the browser to your S3-compatible bucket; in server mode they go through @useupup/server.`}
                />

                <ol className="space-y-12 sm:space-y-16">
                    {steps.map((step, index) => (
                        <li
                            key={step.title}
                            className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10"
                        >
                            <div className="min-w-0">
                                <span
                                    className={`${ICON_CHIP} mb-4 h-8 w-8 rounded-lg text-sm font-semibold`}
                                    aria-hidden
                                >
                                    {index + 1}
                                </span>
                                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                    <span className="sr-only">
                                        Step {index + 1}:{' '}
                                    </span>
                                    {step.title}
                                </h3>
                                <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                                    {step.body}
                                </p>
                            </div>
                            <CodeWindow file={step.file} code={step.code} />
                        </li>
                    ))}
                </ol>

                <div className="mt-16 grid gap-8 border-t border-black/5 pt-12 sm:grid-cols-2 dark:border-white/10">
                    {guide.notes.map(note => (
                        <div key={note.title} className="min-w-0">
                            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                {note.title}
                            </h3>
                            <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                                {note.body}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section id="compare">
                <SectionHeading
                    title={
                        <>
                            {fw.name} file upload libraries{' '}
                            <span className={`block ${GRADIENT_TEXT}`}>
                                compared
                            </span>
                        </>
                    }
                    subtitle={`How upup lines up against the ${fw.name} uploaders teams usually weigh. Each row states what the library is, whether it imports from cloud drives, and its license.`}
                />

                <ul className="mb-12 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {includes.map(item => (
                        <li
                            key={item}
                            className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                        >
                            <span
                                className={`${ICON_CHIP} mt-0.5 h-5 w-5 shrink-0 rounded-md`}
                                aria-hidden
                            >
                                <Check className="h-3.5 w-3.5" />
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>

                <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <caption className="sr-only">
                            upup compared with other {fw.name} file upload
                            libraries
                        </caption>
                        <thead className="bg-black/[0.02] text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Library
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    What it is
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    Cloud-drive imports
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                >
                                    License
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 text-gray-600 dark:divide-white/10 dark:text-gray-300">
                            <tr>
                                <th
                                    scope="row"
                                    className="px-4 py-3 font-semibold text-gray-900 dark:text-white"
                                >
                                    upup ({fw.pkg})
                                </th>
                                <td className="px-4 py-3">
                                    Native {fw.name} UI on a headless core, in
                                    client or server mode
                                </td>
                                <td className="px-4 py-3">
                                    Google Drive, OneDrive, Dropbox, Box
                                </td>
                                <td className="px-4 py-3">MIT</td>
                            </tr>
                            {guide.competitors.map(row => (
                                <tr key={row.name}>
                                    <th
                                        scope="row"
                                        className="px-4 py-3 font-medium text-gray-900 dark:text-white"
                                    >
                                        {row.name}
                                    </th>
                                    <td className="px-4 py-3">{row.what}</td>
                                    <td className="px-4 py-3">
                                        {row.cloudDrives}
                                    </td>
                                    <td className="px-4 py-3">{row.license}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                    For resumable uploads, direct-to-S3 and image editing side
                    by side, see{' '}
                    <Link
                        href={guide.comparisonLink.href}
                        className={LINK_CLASS}
                    >
                        {guide.comparisonLink.label}
                    </Link>
                    .
                </p>

                <h3 className={`${H3_HEADING} mb-6 mt-16`}>Keep reading</h3>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {guide.links.map(link => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className="flex h-full items-center justify-between gap-3 rounded-xl border border-black/5 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20"
                            >
                                {link.label}
                                <ArrowRight
                                    className="h-4 w-4 shrink-0 text-gray-400"
                                    aria-hidden
                                />
                            </Link>
                        </li>
                    ))}
                </ul>
            </Section>
        </>
    )
}
