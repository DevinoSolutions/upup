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
    async headers() {
        return [
            {
                source: '/documentation/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        if (isDev) {
            return {
                beforeFiles: [
                    {
                        source: '/documentation/:path*',
                        destination: `${docsOrigin}/documentation/:path*`,
                    },
                ],
                afterFiles: [],
                fallback: [],
            };
        }

        // In production, let Next.js serve everything from public/documentation automatically
        return {
            beforeFiles: [],
            afterFiles: [],
            fallback: [],
        };
    },
};

export default nextConfig;
