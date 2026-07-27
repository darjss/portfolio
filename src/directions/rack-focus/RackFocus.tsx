import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { profile } from "../../data/profile"
import {
  createBubble,
  supportsHtmlInCanvas,
} from "./canvas/BubbleVanilla"
import { createClouds } from "./canvas/clouds"
import { createDroplets } from "./canvas/droplets"
import { matchWords, planeCount, planes, type Plane } from "./planes"
import "./rackfocus.css"

// Souvlaki teal at the front of the stack, Melodrama blue at the back.
const TEAL = [143, 184, 200] as const
const BLUE = [42, 74, 138] as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
) {
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`
}

function depthTint(index: number) {
  return mixRgb(TEAL, BLUE, clamp01(index / (planeCount - 1)))
}

function titleColor(index: number) {
  return mixRgb([232, 240, 242], TEAL, clamp01(index / (planeCount - 1)) * 0.55)
}

/** The typographic plate body — shared by the stack, the lens, and the fallback. */
function PlateBody(props: { plane: Plane; index: number }) {
  const tint = () => depthTint(props.index)
  return (
    <>
      <p
        class="text-[10px] uppercase tracking-[0.4em]"
        style={{ color: tint() }}
      >
        {props.plane.kicker} · {props.plane.date}
      </p>
      <h2
        class="mt-3 text-[clamp(2.6rem,8.5vw,9rem)] leading-[0.95] font-bold tracking-tight"
        style={{ color: titleColor(props.index) }}
      >
        {props.plane.title}
      </h2>
      <div class="mt-6 max-w-xl space-y-1.5 text-sm leading-relaxed text-neutral-300">
        <For each={props.plane.lines}>{(line) => <p>{line}</p>}</For>
      </div>
      <Show when={props.plane.stat}>
        {(stat) => (
          <p class="mt-6 flex items-baseline gap-3">
            <span class="text-4xl font-bold" style={{ color: tint() }}>
              {stat().value}
            </span>
            <span class="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
              {stat().label}
            </span>
          </p>
        )}
      </Show>
      <a
        class="mt-6 inline-block text-xs underline decoration-dotted underline-offset-4"
        style={{ color: tint(), cursor: "pointer" }}
        href={props.plane.link.href}
        target="_blank"
        rel="noreferrer"
      >
        {props.plane.link.label} ↗
      </a>
    </>
  )
}

/** One plate on the z-axis. Blur, scale, and drift all come from defocus distance. */
function Plate(props: { index: number; focus: () => number; mirror?: boolean }) {
  const d = () => props.focus() - props.index
  const ad = () => Math.abs(d())
  const blur = () => {
    if (props.mirror) return 0
    const b = Math.min(Math.max(ad() - 0.12, 0) * 7, 22)
    return b < 0.25 ? 0 : Math.round(b * 2) / 2
  }
  const opacity = () => {
    const base = 1 / (1 + Math.pow(ad(), 1.7) * 0.85)
    // inside the lens the same depth hierarchy stays, only sharper and
    // brighter, so ghosts can be peeked at without turning to mush
    return props.mirror ? Math.pow(base, 0.72) : base
  }
  const driftX = () => Math.sign(d()) * 2.2 * Math.sqrt(ad())
  const driftY = () => Math.sign(d()) * 0.9 * Math.sqrt(ad())
  return (
    <section
      class="rf-plate absolute inset-0 flex flex-col justify-center pl-[8vw] pr-[22vw]"
      aria-hidden={props.mirror === true || ad() > 2.5}
      style={{
        filter: blur() ? `blur(${blur()}px)` : "none",
        opacity: opacity().toFixed(3),
        transform: `translate3d(${driftX().toFixed(2)}vw, ${driftY().toFixed(2)}vh, 0) scale(${(1 - d() * 0.045).toFixed(3)})`,
        "transform-origin": "26% 50%",
        "z-index": 100 - Math.round(ad() * 10),
        "pointer-events": !props.mirror && ad() < 0.5 ? "auto" : "none",
      }}
    >
      <PlateBody plane={planes[props.index]} index={props.index} />
    </section>
  )
}

function Plates(props: { focus: () => number; mirror?: boolean }) {
  return (
    <For each={planes}>
      {(_, i) => <Plate index={i()} focus={props.focus} mirror={props.mirror} />}
    </For>
  )
}

/** Match-focus cuts: one shared word per plane pair, pinned to fixed screen
 *  coordinates. It never moves and never blurs — the world re-forms around it. */
function MatchWords(props: { focus: () => number }) {
  const ramp = (x: number) => clamp01(x / 0.45)
  return (
    <div class="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <For each={matchWords}>
        {(word, k) => {
          const opacity = () =>
            (
              ramp(props.focus() - (k() - 0.45)) *
              ramp(k() + 1.45 - props.focus())
            ).toFixed(3)
          return (
            <span
              class="absolute left-[8vw] text-xs uppercase tracking-[0.5em]"
              style={{
                top: k() % 2 === 0 ? "81%" : "88%",
                opacity: opacity(),
                color: depthTint(k() + 0.5),
                "text-shadow": "0 0 18px rgba(0,0,0,0.65)",
              }}
            >
              · {word} ·
            </span>
          )
        }}
      </For>
    </div>
  )
}

/** The persistent hairline scale: all nine planes plus the focal position. */
function Scale(props: { focus: () => number; onJump: (i: number) => void }) {
  return (
    <nav
      aria-label="focal planes"
      class="absolute right-4 top-1/2 z-[60] flex h-[62vh] -translate-y-1/2 flex-col justify-between md:right-6"
    >
      <div class="pointer-events-none absolute bottom-0 right-[5px] top-0 w-px bg-white/15" />
      <div
        class="pointer-events-none absolute right-[2px] h-[7px] w-[7px] rounded-full"
        style={{
          top: `calc(${(((props.focus() + 0.5) / planeCount) * 100).toFixed(2)}% - 3px)`,
          background: depthTint(props.focus()),
          "box-shadow": `0 0 10px ${depthTint(props.focus())}`,
        }}
      />
      <For each={planes}>
        {(plane, i) => {
          const near = () => Math.abs(props.focus() - i()) < 0.5
          return (
            <button
              type="button"
              class="relative flex flex-1 items-center justify-end gap-2 pr-4"
              style={{ cursor: "pointer" }}
              onClick={() => props.onJump(i())}
              aria-label={`pull focus to ${plane.title}`}
            >
              <span
                class="text-[9px] uppercase tracking-[0.25em] transition-opacity duration-300"
                style={{ opacity: near() ? 0.9 : 0, color: depthTint(i()) }}
              >
                {plane.id}
              </span>
              <span
                class="absolute right-0 h-px bg-white/40 transition-all duration-300"
                style={{
                  width: near() ? "18px" : "10px",
                  opacity: near() ? 1 : 0.45,
                }}
              />
            </button>
          )
        }}
      </For>
    </nav>
  )
}

function DepthField() {
  // The plates are always live DOM. Where Chrome's html-in-canvas exists, the
  // Bubble also refracts the defocused stack; elsewhere it is a soap-film
  // droplet over the same, fully readable DOM.
  const capture = supportsHtmlInCanvas()

  const [focus, setFocus] = createSignal(0)
  const [target, setTarget] = createSignal(0)
  const [interacted, setInteracted] = createSignal(false)

  let mainEl!: HTMLDivElement
  let sourceCanvas!: HTMLCanvasElement
  let canvasContent!: HTMLDivElement
  let plainContent!: HTMLDivElement
  let bubbleOutput!: HTMLCanvasElement
  let cloudsCanvas!: HTMLCanvasElement
  let dropletsCanvas!: HTMLCanvasElement

  const active = () => Math.min(Math.round(focus()), planeCount - 1)
  const clampTarget = (v: number) => Math.min(Math.max(v, 0), planeCount - 1)
  const jump = (i: number) => {
    setInteracted(true)
    setTarget(clampTarget(i))
  }

  const background = () => {
    const t = focus() / (planeCount - 1)
    const glow = mixRgb(TEAL, BLUE, clamp01(t)).replace("rgb", "rgba").replace(")", ",0.14)")
    return `radial-gradient(120% 90% at 70% 10%, ${glow}, transparent 62%), linear-gradient(180deg, #05080a 0%, #04060c 100%)`
  }

  onMount(() => {
    const cleanups: Array<() => void> = []

    // ——— the focus pull: long, patient, critically damped ease ———
    let raf = 0
    let last = performance.now()
    let lx = -600
    let ly = -600
    let tx = -600
    let ty = -600
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const f = focus()
      const t = target()
      const next = f + (t - f) * (1 - Math.exp(-dt * 2.6))
      if (Math.abs(next - f) > 0.0003) setFocus(next)
      else if (f !== t) setFocus(t)
      const k = 1 - Math.exp(-dt * 10)
      lx += (tx - lx) * k
      ly += (ty - ly) * k
      mainEl.style.setProperty("--lx", `${lx.toFixed(1)}px`)
      mainEl.style.setProperty("--ly", `${ly.toFixed(1)}px`)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    cleanups.push(() => cancelAnimationFrame(raf))

    // ——— wheel: one gesture, one plane ———
    let wheelAcc = 0
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setInteracted(true)
      wheelAcc += event.deltaY
      if (Math.abs(wheelAcc) > 80) {
        jump(Math.round(target()) + (wheelAcc > 0 ? 1 : -1))
        wheelAcc = 0
      }
    }
    mainEl.addEventListener("wheel", onWheel, { passive: false })
    cleanups.push(() => mainEl.removeEventListener("wheel", onWheel))

    // ——— touch: a continuous drag on the focus ring ———
    let touchY = 0
    let touchTarget = 0
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0].clientY
      touchTarget = target()
      setInteracted(true)
    }
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault()
      const dy = touchY - event.touches[0].clientY
      setTarget(clampTarget(touchTarget + dy * 0.006))
    }
    mainEl.addEventListener("touchstart", onTouchStart, { passive: true })
    mainEl.addEventListener("touchmove", onTouchMove, { passive: false })
    cleanups.push(() => {
      mainEl.removeEventListener("touchstart", onTouchStart)
      mainEl.removeEventListener("touchmove", onTouchMove)
    })

    // ——— keyboard ———
    const steps: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      PageDown: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
      PageUp: -1,
    }
    const onKey = (event: KeyboardEvent) => {
      const step = steps[event.key]
      if (step !== undefined) {
        event.preventDefault()
        jump(Math.round(target()) + step)
      } else if (event.key === "Home") {
        event.preventDefault()
        jump(0)
      } else if (event.key === "End") {
        event.preventDefault()
        jump(planeCount - 1)
      }
    }
    window.addEventListener("keydown", onKey)
    cleanups.push(() => window.removeEventListener("keydown", onKey))

    // ——— the lens follows the pointer ———
    const onPointerMove = (event: PointerEvent) => {
      tx = event.clientX
      ty = event.clientY
      if (lx < -100) {
        lx = tx
        ly = ty
      }
      mainEl.style.setProperty("--lens", "1")
    }
    const onPointerLeave = () => {
      mainEl.style.setProperty("--lens", "0")
    }
    mainEl.addEventListener("pointermove", onPointerMove, { passive: true })
    mainEl.addEventListener("pointerleave", onPointerLeave, { passive: true })
    cleanups.push(() => {
      mainEl.removeEventListener("pointermove", onPointerMove)
      mainEl.removeEventListener("pointerleave", onPointerLeave)
    })

    // ——— contained canvas layers: fog between planes, droplets on the lens ———
    const clouds = createClouds(cloudsCanvas, { focus, still: false })
    if (clouds) cleanups.push(clouds.destroy)
    const droplets = createDroplets(dropletsCanvas, {
      activity: () => clamp01(Math.abs(target() - focus()) * 1.4),
    })
    if (droplets) cleanups.push(droplets.destroy)

    // ——— Bubble: the metaball droplet that rides the cursor ———
    if (capture) sourceCanvas.setAttribute("layoutsubtree", "true")
    const bubble = createBubble(
      {
        source: capture ? sourceCanvas : document.createElement("canvas"),
        content: capture ? canvasContent : plainContent,
        output: bubbleOutput,
      },
      {
        size: 10,
        trail: 12,
        follow: 0.55,
        blend: 18,
        speed: 1.6,
        refraction: 64,
        dispersion: 0.9,
        shine: 0.5,
        rim: 0.7,
        iridescence: 0.9,
        intensity: 0.85,
        colorA: [0.561, 0.722, 0.784],
        colorB: [0.165, 0.29, 0.541],
        fallbackOpacity: 0.55,
      },
    )
    if (bubble) cleanups.push(() => bubble.destroy())

    onCleanup(() => {
      for (const cleanup of cleanups) cleanup()
    })
  })

  return (
    <main
      ref={mainEl}
      class="fixed inset-0 overflow-hidden font-mono"
      style={{ background: background(), cursor: "none" }}
    >
      {/* fog drifting at fixed depths between the planes */}
      <canvas
        ref={cloudsCanvas}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      {/* the nine plates, all on screen at once — the IA is depth */}
      <Show
        when={capture}
        fallback={
          <div ref={plainContent} class="absolute inset-0 z-10">
            <Plates focus={focus} />
          </div>
        }
      >
        <canvas
          ref={sourceCanvas}
          class="absolute inset-0 z-10 block h-full w-full"
        >
          <div ref={canvasContent} class="h-full w-full">
            <Plates focus={focus} />
          </div>
        </canvas>
      </Show>

      {/* the lens: a masked sharp duplicate — a circle of sharpness that
          cuts through the blur wherever the pointer goes */}
      <div
        class="rf-lens rf-lens-wrap pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
      >
        <Plates focus={focus} mirror />
      </div>
      <div
        class="rf-ring pointer-events-none fixed left-0 top-0 z-20 h-[264px] w-[264px] rounded-full"
        style={{
          border: "1px solid rgba(200,226,236,0.35)",
          background:
            "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.08), transparent 45%)",
        }}
        aria-hidden="true"
      />

      {/* match-focus cuts */}
      <MatchWords focus={focus} />

      {/* droplets on the lens while a pull is in flight */}
      <canvas
        ref={dropletsCanvas}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-40 h-full w-full"
      />

      {/* the Bubble metaball droplet */}
      <canvas
        ref={bubbleOutput}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-50 h-full w-full"
      />

      {/* chrome */}
      <header class="pointer-events-none absolute inset-x-0 top-0 z-[60] flex items-center justify-between p-5 text-[10px] uppercase tracking-[0.3em] text-neutral-400">
        <span>
          {profile.fullName} · {profile.name}
        </span>
        <span>rack focus · f/1.4</span>
      </header>

      <Scale focus={focus} onJump={jump} />

      <footer class="pointer-events-none absolute inset-x-0 bottom-0 z-[60] p-5">
        <p class="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
          plane {String(active() + 1).padStart(2, "0")} /{" "}
          {String(planeCount).padStart(2, "0")} — {planes[active()].title}
        </p>
        <Show when={!interacted()}>
          <p class="rf-hint absolute inset-x-0 bottom-5 text-center text-[10px] uppercase tracking-[0.3em] text-neutral-300">
            scroll to pull focus · the bubble cuts through the blur
          </p>
        </Show>
      </footer>
    </main>
  )
}

