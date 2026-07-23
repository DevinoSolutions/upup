import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins'

export const docs = defineDocs({
    dir: 'content/docs',
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
