import { expect, test } from 'vitest'
import { TABS_IDS, TOOLS_IDS } from 'react-filerobot-image-editor/lib/utils/constants'
import { TABS, TOOLS } from '../filerobot-constants'

// react-filerobot-image-editor's root re-exports TABS = TABS_IDS, TOOLS = TOOLS_IDS
// (lib/index.d.ts). We compare against the pure-data constants module so the test
// never loads react/konva — the values are identical to the root export.
test('TABS mirror the real Filerobot tab identifiers exactly', () => {
  expect(TABS).toEqual(TABS_IDS)
})

test('TOOLS mirror the real Filerobot tool identifiers exactly', () => {
  expect(TOOLS).toEqual(TOOLS_IDS)
})
