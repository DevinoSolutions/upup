/**
 * Grid-tile geometry. The grid lays tiles with
 * `repeat(auto-fit, minmax(FILE_TILE_MIN, 1fr))` and a FILE_TILE_GAP gap, so a
 * row fits floor((width + gap) / (min + gap)) tiles before it would wrap, and
 * the tiles STRETCH to fill the row (no dead columns). The force-list rule below
 * uses the SAME numbers so the grid never wraps: the moment one more tile would
 * spill to a second row, list mode is forced instead. Mirrors React's
 * lib/view-mode.
 */
export const FILE_TILE_MIN = 160
export const FILE_TILE_GAP = 16

/**
 * How many auto-fit tiles fit across `containerWidth` in a single row. A
 * non-positive / non-finite (unmeasured) width yields 0, which
 * isListViewForced reads as "not measured yet — don't force a switch".
 */
export function computeTilesPerRow(containerWidth: number): number {
    if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 0
    return Math.max(
        1,
        Math.floor(
            (containerWidth + FILE_TILE_GAP) / (FILE_TILE_MIN + FILE_TILE_GAP),
        ),
    )
}

/**
 * The square-tile grid is only honored when every tile fits in ONE row of the
 * fixed-height panel; past that the row list is FORCED and UploaderHeader hides
 * the grid/list toggle. `tilesPerRow <= 0` means the container has not been
 * measured yet — treated as "fits" so the first paint never flashes to list.
 */
export function isListViewForced(
    fileCount: number,
    tilesPerRow: number,
): boolean {
    if (tilesPerRow <= 0) return false
    return fileCount > tilesPerRow
}
