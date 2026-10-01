import { Fragment, createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
    CheckCircle,
    DiagramFrame,
    Flow,
} from '@/components/docs/diagrams/diagram-primitives'

// #452: the docs diagrams drew no solid arrows or check marks for readers with
// prefers-reduced-motion. useReducedMotion() is null during SSR, so the server
// HTML always carried the pathLength:0 dash; a reduced-motion client then
// rendered `initial={false}` with no `whileInView`, leaving framer-motion no
// pathLength value to overwrite that dash with. These pins hold both halves of
// the fix: the server markup never depends on the preference, and reduced
// motion still reaches pathLength 1 (instantly) instead of skipping the draw.

type PathProps = Record<string, unknown>

const motionState = vi.hoisted(() => ({
    reduce: null as boolean | null,
    pathProps: [] as PathProps[],
}))

// Only two seams are replaced: the preference hook, and `motion.path`, which
// records the props each primitive hands framer-motion before rendering the
// real element — so the markup below is framer-motion's own SSR output.
vi.mock('framer-motion', async importOriginal => {
    const actual = await importOriginal<typeof import('framer-motion')>()
    const { createElement: h } = await import('react')
    const RealPath = actual.motion.path as unknown as (
        props: PathProps,
    ) => ReactElement
    const RecordedPath = (props: PathProps) => {
        motionState.pathProps.push(props)
        return h(RealPath, props)
    }
    return {
        ...actual,
        useReducedMotion: () => motionState.reduce,
        motion: new Proxy(actual.motion, {
            get: (target, key, receiver) =>
                key === 'path'
                    ? RecordedPath
                    : Reflect.get(target, key, receiver),
        }),
    }
})

const SOLID_D = 'M10 10 L190 10'
const DASHED_D = 'M10 50 L190 50'

function renderDiagram(reduce: boolean | null) {
    motionState.reduce = reduce
    motionState.pathProps = []
    const markup = renderToStaticMarkup(
        createElement(DiagramFrame, {
            name: 'reduced-motion-probe',
            label: 'Reduced-motion probe',
            width: 200,
            minWidth: 200,
            height: 100,
            children: createElement(
                Fragment,
                null,
                createElement(Flow, { d: SOLID_D, delay: 0.3 }),
                createElement(Flow, { d: DASHED_D, dashed: true }),
                createElement(CheckCircle, { cx: 100, cy: 80, delay: 0.5 }),
            ),
        }),
    )
    const recorded = motionState.pathProps
    const find = (match: (props: PathProps) => boolean): PathProps => {
        const props = recorded.find(match)
        if (!props) throw new Error('motion.path was not rendered')
        return props
    }
    return {
        markup,
        solid: find(p => p.d === SOLID_D),
        dashed: find(p => p.d === DASHED_D),
        check: find(p => p.strokeLinejoin === 'round'),
    }
}

describe('docs diagram primitives under reduced motion (#452)', () => {
    it('server markup is identical whatever the reduced-motion preference', () => {
        // null is what the server renders with; false/true are the two
        // clients that hydrate that HTML.
        const serverMarkup = renderDiagram(null).markup
        expect(serverMarkup).toContain('pathLength="1"')
        expect(renderDiagram(false).markup).toBe(serverMarkup)
        expect(renderDiagram(true).markup).toBe(serverMarkup)
    })

    it('reduced motion jumps solid flows and check marks to pathLength 1', () => {
        const { solid, check } = renderDiagram(true)
        for (const props of [solid, check]) {
            expect(props.initial).toEqual({ pathLength: 0 })
            expect(props.whileInView).toEqual({ pathLength: 1 })
            expect(props.transition).toEqual({ duration: 0 })
        }
    })

    it('without reduced motion solid flows and check marks still draw over time', () => {
        const { solid, check } = renderDiagram(false)
        expect(solid.whileInView).toEqual({ pathLength: 1 })
        expect(solid.transition).toEqual({
            duration: 0.8,
            ease: 'easeOut',
            delay: 0.3,
        })
        expect(check.whileInView).toEqual({ pathLength: 1 })
        expect(check.transition).toEqual({
            duration: 0.4,
            ease: 'easeOut',
            delay: 0.5,
        })
    })

    it('the dashed flow marches only without reduced motion', () => {
        expect(renderDiagram(true).dashed.animate).toBeUndefined()
        expect(renderDiagram(false).dashed.animate).toEqual({
            strokeDashoffset: [0, -20],
        })
    })
})
