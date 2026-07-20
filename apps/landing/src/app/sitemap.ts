import type { MetadataRoute } from 'next'
import { FRAMEWORK_IDS } from '@/lib/frameworks'

const SITE_URL = 'https://useupup.com'

// Key documentation entry points (served by the docs app under /documentation).
// The docs app publishes its own full sitemap at
// https://useupup.com/documentation/sitemap.xml (also referenced from robots.txt);
// these are the high-value pages we surface directly from the root sitemap.
const docsPaths = [
    'getting-started',
    'guides/server-mode-setup',
    'error-handling',
    'quickstarts/react',
    'quickstarts/next',
    'quickstarts/vue',
    'quickstarts/svelte',
    'quickstarts/angular',
    'quickstarts/vanilla',
    'quickstarts/preact',
    'comparisons/upup-vs-uppy',
    'comparisons/upup-vs-filepond',
    'comparisons/upup-vs-react-dropzone',
    'comparisons/upup-vs-uploadthing',
    'ai-assistants',
]

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date()

    return [
        {
            url: `${SITE_URL}/`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        // Per-framework landing pages (/react, /vue, …) — high-value entry points.
        ...FRAMEWORK_IDS.map((id): MetadataRoute.Sitemap[number] => ({
            url: `${SITE_URL}/${id}`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.9,
        })),
        {
            url: `${SITE_URL}/privacy`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        ...docsPaths.map((path): MetadataRoute.Sitemap[number] => ({
            url: `${SITE_URL}/documentation/${path}`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        })),
    ]
}
