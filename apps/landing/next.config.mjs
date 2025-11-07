/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const docsPort = process.env.DOCS_PORT || '3002'
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
    trailingSlash: false,
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

        return {
            beforeFiles: [
                {
                    source: '/documentation',
                    destination: '/documentation/index.html',
                },
                {
                    source: '/documentation/',
                    destination: '/documentation/index.html',
                },
            ],
            afterFiles: [],
            fallback: [],
        };
    },
};

export default nextConfig;
