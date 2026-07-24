import { createSignal, onCleanup, onMount, Show } from "solid-js"
import { createAsciiStage, type AsciiStageInstance } from "./canvas/AsciiStage"
import { createPostFx, type PostFxInstance } from "./canvas/PostFx"
import { createShatterDrop, type ShatterDropInstance } from "./canvas/ShatterDrop"
import {
  prefersReducedMotion,
  supportsHtmlInCanvas,
  supportsWebGL2,
} from "./canvas/support"
import SideA from "./SideA"
import SideB from "./SideB"
import "./flip.css"

const effectsOk =
  typeof document !== "undefined" &&
  supportsHtmlInCanvas() &&
  supportsWebGL2() &&
  !prefersReducedMotion()

function CallOverlay(props: { onEnd: () => void }) {
  const [seconds, setSeconds] = createSignal(0)

  onMount(() => {
    const iv = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    onCleanup(() => window.clearInterval(iv))
  })

  const stamp = () =>
    `00:${String(Math.floor(seconds() / 60)).padStart(2, "0")}:${String(
      seconds() % 60,
    ).padStart(2, "0")}`

  return (
    <div class="fixed inset-0 z-[100] flex items-start justify-center pt-16 font-mono">
      <div class="w-80 border border-rose-accent bg-neutral-950/95 p-4 shadow-[0_0_40px_rgba(244,63,94,0.35)]">
        <div class="flex items-center justify-between text-[10px] tracking-widest text-neutral-500">
          <span>CALLRELAY — WAYLAND LAYER SHELL</span>
          <span class="text-rose-accent">ABOVE FULLSCREEN</span>
        </div>
        <div class="mt-3 text-lg font-bold text-white">+976 9911-XXXX</div>
        <div class="text-xs text-neutral-400">
          android call, relayed through the edge — {stamp()}
        </div>
        <button
          type="button"
          class="mt-4 w-full border border-rose-accent py-1 text-xs font-bold text-rose-accent hover:bg-rose-accent hover:text-black"
          onClick={() => props.onEnd()}
        >
          END CALL
        </button>
      </div>
    </div>
  )
}

