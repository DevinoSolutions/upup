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
    async rewrites() {
        if (isDev) {
            return [
                {
                    source: '/documentation/:path*',
                    destination: `${docsOrigin}/documentation/:path*`,
                },
            ];
        }

        return [
            {
                source: '/documentation',
                destination: '/documentation/index.html',
            },
            {
                source: '/documentation/',
                destination: '/documentation/index.html',
            },
            {
                source: '/documentation/docs/:path*',
                destination: '/documentation/index.html',
            },
        ];
    },
};

export default nextConfig;
