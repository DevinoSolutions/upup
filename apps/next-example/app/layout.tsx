import '@upupjs/next/styles'
import type { ReactNode } from 'react'

export const metadata = { title: 'upup/next example' }

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
