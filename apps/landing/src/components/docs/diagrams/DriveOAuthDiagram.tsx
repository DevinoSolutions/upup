'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// Cloud-drive OAuth then a server-side transfer: the user consents, the server
// exchanges the token, the user picks files, and the server streams the bytes
// straight to storage — they never pass through the browser (the accent hop).
// Two rows joined by an S-curve so it fits the ~584px docs column.
export function DriveOAuthDiagram() {
    return (
        <DiagramFrame
            name="drive-oauth"
            label="Cloud-drive OAuth and transfer flow"
            width={565}
            minWidth={560}
            height={300}
        >
            {/* Row 1 — authenticate */}
            <Node x={15} y={40} width={80} height={52} label="User" />
            <Flow d="M95 66 L144 66" />

            <Node
                x={150}
                y={40}
                width={150}
                height={52}
                label="OAuth popup"
                sub="provider consent"
            />
            <Flow d="M300 66 L349 66" />

            <Node
                x={355}
                y={40}
                width={160}
                height={52}
                label="token exchange"
                sub="server-side"
            />

            {/* S-curve down to row 2 */}
            <Flow d="M435 92 C435 150, 70 150, 70 198" />

            {/* Row 2 — transfer */}
            <Node x={15} y={200} width={110} height={52} label="pick files" />
            <Flow
                d="M125 226 L389 226"
                variant="accent"
                label="server-side transfer"
                labelX={257}
                labelY={214}
            />
            <Node
                x={395}
                y={200}
                width={160}
                height={52}
                label="S3-compatible"
                sub="storage"
            />

            <Muted x={257} y={272} size={9} opacity={0.5}>
                file bytes never pass through the browser
            </Muted>
        </DiagramFrame>
    )
}
