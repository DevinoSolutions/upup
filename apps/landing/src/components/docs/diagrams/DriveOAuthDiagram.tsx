'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// Cloud-drive OAuth then a server-side transfer: the user consents, the server
// exchanges the token, the user picks files, and the server streams the bytes
// straight to storage — they never pass through the browser (the accent hop).
export function DriveOAuthDiagram() {
    return (
        <DiagramFrame
            name="drive-oauth"
            label="Cloud-drive OAuth and transfer flow"
            minWidth={880}
            height={260}
        >
            <Node x={15} y={69} width={90} height={52} label="User" />
            <Flow d="M105 95 L136 95" />

            <Node
                x={140}
                y={69}
                width={140}
                height={52}
                label="OAuth popup"
                sub="provider consent"
            />
            <Flow d="M280 95 L311 95" />

            <Node
                x={315}
                y={69}
                width={140}
                height={52}
                label="token exchange"
                sub="server-side"
            />
            <Flow d="M455 95 L486 95" />

            <Node x={490} y={69} width={110} height={52} label="pick files" />
            <Flow
                d="M600 95 L686 95"
                variant="accent"
                label="server-side transfer"
                labelX={645}
                labelY={84}
            />
            <Node
                x={690}
                y={69}
                width={180}
                height={52}
                label="S3-compatible storage"
            />

            <Muted x={645} y={140} size={9} opacity={0.5}>
                file bytes never pass through the browser
            </Muted>
        </DiagramFrame>
    )
}
