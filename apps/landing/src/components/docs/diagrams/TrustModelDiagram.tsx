'use client'

// The server-mode trust model: a legitimate request is verified, size-bound and
// key-bound before an HMAC-signed presign; a forged request never gets past the
// server (red dashed -> 403). Sized to fit the ~584px docs column.
import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

export function TrustModelDiagram() {
    return (
        <DiagramFrame
            name="trust-model"
            label="Server-mode trust model"
            width={585}
            minWidth={560}
            height={300}
        >
            {/* Legitimate path */}
            <Node x={15} y={58} width={100} height={48} label="Browser" />
            <Flow
                d="M115 82 L174 82"
                label="metadata + intent"
                labelX={145}
                labelY={48}
            />

            <Node x={180} y={35} width={200} height={95} label="" />
            <Muted x={280} y={57} size={11} opacity={0.85}>
                @upupjs/server
            </Muted>
            <Muted x={280} y={80} size={9} opacity={0.55}>
                verify auth
            </Muted>
            <Muted x={280} y={98} size={9} opacity={0.55}>
                sign length
            </Muted>
            <Muted x={280} y={116} size={9} opacity={0.55}>
                bind key / uploadId
            </Muted>

            <Flow
                d="M380 82 L454 82"
                variant="accent"
                label="HMAC-signed presign"
                labelX={417}
                labelY={72}
            />
            <Node
                x={460}
                y={58}
                width={115}
                height={48}
                label="S3-compatible"
                sub="storage"
            />

            {/* Forged path */}
            <Node
                x={15}
                y={230}
                width={150}
                height={44}
                label="Forged request"
            />
            <Flow
                d="M165 252 L294 252"
                variant="danger"
                dashed
                label="no valid token"
                labelX={230}
                labelY={242}
            />
            <Node x={300} y={230} width={80} height={44} label="" />
            <g className="text-red-500">
                <Muted x={340} y={256} size={13} opacity={0.95} weight={600}>
                    403
                </Muted>
            </g>
        </DiagramFrame>
    )
}
