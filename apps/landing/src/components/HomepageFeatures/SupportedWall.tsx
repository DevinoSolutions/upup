import React from 'react'
import Link from 'next/link'
import type { Integration } from './types'

/* Dense, calm logo wall — compact icon+name tiles on the raised surface with
   ONE shared "supported" affordance (a single caption, not a badge per card).
   Replaces the two 12/13-identical-card grids the audit flagged. */
const SupportedWall: React.FC<{ providers: Integration[] }> = ({
    providers,
}) => {
    const captionId = React.useId()
    return (
        <div className="mx-auto max-w-4xl">
            <p
                id={captionId}
                className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400"
            >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Supported today
            </p>
            <div
                role="list"
                aria-labelledby={captionId}
                className="flex flex-wrap justify-center gap-3"
            >
                {providers.map(provider => {
                    const card = (
                        <>
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/5 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-400">
                                <provider.icon
                                    className="h-5 w-5"
                                    aria-hidden
                                />
                            </span>
                            <span className="text-xs font-medium leading-tight text-gray-900 dark:text-white">
                                {provider.name}
                            </span>
                            {provider.qualifier ? (
                                <span className="text-[10px] leading-tight text-gray-500 max-lg:text-xs dark:text-gray-400">
                                    {provider.qualifier}
                                </span>
                            ) : null}
                        </>
                    )
                    const cardClass =
                        'flex h-full flex-col items-center gap-2.5 rounded-xl border border-black/5 bg-[var(--bg-base)] px-3 py-4 text-center dark:border-white/10'
                    return (
                        <div
                            key={provider.id}
                            role="listitem"
                            className="w-[120px]"
                        >
                            {provider.href ? (
                                <Link
                                    href={provider.href}
                                    className={`${cardClass} transition-colors hover:border-black/10 dark:hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                                >
                                    {card}
                                </Link>
                            ) : (
                                <div className={cardClass}>{card}</div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default SupportedWall
