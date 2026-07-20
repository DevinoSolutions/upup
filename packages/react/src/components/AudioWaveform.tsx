import React, { useEffect, useRef } from 'react'

const BAR_COUNT = 28

/**
 * Live recording waveform (states-tour-3 state D): sky bars whose heights track
 * the microphone's live frequency data via a Web Audio AnalyserNode.
 *
 * This is the ONE place JS-driven visuals are sanctioned — the bars render REAL
 * audio data, not fx decoration, so (a) they are NOT classed `upup-fx-*` (the
 * motion gate must not freeze live data) and (b) the rAF read loop is
 * legitimate. Heights are written straight to the DOM (no per-frame React
 * render). The AnalyserNode + AudioContext are torn down on unmount/stop.
 */
export default function AudioWaveform({
    stream,
}: Readonly<{ stream: MediaStream }>): React.ReactElement {
    const barsRef = useRef<Array<HTMLSpanElement | null>>([])

    useEffect(() => {
        const AudioCtor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext
        if (!AudioCtor) return
        const ctx = new AudioCtor()
        // Autoplay policy may create the context suspended; without resuming,
        // getByteFrequencyData returns all-zeros and the bars silently flatline.
        void ctx.resume()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        let raf = 0
        const tick = () => {
            analyser.getByteFrequencyData(data)
            const bars = barsRef.current
            for (let i = 0; i < bars.length; i++) {
                const v = data[i % data.length] ?? 0
                const el = bars[i]
                if (el) el.style.height = `${6 + (v / 255) * 34}px`
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(raf)
            source.disconnect()
            void ctx.close()
        }
    }, [stream])

    return (
        <div
            data-upup-slot="audio-waveform"
            aria-hidden="true"
            className="upup-flex upup-h-11 upup-items-center upup-justify-center upup-gap-[3px]"
        >
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                    key={i}
                    ref={el => {
                        barsRef.current[i] = el
                    }}
                    className="upup-w-[3px] upup-flex-none upup-rounded-full upup-bg-[#38bdf8]"
                    style={{ height: '6px' }}
                />
            ))}
        </div>
    )
}
