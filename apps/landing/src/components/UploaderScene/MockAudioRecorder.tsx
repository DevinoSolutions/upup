'use client'

import { motion } from 'framer-motion'
import { FaMicrophone, FaStop } from 'react-icons/fa'

// ─────────────────────────────────────────────────────────────────────────────
// MockAudioRecorder — the overlay the hero movie slides up when the "Audio"
// source is tapped: a mic chip, a live waveform, a running timer, and a round
// stop button. Fully controlled — the scene drives the elapsed `seconds` through
// timeline steps at 1s boundaries; there is NO Date.now()/setInterval here, so
// the timer stays in lockstep with the scripted beats. Bar heights come from an
// index-based formula (deterministic, no Math.random at render). The waveform
// animates only while the scene is live (`!reduce`); under reduce it holds static
// mid heights. Slots over the panel body inside MockUploader; the stop button is
// the cursor's tap target.
// ─────────────────────────────────────────────────────────────────────────────

interface MockAudioRecorderProps {
    /** Elapsed recording seconds — the scene advances this; drives the timer. */
    seconds: number
    /** Reduced-motion / off-screen: freeze the waveform at static heights. */
    reduce?: boolean
}

const BAR_COUNT = 24

function formatTime(total: number): string {
    const safe = Math.max(0, Math.floor(total))
    const m = Math.floor(safe / 60)
    const s = safe % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

export default function MockAudioRecorder({
    seconds,
    reduce = false,
}: MockAudioRecorderProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-5 overflow-hidden rounded-xl bg-[#0b1120] px-6 ring-1 ring-white/10">
            {/* Mic chip */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 ring-1 ring-purple-400/40">
                <FaMicrophone className="h-5 w-5 text-purple-300" />
            </div>

            {/* Waveform — deterministic per-bar heights, animated while live */}
            <div className="flex h-10 items-center gap-1">
                {Array.from({ length: BAR_COUNT }).map((_, i) => {
                    // Index-based height in [0.3, 1]; a smooth pseudo-random-looking
                    // envelope with no Math.random, so it's stable across renders.
                    const base = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.3))
                    return (
                        <motion.span
                            key={i}
                            className="h-full w-1 rounded-full bg-purple-300/80"
                            style={{ transformOrigin: 'center' }}
                            animate={
                                reduce
                                    ? { scaleY: base }
                                    : { scaleY: [base * 0.4, base, base * 0.4] }
                            }
                            transition={
                                reduce
                                    ? { duration: 0 }
                                    : {
                                          duration: 0.9,
                                          repeat: Infinity,
                                          ease: 'easeInOut',
                                          delay: (i % 6) * 0.08,
                                      }
                            }
                        />
                    )
                })}
            </div>

            {/* Timer — driven entirely by the `seconds` prop */}
            <span className="text-sm font-semibold tabular-nums text-white">
                {formatTime(seconds)}
            </span>

            {/* Stop button — the cursor's tap target */}
            <span
                data-scene-target="audio-stop"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_8px_20px_-6px_rgba(239,68,68,0.7)]"
            >
                <FaStop className="h-3.5 w-3.5" />
            </span>
        </div>
    )
}
