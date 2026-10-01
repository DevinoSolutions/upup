import {
    defineConfig,
    defineDocs,
    frontmatterSchema,
} from 'fumadocs-mdx/config'
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins'
import { z } from 'zod'

// Optional `faq:` frontmatter — a list of `{ q, a }` pairs that
// DocsStructuredData turns into FAQPage JSON-LD. Google only honours FAQ markup
// that mirrors content the reader can see, so a page that sets it must carry
// each `q` as a visible question heading and each `a` drawn from the answer
// text beneath it (faq.mdx is pinned to exactly that by docs-structured-data
// tests). Pages without the key emit no FAQPage node at all.
const faqItemSchema = z.object({
    q: z.string().min(1),
    a: z.string().min(1),
})

export const docs = defineDocs({
    dir: 'content/docs',
    docs: {
        schema: frontmatterSchema.extend({
            faq: z.array(faqItemSchema).optional(),
        }),
    },
})

// fumadocs' default rehypeCode already emits dual-theme (github-light /
// github-dark) shiki tokens as --shiki-* CSS variables; the activation CSS
// lives in globals.css since fumadocs-ui (which normally ships it) is
// forbidden here. The only thing missing is the fenced-block language, which
// the CodeBlock wrapper surfaces as a label — this transformer stamps it onto
// the <pre> as data-language.
const transformers: NonNullable<typeof rehypeCodeDefaultOptions.transformers> =
    [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        {
            name: 'upup:code-language',
            pre(node) {
                const lang = this.options.lang
                if (lang && lang !== 'text' && lang !== 'plaintext') {
                    node.properties['data-language'] = lang
                }
            },
        },
    ]

export default defineConfig({
    mdxOptions: {
        rehypeCodeOptions: {
            ...rehypeCodeDefaultOptions,
            transformers,
        },
    },
})
