// Minimal backend to issue S3 presigned upload URLs for local testing
// Uses env: S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_KEY_ID, S3_SECRET

/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express')
const cors = require('cors')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { v4: uuid } = require('uuid')
require('dotenv').config()

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(
    cors({
        origin: [/^http:\/\/localhost:\d+$/],
        credentials: false,
    }),
)

function getS3Client() {
    const endpoint = process.env.S3_ENDPOINT
    const region = process.env.S3_REGION || 'us-east-1'
    const accessKeyId = process.env.S3_KEY_ID
    const secretAccessKey = process.env.S3_SECRET
    if (
        !endpoint ||
        !process.env.S3_BUCKET ||
        !accessKeyId ||
        !secretAccessKey
    ) {
        throw new Error(
            'Missing S3 env vars (S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_KEY_ID, S3_SECRET)',
        )
    }
    return new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
    })
}

app.post('/api/upload', async (req, res) => {
    try {
        const { name, type, size } = req.body || {}
        console.log(
            `[api] /api/upload ← ${name || 'unknown'} (${type || 'n/a'}, ${
                typeof size === 'number' ? size : 'n/a'
            } bytes)`,
        )
        if (!name || !type || typeof size !== 'number') {
            return res.status(400).json({
                error: 'Invalid payload',
                details: 'name, type, size are required',
            })
        }

        const Bucket = process.env.S3_BUCKET
        const client = getS3Client()
        const Key = `${uuid()}-${name}`

        const command = new PutObjectCommand({
            Bucket,
            Key,
            ContentType: type,
            ContentLength: size,
        })

        const uploadUrl = await getSignedUrl(client, command, {
            expiresIn: 3600,
            signableHeaders: new Set(['content-type', 'content-length']),
        })

        // Construct a public URL (works if bucket/object is publicly readable)
        const base = process.env.S3_ENDPOINT?.replace(/\/$/, '')
        const publicUrl = `${base}/${Bucket}/${encodeURIComponent(Key)}`

        const payload = {
            key: Key,
            publicUrl,
            uploadUrl,
            expiresIn: 3600,
        }

        console.log(
            `[api] /api/upload → 200 key=${Key} url=${publicUrl.slice(
                0,
                60,
            )}...`,
        )
        return res.json(payload)
    } catch (e) {
        console.error('Upload token error:', e)
        return res.status(500).json({
            error: 'UPLOAD_TOKEN_ERROR',
            details: String(e?.message || e),
        })
    }
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
    console.log(`Upup dev backend listening on http://localhost:${PORT}`)
})