export default function Flip() {
  const [slammed, setSlammed] = createSignal(false)
  const [assembled, setAssembled] = createSignal(false)
  const [peelTimed, setPeelTimed] = createSignal(false)
  const [cornerHover, setCornerHover] = createSignal(false)
  const [callActive, setCallActive] = createSignal(false)
  const [dropped, setDropped] = createSignal(false)
  const [shattering, setShattering] = createSignal(false)

  let source!: HTMLCanvasElement
  let content!: HTMLDivElement
  let asciiOut!: HTMLCanvasElement
  let postOut!: HTMLCanvasElement
  let shatterOut!: HTMLCanvasElement

  let ascii: AsciiStageInstance | null = null
  let post: PostFxInstance | null = null
  let shatter: ShatterDropInstance | null = null
  const timers: number[] = []
  let beatIv = 0

  onMount(() => {
    if (!effectsOk) return

    ascii = createAsciiStage({ source, content, output: asciiOut })
    post = createPostFx(asciiOut, postOut, {
      wave: 2.4,
      jitter: 1.4,
      switching: 1.4,
      grain: 0.3,
      aberration: 6,
    })
    if (!ascii || !post) return

    // 0-1s: VHS tracking noise + datamosh glitch burst
    post.burst(1.5)
    ascii.kick(1)

    // 1-3s: title slams in, tape settles
    timers.push(
      window.setTimeout(() => {
        post?.setOptions({
          wave: 0.8,
          jitter: 0.2,
          switching: 0.05,
          grain: 0.08,
          aberration: 2,
        })
        setSlammed(true)
        post?.burst(0.8)
        ascii?.kick(0.7)
      }, 1000),
    )

    // 5-8s: the tracklist assembles
    timers.push(window.setTimeout(() => setAssembled(true), 5000))

    // 8-10s: the corner peels back, the ghost of SIDE B, then snaps shut
    timers.push(window.setTimeout(() => setPeelTimed(true), 8000))
    timers.push(window.setTimeout(() => setPeelTimed(false), 9600))

    // beat grid: glitch bursts and laser sweeps land on the grid
    let beat = 0
    beatIv = window.setInterval(() => {
      beat += 1
      if (beat % 8 === 0) {
        post?.burst(0.9)
        post?.laserSweep()
        ascii?.kick(0.8)
      } else if (beat % 2 === 0 && Math.random() < 0.35) {
        post?.burst(0.3)
      }
    }, 480)

    // scroll velocity drives VHS tracking errors and laser
    let lastTop = content.scrollTop
    let lastT = performance.now()
    const onScroll = () => {
      const now = performance.now()
      const dt = Math.max(now - lastT, 16) / 1000
      const velocity = Math.abs(content.scrollTop - lastTop) / dt / 1000
      lastTop = content.scrollTop
      lastT = now
      const max = content.scrollHeight - content.clientHeight
      post?.addScrollImpulse(
        velocity,
        max > 0 ? content.scrollTop / max : 0,
      )
    }
    content.addEventListener("scroll", onScroll, { passive: true })

    // peel is armed on the bottom-right corner
    const onMove = (event: PointerEvent) => {
      setCornerHover(
        event.clientX > window.innerWidth - 140 &&
          event.clientY > window.innerHeight - 140,
      )
    }
    window.addEventListener("pointermove", onMove)

    onCleanup(() => {
      content.removeEventListener("scroll", onScroll)
      window.removeEventListener("pointermove", onMove)
    })
  })

  onCleanup(() => {
    for (const t of timers) window.clearTimeout(t)
    window.clearInterval(beatIv)
    shatter?.destroy()
    post?.destroy()
    ascii?.destroy()
  })

  function beginShatter() {
    if (!ascii || !post) return
    setShattering(true)
    shatter = createShatterDrop(postOut, shatterOut)
    if (!shatter) {
      setDropped(true)
      return
    }
    // the stage hides; the shatter canvas holds the identical last frame
    shatter.drop(() => {
      setDropped(true)
      setShattering(false)
      shatter?.destroy()
      shatter = null
    })
    // mid-fall, SIDE B fades in underneath the falling shards
    timers.push(window.setTimeout(() => setDropped(true), 900))
  }

  function playTheDrop() {
    if (shattering() || dropped()) return
    // glitch crescendo, then the shatter
    let n = 0
    const crescendo = window.setInterval(() => {
      n += 1
      post?.burst(1 + n * 0.25)
      ascii?.kick(1)
      if (n >= 9) {
        window.clearInterval(crescendo)
        beginShatter()
      }
    }, 100)
  }

  function runItBack() {
    setDropped(false)
    ascii?.resize()
    post?.resize()
  }

  if (!effectsOk) {
    return (
      <div class="h-full overflow-y-auto">
        <SideB fallback />
      </div>
    )
  }

  return (
    <div class="fixed inset-0 overflow-hidden bg-[#0a0a0a] font-mono">
      {/* SIDE B sits underneath and is revealed by the drop */}
      <div class="absolute inset-0 z-0 overflow-y-auto">
        <SideB onFlipBack={runItBack} />
      </div>

      {/* SIDE A: raw live DOM -> asciify -> post fx */}
      <div
        class="absolute inset-0 z-10"
        style={{ display: dropped() ? "none" : "block" }}
      >
        <canvas
          ref={(el) => {
            source = el
            el.setAttribute("layoutsubtree", "true")
          }}
          class="absolute inset-0 block h-full w-full"
        >
          <div
            ref={content}
            class="flip-noscroll h-full w-full overflow-y-auto bg-[#0a0a0a]"
          >
            <SideA
              slammed={slammed()}
              assembled={assembled()}
              onPlayDrop={playTheDrop}
              onAnswerCall={() => setCallActive(true)}
            />
          </div>
        </canvas>
        <canvas
          ref={asciiOut}
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-10 block h-full w-full"
        />
        <canvas
          ref={postOut}
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-20 block h-full w-full"
        />
      </div>

      {/* the drop: refractive 3D shards of the ascii page */}
      <canvas
        ref={shatterOut}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-30 block h-full w-full"
        style={{ display: shattering() ? "block" : "none" }}
      />

      {/* Peel: the ghost of SIDE B, armed on the corner */}
      <Show when={!dropped()}>
        <div
          aria-hidden="true"
          class={`flip-peel pointer-events-none absolute right-0 bottom-0 z-40 h-44 w-44 ${peelTimed() || cornerHover() ? "open" : ""}`}
        >
          <div class="flip-peel-paper absolute inset-0 bg-[#f5f1e8] font-serif text-[#16130f]">
            <div class="absolute right-6 bottom-5 text-right">
              <p class="text-base font-bold">Dariimaa Erdenesuren</p>
              <p class="text-sm italic">Curriculum Vitae</p>
              <p class="text-xs">side b — the fallback</p>
            </div>
          </div>
          <div class="flip-peel-flap absolute inset-0" />
        </div>
      </Show>

      {/* callrelay overlay: above all layers, in true color */}
      <Show when={callActive()}>
        <CallOverlay onEnd={() => setCallActive(false)} />
      </Show>
    </div>
  )
}
