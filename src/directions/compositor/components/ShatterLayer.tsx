// Shatter layer — canvasui Shatter around the windows layer.
// ARMED at all times: the cursor lens gently lifts live shards. Workspace switches
// run blast(): baseStrength sweeps 0 -> 1 (the whole desktop floats as refractive
// glass), the workspace swaps at peak, then it slams back to 0.
// Only active with html-in-canvas; the caller uses a CSS tumble fallback otherwise.

import { onMount, type ParentProps } from "solid-js"
import { createShatter, type ShatterInstance } from "../canvas/shatter"
import Capture from "./Capture"

export type BlastFn = (mid: () => void, done: () => void) => void

export default function ShatterLayer(props: ParentProps<{
  capture: boolean
  onReady: (blast: BlastFn) => void
}>) {
  let instance: ShatterInstance | null = null

  const blast: BlastFn = (mid, done) => {
    if (!instance) {
      mid()
      done()
      return
    }
    const inst = instance
    let raf = 0
    let swapped = false
    const t0 = performance.now()
    const UP = 420
    const DOWN = 620
    const tick = (now: number) => {
      const t = now - t0
      if (t < UP) {
        const k = t / UP
        inst.setOptions({ baseStrength: k * k, strength: 1 })
        raf = requestAnimationFrame(tick)
        return
      }
      if (!swapped) {
        swapped = true
        mid()
      }
      if (t < UP + DOWN) {
        const k = (t - UP) / DOWN
        const slam = 1 - k * k * (3 - 2 * k)
        inst.setOptions({ baseStrength: Math.max(0, slam), strength: 0.55 })
        raf = requestAnimationFrame(tick)
        return
      }
      inst.setOptions({ baseStrength: 0, strength: 0.55 })
      done()
    }
    raf = requestAnimationFrame(tick)
  }

  onMount(() => {
    props.onReady(blast)
  })

  return (
    <Capture
      enabled={props.capture}
      wrapperClass="absolute inset-0"
      contentClass="h-full w-full"
      onInit={(els) => {
        if (!props.capture) return
        instance = createShatter(els, {
          radius: 0.3,
          softness: 0.6,
          tileSize: 130,
          shards: 1,
          lift: 26,
          tilt: 2,
          scatter: 6,
          refraction: 1.4,
          dispersion: 0.3,
          shadow: 0.5,
          shading: 0.5,
          floatSpeed: 2,
          strength: 0.55,
          baseStrength: 0,
          followSpeed: 8,
          gapColor: [0.04, 0.04, 0.04],
        })
        if (!instance) return
        return () => {
          instance?.destroy()
          instance = null
        }
      }}
    >
      {props.children}
    </Capture>
  )
}
