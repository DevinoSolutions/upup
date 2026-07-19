import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'

const BAR_COUNT = 28

interface WaveState {
    raf: number
    ctx: AudioContext
    source: MediaStreamAudioSourceNode
    refCb: (el: Element | undefined) => void
}
const states = new WeakMap<MediaStream, WaveState>()

function start(stream: MediaStream, host: HTMLElement): void {
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
    const bars = Array.from(host.querySelectorAll<HTMLSpanElement>('span'))
    let raf: number
    const tick = () => {
        analyser.getByteFrequencyData(data)
        for (let i = 0; i < bars.length; i++) {
            const v = data[i % data.length] ?? 0
            const el = bars[i]
            if (el) el.style.height = `${6 + (v / 255) * 34}px`
        }
        raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const existing = states.get(stream)
    states.set(stream, {
        raf,
        ctx,
        source,
        refCb: existing?.refCb ?? (() => {}),
    })
}

function stop(stream: MediaStream): void {
    const s = states.get(stream)
    if (!s) return
    // Seeded-but-never-started state carries no audio nodes — just drop it.
    if (!s.ctx) {
        states.delete(stream)
        return
    }
    cancelAnimationFrame(s.raf)
    s.source.disconnect()
    void s.ctx.close()
    states.delete(stream)
}

function getRefCb(stream: MediaStream): (el: Element | undefined) => void {
    const existing = states.get(stream)
    if (existing) return existing.refCb
    const refCb = (el: Element | undefined) => {
        if (el) start(stream, el as HTMLElement)
        else stop(stream)
    }
    // Seed a placeholder so the cb identity is stable across renders for this stream.
    states.set(stream, {
        raf: 0,
        ctx: undefined as unknown as AudioContext,
        source: undefined as unknown as MediaStreamAudioSourceNode,
        refCb,
    })
    return refCb
}

/**
 * Live recording waveform (states-tour-3 state D): sky bars whose heights track
 * the microphone's live frequency data via a Web Audio AnalyserNode. Mirrors
 * React's AudioWaveform. This is the ONE place JS-driven visuals are sanctioned
 * — the bars render REAL audio data, not fx decoration, so they are NOT classed
 * `upup-fx-*` (the motion gate must not freeze live data) and the rAF read loop
 * is legitimate. Heights are written straight to the DOM. The AnalyserNode +
 * AudioContext are torn down on unmount.
 */
export function audioWaveform(stream: MediaStream): TemplateResult {
    const refCb = getRefCb(stream)
    return html`<div
        ${ref(refCb)}
        data-upup-slot="audio-waveform"
        aria-hidden="true"
        class="upup-flex upup-h-11 upup-items-center upup-justify-center upup-gap-[3px]"
    >
        ${Array.from({ length: BAR_COUNT }).map(
            () =>
                html`<span
                    class="upup-w-[3px] upup-flex-none upup-rounded-full upup-bg-[#38bdf8]"
                    style="height: 6px"
                ></span>`,
        )}
    </div>`
}
