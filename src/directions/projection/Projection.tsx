import "./projection.css"
import { For, Show, createEffect, createSignal, onCleanup, onMount, untrack } from "solid-js"
import { experience } from "../../data/experience"
import { profile } from "../../data/profile"
import { supportsHtmlInCanvas, type ElementImageContext, type PaintableCanvas } from "../../lab/html-in-canvas"
import SoundGate from "../../lab/SoundGate"
import { sound as soundChoice } from "../../lab/sound"
import { createProjectorSound, type ProjectorSound } from "./projector-sound"
import { Amerik, Credits, Erxes, Golomt, Opening, Projects, Strobe, erxesCamera, strobeWord } from "./reels"
import { createRenderer, type FilmFrame } from "./renderer"
import Screenplay from "./Screenplay"
import { TRANSITION_HALF, aperture, locate, reelStart, reels, smoothstep, totalLength, type ReelId } from "./timeline"

declare module "solid-js" {
  namespace JSX {
    interface ExplicitAttributes {
      layoutsubtree: string
    }
  }
}

export default function Projection() {
  const [script, setScript] = createSignal(!supportsHtmlInCanvas() || window.innerWidth < 760)
  return (
    <Show when={!script()} fallback={<Screenplay />}>
      <Theatre onFail={() => setScript(true)} />
      <SoundGate title="watch a movie" />
    </Show>
  )
}

type Canvas = PaintableCanvas
type Rect = { x: number; y: number; w: number; h: number }

const DIGIT = 0.45
const COUNTDOWN = DIGIT * 6 + 0.9
const SECONDS_PER_UNIT = 8
const kinds = { splice: 0, burn: 1, runout: 2 } as const
const tints: Record<ReelId, [number, number, number]> = {
  opening: [1, 0.99, 0.96],
  golomt: [1.02, 1, 0.93],
  erxes: [1.02, 1, 1],
  amerik: [1.07, 0.95, 0.84],
  projects: [1.03, 1.02, 1],
  credits: [1, 0.99, 0.96],
}

const reelName = (i: number) => {
  const id = reels[i].id
  if (id === "opening") return "titles"
  if (id === "projects" || id === "credits") return id
  return experience.find((e) => e.company.toLowerCase().startsWith(id))?.company.toLowerCase() ?? id
}

const navLabel = (i: number) => (i > 0 && i < reels.length - 1 ? `${i} ${reelName(i)}` : reelName(i))

function drawCountdown(ctx: CanvasRenderingContext2D, ap: Rect, dpr: number, time: number) {
  const step = Math.floor(time / DIGIT)
  if (step > 6) return
  const digit = 8 - step
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const cx = ap.x + ap.w / 2
  const cy = ap.y + ap.h / 2
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, ap.w * 0.6)
  bg.addColorStop(0, digit === 2 ? "#f4f1ea" : "#a7a49b")
  bg.addColorStop(1, digit === 2 ? "#d8d4ca" : "#4f4d48")
  ctx.fillStyle = bg
  ctx.fillRect(ap.x, ap.y, ap.w, ap.h)
  const r = ap.h * 0.36
  const sweep = (time % DIGIT) / DIGIT
  ctx.fillStyle = "rgba(0,0,0,0.32)"
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, ap.w, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = "rgba(20,20,20,0.85)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ap.x, cy)
  ctx.lineTo(ap.x + ap.w, cy)
  ctx.moveTo(cx, ap.y)
  ctx.lineTo(cx, ap.y + ap.h)
  ctx.stroke()
  ctx.strokeStyle = "rgba(250,248,240,0.9)"
  ctx.lineWidth = 4
  for (const radius of [r, r * 0.84]) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = "#141414"
  ctx.font = `700 ${Math.round(ap.h * 0.46)}px "Libre Franklin", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(String(digit), cx, cy + ap.h * 0.02)
}

function drawLeader(ctx: CanvasRenderingContext2D, ap: Rect, dpr: number, tail: boolean, reel: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = tail ? "#15130f" : "#3a3731"
  ctx.fillRect(ap.x, ap.y, ap.w, ap.h)
  const cx = ap.x + ap.w / 2
  const cy = ap.y + ap.h / 2
  ctx.fillStyle = tail ? "#d9d3c4" : "#f1ede2"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 ${Math.round(ap.h * 0.2)}px "Courier Prime", monospace`
  ctx.fillText(tail ? "TAIL" : "HEAD", cx, cy - ap.h * 0.08)
  ctx.font = `400 ${Math.round(ap.h * 0.055)}px "Courier Prime", monospace`
  const label = reel > 0 && reel < reels.length - 1 ? `reel ${reel} · ${reelName(reel)}` : reelName(reel)
  ctx.fillText(label, cx, cy + ap.h * 0.12)
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineWidth = 2
  ctx.strokeRect(ap.x + ap.w * 0.06, ap.y + ap.h * 0.08, ap.w * 0.88, ap.h * 0.84)
}

