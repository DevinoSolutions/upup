/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

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
    async rewrites() {
        if (isDev) {
            return {
                beforeFiles: [
                    {
                        source: '/documentation',
                        destination: 'http://localhost:3002/documentation/',
                    },
                    {
                        source: '/documentation/:path*',
                        destination: 'http://localhost:3002/documentation/:path*',
                    },
                ],
                afterFiles: [],
                fallback: [],
            };
        }

        return {
            beforeFiles: [],
            afterFiles: [],
            fallback: [],
        };
    },
};

export default nextConfig;
