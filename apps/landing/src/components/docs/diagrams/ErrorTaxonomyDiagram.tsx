'use client'

import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

// The UpupError class tree: the base on top, its six subclasses on two bussed
// rows below (each labelled with the code it fixes), and the batch error kept
// visually apart because it extends plain Error, not UpupError. Sized to fit
// the ~584px docs column.
export function ErrorTaxonomyDiagram() {
    return (
        <DiagramFrame
            name="error-taxonomy"
            label="UpupError class taxonomy: the UpupError base and its six subclasses — UpupAuthError, UpupNetworkError, UpupValidationError, UpupQuotaError, UpupStorageError, UpupConfigError — plus UpupUploadBatchError, which extends Error and sits outside the taxonomy"
            width={564}
            minWidth={560}
            height={300}
        >
            <Node
                x={172}
                y={14}
                width={220}
                height={44}
                label="UpupError"
                sub="code · retryable · status?"
            />

            {/* Bus down the left of the base, branching to each row */}
            <Flow d="M190 58 L190 76 L99 76 L99 89" delay={0} />
            <Flow d="M190 76 L282 76 L282 89" delay={0.1} />
            <Flow d="M190 76 L465 76 L465 89" delay={0.2} />

            <Node
                x={14}
                y={90}
                width={170}
                height={44}
                label="UpupAuthError"
                sub="AUTH_PROVIDER_ERROR"
            />
            <Node
                x={197}
                y={90}
                width={170}
                height={44}
                label="UpupNetworkError"
                sub="NETWORK_ERROR · retryable"
            />
            <Node
                x={380}
                y={90}
                width={170}
                height={44}
                label="UpupValidationError"
                sub="the restriction reason"
            />

            <Flow d="M190 76 L190 150 L99 150 L99 163" delay={0.3} />
            <Flow d="M190 150 L282 150 L282 163" delay={0.4} />
            <Flow d="M190 150 L465 150 L465 163" delay={0.5} />

            <Node
                x={14}
                y={164}
                width={170}
                height={44}
                label="UpupQuotaError"
                sub="QUOTA_EXCEEDED"
            />
            <Node
                x={197}
                y={164}
                width={170}
                height={44}
                label="UpupStorageError"
                sub="STORAGE_ERROR"
            />
            <Node
                x={380}
                y={164}
                width={170}
                height={44}
                label="UpupConfigError"
                sub="NO_UPLOAD_TARGET"
            />

            <Muted x={14} y={236} anchor="start" size={10} weight={600}>
                Outside the taxonomy
            </Muted>
            <Node
                x={14}
                y={246}
                width={230}
                height={44}
                label="UpupUploadBatchError"
                sub="extends Error — no code"
            />
            <Muted x={258} y={264} anchor="start">
                The rejection from upload() itself.
            </Muted>
            <Muted x={258} y={278} anchor="start">
                Its errors[] holds the coded per-file failures.
            </Muted>
        </DiagramFrame>
    )
}
