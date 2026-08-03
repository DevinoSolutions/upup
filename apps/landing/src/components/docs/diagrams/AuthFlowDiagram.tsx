'use client'

// The auth decision an upload request walks through: the optional coarse
// `auth` gate, then `getUserId` identity, then a presign whose upload token
// bakes in the resolved uid. Each rejection hangs off the stage that produces
// it (red). Sized to fit the ~584px docs column.
import { DiagramFrame, Flow, Muted, Node } from './diagram-primitives'

export function AuthFlowDiagram() {
    return (
        <DiagramFrame
            name="auth-flow"
            label="How an upload request resolves auth: the auth gate, getUserId identity, and the presign whose token binds the user id"
            width={585}
            minWidth={560}
            height={350}
        >
            {/* Main path, top to bottom */}
            <Node
                x={30}
                y={24}
                width={170}
                height={48}
                label="Upload request"
                sub="/presign · /multipart/init"
            />
            <Flow d="M115 76 L115 102" />

            <Node
                x={30}
                y={108}
                width={170}
                height={48}
                label="auth(req)"
                sub="optional coarse gate"
            />
            <Flow d="M115 160 L115 186" />
            <Muted x={124} y={178} anchor="start">
                authorized
            </Muted>

            <Node
                x={30}
                y={192}
                width={170}
                height={48}
                label="getUserId(req)"
                sub="optional identity"
            />
            <Flow d="M115 244 L115 270" variant="accent" />
            <Muted x={124} y={262} anchor="start">
                id returned
            </Muted>

            <Node
                x={30}
                y={276}
                width={170}
                height={48}
                label="Presign issued"
                sub="token binds uid"
            />

            {/* Rejections */}
            <Flow d="M200 48 L304 48" variant="danger" dashed />
            <Node x={310} y={24} width={245} height={48} label="" />
            <g className="text-red-500">
                <Muted x={432} y={44} size={11} opacity={0.95} weight={600}>
                    403 AUTH_REQUIRED
                </Muted>
            </g>
            <Muted x={432} y={60}>
                neither hook set, no anonymous opt-in
            </Muted>
            <Muted x={310} y={90} anchor="start">
                allowAnonymousUploads:true opens this path anyway
            </Muted>

            <Flow d="M200 132 L304 132" variant="danger" />
            <Node x={310} y={108} width={245} height={48} label="" />
            <g className="text-red-500">
                <Muted x={432} y={128} size={11} opacity={0.95} weight={600}>
                    401 Unauthorized
                </Muted>
            </g>
            <Muted x={432} y={144}>
                auth(req) returned false
            </Muted>

            <Flow d="M200 216 L304 216" variant="danger" />
            <Node x={310} y={192} width={245} height={48} label="" />
            <g className="text-red-500">
                <Muted x={432} y={212} size={11} opacity={0.95} weight={600}>
                    401 Unauthenticated
                </Muted>
            </g>
            <Muted x={432} y={228}>
                getUserId returned null
            </Muted>

            <Muted x={30} y={342} anchor="start">
                Every multipart continuation re-checks the caller against the
                bound uid — a mismatch is 403 AUTH_DENIED.
            </Muted>
        </DiagramFrame>
    )
}
