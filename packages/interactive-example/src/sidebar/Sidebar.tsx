import React from 'react'
import { categories } from '../categories'
import { CategorySection } from './CategorySection'
import type { CategoryId } from '../types'

export function Sidebar({ defaultExpanded }: { defaultExpanded: CategoryId[] }) {
    const expandedSet = new Set(defaultExpanded)
    return (
        <aside className="upup-ie-sidebar">
            {categories.map((c) => (
                <CategorySection key={c.id} category={c} defaultExpanded={expandedSet.has(c.id)} />
            ))}
        </aside>
    )
}
