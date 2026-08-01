import { describe, it, expect } from 'vitest'
import {
    computeTilesPerRow,
    isListViewForced,
    FILE_TILE_MIN,
    FILE_TILE_GAP,
} from '../src/lib/view-mode'

describe('view-mode — adaptive grid→list rule', () => {
    it('computeTilesPerRow fits 160px min tiles + 16px gap into the width', () => {
        // one tile (160) fits; a second needs 160+16 more.
        expect(computeTilesPerRow(FILE_TILE_MIN)).toBe(1)
        expect(computeTilesPerRow(FILE_TILE_MIN * 2 + FILE_TILE_GAP)).toBe(2)
        expect(computeTilesPerRow(FILE_TILE_MIN * 3 + FILE_TILE_GAP * 2)).toBe(
            3,
        )
        // a hair under three tiles still only fits two.
        expect(
            computeTilesPerRow(FILE_TILE_MIN * 3 + FILE_TILE_GAP * 2 - 1),
        ).toBe(2)
    })

    it('computeTilesPerRow returns 0 for an unmeasured/invalid width', () => {
        expect(computeTilesPerRow(0)).toBe(0)
        expect(computeTilesPerRow(-50)).toBe(0)
        expect(computeTilesPerRow(Number.NaN)).toBe(0)
    })

    it('forces the list only when the file count exceeds the fitting tiles', () => {
        expect(isListViewForced(3, 3)).toBe(false)
        expect(isListViewForced(4, 3)).toBe(true)
        expect(isListViewForced(1, 1)).toBe(false)
    })

    it('never forces the list before the container is measured (tilesPerRow 0)', () => {
        expect(isListViewForced(50, 0)).toBe(false)
    })
})
