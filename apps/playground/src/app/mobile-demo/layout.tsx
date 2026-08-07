import type { Metadata } from 'next'

// page.tsx in this segment is a client component, so it cannot export metadata
// itself — this layout is the only place to give the mobile demo a title of its
// own. Without it the route inherited the root layout's verbatim, leaving two
// routes indistinguishable to a crawler (identical title, description, and h1).
export const metadata: Metadata = {
    title: 'upup Playground — mobile demo',
    description:
        'Chrome-free mobile viewport harness for the upup uploader, used to check touch targets and small-screen layout.',
}

export default function MobileDemoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
