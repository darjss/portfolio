import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import { SourceCapture, supportsHtmlInCanvas } from "./canvas/capture"
import { createFrost, type FrostInstance } from "./canvas/FrostVanilla"
import { createMagnify, type MagnifyInstance } from "./canvas/MagnifyVanilla"
import LedgerContent from "./content"
import "./cold-storage.css"

const MELT_RADIUS_PX = 120
const PAGE_BG: [number, number, number] = [0xee, 0xf2, 0xf5]

interface HudReading {
  x: number
  y: number
  lines: string
}

function parseColor(value: string): [number, number, number, number] | null {
  const match = value.match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) {
    return null
  }
  return [parts[0], parts[1], parts[2], Number.isFinite(parts[3]) ? parts[3] : 1]
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

// The signature move: the loupe audits the page it floats over.
function measureElement(element: Element): string {
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)

  const fg = parseColor(style.color) ?? [0, 0, 0, 1]
  let bg: [number, number, number] = [...PAGE_BG]
  let depth = 0
  let node: Element | null = element
  let bgFound = false
  while (node) {
    depth += 1
    if (!bgFound) {
      const candidate = parseColor(getComputedStyle(node).backgroundColor)
      if (candidate && candidate[3] > 0) {
        bg = [candidate[0], candidate[1], candidate[2]]
        bgFound = true
      }
    }
    node = node.parentElement
  }

  const l1 = luminance([fg[0], fg[1], fg[2]])
  const l2 = luminance(bg)
  const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

  const classes =
    typeof element.className === "string"
      ? element.className.trim().split(/\s+/)[0]
      : ""
  const tag = element.tagName.toLowerCase()

  return (
    `${tag}${classes ? `.${classes}` : ""}\n` +
    `BOX ${rect.width.toFixed(1)} × ${rect.height.toFixed(1)} PX\n` +
    `FONT ${style.fontSize} / ${style.fontWeight}\n` +
    `CONTRAST ${contrast.toFixed(2)}:1\n` +
    `DEPTH ${String(depth).padStart(2, "0")}`
  )
}

