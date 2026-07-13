// Deliberately a SERVER component (no 'use client' here). Importing <UpupUploader>
// from @upupjs/next and rendering it proves the 'use client' directive survived the
// package build — if it had been stripped, Next would throw "needs use client" at
// render. Server Components can only pass serializable props, so no function
// handlers here; the Pages Router demo (/pages-router) exercises callbacks.
import { UpupUploader } from '@upupjs/next'
import Link from 'next/link'

export default function Home() {
    return (
        <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
            <h1>@upupjs/next — App Router</h1>
            <p>
                Server-mode uploader talking to the App Router handler at{' '}
                <code>/api/upup</code>.
            </p>
            <UpupUploader mode="server" serverUrl="/api/upup" />
            <p style={{ marginTop: 24 }}>
                <Link href="/pages-router">→ Pages Router demo</Link>
            </p>
        </main>
    )
}
