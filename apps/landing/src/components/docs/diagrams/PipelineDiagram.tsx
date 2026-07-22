'use client'

import { CheckCircle, DiagramFrame, Flow, Node } from './diagram-primitives'

// The client-side pipeline a file passes through before upload. Two rows joined
// by an S-curve so it fits the ~584px docs column; each connector draws in
// sequence (staggered delay) so the eye follows the order.
export function PipelineDiagram() {
    return (
        <DiagramFrame
            name="pipeline"
            label="What happens to a file before upload"
            width={520}
            minWidth={520}
            height={230}
        >
            {/* Row 1 */}
            <Node x={15} y={25} width={100} height={48} label="File" />
            <Flow d="M115 49 L164 49" delay={0} />

            <Node x={165} y={25} width={115} height={48} label="validate" />
            <Flow d="M280 49 L329 49" delay={0.15} />

            <Node
                x={330}
                y={25}
                width={175}
                height={48}
                label="compress / HEIC"
                sub="web worker"
            />

            {/* S-curve down to row 2 */}
            <Flow d="M417 73 C417 118, 220 105, 220 148" delay={0.3} />

            {/* Row 2 */}
            <Node x={165} y={150} width={110} height={48} label="upload" />
            <Flow d="M275 174 L329 174" delay={0.45} />

            <Node x={330} y={150} width={130} height={48} label="done" />
            <CheckCircle cx={430} cy={174} r={8} delay={0.6} />
        </DiagramFrame>
    )
}
