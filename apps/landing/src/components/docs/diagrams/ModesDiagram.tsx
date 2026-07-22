'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// Client mode vs server mode: two labelled rows sharing the same storage
// destination on the right. The accent (blue->teal) arrow marks the hop that
// actually carries the file bytes.
export function ModesDiagram() {
    return (
        <DiagramFrame
            name="modes"
            label="Client mode vs server mode upload flow"
            minWidth={880}
            height={260}
        >
            {/* Row captions */}
            <Muted
                x={12}
                y={69}
                anchor="start"
                size={11}
                opacity={0.7}
                weight={600}
            >
                Client mode
            </Muted>
            <Muted
                x={12}
                y={194}
                anchor="start"
                size={11}
                opacity={0.7}
                weight={600}
            >
                Server mode
            </Muted>

            {/* Client mode row */}
            <Node x={130} y={42} width={110} height={46} label="Browser" />
            <Flow
                d="M244 65 L654 65"
                variant="accent"
                label="direct upload"
                labelX={449}
                labelY={55}
            />
            <Node
                x={660}
                y={42}
                width={210}
                height={46}
                label="S3-compatible storage"
            />

            {/* Server mode row */}
            <Node x={130} y={167} width={110} height={46} label="Browser" />
            <Flow
                d="M244 190 L344 190"
                label="signed request"
                labelX={294}
                labelY={180}
            />
            <Node
                x={350}
                y={167}
                width={210}
                height={46}
                label="Your server"
                sub="@upupjs/server"
            />
            <Flow
                d="M564 190 L654 190"
                variant="accent"
                label="presigned PUT"
                labelX={609}
                labelY={180}
            />
            <Node
                x={660}
                y={167}
                width={210}
                height={46}
                label="S3-compatible storage"
            />
        </DiagramFrame>
    )
}
