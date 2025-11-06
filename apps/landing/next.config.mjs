/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    experimental: {
        optimizePackageImports: ['@stackblitz/sdk'],
    },
    transpilePackages: ['@stackblitz/sdk'],
    async rewrites() {
        return [
            {
                source: '/documentation/:path*',
                destination: '/documentation/index.html',
            },
        ];
    },
};

export default nextConfig;
