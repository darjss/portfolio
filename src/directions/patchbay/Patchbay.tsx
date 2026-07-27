// Patchbay — the projects themselves are the interface. Nine live hex modules
// float on a dark panel (canvasui Hex Float over live DOM): ledgers tick,
// boards update, inputs type while they float. Click dissolves a module to
// dust and reassembles it full-screen as a working instrument. Patch cables
// drag jack-to-jack and dock onto the real data flow between systems.

import {
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js"
import { profile } from "../../data/profile"
import { CableLayer, type Cable } from "./cables"
import { createHexFloat, type HexFloatInstance } from "./canvas/HexFloatVanilla"
import { prefersReducedMotion, supportsHtmlInCanvas } from "./canvas/support"
import { accentOf, flowText, MODULES, moduleById, type ModuleDef, type ModuleId } from "./data"
import { InstrumentOverlay } from "./InstrumentOverlay"
import {
  MiniCallrelay,
  MiniErxes,
  MiniGolomt,
  MiniHerdr,
  MiniHtmlThing,
  MiniKhaan,
  MiniPlugged,
  MiniSisi,
  MiniVitStore,
} from "./minis"
import "./patchbay.css"

function Mini(props: { id: ModuleId }): JSX.Element {
  switch (props.id) {
    case "vit-store":
      return <MiniVitStore />
    case "plugged":
      return <MiniPlugged />
    case "callrelay":
      return <MiniCallrelay />
    case "herdr-orchestrate":
      return <MiniHerdr />
    case "khaan-client":
      return <MiniKhaan />
    case "sisi-agent":
      return <MiniSisi />
    case "html-thing":
      return <MiniHtmlThing />
    case "erxes":
      return <MiniErxes />
    case "golomt":
      return <MiniGolomt />
  }
}

const HEX_CLIP =
  "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"
const HEX_CLIP_WIDE =
  "polygon(7% 0%, 93% 0%, 100% 50%, 93% 100%, 7% 100%, 0% 50%)"

export default function Patchbay() {
  const reduced = prefersReducedMotion()
  const capture = !reduced && supportsHtmlInCanvas()

  const [open, setOpen] = createSignal<ModuleId | null>(null)
  const [closing, setClosing] = createSignal(false)
  const [origin, setOrigin] = createSignal({ x: 0, y: 0 })
  const [cables, setCables] = createSignal<Cable[]>([])
  const [readout, setReadout] = createSignal<string | null>(null)
  const [armed, setArmed] = createSignal<{ from: ModuleId; x: number; y: number } | null>(null)
  const [rings, setRings] = createSignal<
    { id: number; x: number; y: number; accent: string }[]
  >([])

  let source!: HTMLCanvasElement
  let content!: HTMLDivElement
  let output!: HTMLCanvasElement
  let wrapper!: HTMLDivElement
  let disturb: (x: number, y: number, strength: number) => void = () => {}
  let ringId = 0
  const timers: number[] = []
  let armMove: ((e: PointerEvent) => void) | null = null
  let armUp: ((e: PointerEvent) => void) | null = null

  const toWrapper = (e: { clientX: number; clientY: number }) => {
    const r = wrapper.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  /* --- module open / close ------------------------------------------------ */
  const doOpen = (id: ModuleId, x: number, y: number) => {
    setOrigin({ x, y })
    setClosing(false)
    setOpen(id)
  }

  const openModule = (e: MouseEvent, id: ModuleId) => {
    const t = e.target as HTMLElement
    if (t.closest("input, button, a, textarea, select, [data-jack-module]")) return
    if (armed()) {
      setArmed(null)
      return
    }
    doOpen(id, e.clientX, e.clientY)
  }

  const openModuleKey = (id: ModuleId) => {
    if (armed()) setArmed(null)
    doOpen(id, window.innerWidth / 2, window.innerHeight / 2)
  }

  const requestClose = () => {
    if (capture) setClosing(true)
    else setOpen(null)
  }

  /* --- patch cables -------------------------------------------------------- */
  const dock = (from: ModuleId, to: ModuleId) => {
    const a = armed()
    setArmed(null)
    setCables((cs) =>
      cs.some((c) => c.from === from && c.to === to)
        ? cs
        : [...cs, { from, to }],
    )
    setReadout(flowText(from, to))
    disturb(a?.x ?? 0, a?.y ?? 0, 26)
  }

  const onJackDown = (e: PointerEvent, id: ModuleId) => {
    e.stopPropagation()
    e.preventDefault()
    const current = armed()
    if (current && current.from !== id) {
      // "this site" only has an input jack: it is always the destination.
      if (current.from === "site") dock(id, "site")
      else if (id === "site") dock(current.from, "site")
      else dock(current.from, id)
      return
    }
    if (current?.from === id) {
      setArmed(null)
      return
    }
    const start = { x: e.clientX, y: e.clientY }
    const pt = toWrapper(e)
    setArmed({ from: id, x: pt.x, y: pt.y })

    const move = (ev: PointerEvent) => {
      const p = toWrapper(ev)
      setArmed((a) => (a ? { ...a, x: p.x, y: p.y } : a))
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      armMove = null
      armUp = null
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const jack = el?.closest<HTMLElement>("[data-jack-module]")
      const target = jack?.dataset.jackModule as ModuleId | undefined
      const moved = Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8
      if (target === "site") dock(id, "site")
      else if (target && target !== id) dock(id, target)
      else if (moved) setArmed(null)
      // A plain click keeps the cable armed; the next jack click docks it.
    }
    armMove = move
    armUp = up
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const removeCable = (index: number) => {
    setCables((cs) => cs.filter((_, i) => i !== index))
    setReadout("cable unplugged")
  }

  /* --- tactile rings -------------------------------------------------------- */
  const spawnRing = (e: PointerEvent) => {
    if (armed()) setArmed(null)
    const p = toWrapper(e)
    disturb(p.x, p.y, 14)
    if (reduced) return
    const mod = (e.target as HTMLElement).closest<HTMLElement>("[data-module]")
    const accent = mod?.dataset.module
      ? moduleById(mod.dataset.module as ModuleId).accent
      : "#6a8aff"
    const id = ++ringId
    setRings((rs) => [...rs, { id, x: p.x, y: p.y, accent }])
    timers.push(
      window.setTimeout(
        () => setRings((rs) => rs.filter((r) => r.id !== id)),
        950,
      ),
    )
  }

  /* --- effect lifecycle ----------------------------------------------------- */
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (armed()) setArmed(null)
      else if (open() && !closing()) requestClose()
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
    onCleanup(() => {
      for (const t of timers) window.clearTimeout(t)
      if (armMove) window.removeEventListener("pointermove", armMove)
      if (armUp) window.removeEventListener("pointerup", armUp)
    })

    if (!capture) return
    source.setAttribute("layoutsubtree", "true")
    const instance: HexFloatInstance | null = createHexFloat(
      { source, content, output },
      {
        size: 175,
        gap: 5,
        bevel: 1.5,
        tilt: 14,
        perspective: 0.45,
        float: 0.55,
        speed: 0.8,
        shine: 0.55,
        lift: 0.3,
        radius: 850,
        flow: 1.4,
        swirl: 5,
        trail: 0.45,
        iridescence: 1,
        bloom: 0.25,
        grain: 0.5,
        gapColor: "auto",
      },
    )
    onCleanup(() => instance?.destroy())
  })

  const panel = (
    <div
      ref={content}
      class="relative h-full w-full overflow-auto bg-[#0a0a0e] font-mono text-neutral-200"
    >
      {/* ambient Melodrama wash */}
      <div
        class="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 12% 0%, rgb(42 74 138 / 0.16), transparent 70%), radial-gradient(55% 45% at 92% 100%, rgb(138 42 90 / 0.13), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div class="pb-scanlines pointer-events-none absolute inset-0" aria-hidden="true" />

      <div
        ref={wrapper}
        class="relative mx-auto flex min-h-full max-w-6xl flex-col px-6 py-5"
        onPointerDown={spawnRing}
      >
        <header class="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <a href="/" class="text-[12px] text-neutral-500 hover:text-neutral-200">
            darjs.dev
          </a>
          <button
            type="button"
            data-jack-module="site"
            data-jack-side="in"
            aria-label="patch into this site"
            class={`h-3.5 w-3.5 rounded-full border-2 bg-[#0a0a0e] ${
              armed()?.from === "site" ? "pb-jack-armed" : ""
            }`}
            style={{ "border-color": "#9ab8c8", cursor: "crosshair" }}
            onPointerDown={(e) => onJackDown(e, "site")}
          />
          <span class="text-[12px] text-neutral-600">/</span>
          <h1 class="text-[13px] tracking-[0.2em] text-neutral-200">PATCHBAY</h1>
          <span class="text-[10px] text-neutral-600">
            hover to read · click to open · drag jack to jack to patch
          </span>
          <span class="ml-auto text-[10px] text-neutral-500">
            {profile.fullName} · {profile.role.toLowerCase()}
          </span>
        </header>

        <div
          class="grid min-w-[680px] flex-1 grid-cols-6 gap-4"
          style={{ "grid-template-rows": "150px 235px 235px 175px" }}
        >
          <For each={MODULES}>
            {(def, i) => (
              <ModuleCard
                def={def}
                index={i()}
                onOpen={openModule}
                onOpenKey={openModuleKey}
                onJackDown={onJackDown}
                armedFrom={armed()?.from ?? null}
              />
            )}
          </For>
        </div>

        <div class="mt-4 flex items-center gap-3 border-t border-neutral-800/80 px-1 pt-2 text-[10px]">
          <span class="tracking-[0.25em] text-neutral-500">PATCH ▸</span>
          <span class={readout() ? "text-neutral-300" : "text-neutral-600"}>
            {readout() ??
              "no cables yet — drag from a module's jack onto another to see the real data flow"}
          </span>
          <span class="ml-auto text-neutral-600">
            {cables().length} cable{cables().length === 1 ? "" : "s"} · click a cable to unplug
          </span>
        </div>

        <CableLayer
          container={() => wrapper}
          cables={cables}
          armed={armed}
          accentOf={accentOf}
          reduced={reduced}
          onRemove={removeCable}
          disturbRef={(fn) => {
            disturb = fn
          }}
        />

        <For each={rings()}>
          {(r) => (
            <span
              class="pb-ring"
              style={{ left: `${r.x}px`, top: `${r.y}px`, "--accent": r.accent }}
            />
          )}
        </For>
      </div>
    </div>
  )

  return (
    <main
      class={`fixed inset-0 overflow-hidden bg-[#0a0a0e] ${reduced ? "" : "pb-motion"}`}
    >
      {capture ? (
        <div class="relative h-full w-full">
          <canvas
            ref={source}
            class="absolute inset-0 h-full w-full"
          >
            {panel}
          </canvas>
          <canvas
            ref={output}
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        panel
      )}

      <Show when={open()}>
        {(id) => (
          <InstrumentOverlay
            id={id()}
            origin={origin()}
            capture={capture}
            closing={closing()}
            onClose={requestClose}
            onClosed={() => {
              setOpen(null)
              setClosing(false)
            }}
          />
        )}
      </Show>
    </main>
  )
}

/* One floating hex module: drift wrapper, pulse wrapper, JS hover tilt,
   accent rim, live miniature, and two patch jacks. */
function ModuleCard(props: {
  def: ModuleDef
  index: number
  armedFrom: ModuleId | null
  onOpen: (e: MouseEvent, id: ModuleId) => void
  onOpenKey: (id: ModuleId) => void
  onJackDown: (e: PointerEvent, id: ModuleId) => void
}) {
  const [tilt, setTilt] = createSignal("")
  const wide = () => props.def.master === true || props.def.id === "html-thing"
  const clip = () => (wide() ? HEX_CLIP_WIDE : HEX_CLIP)
  const delay = () => `${(props.index * 0.9) % 7}s`
  const speed = () => `${8 + (props.index % 4)}s`

  const onMove = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    setTilt(
      `perspective(700px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 11).toFixed(2)}deg) scale(1.03)`,
    )
  }

  return (
    <div
      class="relative min-w-0"
      style={{ "grid-column": props.def.col, "grid-row": props.def.row }}
      data-module={props.def.id}
    >
      <div
        class="pb-drift h-full"
        style={{ "--drift-delay": delay(), "--drift-speed": speed() }}
      >
        <div
          class="pb-pulse h-full"
          style={{ "--accent": props.def.accent, "--pulse-delay": delay() }}
        >
          <div
            class="h-full cursor-pointer transition-transform duration-200 ease-out"
            style={{ transform: tilt() }}
            onPointerMove={onMove}
            onPointerLeave={() => setTilt("")}
            onClick={(e) => props.onOpen(e, props.def.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onOpenKey(props.def.id)
            }}
            aria-label={`open ${props.def.label}`}
          >
            <div
              class="relative h-full"
              style={{
                "clip-path": clip(),
                background: `color-mix(in srgb, ${props.def.accent} 32%, #101018)`,
              }}
            >
              <div
                class="absolute inset-[1.5px] flex flex-col justify-between overflow-hidden"
                style={{
                  "clip-path": clip(),
                  background: `linear-gradient(160deg, color-mix(in srgb, ${props.def.accent} 10%, #0c0c12), #0a0a0e 60%)`,
                  padding: wide() ? "14px 9%" : "32px 21%",
                }}
              >
                <div class="flex items-baseline justify-between gap-2">
                  <span
                    class="truncate text-[11px] tracking-wide"
                    style={{ color: props.def.accent }}
                  >
                    {props.def.label}
                  </span>
                  <span class="shrink-0 text-[8px] uppercase tracking-[0.2em] text-neutral-600">
                    {props.def.tag}
                  </span>
                </div>
                <div class="min-h-0 flex-1 py-1">
                  <Mini id={props.def.id} />
                </div>
                <span class="text-[8px] uppercase tracking-[0.2em] text-neutral-700">
                  open ▸
                </span>
              </div>

              {/* patch jacks: in (left), out (right) */}
              <button
                type="button"
                data-jack-module={props.def.id}
                data-jack-side="in"
                aria-label={`patch into ${props.def.label}`}
                class={`absolute left-[3px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-[#0a0a0e] ${
                  props.armedFrom === props.def.id ? "pb-jack-armed" : ""
                }`}
                style={{
                  "border-color": props.def.accent,
                  cursor: "crosshair",
                  "z-index": 2,
                }}
                onPointerDown={(e) => props.onJackDown(e, props.def.id)}
              />
              <button
                type="button"
                data-jack-module={props.def.id}
                data-jack-side="out"
                aria-label={`patch out of ${props.def.label}`}
                class={`absolute right-[3px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-[#0a0a0e] ${
                  props.armedFrom === props.def.id ? "pb-jack-armed" : ""
                }`}
                style={{
                  "border-color": props.def.accent,
                  cursor: "crosshair",
                  "z-index": 2,
                }}
                onPointerDown={(e) => props.onJackDown(e, props.def.id)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