function Theatre(props: { onFail: () => void }) {
  let source!: HTMLCanvasElement
  let output!: HTMLCanvasElement
  let strobeEl!: HTMLElement
  const elements: HTMLElement[] = []
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const [us, setUs] = createSignal(reels.map(() => 0))
  const [spin, setSpin] = createSignal(0)
  const [word, setWord] = createSignal("")
  const [invert, setInvert] = createSignal(false)
  const [active, setActive] = createSignal(0)
  const [counter, setCounter] = createSignal("0000 ft 00 fr")
  const [aspectLabel, setAspectLabel] = createSignal("1.85")
  const [sound, setSound] = createSignal<ProjectorSound | null>(null)
  const [playing, setPlaying] = createSignal(false)
  const [progress, setProgress] = createSignal(0)

  const u = (i: number) => () => us()[i]
  const live = { time: 0, countdownStart: 0, countdown: false, kick: 0, head: 0 }

  const toggleSound = () => {
    const current = sound()
    if (current) {
      current.stop()
      setSound(null)
      return
    }
    setSound(createProjectorSound())
    live.kick = 1
  }

  const roll = () => {
    if (live.head >= totalLength) live.head = 0
    if (live.head < 0.01 && !reduced) {
      live.countdown = true
      live.countdownStart = live.time
    }
    setPlaying(true)
  }

  const togglePlay = () => (playing() ? setPlaying(false) : roll())

  const jump = (i: number) => {
    live.countdown = false
    live.head = reelStart(i) + (i > 0 ? TRANSITION_HALF + 0.04 : 0)
  }

  createEffect(() => {
    const choice = soundChoice()
    if (choice === null) return
    untrack(() => {
      if (choice && !sound()) toggleSound()
      roll()
    })
  })

  onMount(() => {
    const renderer = createRenderer(output, source)
    const ctx = source.getContext("2d") as ElementImageContext | null
    if (!renderer || !ctx) {
      props.onFail()
      return
    }
    const canvas = source as Canvas
    const root = document.documentElement
    root.style.background = "#000"

    const onWheel = (e: WheelEvent) => {
      if (e.target instanceof Element && e.target.closest(".pj-booth")) return
      live.countdown = false
      live.head = Math.min(Math.max(live.head + e.deltaY / window.innerHeight, 0), totalLength)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return
      if (e.key === " ") {
        e.preventDefault()
        togglePlay()
      } else if (e.key === "ArrowRight") jump(Math.min(locate(live.head).index + 1, reels.length - 1))
      else if (e.key === "ArrowLeft") jump(Math.max(locate(live.head).index - (locate(live.head).local < 0.1 ? 1 : 0), 0))
    }
    window.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("keydown", onKey)

    let s = 0
    const start = performance.now()
    let last = start
    let velocity = 0
    let spinX = 0
    let spinV = 0
    let lastStep = -1
    let kickRoll = 0
    let lastSide = 0
    let lastDigit = -1
    let lastDrawn: HTMLElement | null = null
    let raf = 0
    let loc = locate(s)

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      live.time = (now - start) / 1000
      const countdownTime = live.time - live.countdownStart
      if (live.countdown && countdownTime > COUNTDOWN) live.countdown = false
      if (playing() && !live.countdown) {
        const here = locate(live.head)
        const surge = reels[here.index].id === "amerik" && !reduced ? 0.35 + 1.9 * Math.max(0, Math.sin(live.time * 0.9)) ** 6 : 1
        live.head = Math.min(live.head + (dt / SECONDS_PER_UNIT) * surge, totalLength)
        if (live.head >= totalLength) setPlaying(false)
      }
      const target = live.head
      setProgress(live.head / totalLength)
      if (live.countdown) {
        const digit = 8 - Math.floor(countdownTime / DIGIT)
        if (digit === 2 && lastDigit !== 2) sound()?.beep()
        lastDigit = digit
      }
      const rate = reduced ? 40 : 6
      const prev = s
      s += (target - s) * (1 - Math.exp(-dt * rate))
      const v = (s - prev) / Math.max(dt, 1e-3)
      velocity += (v - velocity) * (1 - Math.exp(-dt * 8))
      const spinTarget = reduced ? 0 : Math.max(-1.6, Math.min(1.6, velocity * 1.1))
      spinV += ((spinTarget - spinX) * 50 - spinV * 8) * dt
      spinX += spinV * dt
      live.kick *= Math.exp(-dt * 2.2)
      kickRoll += dt * live.kick * 7
      loc = locate(s)
      const values = reels.map((_, i) => (i === loc.index ? loc.local : i < loc.index ? 1 : 0))
      setUs(values)
      setSpin(spinX)
      setWord(strobeWord(erxesCamera(values[2]).next))
      setInvert(Math.floor(live.time * 12) % 2 === 1)
      setActive(loc.index)
      const frames = Math.floor(s * SECONDS_PER_UNIT * 24)
      setCounter(`${String(Math.floor(frames / 16)).padStart(4, "0")} ft ${String(frames % 16).padStart(2, "0")} fr`)
      sound()?.setSpeed(Math.abs(velocity))
      const side = loc.change ? Math.sign(loc.change.t) : 0
      if (side > 0 && lastSide < 0) sound()?.thump()
      lastSide = side
      canvas.requestPaint()
      raf = requestAnimationFrame(tick)
    }

    canvas.onpaint = () => {
      const vw = source.clientWidth
      const vh = source.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = Math.round(vw * dpr)
      const ch = Math.round(vh * dpr)
      if (source.width !== cw || source.height !== ch) {
        source.width = cw
        source.height = ch
      }
      ctx.reset()
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, cw, ch)

      const change = loc.change
      const aspect = change
        ? reels[change.from].aspect + (reels[change.to].aspect - reels[change.from].aspect) * smoothstep(-0.55, 0.55, change.t)
        : reels[loc.index].aspect
      const ap = aperture(aspect, vw, vh)
      const env = { x: vw * 0.05, y: vh * 0.075, w: vw * 0.9, h: vh * 0.7 }
      setAspectLabel(aspect.toFixed(2))

      const shown = change ? (change.t < 0 ? change.from : change.to) : loc.index
      let drawn: HTMLElement | null = null
      const leader = live.countdown || (change?.kind === "runout" && Math.abs(change.t) < 0.45)
      if (live.countdown) drawCountdown(ctx, ap, dpr, live.time - live.countdownStart)
      else if (change && leader) drawLeader(ctx, ap, dpr, change.t < 0, change.t < 0 ? change.from : change.to)
      else {
        drawn = elements[shown]
        if (reels[shown].id === "erxes" && !reduced && erxesCamera(us()[shown]).strobe && Math.floor(live.time * 12) % 3 !== 2) drawn = strobeEl
        const w = drawn.offsetWidth
        const h = drawn.offsetHeight
        const sc = Math.max(ap.w / w, ap.h / h)
        const x = ap.x + (ap.w - w * sc) / 2
        const y = ap.y + (ap.h - h * sc) / 2
        ctx.setTransform(sc, 0, 0, sc, x * dpr, y * dpr)
        try {
          ctx.drawElementImage(drawn, 0, 0)
        } catch {}
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        drawn.style.transform = `matrix(${sc}, 0, 0, ${sc}, ${x}, ${y})`
        canvas.updateElementGeometry?.(drawn)
      }
      if (lastDrawn && lastDrawn !== drawn) canvas.clearElementGeometry?.(lastDrawn)
      lastDrawn = drawn

      const id = reels[shown].id
      const fr = Math.floor(live.time * 24)
      const wt = fr / 24
      const weave: [number, number] = reduced
        ? [0, 0]
        : [Math.sin(wt * 2.1) * 0.35 + Math.sin(wt * 5.3 + 1) * 0.3, Math.sin(wt * 1.7 + 2) * 0.6 + Math.sin(wt * 4.1) * 0.45]

      let slip = 0
      let edge = 0
      if (change?.kind === "splice") slip = change.t < 0 && change.t > -0.12 ? 0.22 : change.t >= 0 && change.t < 0.1 ? -0.12 : 0
      if (change?.kind === "runout" && Math.abs(change.t) < 0.5) {
        slip = change.t * 5
        edge = 1 - smoothstep(0.3, 0.5, Math.abs(change.t))
      }
      if (live.kick > 0.03 && !reduced) {
        slip += kickRoll
        edge = Math.max(edge, live.kick)
      }

      let cue = 0
      if (!change && loc.index < reels.length - 1) {
        const d = reelStart(loc.index + 1) - s
        cue = (d > 0.44 && d < 0.5) || (d > 0.26 && d < 0.31) ? 1 : 0
      }

      let refresh = true
      let smear = 0
      let streak: [number, number] = [0, 0]
      const speed = Math.abs(velocity)
      if (id === "amerik" && !leader && !reduced && speed > 0.08) {
        const step = Math.floor(live.time * 8)
        refresh = step !== lastStep
        lastStep = step
        smear = Math.min(0.78, 0.35 + speed * 0.6)
        streak = [Math.max(-90, Math.min(90, velocity * 110)), 0]
      }

      const strike = live.time < 0.8 ? (0.3 + 0.7 * (live.time / 0.8)) * (0.7 + 0.3 * Math.abs(Math.sin(live.time * 91))) : 1
      const frame: FilmFrame = {
        vw,
        vh,
        dpr,
        time: live.time,
        frame: fr,
        ap,
        env,
        weave,
        slip,
        kind: change ? kinds[change.kind] : -1,
        t: change?.t ?? 0,
        cue,
        smear,
        streak,
        edge,
        grain: reduced ? 0.035 : 0.075,
        lamp: strike * (1 - live.kick * 0.25),
        tint: leader ? [1, 1, 1] : tints[id],
        beam: 0.12,
        refresh,
      }
      renderer.render(frame)
    }

    raf = requestAnimationFrame(tick)
    onCleanup(() => {
      cancelAnimationFrame(raf)
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      canvas.onpaint = null
      renderer.destroy()
      sound()?.stop()
      root.style.background = ""
    })
  })

  return (
    <main class="pj-theatre">
      <canvas ref={source} class="pj-layer" attr:layoutsubtree="true">
        <Opening u={u(0)} ref={(el) => (elements[0] = el)} />
        <Golomt u={u(1)} ref={(el) => (elements[1] = el)} />
        <Erxes u={u(2)} spin={spin} ref={(el) => (elements[2] = el)} />
        <Amerik u={u(3)} ref={(el) => (elements[3] = el)} />
        <Projects u={u(4)} ref={(el) => (elements[4] = el)} />
        <Credits u={u(5)} ref={(el) => (elements[5] = el)} />
        <Strobe ref={(el) => (strobeEl = el)} word={word} invert={invert} />
      </canvas>
      <canvas ref={output} class="pj-layer pj-output" aria-hidden="true" />
      <footer class="pj-booth">
        <button type="button" class="pj-play" aria-label={playing() ? "pause" : "play"} onClick={togglePlay}>
          {playing() ? "❚❚" : "▶"}
        </button>
        <span class="pj-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress()})` }} />
        </span>
        <nav aria-label="reels">
          <For each={reels}>
            {(_, i) => (
              <button type="button" aria-current={active() === i()} onClick={() => jump(i())}>
                {navLabel(i())}
              </button>
            )}
          </For>
        </nav>
        <span class="pj-counter" aria-hidden="true">
          {counter()} · {aspectLabel()} : 1
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <a href={profile.cvUrl}>cv</a>
          <button type="button" class="pj-sound" aria-pressed={sound() !== null} onClick={toggleSound}>
            {sound() ? "projector sound on" : "projector sound off"}
          </button>
        </div>
      </footer>
    </main>
  )
}
