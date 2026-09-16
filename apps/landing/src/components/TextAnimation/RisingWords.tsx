import type { CSSProperties } from 'react'

// RisingWords — the hero H1's per-word entrance.
//
// This replaces the old framer-motion `BlurText`, which rendered every word as
// a `motion.span` with an inline `opacity: 0` initial style behind an
// IntersectionObserver. That put the H1 — server-rendered, indexable text — at
// zero opacity in the HTML until framer had hydrated and the observer had
// fired, which on a throttled phone is seconds of pure render delay.
//
// Here the words are plain text nodes in the server HTML; a CSS keyframe
// (`.hero-word` in app/globals.css, with a per-word `--hero-delay`) animates
// them in. No framer, no observer, no `will-change`, and
// `prefers-reduced-motion: reduce` turns the animation off in the same
// stylesheet. The inter-word gap is a non-breaking space inside each word's
// span, exactly as before: the wrapper is a flex row, so a normal trailing
// space would collapse away between flex items.

export default function RisingWords({
    text,
    className = '',
    /** Per-word stagger, in milliseconds. */
    stagger = 60,
    /** Delay before the first word, in milliseconds. */
    startDelay = 0,
}: Readonly<{
    text: string
    className?: string
    stagger?: number
    startDelay?: number
}>) {
    const words = text.split(' ')

    return (
        <span className={`flex flex-wrap ${className}`}>
            {words.map((word, index) => (
                <span
                    // A headline repeats words, so the index has to be part of
                    // the key.
                    key={`${word}-${index}`}
                    className="hero-word"
                    style={
                        {
                            '--hero-delay': `${startDelay + index * stagger}ms`,
                        } as CSSProperties
                    }
                >
                    {word}
                    {index < words.length - 1 && '\u00A0'}
                </span>
            ))}
        </span>
    )
}
