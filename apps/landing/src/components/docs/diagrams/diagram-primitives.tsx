'use client'

import { createContext, useContext, useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Shared building blocks for the hand-crafted architecture diagrams. Every
// diagram wraps its nodes/flows in <DiagramFrame>, which owns the <svg>, the
// per-instance accent gradient + arrowheads, and the reduced-motion decision.
// Colour comes from `currentColor` (a gray that flips with the site theme); the
// ONE accent is the site's blue->teal gradient, fixed in both themes.

type DiagramCtx = {
    gradientId: string
    arrowId: string
    accentArrowId: string
    dangerArrowId: string
    reduce: boolean
}

const DiagramContext = createContext<DiagramCtx | null>(null)

function useDiagram(): DiagramCtx {
    const ctx = useContext(DiagramContext)
    if (!ctx) {
        throw new Error('Diagram primitives must render inside <DiagramFrame>')
    }
    return ctx
}

export function DiagramFrame({
    name,
    label,
    width,
    minWidth,
    height,
    children,
}: {
    name: string
    label: string
    // The intrinsic coordinate width (viewBox). Keep it at/under the ~584px
    // docs article column so the diagram renders 1:1 with no desktop h-scroll.
    width: number
    // CSS floor: below this the frame scrolls instead of squishing (mobile).
    minWidth: number
    height: number
    children: ReactNode
}) {
    const reduce = useReducedMotion() ?? false
    // useId() can contain ':' which is unsafe inside url(#...) references; strip it.
    const uid = useId().replace(/:/g, '')
    const gradientId = `upup-diagram-grad-${uid}`
    const arrowId = `upup-diagram-arrow-${uid}`
    const accentArrowId = `upup-diagram-arrow-accent-${uid}`
    const dangerArrowId = `upup-diagram-arrow-danger-${uid}`

    return (
        <DiagramContext.Provider
            value={{
                gradientId,
                arrowId,
                accentArrowId,
                dangerArrowId,
                reduce,
            }}
        >
            {/* minWidth keeps the diagram legible on mobile by scrolling inside
                this frame instead of squishing — the page body never scrolls
                sideways. */}
            <div className="not-prose my-8 overflow-x-auto">
                <svg
                    data-docs-diagram={name}
                    role="img"
                    aria-label={label}
                    viewBox={`0 0 ${width} ${height}`}
                    style={{ minWidth }}
                    className="h-auto w-full text-gray-700 dark:text-gray-300"
                >
                    <defs>
                        {/* userSpaceOnUse (not the default objectBoundingBox):
                            a perfectly horizontal path has a zero-height bbox,
                            which makes an objectBoundingBox gradient degenerate
                            and paint nothing. Spanning 0..width in user space
                            fixes that and lets each accent path pick up its
                            positional slice of the blue->teal sweep. */}
                        <linearGradient
                            id={gradientId}
                            gradientUnits="userSpaceOnUse"
                            x1={0}
                            y1={0}
                            x2={width}
                            y2={0}
                        >
                            <stop offset="0%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                        <marker
                            id={arrowId}
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path
                                d="M0 0 L10 5 L0 10 z"
                                fill="currentColor"
                                fillOpacity={0.45}
                            />
                        </marker>
                        <marker
                            id={accentArrowId}
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M0 0 L10 5 L0 10 z" fill="#14b8a6" />
                        </marker>
                        <marker
                            id={dangerArrowId}
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M0 0 L10 5 L0 10 z" fill="#ef4444" />
                        </marker>
                    </defs>
                    {children}
                </svg>
            </div>
        </DiagramContext.Provider>
    )
}

export function Node({
    x,
    y,
    width,
    height,
    label,
    sub,
}: {
    x: number
    y: number
    width: number
    height: number
    label: string
    sub?: string
}) {
    const cx = x + width / 2
    const cy = y + height / 2
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={8}
                fill="currentColor"
                fillOpacity={0.03}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth={1}
            />
            <text
                x={cx}
                y={sub ? cy - 5 : cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="currentColor"
                fontSize={11}
                className="font-sans"
            >
                {label}
            </text>
            {sub ? (
                <text
                    x={cx}
                    y={cy + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="currentColor"
                    fillOpacity={0.55}
                    fontSize={9}
                    className="font-sans"
                >
                    {sub}
                </text>
            ) : null}
        </g>
    )
}

// A muted, non-node text label — captions, badges, row headers.
export function Muted({
    x,
    y,
    children,
    size = 9,
    opacity = 0.55,
    anchor = 'middle',
    weight,
}: {
    x: number
    y: number
    children: ReactNode
    size?: number
    opacity?: number
    anchor?: 'start' | 'middle' | 'end'
    weight?: number
}) {
    return (
        <text
            x={x}
            y={y}
            textAnchor={anchor}
            fill="currentColor"
            fillOpacity={opacity}
            fontSize={size}
            fontWeight={weight}
            className="font-sans"
        >
            {children}
        </text>
    )
}

export function Flow({
    d,
    variant = 'default',
    dashed = false,
    delay = 0,
    label,
    labelX,
    labelY,
}: {
    d: string
    variant?: 'default' | 'accent' | 'danger'
    dashed?: boolean
    delay?: number
    label?: string
    labelX?: number
    labelY?: number
}) {
    const { gradientId, arrowId, accentArrowId, dangerArrowId, reduce } =
        useDiagram()

    const stroke =
        variant === 'accent'
            ? `url(#${gradientId})`
            : variant === 'danger'
              ? '#ef4444'
              : 'currentColor'
    const strokeOpacity = variant === 'default' ? 0.3 : 1
    const markerEnd =
        variant === 'accent'
            ? `url(#${accentArrowId})`
            : variant === 'danger'
              ? `url(#${dangerArrowId})`
              : `url(#${arrowId})`

    return (
        <g>
            {dashed ? (
                <motion.path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeDasharray="5 5"
                    markerEnd={markerEnd}
                    initial={reduce ? false : { strokeDashoffset: 0 }}
                    animate={
                        reduce ? undefined : { strokeDashoffset: [0, -20] }
                    }
                    transition={
                        reduce
                            ? undefined
                            : {
                                  duration: 0.9,
                                  ease: 'linear',
                                  repeat: Infinity,
                              }
                    }
                />
            ) : (
                <motion.path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    markerEnd={markerEnd}
                    initial={reduce ? false : { pathLength: 0 }}
                    whileInView={reduce ? undefined : { pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={
                        reduce
                            ? undefined
                            : { duration: 0.8, ease: 'easeOut', delay }
                    }
                />
            )}
            {label && labelX != null && labelY != null ? (
                <Muted x={labelX} y={labelY} size={10} opacity={0.6}>
                    {label}
                </Muted>
            ) : null}
        </g>
    )
}

export function CheckCircle({
    cx,
    cy,
    r = 9,
    delay = 0,
}: {
    cx: number
    cy: number
    r?: number
    delay?: number
}) {
    const { gradientId, reduce } = useDiagram()
    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={1.5}
            />
            <motion.path
                d={`M${cx - r * 0.42} ${cy} l${r * 0.32} ${r * 0.4} l${r * 0.6} -${r * 0.72}`}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? false : { pathLength: 0 }}
                whileInView={reduce ? undefined : { pathLength: 1 }}
                viewport={{ once: true }}
                transition={
                    reduce
                        ? undefined
                        : { duration: 0.4, ease: 'easeOut', delay }
                }
            />
        </g>
    )
}
