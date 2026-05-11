import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const docsPort = process.env.DOCS_PORT || '53002'
const docsOrigin = `http://localhost:${docsPort}`

const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    experimental: !isDev
        ? {
              optimizePackageImports: ['@stackblitz/sdk'],
          }
        : undefined,
    transpilePackages: ['@stackblitz/sdk'],
    trailingSlash: true,
    turbopack: {
        root: repoRoot,
    },
    async rewrites() {
        if (isDev) {
            return {
                beforeFiles: [
                    {
                        source: '/documentation',
                        destination: `${docsOrigin}/documentation/`,
                    },
                    {
                        source: '/documentation/:path*',
                        destination: `${docsOrigin}/documentation/:path*`,
                    },
                ],
                afterFiles: [],
                fallback: [],
            };
        }

        return [
            {
                source: '/documentation/:path*',
                destination: '/documentation/index.html',
            },
        ];
    },
};

export default nextConfig;
