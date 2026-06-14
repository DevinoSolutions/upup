import type { WorkerRequest, WorkerResponse, WorkerResult } from './protocol'
import { encodeImageFile, createThumbnail } from '../steps/image-utils'
import type { UploadFile } from '../contracts'
import { heicToJpegBlob } from '../steps/heic-decode'

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function asUploadFile(data: ArrayBuffer, mime: string, name: string): UploadFile {
  const file = new File([data], name, { type: mime })
  return Object.assign(file, { id: 'worker', metadata: {} }) as unknown as UploadFile
}

function jpegName(name: string): string {
  if (/\.(heic|heif)$/i.test(name)) return name.replace(/\.(heic|heif)$/i, '.jpg')
  return `${name}.jpg`
}

async function toImageResult(processed: UploadFile | null): Promise<Extract<WorkerResult, { kind: 'image' }> | null> {
  if (!processed) return null
  const bytes = await processed.arrayBuffer()
  return { kind: 'image', bytes, type: processed.type, name: processed.name, metadata: (processed.metadata ?? {}) as Record<string, unknown> }
}

export async function handleTask(req: WorkerRequest): Promise<WorkerResponse> {
  try {
    const params = req.params ?? {}
    const mime = params.mime || 'application/octet-stream'
    const name = params.name || 'file'

    switch (req.type) {
      case 'hash': {
        const checksum = await sha256Hex(req.data)
        return { id: req.id, ok: true, result: { kind: 'hash', checksum } }
      }

      case 'heic': {
        const blob = await heicToJpegBlob(new Blob([req.data], { type: mime }), { quality: 0.92 })
        if (!blob) return { id: req.id, ok: false, error: 'heic: no decode backend' }
        const bytes = await blob.arrayBuffer()
        return {
          id: req.id, ok: true,
          result: { kind: 'image', bytes, type: 'image/jpeg', name: jpegName(name), metadata: { heicConverted: true, originalSize: req.data.byteLength, processedSize: bytes.byteLength } },
        }
      }

      case 'exif': {
        const processed = await encodeImageFile(asUploadFile(req.data, mime, name), {
          type: mime || 'image/jpeg', quality: 0.92, metadata: { exifStripped: true },
        })
        const result = await toImageResult(processed)
        if (!result) return { id: req.id, ok: false, error: 'exif: encode failed' }
        result.metadata!.processedSize = result.bytes.byteLength
        return { id: req.id, ok: true, result }
      }

      case 'compress': {
        const file = asUploadFile(req.data, mime, name)
        const maxWidthOrHeight = params.maxWidthOrHeight ?? 1920
        const maxBytes = typeof params.maxSizeMB === 'number' ? params.maxSizeMB * 1024 * 1024 : undefined
        let quality = params.quality ?? 0.82
        let processed = await encodeImageFile(file, { maxWidthOrHeight, quality, metadata: { originalSize: req.data.byteLength, compressed: true } })
        while (processed && maxBytes && processed.size > maxBytes && quality > 0.35) {
          quality = Math.max(0.35, quality - 0.12)
          processed = await encodeImageFile(file, { maxWidthOrHeight, quality, metadata: { originalSize: req.data.byteLength, compressed: true } })
        }
        if (!processed) return { id: req.id, ok: false, error: 'compress: encode failed' }
        // Mirror compress.ts: if no size benefit and nothing was forced, keep the original bytes.
        if (processed.size >= req.data.byteLength && !maxBytes && !params.maxWidthOrHeight) {
          return { id: req.id, ok: true, result: { kind: 'image', bytes: req.data, type: mime, name, metadata: {} } }
        }
        const result = await toImageResult(processed)
        if (!result) return { id: req.id, ok: false, error: 'compress: encode failed' }
        result.metadata!.processedSize = result.bytes.byteLength
        return { id: req.id, ok: true, result }
      }

      case 'thumbnail': {
        const thumb = await createThumbnail(asUploadFile(req.data, mime, name), {
          width: params.maxWidthOrHeight, quality: params.quality,
        })
        if (!thumb) return { id: req.id, ok: false, error: 'thumbnail: failed' }
        const bytes = await thumb.file.arrayBuffer()
        return { id: req.id, ok: true, result: { kind: 'thumbnail', thumbnailUrl: thumb.dataUrl, bytes, type: thumb.file.type, name: thumb.file.name } }
      }

      default:
        return { id: req.id, ok: false, error: `unknown task type: ${(req as { type: string }).type}` }
    }
  } catch (e) {
    return { id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
