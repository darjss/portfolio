// Overpressure — a dark maximalist pressure chamber.
// All seven projects and both jobs live on one symmetric wall, no scroll for
// the core content. Pointer movement pressurizes a canvasui Liquid fluid sim
// over a single shared live-DOM capture of the whole wall: move = chaos,
// stillness = clarity. Clicking a plate fires splat() with the plate's accent
// and the pigment floods into every plate that shares stack DNA. A 200ms
// Glitch-style burst masks plate open/close reflows. Blaze burns only on the
// erxes column — the currently hot job.

import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { prefersReducedMotion, supportsHtmlInCanvas } from "./canvas/support"
import { createLiquid, type LiquidInstance } from "./canvas/liquid"
import { createBlaze, type BlazeInstance } from "./canvas/blaze"
import { createIntro, type IntroHandle } from "./canvas/intro"
import { EDGES, neighborsOf, PLATES, projectOf, type PlateDef } from "./wall-data"
import { experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { socials } from "../../data/socials"

const PINK = "#e8a0b4"

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const edgeKey = (a: string, b: string) => [a, b].sort().join("|")
const accentOf = (slug: string) => PLATES.find((p) => p.slug === slug)!.accent

export default function Overpressure() {
  const reduced = prefersReducedMotion()
  const capture = !reduced && supportsHtmlInCanvas()

  const [phase, setPhase] = createSignal<"intro" | "wall">(
    reduced ? "wall" : "intro",
  )
  const [introFading, setIntroFading] = createSignal(false)
  const [expanded, setExpanded] = createSignal<string | null>(null)
  const [glitching, setGlitching] = createSignal(false)
  const [lit, setLit] = createSignal<ReadonlySet<string>>(new Set())
  const [centers, setCenters] = createSignal<Record<string, { x: number; y: number }>>({})
  const [blazeRect, setBlazeRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null)
  const [desktop, setDesktop] = createSignal(
    typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  )

  let wallWrap!: HTMLDivElement
  let source!: HTMLCanvasElement
  let wallContent!: HTMLDivElement
  let fallbackContent!: HTMLDivElement
  let output!: HTMLCanvasElement
  let blazeCanvas!: HTMLCanvasElement
  let introCanvas!: HTMLCanvasElement
  let erxesCol!: HTMLElement
  const plateEls = new Map<string, HTMLElement>()

  let liquid: LiquidInstance | null = null
  let blaze: BlazeInstance | null = null
  let blazeTried = false
  let intro: IntroHandle | null = null
  const timers: number[] = []
  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms))
  }

  const strongEdges = EDGES.filter((e) => e.strong)
  const weakEdges = EDGES.filter((e) => !e.strong)

  // ---- geometry -----------------------------------------------------------

  function measure() {
    if (!wallWrap) return
    const wrap = wallWrap.getBoundingClientRect()
    const next: Record<string, { x: number; y: number }> = {}
    for (const [slug, el] of plateEls) {
      const r = el.getBoundingClientRect()
      next[slug] = {
        x: r.left - wrap.left + r.width / 2,
        y: r.top - wrap.top + r.height / 2,
      }
    }
    setCenters(next)
    if (erxesCol) {
      const r = erxesCol.getBoundingClientRect()
      setBlazeRect({
        x: r.left - wrap.left,
        y: r.top - wrap.top,
        w: r.width,
        h: r.height,
      })
    }
    liquid?.resize()
    initBlaze()
  }

  // ---- pigment ------------------------------------------------------------

  function fireSplat(cx: number, cy: number, color: string, power: number) {
    if (!liquid) return
    const rect = output.getBoundingClientRect()
    if (rect.width === 0) return
    liquid.splat(
      cx / rect.width,
      1 - cy / rect.height,
      (Math.random() - 0.5) * power,
      (Math.random() - 0.5) * power,
      hexToRgb01(color),
    )
  }

  function splatPlate(slug: string, power: number, color = accentOf(slug)) {
    const c = centers()[slug]
    if (!c) return
    for (let i = 0; i < 3; i++) fireSplat(c.x, c.y, color, power)
  }

  function lightEdges(slug: string) {
    const keys = EDGES.filter((e) => e.a === slug || e.b === slug).map((e) =>
      edgeKey(e.a, e.b),
    )
    setLit((prev) => new Set([...prev, ...keys]))
    later(() => {
      setLit((prev) => {
        const next = new Set(prev)
        keys.forEach((k) => next.delete(k))
        return next
      })
    }, 1900)
  }

  // ---- plate activation ---------------------------------------------------

  function activate(slug: string) {
    if (!reduced) {
      setGlitching(true)
      later(() => setGlitching(false), 200)
    }
    setExpanded((current) => (current === slug ? null : slug))
    requestAnimationFrame(measure)

    splatPlate(slug, 60)
    lightEdges(slug)
    // Pigment physically travels to plates sharing real stack DNA — the
    // source plate's accent floods its neighbors.
    neighborsOf(slug)
      .filter((n) => n.strong)
      .forEach((n, i) => {
        later(() => splatPlate(n.slug, 28, accentOf(slug)), 160 + i * 110)
      })
  }

  // ---- blaze (erxes only, pure-WebGL overlay) ------------------------------

  function initBlaze() {
    if (blazeTried || reduced || !blazeCanvas || !erxesCol) return
    const r = blazeRect()
    if (!r || r.w < 4) return
    blazeTried = true
    blaze = createBlaze(
      {
        source: document.createElement("canvas"),
        content: erxesCol,
        output: blazeCanvas,
      },
      {
        height: 0.62,
        speed: 0.9,
        sparks: 1.2,
        sparkDensity: 1.4,
        sparkSize: 1.6,
        layers: 5,
        smoke: 0.5,
        glow: 2.2,
        sparkColor: [1, 0.45, 0.1],
        smokeColor: [1, 0.43, 0.12],
      },
    )
  }

  // ---- mount ---------------------------------------------------------------

  onMount(() => {
    const motionOk = !reduced

    if (motionOk) {
      liquid = createLiquid(
        capture
          ? { source, content: wallContent, output }
          : {
              source: document.createElement("canvas"),
              content: fallbackContent,
              output,
            },
        {
          simResolution: 128,
          dyeResolution: 512,
          densityDissipation: 0.965,
          velocityDissipation: 0.995,
          curl: 2.2,
          radius: 0.3,
          force: 1.2,
          intensity: capture ? 2 : 1.2,
          distortion: 0.5,
          blend: 5,
          color: hexToRgb01(PINK),
          rainbow: false,
        },
      )
    }

    // Intro particle object: scatter -> logotype -> detonation.
    if (phase() === "intro") {
      let cancelled = false
      document.fonts.ready.then(() => {
        if (cancelled) return
        intro = createIntro(introCanvas, "darjs", () => {
          setPhase("wall")
          // Detonation echo — pink pigment settles over the revealed wall.
          for (let i = 0; i < 5; i++) {
            later(() => {
              const rect = output.getBoundingClientRect()
              fireSplat(
                rect.width * (0.2 + Math.random() * 0.6),
                rect.height * (0.2 + Math.random() * 0.6),
                PINK,
                70,
              )
            }, i * 90)
          }
        })
        later(() => setIntroFading(true), 2100)
      })
      onCleanup(() => {
        cancelled = true
        intro?.destroy()
      })
    }

    // Loveless-pink bloom where the cursor first rests.
    if (motionOk && liquid) {
      let last: { x: number; y: number } | null = null
      let restTimer = 0
      let bloomed = false
      const onMove = (e: PointerEvent) => {
        if (bloomed) return
        const rect = wallWrap.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (last && Math.hypot(x - last.x, y - last.y) > 12) {
          window.clearTimeout(restTimer)
        }
        last = { x, y }
        window.clearTimeout(restTimer)
        restTimer = window.setTimeout(() => {
          if (bloomed || !last) return
          bloomed = true
          for (let i = 0; i < 3; i++) fireSplat(last.x, last.y, PINK, 50)
          wallWrap.removeEventListener("pointermove", onMove)
        }, 900)
      }
      wallWrap.addEventListener("pointermove", onMove)
      onCleanup(() => {
        wallWrap.removeEventListener("pointermove", onMove)
        window.clearTimeout(restTimer)
      })
    }

    const mq = window.matchMedia("(min-width: 1024px)")
    const onMq = () => {
      setDesktop(mq.matches)
      requestAnimationFrame(measure)
    }
    mq.addEventListener("change", onMq)

    const observer = new ResizeObserver(() => measure())
    observer.observe(wallWrap)
    document.fonts.ready.then(() => measure())
    later(measure, 60)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(null)
        requestAnimationFrame(measure)
      }
    }
    window.addEventListener("keydown", onKey)

    onCleanup(() => {
      mq.removeEventListener("change", onMq)
      observer.disconnect()
      window.removeEventListener("keydown", onKey)
      timers.forEach((t) => window.clearTimeout(t))
      liquid?.destroy()
      blaze?.destroy()
    })
  })

  createEffect(() => {
    expanded()
    requestAnimationFrame(measure)
  })

  // The blaze canvas only exists after the first measure publishes its rect.
  createEffect(() => {
    blazeRect()
    initBlaze()
  })

  // ---- wall content ---------------------------------------------------------

  const erxes = experience[0]
  const golomt = experience[1]

  function JobColumn(props: { live: boolean }) {
    const job = props.live ? erxes : golomt
    return (
      <aside
        ref={props.live ? (el) => (erxesCol = el) : undefined}
        class={`relative flex flex-col border p-3 ${
          props.live
            ? "border-orange-900/70 bg-[#120c08]"
            : "border-neutral-800 bg-[#0d0d10]"
        }`}
      >
        <div class="flex items-center justify-between text-[9px] tracking-widest text-neutral-600 uppercase">
          <span>{props.live ? "current" : "legacy"}</span>
          <Show when={props.live}>
            <span class="op-live flex items-center gap-1 text-orange-400">
              <span class="op-live-dot inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
              live
            </span>
          </Show>
        </div>
        <div
          class={`mt-3 text-5xl leading-none font-bold tracking-tighter xl:text-6xl ${
            props.live ? "text-orange-400" : "text-neutral-200"
          }`}
        >
          {props.live ? "25k+" : "3"}
        </div>
        <div class="mt-1 text-[9px] tracking-wider text-neutral-500 uppercase">
          {props.live ? "organizations run the platform" : "payment features · nationwide"}
        </div>
        <h2
          class={`mt-4 text-lg font-bold ${
            props.live ? "text-orange-200" : "text-neutral-100"
          }`}
        >
          {job.company}
        </h2>
        <div class="text-[10px] text-neutral-400">{job.role}</div>
        <div class="text-[10px] text-neutral-600">{job.period}</div>
        <p class="mt-3 text-[10px] leading-relaxed text-neutral-500">
          {job.context}
        </p>
        <ul class="mt-auto space-y-2 pt-3">
          <For each={job.highlights}>
            {(h) => (
              <li class="border-l border-neutral-800 pl-2 text-[9px] leading-snug text-neutral-400">
                {h}
              </li>
            )}
          </For>
        </ul>
      </aside>
    )
  }

  function Plate(props: { plate: PlateDef; index: number }) {
    const project = () => projectOf(props.plate.slug)
    const open = () => expanded() === props.plate.slug
    return (
      <article
        ref={(el) => plateEls.set(props.plate.slug, el)}
        role="button"
        tabIndex={0}
        aria-expanded={open()}
        onClick={() => activate(props.plate.slug)}
        onKeyDown={(e) => {
          if (e.key === "Enter") activate(props.plate.slug)
        }}
        class={`relative flex cursor-pointer flex-col overflow-hidden border bg-[#0d0d10]/95 p-3 transition-colors ${
          open()
            ? "border-neutral-500"
            : "border-neutral-800 hover:border-neutral-600"
        }`}
        style={{
          "border-top": `2px solid ${props.plate.accent}`,
          ...(desktop()
            ? expanded()
              ? open()
                ? { "grid-column": "1 / -1", order: "-1" }
                : { "grid-column": "span 2" }
              : {
                  "grid-column": props.plate.col,
                  "grid-row": String(props.plate.row),
                }
            : {}),
        }}
      >
        <div class="flex items-baseline justify-between text-[9px] tracking-widest text-neutral-600 uppercase">
          <span>{String(props.index + 1).padStart(2, "0")}</span>
          <span>{project().featured ? "featured" : "archive"}</span>
        </div>
        <div
          class="mt-2 text-5xl leading-none font-bold tracking-tighter xl:text-6xl"
          style={{ color: props.plate.accent }}
        >
          {props.plate.numeral}
        </div>
        <div class="mt-1 text-[9px] tracking-wider text-neutral-500 uppercase">
          {props.plate.caption}
        </div>
        <h3 class="mt-3 text-base leading-tight font-bold text-neutral-100">
          {project().name}
        </h3>
        <p class="mt-1 line-clamp-2 text-[10px] leading-snug text-neutral-400">
          {project().pitch}
        </p>

        <Show when={open()}>
          <div class="mt-3 grid gap-3 overflow-y-auto border-t border-neutral-800 pt-3 md:grid-cols-2">
            <div>
              <div class="text-[9px] tracking-widest text-neutral-600 uppercase">
                dossier
              </div>
              <p class="mt-1 text-[10px] leading-relaxed text-neutral-400">
                {project().description}
              </p>
              <div class="mt-2 flex flex-wrap gap-1">
                <For each={project().stack}>
                  {(item) => (
                    <span
                      class="border px-1.5 py-0.5 text-[9px] text-neutral-300"
                      style={{ "border-color": `${props.plate.accent}55` }}
                    >
                      {item}
                    </span>
                  )}
                </For>
              </div>
            </div>
            <div class="flex flex-col">
              <div class="text-[9px] tracking-widest text-neutral-600 uppercase">
                pigment channels — shared stack
              </div>
              <ul class="mt-1 space-y-1">
                <For each={neighborsOf(props.plate.slug)}>
                  {(n) => (
                    <li class="text-[9px] leading-snug">
                      <span style={{ color: accentOf(n.slug) }}>
                        {n.slug}
                      </span>
                      <span class="text-neutral-500">
                        {" "}
                        — {n.shared.join(" · ")}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
              <div class="mt-auto flex gap-3 pt-3">
                <a
                  href={project().sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  class="border border-neutral-700 px-2 py-1 text-[10px] text-neutral-200 hover:border-neutral-400"
                >
                  source ↗
                </a>
                <Show when={project().websiteUrl}>
                  {(url) => (
                    <a
                      href={url()}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      class="border border-neutral-700 px-2 py-1 text-[10px] text-neutral-200 hover:border-neutral-400"
                    >
                      site ↗
                    </a>
                  )}
                </Show>
                <span class="ml-auto self-center text-[9px] text-neutral-600">
                  esc / click to close
                </span>
              </div>
            </div>
          </div>
        </Show>
      </article>
    )
  }

  function connectionSvg() {
    return (
      <svg
        class="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        aria-hidden="true"
      >
        <defs>
          <For each={strongEdges}>
            {(e, i) => (
              <linearGradient id={`op-eg-${i()}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color={accentOf(e.a)} />
                <stop offset="100%" stop-color={accentOf(e.b)} />
              </linearGradient>
            )}
          </For>
        </defs>
        <For each={strongEdges}>
          {(e, i) => (
            <Show when={centers()[e.a] && centers()[e.b]}>
              <line
                x1={centers()[e.a].x}
                y1={centers()[e.a].y}
                x2={centers()[e.b].x}
                y2={centers()[e.b].y}
                stroke={`url(#op-eg-${i()})`}
                stroke-width={lit().has(edgeKey(e.a, e.b)) ? 1.6 : 0.7}
                opacity={lit().has(edgeKey(e.a, e.b)) ? 0.85 : 0.28}
              />
            </Show>
          )}
        </For>
        <For each={weakEdges}>
          {(e) => (
            <Show
              when={lit().has(edgeKey(e.a, e.b)) && centers()[e.a] && centers()[e.b]}
            >
              <line
                x1={centers()[e.a].x}
                y1={centers()[e.a].y}
                x2={centers()[e.b].x}
                y2={centers()[e.b].y}
                stroke="#8a8a8a"
                stroke-width="0.6"
                stroke-dasharray="3 5"
                opacity="0.6"
              />
            </Show>
          )}
        </For>
      </svg>
    )
  }

  function wallBody() {
    return (
      <div
        class={`relative h-full w-full overflow-y-auto bg-[#0a0a0a] p-3 ${
          expanded() ? "" : "lg:overflow-hidden"
        } ${glitching() ? "op-glitch" : ""}`}
      >
        {connectionSvg()}
        <div class="relative grid h-auto min-h-full grid-cols-1 content-start gap-3 lg:h-full lg:grid-cols-[230px_minmax(0,1fr)_230px] lg:content-stretch">
          <JobColumn live={false} />
          <div
            class="grid grid-cols-1 gap-3 lg:grid-cols-6"
            style={
              desktop()
                ? expanded()
                  ? { "grid-auto-rows": "minmax(130px, auto)" }
                  : { "grid-template-rows": "repeat(3, minmax(0, 1fr))" }
                : {}
            }
          >
            <For each={PLATES}>
              {(plate, i) => <Plate plate={plate} index={i()} />}
            </For>
          </div>
          <JobColumn live={true} />
        </div>
      </div>
    )
  }

  return (
    <main class="flex h-dvh flex-col overflow-hidden bg-[#0a0a0a] font-mono text-neutral-300">
      <style>{`
        @keyframes op-glitch-kf {
          0% { transform: translate(0); filter: none; clip-path: inset(0); }
          20% { transform: translate(-7px, 2px) skewX(2deg); filter: hue-rotate(70deg) saturate(4) contrast(1.5); clip-path: inset(8% 0 14% 0); }
          45% { transform: translate(6px, -3px); filter: hue-rotate(-100deg) invert(0.12); clip-path: inset(42% 0 28% 0); }
          70% { transform: translate(-4px, 1px) skewX(-1.5deg); filter: saturate(3); clip-path: inset(64% 0 4% 0); }
          100% { transform: none; filter: none; clip-path: inset(0); }
        }
        .op-glitch { animation: op-glitch-kf 0.2s steps(3, end) both; }
        @media (prefers-reduced-motion: reduce) { .op-glitch { animation: none; } }
        @keyframes op-live-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        .op-live-dot { animation: op-live-pulse 1.4s ease-in-out infinite; }
      `}</style>

      <header class="flex h-10 shrink-0 items-center justify-between border-b border-neutral-900 px-3 text-[10px] tracking-widest uppercase">
        <div class="text-neutral-200">
          darjs <span class="text-neutral-600">— {profile.fullName}</span>
        </div>
        <div class="hidden text-neutral-600 sm:block">
          {profile.role} · {profile.location}
        </div>
        <div class="text-neutral-500">
          overpressure <span class="text-neutral-700">/ chamber 01</span>
        </div>
      </header>

      <div ref={wallWrap} class="relative min-h-0 flex-1">
        <Show
          when={capture}
          fallback={
            <div ref={fallbackContent} class="absolute inset-0">
              {wallBody()}
            </div>
          }
        >
          <canvas
            ref={(el) => {
              source = el
              el.setAttribute("layoutsubtree", "true")
            }}
            class="absolute inset-0 block h-full w-full"
          >
            <div ref={wallContent} class="h-full w-full">
              {wallBody()}
            </div>
          </canvas>
        </Show>

        <canvas
          ref={output}
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-10 h-full w-full"
        />
        <Show when={blazeRect()}>
          {(r) => (
            <canvas
              ref={blazeCanvas}
              aria-hidden="true"
              class="pointer-events-none absolute z-20"
              style={{
                left: `${r().x}px`,
                top: `${r().y}px`,
                width: `${r().w}px`,
                height: `${r().h}px`,
              }}
            />
          )}
        </Show>

        <Show when={phase() === "intro"}>
          <div class="absolute inset-0 z-30">
            <div
              class="absolute inset-0 bg-black transition-opacity duration-1000"
              style={{ opacity: introFading() ? 0 : 1 }}
            />
            <canvas ref={introCanvas} class="absolute inset-0 h-full w-full" />
          </div>
        </Show>
      </div>

      <footer class="flex h-9 shrink-0 items-center justify-between border-t border-neutral-900 px-3 text-[9px] tracking-widest text-neutral-600 uppercase">
        <div>
          move = chaos <span class="text-neutral-800">·</span> stillness = clarity{" "}
          <span class="text-neutral-800">·</span> click = pigment
        </div>
        <div class="flex gap-4">
          <For each={socials}>
            {(s) => (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                class="text-neutral-500 hover:text-neutral-200"
              >
                {s.name}
              </a>
            )}
          </For>
          <a href={profile.cvUrl} class="text-neutral-500 hover:text-neutral-200">
            cv
          </a>
        </div>
      </footer>
    </main>
  )
}