/** Fallback: a normal vertical scroll. Blur becomes a fade, the Bubble
 *  becomes a plain cursor, the scale stays pinned to the right edge. */
function FallbackDoc() {
  const [active, setActive] = createSignal(0)
  let listEl!: HTMLDivElement

  onMount(() => {
    const sections = Array.from(listEl.querySelectorAll("section"))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("rf-in")
            const index = sections.indexOf(entry.target as HTMLElement)
            if (index >= 0) setActive(index)
          }
        }
      },
      { threshold: 0.55 },
    )
    for (const section of sections) observer.observe(section)
    onCleanup(() => observer.disconnect())
  })

  const jump = (i: number) => {
    listEl
      .querySelectorAll("section")
      [i]?.scrollIntoView({ behavior: "auto", block: "start" })
  }

  return (
    <main
      class="min-h-full font-mono"
      style={{ background: "linear-gradient(180deg, #05080a, #04060c)" }}
    >
      <header class="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between p-5 text-[10px] uppercase tracking-[0.3em] text-neutral-400">
        <span>
          {profile.fullName} · {profile.name}
        </span>
        <span>rack focus</span>
      </header>

      <nav
        aria-label="focal planes"
        class="fixed right-4 top-1/2 z-40 flex h-[62vh] -translate-y-1/2 flex-col justify-between md:right-6"
      >
        <div class="pointer-events-none absolute bottom-0 right-[5px] top-0 w-px bg-white/15" />
        <div
          class="pointer-events-none absolute right-[2px] h-[7px] w-[7px] rounded-full transition-[top] duration-300"
          style={{
            top: `calc(${(((active() + 0.5) / planeCount) * 100).toFixed(2)}% - 3px)`,
            background: depthTint(active()),
          }}
        />
        <For each={planes}>
          {(plane, i) => (
            <button
              type="button"
              class="relative flex flex-1 items-center justify-end gap-2 pr-4"
              onClick={() => jump(i())}
              aria-label={`scroll to ${plane.title}`}
            >
              <span
                class="text-[9px] uppercase tracking-[0.25em] transition-opacity duration-300"
                style={{ opacity: active() === i() ? 0.9 : 0, color: depthTint(i()) }}
              >
                {plane.id}
              </span>
              <span
                class="absolute right-0 h-px bg-white/40 transition-all duration-300"
                style={{
                  width: active() === i() ? "18px" : "10px",
                  opacity: active() === i() ? 1 : 0.45,
                }}
              />
            </button>
          )}
        </For>
      </nav>

      <div ref={listEl}>
        <For each={planes}>
          {(plane, i) => (
            <section class="rf-section flex min-h-screen flex-col justify-center pl-[8vw] pr-[24vw]">
              <PlateBody plane={plane} index={i()} />
            </section>
          )}
        </For>
      </div>
    </main>
  )
}

export default function RackFocus() {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
  return (
    <Show when={!reducedMotion} fallback={<FallbackDoc />}>
      <DepthField />
    </Show>
  )
}
