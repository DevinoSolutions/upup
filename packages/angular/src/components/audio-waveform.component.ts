import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnDestroy,
    QueryList,
    ViewChildren,
} from '@angular/core'

const BAR_COUNT = 28

/**
 * Live recording waveform (port of AudioWaveform): sky bars whose heights track
 * the microphone's live frequency data via a Web Audio AnalyserNode.
 *
 * This is the ONE place JS-driven visuals are sanctioned — the bars render REAL
 * audio data, not fx decoration, so (a) they are NOT classed `upup-fx-*` (the
 * motion gate must not freeze live data) and (b) the rAF read loop is
 * legitimate. Heights are written straight to the DOM (no per-frame render).
 * The AnalyserNode + AudioContext are torn down on destroy.
 */
@Component({
    selector: 'upup-audio-waveform',
    standalone: true,
    template: `
        <div
            data-upup-slot="audio-waveform"
            aria-hidden="true"
            class="upup-flex upup-h-11 upup-items-center upup-justify-center upup-gap-[3px]"
        >
            @for (bar of bars; track $index) {
                <span
                    #bar
                    class="upup-w-[3px] upup-flex-none upup-rounded-full upup-bg-[#38bdf8]"
                    style="height: 6px"
                ></span>
            }
        </div>
    `,
})
export class AudioWaveformComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) stream!: MediaStream

    readonly bars = Array.from({ length: BAR_COUNT })
    @ViewChildren('bar') barEls!: QueryList<ElementRef<HTMLSpanElement>>

    private raf = 0
    private audioCtx: AudioContext | null = null
    private sourceNode: MediaStreamAudioSourceNode | null = null

    ngAfterViewInit(): void {
        const AudioCtor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext
        if (!AudioCtor) return
        this.audioCtx = new AudioCtor()
        // Autoplay policy may create the context suspended; without resuming,
        // getByteFrequencyData returns all-zeros and the bars silently flatline.
        void this.audioCtx.resume()
        this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream)
        const analyser = this.audioCtx.createAnalyser()
        analyser.fftSize = 64
        this.sourceNode.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        const els = this.barEls.toArray()
        const tick = (): void => {
            analyser.getByteFrequencyData(data)
            for (let i = 0; i < els.length; i++) {
                const v = data[i % data.length] ?? 0
                const el = els[i]?.nativeElement
                if (el) el.style.height = `${6 + (v / 255) * 34}px`
            }
            this.raf = requestAnimationFrame(tick)
        }
        this.raf = requestAnimationFrame(tick)
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.raf)
        this.sourceNode?.disconnect()
        void this.audioCtx?.close()
    }
}
