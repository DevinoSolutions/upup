'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// The run-level UploadStatus projection core emits on `state-change`. Top row is
// the happy path (IDLE -> PROCESSING -> UPLOADING -> SUCCESSFUL); the branch row
// is what an interruption or a terminal failure lands on, with the two recovery
// calls looping back into UPLOADING around the outside so no connector crosses.
// Sized to fit the ~584px docs column.
export function UploadLifecycleDiagram() {
    return (
        <DiagramFrame
            name="upload-lifecycle"
            label="Upload run status machine: IDLE to PROCESSING to UPLOADING to SUCCESSFUL, branching to PAUSED on pause and FAILED on error, with resume and retry returning to UPLOADING"
            width={576}
            minWidth={560}
            height={272}
        >
            {/* Happy path */}
            <Node x={40} y={56} width={62} height={46} label="IDLE" />
            <Flow
                d="M102 79 L147 79"
                delay={0}
                label="upload()"
                labelX={125}
                labelY={69}
            />

            <Node
                x={148}
                y={56}
                width={100}
                height={46}
                label="PROCESSING"
                sub="pipeline"
            />
            <Flow d="M248 79 L293 79" delay={0.15} />

            <Node
                x={294}
                y={56}
                width={96}
                height={46}
                label="UPLOADING"
                sub="transfer"
            />
            <Flow
                d="M390 79 L435 79"
                variant="accent"
                delay={0.3}
                label="all keys"
                labelX={412}
                labelY={69}
            />

            <Node
                x={436}
                y={56}
                width={92}
                height={46}
                label="SUCCESSFUL"
                sub="run done"
            />

            {/* Branch row */}
            <Flow
                d="M312 102 C312 145, 198 138, 198 175"
                delay={0.45}
                label="pause()"
                labelX={271}
                labelY={134}
            />
            <Node
                x={148}
                y={176}
                width={100}
                height={46}
                label="PAUSED"
                sub="requests aborted"
            />

            <Flow
                d="M372 102 C372 145, 440 138, 440 175"
                variant="danger"
                delay={0.45}
                label="error"
                labelX={466}
                labelY={130}
            />
            <Node
                x={390}
                y={176}
                width={100}
                height={46}
                label="FAILED"
                sub="run error"
            />

            {/* Recovery loops — routed around the outside, entering UPLOADING's
                top edge at two separate points so they never cross the
                downward branch connectors. */}
            <Flow
                d="M148 199 C82 199, 18 192, 18 132 C18 60, 24 32, 96 32 L300 32 C318 32, 322 40, 322 54"
                delay={0.6}
                label="resume()"
                labelX={54}
                labelY={116}
            />
            <Flow
                d="M490 199 C544 199, 556 192, 556 132 C556 60, 550 32, 478 32 L372 32 C354 32, 350 40, 350 54"
                delay={0.75}
                label="retry()"
                labelX={520}
                labelY={116}
            />

            <Muted x={40} y={246} anchor="start">
                cancel() returns the run — and every pending file — to IDLE.
            </Muted>
            <Muted x={40} y={260} anchor="start">
                READY is a per-file status only — the run projection never
                reports it.
            </Muted>
        </DiagramFrame>
    )
}
