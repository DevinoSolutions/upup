// src/msw/handlers.ts
import { http, HttpResponse } from 'msw'

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string' || name.trim() === '') return 'file'
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, '-')
}

export const uploadHandlers = [
  http.post('*/api/upup-mock/presign', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const name = sanitizeName(body.name)
    const key = `mock/${name}`
    const origin = new URL(request.url).origin
    const uploadUrl = `${origin}/api/upup-mock/object/${key.split('/').map(encodeURIComponent).join('/')}`
    return HttpResponse.json({ key, uploadUrl, publicUrl: uploadUrl, expiresIn: 3600 })
  }),
  http.put('*/api/upup-mock/object/*', async ({ request }) => {
    await request.arrayBuffer().catch(() => undefined)
    return new HttpResponse(null, { status: 200 })
  }),
  http.options('*/api/upup-mock/object/*', () => new HttpResponse(null, { status: 204 })),
]
