<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  const BAR_COUNT = 28

  /**
   * Live recording waveform (states-tour-3 state D): sky bars whose heights track
   * the microphone's live frequency data via a Web Audio AnalyserNode.
   *
   * This is the ONE place JS-driven visuals are sanctioned — the bars render REAL
   * audio data, not fx decoration, so (a) they are NOT classed `upup-fx-*` (the
   * motion gate must not freeze live data) and (b) the rAF read loop is
   * legitimate. Heights are written straight to the DOM (no per-frame render).
   * The AnalyserNode + AudioContext are torn down on unmount/stop.
   */
  let { stream }: { stream: MediaStream } = $props()

  const barEls: Array<HTMLSpanElement | null> = new Array(BAR_COUNT).fill(null)
  let raf = 0
  let audioCtx: AudioContext | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null

  onMount(() => {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtor) return
    audioCtx = new AudioCtor()
    // Autoplay policy may create the context suspended; without resuming,
    // getByteFrequencyData returns all-zeros and the bars silently flatline.
    void audioCtx.resume()
    sourceNode = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 64
    sourceNode.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < barEls.length; i++) {
        const v = data[i % data.length] ?? 0
        const el = barEls[i]
        if (el) el.style.height = `${6 + (v / 255) * 34}px`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })

  onDestroy(() => {
    cancelAnimationFrame(raf)
    sourceNode?.disconnect()
    void audioCtx?.close()
  })
</script>

<div
  data-upup-slot="audio-waveform"
  aria-hidden="true"
  class="upup-flex upup-h-11 upup-items-center upup-justify-center upup-gap-[3px]"
>
  {#each Array.from({ length: BAR_COUNT }) as _, i}
    <span
      bind:this={barEls[i]}
      class="upup-w-[3px] upup-flex-none upup-rounded-full upup-bg-[#38bdf8]"
      style="height: 6px"
    ></span>
  {/each}
</div>
