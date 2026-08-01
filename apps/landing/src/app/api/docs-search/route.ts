import { source } from '@/lib/docs/source'
import { createFromSource } from 'fumadocs-core/search/server'

// The landing app runs as a Node server (not a static export), so the plain
// dynamic GET is the right shape here — no staticGET/export() path needed.
export const { GET } = createFromSource(source)
