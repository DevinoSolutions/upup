import { z } from 'zod'

/**
 * Playground-facing subset of UpupConfig.
 *
 * Mirrors the fields the interactive-example sidebar exposes today. Kept
 * deliberately narrow so the agent has a small, well-documented surface to
 * target — adding a field here should be a conscious choice, not an
 * accident from upstream type drift.
 */

const SizeUnit = z.enum(['B', 'KB', 'MB', 'GB'])
const SizeValue = z.object({ size: z.number().nonnegative(), unit: SizeUnit })

const Source = z.enum([
    'local',
    'camera',
    'audio',
    'screen',
    'url',
    'google_drive',
    'onedrive',
    'dropbox',
    'box',
])

const Provider = z.enum([
    'aws',
    'azure',
    'backblaze',
    'digitalocean',
    'r2',
    'wasabi',
    'minio',
    'gcs',
    'supabase',
    'hetzner',
    'linode',
    'vultr',
    'upcloud',
    'scaleway',
    'ovhcloud',
    'alibaba',
    'oracle',
    'contabo',
    'storj',
    'idrive',
    'ceph',
])

const Theme = z.object({
    mode: z.enum(['light', 'dark', 'auto']).optional(),
    primary: z.string().optional(),
    radius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
})

const Resumable = z.object({
    mode: z.enum(['multipart', 'tus']).optional(),
    chunkSizeBytes: z.number().int().positive().optional(),
})

const ImageEditor = z.object({
    enabled: z.boolean().optional(),
    display: z.enum(['inline', 'modal']).optional(),
    autoOpen: z.enum(['never', 'single', 'all']).optional(),
})

export const UpupConfigSchema = z
    .object({
        provider: Provider.optional(),
        mode: z.enum(['client', 'server']).optional(),
        // Absolute URL OR relative path — the playground accepts both
        // (relative paths are common when proxying through the same origin).
        serverUrl: z.string().min(1).optional(),

        allowedFileTypes: z.string().optional(),
        maxFileSize: SizeValue.optional(),
        minFileSize: SizeValue.optional(),
        maxFiles: z.number().int().positive().optional(),
        maxRetries: z.number().int().nonnegative().optional(),

        sources: z.array(Source).optional(),
        resumable: Resumable.optional(),
        imageEditor: ImageEditor.optional(),
        theme: Theme.optional(),

        showBranding: z.boolean().optional(),
        locale: z.string().optional(),
    })
    .strict()

export type UpupConfig = z.infer<typeof UpupConfigSchema>

/**
 * Returns a stable, sorted JSON Schema string suitable for embedding in the
 * agent's system prompt. Anchored to the structure above so prompt drift
 * surfaces as a code change.
 */
export function renderSchemaForPrompt(): string {
    return JSON.stringify(
        {
            provider: 'one of: ' + Provider.options.join(', '),
            mode: 'client | server',
            serverUrl: 'string (URL) — only when mode=server',
            allowedFileTypes:
                'comma-separated MIME types or shorthand keys (images, videos, audio, documents)',
            maxFileSize: '{ size: number, unit: B|KB|MB|GB }',
            minFileSize: '{ size: number, unit: B|KB|MB|GB }',
            maxFiles: 'positive integer',
            maxRetries: 'non-negative integer',
            sources: 'array of: ' + Source.options.join(', '),
            resumable: '{ mode: multipart|tus, chunkSizeBytes?: number }',
            imageEditor:
                '{ enabled?: boolean, display?: inline|modal, autoOpen?: never|single|all }',
            theme: '{ mode?: light|dark|auto, primary?: hex, radius?: none|sm|md|lg|xl|full }',
            showBranding: 'boolean',
            locale: 'BCP-47 tag (e.g. en-US, fr-FR)',
        },
        null,
        2,
    )
}
