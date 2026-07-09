import {
    createCanvas as createNapiCanvas,
    type Canvas as NapiCanvas,
    type SKRSContext2D,
} from '@napi-rs/canvas'
import { FileSource } from '../../src/types/file-source'
import { UploadStatus } from '../../src/types/upload-status'
import type {
    UploadFile,
    UploadFileMetadata,
} from '../../src/types/upload-file'

// Real image fixtures rendered by Skia (@napi-rs/canvas) — genuine encoded
// JPEG/PNG/WebP bytes, not stubs. The HEIC sample is the same 64x64 HEIF blob
// checked into storybook-config's fixtures (inlined here rather than imported
// so the core test tree stays inside its own rootDir).

// AUTO-GENERATED HEIC bytes — mirrors packages/storybook-config/src/fixtures/heicSample.ts.
export const HEIC_SAMPLE_BASE64 =
    'AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAVRtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAABeAABAAAAAAAAAB4AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABodmMxAAAAAA5waXRtAAAAAAABAAAA1GlwcnAAAAC1aXBjbwAAAHhodmNDAQNwAAAAAAAAAAAAHvAA/P34+AAADwNgAAEAGEABDAH//wNwAAADAJAAAAMAAAMAHroCQGEAAQArQgEBA3AAAAMAkAAAAwAAAwAeoCCBBZbqSSmubgIaDAgAAAMAyAAAAwAIQGIAAQAHRAHBcrAiQAAAABNjb2xybmNseAABAA0ABoAAAAAUaXNwZQAAAAAAAABAAAAAQAAAAA5waXhpAAAAAAEIAAAAF2lwbWEAAAAAAAAAAQABBIECAwQAAAAmbWRhdAAAABooAa8E+EEyacv/S7/5H9i13//vHhpPRxg2/A=='

function toBytes(buffer: Buffer): Uint8Array {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

export function buildHeicFile(name = 'sample.heic'): File {
    const bytes = toBytes(Buffer.from(HEIC_SAMPLE_BASE64, 'base64'))
    return new File([bytes], name, { type: 'image/heic' })
}

// Paints a deterministic, high-frequency scene: a diagonal gradient plus a
// dense colored-tile pattern. The detail matters — a flat fill would compress
// to almost nothing, hiding real size/quality differences.
function paintScene(ctx: SKRSContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#ff2d55')
    gradient.addColorStop(0.5, '#34c759')
    gradient.addColorStop(1, '#0a84ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const tile = 6
    for (let y = 0; y < height; y += tile) {
        for (let x = 0; x < width; x += tile) {
            const r = (x * 7 + y * 3) % 256
            const g = (y * 11 + 40) % 256
            const b = (x * 13 + y * 17) % 256
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
            ctx.fillRect(x, y, tile - 2, tile - 2)
        }
    }
}

function renderFile(
    width: number,
    height: number,
    encode: (canvas: NapiCanvas) => Buffer,
    name: string,
    type: string,
): File {
    const canvas = createNapiCanvas(width, height)
    const ctx = canvas.getContext('2d')
    paintScene(ctx, width, height)
    return new File([toBytes(encode(canvas))], name, { type })
}

export function createJpegFixture(width = 64, height = 64): File {
    return renderFile(
        width,
        height,
        canvas => canvas.toBuffer('image/jpeg', 92),
        'fixture.jpg',
        'image/jpeg',
    )
}

export function createPngFixture(width = 64, height = 64): File {
    return renderFile(
        width,
        height,
        canvas => canvas.toBuffer('image/png'),
        'fixture.png',
        'image/png',
    )
}

export function createWebpFixture(width = 64, height = 64): File {
    return renderFile(
        width,
        height,
        canvas => canvas.toBuffer('image/webp', 90),
        'fixture.webp',
        'image/webp',
    )
}

export function createLargeJpegFixture(width: number, height: number): File {
    return createJpegFixture(width, height)
}

// Promote a plain File to an UploadFile with the identity fields the pipeline
// reads/propagates (id/source/status/metadata).
export function asUploadFile(
    file: File,
    init: {
        id?: string
        source?: FileSource
        status?: UploadStatus
        metadata?: UploadFileMetadata
    } = {},
): UploadFile {
    return Object.assign(file, {
        id: init.id ?? 'fixture-1',
        source: init.source ?? FileSource.LOCAL,
        status: init.status ?? UploadStatus.IDLE,
        metadata: init.metadata ?? {},
    }) as UploadFile
}
