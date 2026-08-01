import React, { useEffect, useState } from 'react'
import { categories } from '../categories'
import { CategorySection } from './CategorySection'
import type { CategoryId } from '../types'

type Tier = 'simple' | 'advanced'
const TIER_KEY = 'upup-ie:sidebar-tier'

export function Sidebar({
    defaultExpanded,
    hiddenCategories = [],
}: {
    defaultExpanded: CategoryId[]
    hiddenCategories?: CategoryId[]
}) {
    const expandedSet = new Set(defaultExpanded)
    const [tier, setTier] = useState<Tier>('simple')
    const [hasLoadedSavedTier, setHasLoadedSavedTier] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = window.localStorage.getItem(TIER_KEY)
        setTier(saved === 'advanced' ? 'advanced' : 'simple')
        setHasLoadedSavedTier(true)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined' || !hasLoadedSavedTier) return
        window.localStorage.setItem(TIER_KEY, tier)
    }, [hasLoadedSavedTier, tier])

    const hiddenSet = new Set(hiddenCategories)
    const available = categories.filter(c => !hiddenSet.has(c.id))
    const visible = available.filter(c =>
        tier === 'advanced' ? true : c.tier === 'simple',
    )
    const hiddenCount = available.length - visible.length

    return (
        <aside className="upup-ie-sidebar">
            <div
                className="upup-ie-tier-toggle"
                role="tablist"
                aria-label="Sidebar depth"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={tier === 'simple'}
                    className={tier === 'simple' ? 'is-active' : ''}
                    onClick={() => setTier('simple')}
                >
                    Simple
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tier === 'advanced'}
                    className={tier === 'advanced' ? 'is-active' : ''}
                    onClick={() => setTier('advanced')}
                >
                    Advanced
                    {hiddenCount > 0 && tier === 'simple' && (
                        <span className="upup-ie-tier-count">
                            +{hiddenCount}
                        </span>
                    )}
                </button>
            </div>
            {visible.map(c => (
                <CategorySection
                    key={c.id}
                    category={c}
                    defaultExpanded={expandedSet.has(c.id)}
                />
            ))}
        </aside>
    )
}
