import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the AWS SDK external to the serverless function bundle (cold-start + correctness).
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  turbopack: { root: repoRoot },
}

export default nextConfig
