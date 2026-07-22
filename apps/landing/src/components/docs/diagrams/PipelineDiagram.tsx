'use client'

import { CheckCircle, DiagramFrame, Flow, Node } from './diagram-primitives'

// The client-side pipeline a file passes through before upload. Each connector
// draws in sequence (staggered delay) so the eye follows the order.
export function PipelineDiagram() {
    return (
        <DiagramFrame
            name="pipeline"
            label="What happens to a file before upload"
            minWidth={880}
            height={180}
        >
            <Node x={20} y={66} width={110} height={48} label="File" />
            <Flow d="M130 90 L166 90" delay={0} />

            <Node x={170} y={66} width={120} height={48} label="validate" />
            <Flow d="M290 90 L326 90" delay={0.15} />

            <Node
                x={330}
                y={66}
                width={160}
                height={48}
                label="compress / HEIC"
                sub="web worker"
            />
            <Flow d="M490 90 L526 90" delay={0.3} />

            <Node x={530} y={66} width={110} height={48} label="upload" />
            <Flow d="M640 90 L676 90" delay={0.45} />

            <Node x={680} y={66} width={140} height={48} label="done" />
            <CheckCircle cx={790} cy={90} r={8} delay={0.6} />
        </DiagramFrame>
    )
}
