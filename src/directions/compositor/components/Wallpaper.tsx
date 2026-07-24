// Liquid wallpaper — canvasui Liquid over a static gradient wallpaper.
// The fluid runs in pure-WebGL fallback mode (no content capture), so it works in
// every WebGL2 browser. Pointer splats are fed from the desktop root so the dye
// keeps flowing even when the cursor travels over windows.

import { onCleanup, onMount } from "solid-js"
import { createLiquid, type LiquidInstance } from "../canvas/liquid"
import { albums } from "../../../data/taste"

// Loveless pink and nostalgia, ULTRA orange.
const PINK: [number, number, number] = [0.91, 0.63, 0.71]
const ORANGE: [number, number, number] = [0.91, 0.42, 0.16]

export interface WallpaperHandle {
  splat: (x: number, y: number, dx: number, dy: number, orange: boolean) => void
}

export default function Wallpaper(props: {
  reduced: boolean
  onReady: (handle: WallpaperHandle) => void
}) {
  let output!: HTMLCanvasElement

  onMount(() => {
    if (props.reduced) return
    const instance: LiquidInstance | null = createLiquid(
      {
        source: document.createElement("canvas"),
        content: output.parentElement as HTMLElement,
        output,
      },
      {
        simResolution: 128,
        dyeResolution: 512,
        densityDissipation: 0.965,
        velocityDissipation: 0.99,
        curl: 2.4,
        radius: 0.32,
        force: 1.15,
        intensity: 2.4,
        color: PINK,
        rainbow: false,
      },
    )
    if (!instance) return
    props.onReady({
      splat(x, y, dx, dy, orange) {
        instance.setOptions({ color: orange ? ORANGE : PINK })
        instance.splat(x, y, dx, dy)
      },
    })
    onCleanup(() => instance.destroy())
  })

  const loveless = albums[0].palette
  const ultra = albums[2].palette

  return (
    <div class="absolute inset-0 overflow-hidden" style={{ background: "#0a0a0a" }}>
      {/* static gradient wallpaper — the fallback is the whole design */}
      <div
        class="absolute inset-0"
        style={{
          background: `
            radial-gradient(60% 50% at 15% 85%, ${loveless[1]}55 0%, transparent 70%),
            radial-gradient(55% 45% at 85% 15%, ${ultra[1]}44 0%, transparent 70%),
            radial-gradient(40% 40% at 70% 80%, ${loveless[0]}22 0%, transparent 70%),
            linear-gradient(160deg, #0d0d10 0%, #0a0a0a 60%, #100a0c 100%)
          `,
        }}
      />
      <canvas ref={output} class="pointer-events-none absolute inset-0 h-full w-full" />
      <div class="pointer-events-none absolute right-6 bottom-20 text-right select-none">
        <div class="text-[11px] tracking-widest text-neutral-600 uppercase">
          steppe os · wayland · dankmaterialshell
        </div>
        <div class="mt-1 text-4xl font-bold text-neutral-800">darjs</div>
      </div>
    </div>
  )
}
