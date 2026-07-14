// src/msw/handlers.ts
import { http, HttpResponse, delay } from 'msw'

function sanitizeName(name: unknown): string {
    if (typeof name !== 'string' || name.trim() === '') return 'file'
    return name.trim().replace(/[^a-zA-Z0-9._-]/g, '-')
}

export const uploadHandlers = [
    http.post('*/api/upup-mock/presign', async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
            name?: string
        }
        const name = sanitizeName(body.name)
        const key = `mock/${name}`
        const origin = new URL(request.url).origin
        const uploadUrl = `${origin}/api/upup-mock/object/${key.split('/').map(encodeURIComponent).join('/')}`
        return HttpResponse.json({
            key,
            uploadUrl,
            publicUrl: uploadUrl,
            expiresIn: 3600,
        })
    }),
    http.put('*/api/upup-mock/object/*', async ({ request }) => {
        await request.arrayBuffer().catch(() => undefined)
        return new HttpResponse(null, { status: 200 })
    }),
    http.options(
        '*/api/upup-mock/object/*',
        () => new HttpResponse(null, { status: 204 }),
    ),
]

// ── Error / latency variants ─────────────────────────────────────────────────
// The success `uploadHandlers` above is the default wired in each storybook's
// preview. The sets below are opted into per-story (`parameters.msw.handlers`)
// to exercise the failure and in-flight states the UI must render — the paths
// otherwise only proven in Playwright. They reuse the SAME mock-api boundary
// (`/api/upup-mock/*`) MSW is designed to own.

// Presign responder identical to the success one — reused by the sets whose
// FAILURE is downstream (the PUT), so presign still yields a real object URL.
const presignOk = http.post('*/api/upup-mock/presign', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const name = sanitizeName(body.name)
    const key = `mock/${name}`
    const origin = new URL(request.url).origin
    const uploadUrl = `${origin}/api/upup-mock/object/${key.split('/').map(encodeURIComponent).join('/')}`
    return HttpResponse.json({
        key,
        uploadUrl,
        publicUrl: uploadUrl,
        expiresIn: 3600,
    })
})

const objectPreflight = http.options(
    '*/api/upup-mock/object/*',
    () => new HttpResponse(null, { status: 204 }),
)

// Presign succeeds; the object PUT returns 500 — the real downstream-failure
// path (bytes reach storage and are rejected). Drives the uploader to FAILED.
export const uploadErrorHandlers = [
    presignOk,
    http.put('*/api/upup-mock/object/*', async ({ request }) => {
        await request.arrayBuffer().catch(() => undefined)
        return new HttpResponse('mock storage failure', { status: 500 })
    }),
    objectPreflight,
]

// The upload never starts: the presign POST itself 500s. A distinct failure
// origin from `uploadErrorHandlers` (no object URL is ever issued).
export const presignErrorHandlers = [
    http.post(
        '*/api/upup-mock/presign',
        () => new HttpResponse('mock presign failure', { status: 500 }),
    ),
    objectPreflight,
]

// Presign succeeds; the object PUT resolves 200 only after a ~1.5s delay so the
// in-flight (UPLOADING) state and a progress frame are observable.
export const uploadSlowHandlers = [
    presignOk,
    http.put('*/api/upup-mock/object/*', async ({ request }) => {
        await request.arrayBuffer().catch(() => undefined)
        await delay(1500)
        return new HttpResponse(null, { status: 200 })
    }),
    objectPreflight,
]
