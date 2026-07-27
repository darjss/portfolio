// Full-screen instrument overlay. With html-in-canvas the instrument
// assembles out of dust (adapted canvasui Particle Reveal); the pointer can
// disturb the dust while the transition runs. Without capture it is a plain,
// stable DOM view. The instrument itself is always flat, readable DOM.

import { createEffect, onCleanup, onMount } from "solid-js"
import { createDustTransition, type DustInstance } from "./canvas/DustVanilla"
import type { ModuleId } from "./data"
import CallrelayInstrument from "./instruments/Callrelay"
import HerdrInstrument from "./instruments/Herdr"
import HtmlThingInstrument from "./instruments/HtmlThing"
import { ErxesInstrument, GolomtInstrument } from "./instruments/Jobs"
import KhaanInstrument from "./instruments/Khaan"
import PluggedInstrument from "./instruments/Plugged"
import { InstrumentShell } from "./instruments/shell"
import SisiInstrument from "./instruments/Sisi"
import VitStoreInstrument from "./instruments/VitStore"

function Body(props: { id: ModuleId }) {
  switch (props.id) {
    case "vit-store":
      return <VitStoreInstrument />
    case "plugged":
      return <PluggedInstrument />
    case "callrelay":
      return <CallrelayInstrument />
    case "herdr-orchestrate":
      return <HerdrInstrument />
    case "khaan-client":
      return <KhaanInstrument />
    case "sisi-agent":
      return <SisiInstrument />
    case "html-thing":
      return <HtmlThingInstrument />
    case "erxes":
      return <ErxesInstrument />
    case "golomt":
      return <GolomtInstrument />
  }
}

export function InstrumentOverlay(props: {
  id: ModuleId
  /** Click point in client coords — the dust wave radiates from here. */
  origin: { x: number; y: number }
  capture: boolean
  closing: boolean
  onClose: () => void
  onClosed: () => void
}) {
  let wrap!: HTMLDivElement
  let source!: HTMLCanvasElement
  let content!: HTMLDivElement
  let output!: HTMLCanvasElement
  let instance: DustInstance | null = null
  let raf = 0
  let exited = false

  const animate = (from: number, to: number, dur: number, done: () => void) => {
    cancelAnimationFrame(raf)
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - t, 3)
      instance?.setOptions({ progress: from + (to - from) * e })
      if (t < 1) raf = requestAnimationFrame(step)
      else done()
    }
    raf = requestAnimationFrame(step)
  }

  onMount(() => {
    if (!props.capture) return
    source.setAttribute("layoutsubtree", "true")
    const rect = wrap.getBoundingClientRect()
    instance = createDustTransition(
      { source, content, output },
      {
        background: "#0a0a0e",
        radius: 240,
        softness: 0.7,
        size: 1.4,
        scatter: 70,
        drift: 0.9,
        aberration: 5,
        bend: 26,
        fade: 0.9,
        threshold: 0.08,
        progress: 0,
        origin: [props.origin.x - rect.left, props.origin.y - rect.top],
      },
    )
    if (!instance) return
    animate(0, 1, 1000, () => {})
  })

  createEffect(() => {
    if (props.closing && !exited) {
      exited = true
      if (instance) animate(1, 0, 550, () => props.onClosed())
      else props.onClosed()
    }
  })

  onCleanup(() => {
    cancelAnimationFrame(raf)
    instance?.destroy()
    instance = null
  })

  return (
    <div ref={wrap} class="fixed inset-0 z-50 bg-[#0a0a0e]">
      {props.capture ? (
        <div class="relative h-full w-full">
          <canvas
            ref={source}
            class="absolute inset-0 h-full w-full"
          >
            <div ref={content} class="h-full w-full">
              <InstrumentShell id={props.id} onClose={props.onClose}>
                <Body id={props.id} />
              </InstrumentShell>
            </div>
          </canvas>
          <canvas
            ref={output}
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        <div class="pb-fade-in h-full w-full">
          <InstrumentShell id={props.id} onClose={props.onClose}>
            <Body id={props.id} />
          </InstrumentShell>
        </div>
      )}
    </div>
  )
}