export default function ColdStorage() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
  // ?force-frost exercises the WebGL path where the capture API is absent
  // (the frost then renders its icy fallback instead of frosted content).
  const forced = new URLSearchParams(window.location.search).has("force-frost")
  // The frozen archive needs live-DOM capture. Without it the visitor gets
  // the same ledger as a clean one-page engineering document at 15px.
  const frozen = !reducedMotion && (supportsHtmlInCanvas() || forced)

  const [spaceHeld, setSpaceHeld] = createSignal(false)
  const [latched, setLatched] = createSignal(false)
  const loupeOn = () => spaceHeld() || latched()
  const [hud, setHud] = createSignal<HudReading | null>(null)
  const [magnify, setMagnify] = createSignal<MagnifyInstance | null>(null)

  let wrap!: HTMLDivElement
  let source!: HTMLCanvasElement
  let contentEl!: HTMLDivElement
  let frostOut!: HTMLCanvasElement
  let lensOut!: HTMLCanvasElement
  let loupeBtn!: HTMLButtonElement

  createEffect(() => {
    magnify()?.setOptions({ enabled: loupeOn() })
    if (!loupeOn()) setHud(null)
  })

  onMount(() => {
    if (!frozen) return

    source.setAttribute("layoutsubtree", "true")
    const capture = new SourceCapture(source, contentEl)

    // A canvas is a replaced element: pin its box to the content height so
    // the wrapper (and both overlay canvases) always cover the full ledger.
    const syncSourceBox = () => {
      const height = contentEl.offsetHeight
      if (height > 0) source.style.height = `${height}px`
      capture.syncSize()
    }
    syncSourceBox()

    // ——— frost: the whole ledger under one pane of ice ———
    const frost: FrostInstance | null = createFrost(
      { source, content: contentEl, output: frostOut, capture },
      {
        frost: 0.3,
        strength: 0.85,
        contrast: 3,
        crispness: 1.2,
        highlight: 0.25,
        highlightStrength: 0.7,
        haze: 0.75,
        tintThin: [0.85, 0.89, 0.97],
        tintThick: [0.93, 0.96, 1.02],
        tintStrength: 0.55,
        saturation: 0.45,
        brightness: 1.04,
        refraction: 0.55,
        ior: 1.31,
        detail: 1.6,
        textureScale: 2,
        fresnel: 0.6,
        meltRadius: MELT_RADIUS_PX / Math.max(frostOut.clientHeight, 1),
        meltNoise: 0.16,
        meltStrength: 0.9,
        refreeze: 4, // a melt lives about four seconds
        meltEdges: true,
        introDuration: 0, // the page loads already frozen
        opacity: 0.97,
        shimmer: 0,
        quality: 0.75,
      },
    )

    // ——— magnify: the loupe, retracted until Space or the button ———
    const lens = createMagnify(
      { source, content: contentEl, output: lensOut, capture },
      {
        size: 110,
        zoom: 2.5,
        color: [0.32, 0.44, 0.58],
        follow: 1,
        hud: 0.9,
        ring: true,
        crosshair: true,
        ticks: true,
        brackets: false,
        dot: true,
        grid: false,
        readout: false, // the DOM HUD below replaces the stock readout
        aberration: 0.4,
        haze: 0,
        ripples: false,
        enabled: false,
      },
    )
    setMagnify(lens)

    const observer = new ResizeObserver(() => {
      syncSourceBox()
      frost?.setOptions({
        meltRadius: MELT_RADIUS_PX / Math.max(frostOut.clientHeight, 1),
      })
    })
    observer.observe(contentEl)

    // ——— hold Space to raise the loupe ———
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return
      const target = event.target
      if (target instanceof HTMLElement) {
        if (target === loupeBtn) return // the button handles its own toggle
        if (target.closest("input, textarea, [contenteditable]")) return
      }
      event.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)

    // ——— the loupe measures whatever it crosses ———
    let lastMeasure = 0
    const onPointerMove = (event: PointerEvent) => {
      if (!loupeOn()) return
      const now = performance.now()
      if (now - lastMeasure < 50) return
      lastMeasure = now
      const target = event.target
      if (!(target instanceof Element) || !contentEl.contains(target)) {
        setHud(null)
        return
      }
      const x =
        event.clientX > window.innerWidth - 200
          ? event.clientX - 190
          : event.clientX + 22
      const y =
        event.clientY > window.innerHeight - 130
          ? event.clientY - 130
          : event.clientY + 22
      setHud({ x, y, lines: measureElement(target) })
    }
    wrap.addEventListener("pointermove", onPointerMove, { passive: true })

    onCleanup(() => {
      observer.disconnect()
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      wrap.removeEventListener("pointermove", onPointerMove)
      frost?.destroy()
      lens?.destroy()
      setMagnify(null)
      capture.destroy()
    })
  })

  return (
    <main class="min-h-screen w-full bg-[#eef2f5]">
      <div ref={wrap} class="relative w-full">
        <Show
          when={frozen}
          fallback={
            <div ref={contentEl} class="w-full">
              <LedgerContent plain />
            </div>
          }
        >
          <canvas ref={source} class="block w-full">
            <div ref={contentEl} class="w-full">
              <LedgerContent plain={false} />
            </div>
          </canvas>
          <canvas
            ref={frostOut}
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 z-10 h-full w-full"
          />
          <canvas
            ref={lensOut}
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 z-20 h-full w-full"
          />
        </Show>
      </div>

      {/* ——— the loupe control ——— */}
      <Show when={frozen}>
        <button
          ref={loupeBtn}
          type="button"
          aria-pressed={latched()}
          onClick={() => setLatched((on) => !on)}
          class="cs-loupe-btn fixed right-4 bottom-4 z-50 border font-mono text-[9px] tracking-[0.25em]"
          classList={{
            "border-[#3d5270] bg-[#3d5270] text-[#eef2f5]": loupeOn(),
            "border-[#9db3c4] bg-[#eef2f5]/85 text-[#3d5270]": !loupeOn(),
          }}
          style={{ padding: "8px 12px" }}
        >
          ◎ LOUPE{loupeOn() ? " — ON" : ""}
          <span class="ml-2 opacity-60">HOLD SPACE</span>
        </button>

        {/* ——— the audit HUD: live metrics of whatever the lens crosses ——— */}
        <Show when={hud()}>
          {(reading) => (
            <div
              class="cs-hud font-mono"
              style={{
                left: `${reading().x}px`,
                top: `${reading().y}px`,
              }}
            >
              {reading().lines}
            </div>
          )}
        </Show>
      </Show>
    </main>
  )
}
