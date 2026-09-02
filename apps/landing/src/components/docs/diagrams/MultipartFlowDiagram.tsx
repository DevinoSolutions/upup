'use client'

// The server-mode multipart lifecycle: the browser drives every step against
// your server (init -> sign-part -> complete), but the part bytes never pass
// through it — they go straight to storage on presigned part URLs (the accent
// hop). Sized to fit the ~584px docs column.
import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

export function MultipartFlowDiagram() {
    return (
        <DiagramFrame
            name="multipart-flow"
            label="Server-mode multipart upload lifecycle"
            width={585}
            minWidth={560}
            height={300}
        >
            <Node x={8} y={14} width={104} height={44} label="Browser" />
            <Node
                x={222}
                y={14}
                width={156}
                height={44}
                label="Your server"
                sub="@useupup/server"
            />
            <Node
                x={468}
                y={14}
                width={110}
                height={44}
                label="S3-compatible"
                sub="storage"
            />

            {/* 1. init -> signed token */}
            <Flow
                d="M60 92 L294 92"
                label="POST /multipart/init"
                labelX={177}
                labelY={84}
            />
            <Flow
                d="M294 114 L66 114"
                label="key · uploadId · HMAC token"
                labelX={180}
                labelY={128}
            />

            {/* 2. sign each part */}
            <Flow
                d="M60 156 L294 156"
                label="POST /multipart/sign-part"
                labelX={177}
                labelY={148}
            />
            <Flow
                d="M294 178 L66 178"
                label="presigned URL for that part"
                labelX={180}
                labelY={192}
            />
            <Muted x={330} y={162} anchor="start">
                repeated per part —
            </Muted>
            <Muted x={330} y={176} anchor="start">
                the token carries key, uploadId
            </Muted>
            <Muted x={330} y={190} anchor="start">
                and the signed size envelope
            </Muted>

            {/* 3. the bytes: browser straight to storage */}
            <Flow
                d="M60 220 L510 220"
                variant="accent"
                label="PUT part bytes — never through your server"
                labelX={285}
                labelY={212}
            />

            {/* 4. complete */}
            <Flow
                d="M60 256 L294 256"
                label="POST /multipart/complete"
                labelX={177}
                labelY={248}
            />
            <Flow
                d="M306 256 L510 256"
                label="CompleteMultipartUpload"
                labelX={408}
                labelY={248}
            />

            <Muted x={8} y={288} anchor="start">
                Cancelled or failed runs end at POST /multipart/abort.
            </Muted>
        </DiagramFrame>
    )
}
