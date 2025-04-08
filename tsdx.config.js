const autoprefixer = require('autoprefixer')
const tailwindcss = require('tailwindcss')
const postcss = require('rollup-plugin-postcss')
const replace = require('@rollup/plugin-replace')
const analyze = require('rollup-plugin-analyzer')
const commonjs = require('@rollup/plugin-commonjs')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const { babel } = require('@rollup/plugin-babel')

const GRAPH_CLIENT_DEPS = [
    '@microsoft/microsoft-graph-client',
    '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser',
]

const AWS_SDK_DEPS = [
    '@aws-sdk/core',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    '@aws-sdk/xhr-http-handler',
    '@smithy/core',
    '@smithy/signature-v4',
]

const AZURE_DEPS = [
    '@azure/core-lro',
    '@azure/core-util',
    '@azure/storage-blob',
    '@azure/identity',
    '@azure/msal-browser',
]

module.exports = {
    rollup(config, options) {
        const isNode = options.format === 'cjs'

        config.plugins = [
            nodeResolve({
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            }),
            commonjs({
                requireReturnsDefault: 'auto',
            }),
            replace({
                preventAssignment: true,
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                'process.env.TARGET': JSON.stringify(
                    isNode ? 'node' : 'browser',
                ),
            }),
            babel({
                babelHelpers: 'bundled',
                include: [
                    'src/**/*',
                    'node_modules/framer-motion/dist/**/*',
                    'node_modules/react-toastify/dist/**/*',
                ],
            }),
            ...config.plugins,
            postcss({
                plugins: [tailwindcss, autoprefixer],
                inject: false,
                extract: !isNode && 'upup.css',
            }),
            analyze({ summaryOnly: true }),
        ]

        if (isNode) {
            config.output.file = config.output.file.replace(
                '.cjs.production.min.js',
                '.node.js',
            )
            config.external = [
                ...(Array.isArray(config.external) ? config.external : []),
                'react',
                'react-dom',
                'react/jsx-runtime',
                'tailwind-merge',
                ...AWS_SDK_DEPS,
                ...AZURE_DEPS,
                ...GRAPH_CLIENT_DEPS,
            ]
        }

        return config
    },
}
