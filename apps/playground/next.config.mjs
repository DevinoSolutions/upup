import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
    outputFileTracingRoot: repoRoot,
    transpilePackages: ['@upup/core', '@upup/react', '@upup/server', '@upup/interactive-example'],
    turbopack: {
        root: repoRoot,
    },
};

export default nextConfig;
