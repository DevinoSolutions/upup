'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// The server-mode trust model: a legitimate request is verified, size-bound and
// key-bound before an HMAC-signed presign; a forged request never gets past the
// server (red dashed -> 403).
export function TrustModelDiagram() {
    return (
        <DiagramFrame
            name="trust-model"
            label="Server-mode trust model"
            minWidth={880}
            height={260}
        >
            {/* Legitimate path */}
            <Node x={20} y={61} width={120} height={48} label="Browser" />
            <Flow
                d="M140 85 L294 85"
                label="metadata + intent"
                labelX={217}
                labelY={75}
            />

            <Node x={300} y={40} width={260} height={90} label="" />
            <Muted x={430} y={62} size={11} opacity={0.85}>
                @upupjs/server
            </Muted>
            <Muted x={430} y={82} size={9} opacity={0.55}>
                verify auth
            </Muted>
            <Muted x={430} y={98} size={9} opacity={0.55}>
                sign length
            </Muted>
            <Muted x={430} y={114} size={9} opacity={0.55}>
                bind key / uploadId
            </Muted>

            <Flow
                d="M560 85 L694 85"
                variant="accent"
                label="HMAC-signed presign"
                labelX={627}
                labelY={75}
            />
            <Node
                x={700}
                y={61}
                width={168}
                height={48}
                label="S3-compatible storage"
            />

            {/* Forged path */}
            <Node
                x={20}
                y={188}
                width={150}
                height={44}
                label="Forged request"
            />
            <Flow
                d="M170 210 L294 210"
                variant="danger"
                dashed
                label="no valid token"
                labelX={232}
                labelY={200}
            />
            <Node x={300} y={188} width={90} height={44} label="" />
            <g className="text-red-500">
                <Muted x={345} y={214} size={13} opacity={0.95} weight={600}>
                    403
                </Muted>
            </g>
        </DiagramFrame>
    )
}
