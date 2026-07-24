// plugged — a music-player app window for the curated IEM storefront.
// The product viewer is a Dithered Object: an IEM built from three.js
// primitives, rendered through a 1-bit Bayer dither. Drag to orbit.

import { createSignal, For, onCleanup, onMount } from "solid-js"
import { createDitheredIem, type DitheredIemInstance } from "../canvas/dithered-iem"

const IEMS = [
  { id: "zero2", name: "7Hz Salnotes Zero 2", price: "₮89,000", note: "the benchmark budget single DD" },
  { id: "chu2", name: "Moondrop Chu II", price: "₮79,000", note: "clean harman-ish daily driver" },
  { id: "hexa", name: "Truthear Hexa", price: "₮290,000", note: "1DD+3BA hybrid, studio-safe" },
]

export default function PluggedApp(props: { reduced: boolean }) {
  let canvas!: HTMLCanvasElement
  let instance: DitheredIemInstance | null = null
  const [selected, setSelected] = createSignal(IEMS[0])
  const [playing, setPlaying] = createSignal(true)

  onMount(() => {
    instance = createDitheredIem(canvas, {
      gridSize: 4,
      foreground: "#e5e5e5",
      background: "#0a0a0a",
      autoRotate: true,
      reducedMotion: props.reduced,
    })
    onCleanup(() => {
      instance?.destroy()
      instance = null
    })
  })

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] tracking-widest text-neutral-600 uppercase">
          plugged · iem shelf
        </span>
        <button
          type="button"
          class="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400 hover:border-rose-accent hover:text-rose-accent"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing() ? "⏸ pause" : "▶ play"}
        </button>
      </div>
      <div class="relative overflow-hidden rounded-lg border border-neutral-800 bg-black/40">
        <canvas
          ref={canvas}
          class="block h-[240px] w-full cursor-grab active:cursor-grabbing"
          aria-label="dithered IEM viewer — drag to orbit"
        />
        <span class="pointer-events-none absolute bottom-1.5 right-2 text-[9px] text-neutral-600">
          1-bit bayer · drag to orbit
        </span>
      </div>
      <div class="flex flex-col gap-1">
        <For each={IEMS}>
          {(iem) => (
            <button
              type="button"
              class={`flex items-baseline gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ${
                selected().id === iem.id
                  ? "border-rose-accent/50 bg-rose-accent/10"
                  : "border-neutral-800 bg-white/[0.02] hover:border-neutral-700"
              }`}
              onClick={() => setSelected(iem)}
            >
              <span class="flex-1 text-xs font-bold text-neutral-200">{iem.name}</span>
              <span class="text-[11px] text-rose-accent tabular-nums">{iem.price}</span>
            </button>
          )}
        </For>
      </div>
      <div class="text-[11px] text-neutral-500">
        {selected().note} · qpay at checkout · hybrid semantic search in the catalog
      </div>
    </div>
  )
}
