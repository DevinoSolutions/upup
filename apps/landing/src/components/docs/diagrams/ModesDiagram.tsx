'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// Client mode vs server mode: two labelled rows sharing the same storage
// destination on the right. The accent (blue->teal) arrow marks the hop that
// actually carries the file bytes. Sized to fit the ~584px docs column.
export function ModesDiagram() {
    return (
        <DiagramFrame
            name="modes"
            label="Client mode vs server mode upload flow"
            width={570}
            minWidth={560}
            height={250}
        >
            {/* Client mode row */}
            <Muted
                x={10}
                y={30}
                anchor="start"
                size={11}
                opacity={0.7}
                weight={600}
            >
                Client mode
            </Muted>
            <Node x={10} y={45} width={100} height={48} label="Browser" />
            <Flow
                d="M110 69 L419 69"
                variant="accent"
                label="direct upload"
                labelX={265}
                labelY={59}
            />
            <Node
                x={425}
                y={45}
                width={130}
                height={48}
                label="S3-compatible"
                sub="storage"
            />

            {/* Server mode row */}
            <Muted
                x={10}
                y={150}
                anchor="start"
                size={11}
                opacity={0.7}
                weight={600}
            >
                Server mode
            </Muted>
            <Node x={10} y={165} width={100} height={48} label="Browser" />
            <Flow
                d="M110 189 L174 189"
                label="signed request"
                labelX={142}
                labelY={179}
            />
            <Node
                x={180}
                y={165}
                width={175}
                height={48}
                label="Your server"
                sub="@upupjs/server"
            />
            <Flow
                d="M355 189 L419 189"
                variant="accent"
                label="presigned PUT"
                labelX={387}
                labelY={179}
            />
            <Node
                x={425}
                y={165}
                width={130}
                height={48}
                label="S3-compatible"
                sub="storage"
            />
        </DiagramFrame>
    )
}
