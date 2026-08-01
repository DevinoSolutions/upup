'use client'

// ─────────────────────────────────────────────────────────────────────────────
// BeatChips — the interactive segment index under the hero animation. The scene
// itself stays passive (its taps are simulated), but these chips are REAL buttons
// that jump the loop straight to a beat and let it play from there: clicking one
// calls back with that beat's start timestamp, which HeroSession hands to the
// timeline's `seek`. While the loop plays, the chip whose segment is on screen is
// highlighted. They MUST live outside the aria-hidden scene root (they are
// genuine controls), so HeroSession renders them as a sibling of it. Flat
// hairline styling — the landing page's de-playful system, no gradients/glow.
// The "Screen share" chip carries a persistent Popular badge (flagship item).
// ─────────────────────────────────────────────────────────────────────────────

export interface BeatChip {
    id: string
    label: string
    /** Loop timestamp (seconds) this chip seeks to — a beat start. */
    seekTo: number
    /** Marks the flagship chip; shows a persistent "Popular" badge. */
    popular?: boolean
}

interface BeatChipsProps {
    beats: BeatChip[]
    /** Id of the chip whose segment is currently playing (null → none). */
    activeId: string | null
    /** Reduced motion / off-viewport: chips still render but seeking no-ops. */
    frozen: boolean
    onSelect: (seekTo: number) => void
}

export default function BeatChips({
    beats,
    activeId,
    frozen,
    onSelect,
}: BeatChipsProps) {
    return (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
            {beats.map(beat => {
                const active = beat.id === activeId
                return (
                    <button
                        key={beat.id}
                        type="button"
                        aria-label={`Play the ${beat.label} part of the demo`}
                        aria-disabled={frozen || undefined}
                        onClick={() => onSelect(beat.seekTo)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                            active
                                ? 'border-sky-500/60 bg-sky-500/[0.08] text-sky-600 dark:text-sky-300'
                                : 'border-black/10 text-gray-600 hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                        }`}
                    >
                        {beat.label}
                        {beat.popular && (
                            <span className="rounded-full bg-sky-500/15 px-1.5 text-[9px] font-semibold uppercase text-sky-600 dark:text-sky-300">
                                Popular
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
