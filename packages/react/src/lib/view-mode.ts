/**
 * Above this many files the square-tile grid stops fitting the fixed-height
 * panel, so FileList FORCES the row list view and UploaderHeader hides the
 * grid/list toggle. At or below it, the user's viewMode toggle is honored.
 */
export const GRID_VIEW_MAX_FILES = 4

export function isListViewForced(fileCount: number): boolean {
    return fileCount > GRID_VIEW_MAX_FILES
}
