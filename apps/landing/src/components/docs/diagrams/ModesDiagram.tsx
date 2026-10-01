'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// Client mode vs server mode. The accent (blue->teal) arrow marks a hop that
// actually carries file bytes. In BOTH rows local-file bytes go straight from
// the browser to storage on a presigned URL; the server only signs it (the muted
// arc). Server mode adds the cloud-drive path: the server pulls the picked file
// and streams it into storage itself, so drive bytes never reach the browser.
// Sized to fit the ~584px docs column.
export function ModesDiagram() {
    return (
        <DiagramFrame
            name="modes"
            label="Client mode vs server mode upload flow: in both modes the browser uploads file bytes straight to storage on a URL your server signs; in server mode the server also streams cloud-drive files into storage"
            width={570}
            minWidth={560}
            height={330}
        >
            {/* Client mode row */}
            <Muted
                x={10}
                y={22}
                anchor="start"
                size={11}
                opacity={0.7}
                weight={600}
            >
                Client mode
            </Muted>
            <Node
                x={190}
                y={32}
                width={150}
                height={44}
                label="Your endpoint"
                sub="signs URLs"
            />
            <Node x={10} y={100} width={100} height={44} label="Browser" />
            <Flow
                d="M60 100 C60 54, 110 54, 184 54"
                label="presign"
                labelX={118}
                labelY={48}
            />
            <Flow
                d="M110 122 L419 122"
                variant="accent"
                label="PUT file bytes (presigned URL)"
                labelX={265}
                labelY={112}
            />
            <Node
                x={425}
                y={100}
                width={130}
                height={44}
                label="S3-compatible"
                sub="storage"
            />

            {/* Server mode row */}
            <Muted
                x={10}
                y={172}
                anchor="start"
                size={11}
                opacity={0.7}
                weight={600}
            >
                Server mode
            </Muted>
            <Node
                x={190}
                y={182}
                width={150}
                height={44}
                label="Your server"
                sub="@useupup/server"
            />
            <Node
                x={425}
                y={182}
                width={130}
                height={44}
                label="Cloud drive"
                sub="Google, OneDrive, …"
            />
            <Flow
                d="M425 204 L346 204"
                label="OAuth + pull"
                labelX={383}
                labelY={196}
            />
            <Node x={10} y={250} width={100} height={44} label="Browser" />
            <Flow
                d="M60 250 C60 204, 110 204, 184 204"
                label="presign"
                labelX={118}
                labelY={198}
            />
            <Flow
                d="M110 272 L419 272"
                variant="accent"
                label="PUT local file bytes (presigned URL)"
                labelX={265}
                labelY={262}
            />
            <Flow
                d="M300 226 C300 240, 470 234, 470 244"
                variant="accent"
                delay={0.3}
            />
            <Node
                x={425}
                y={250}
                width={130}
                height={44}
                label="S3-compatible"
                sub="storage"
            />

            <Muted x={285} y={318} size={9} opacity={0.5}>
                drive files stream server → storage and never pass through the
                browser
            </Muted>
        </DiagramFrame>
    )
}
