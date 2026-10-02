import { describe, expect, it } from 'vitest'
import { noindexMiddleware } from './noindex.js'

function makeContext() {
    const sentHeaders: Record<string, string> = {}
    const order: string[] = []
    const ctx = {
        header: (name: string, value: string) => {
            order.push(`header:${name}`)
            sentHeaders[name] = value
        },
    }
    return { ctx, sentHeaders, order }
}

describe('noindexMiddleware', () => {
    it('sets x-robots-tag to noindex, nofollow', async () => {
        const { ctx, sentHeaders } = makeContext()

        await noindexMiddleware()(ctx, async () => {})

        expect(sentHeaders['x-robots-tag']).toBe('noindex, nofollow')
    })

    it('sets the header after the downstream handler ran, so it lands on the final response', async () => {
        const { ctx, order } = makeContext()

        await noindexMiddleware()(ctx, async () => {
            order.push('next')
        })

        expect(order).toEqual(['next', 'header:x-robots-tag'])
    })
})
