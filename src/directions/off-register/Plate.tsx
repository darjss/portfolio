import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { createGhostPlate, type GhostPlateInstance } from "./canvas/GhostPlate"
import type { PressSound } from "./sound"

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

export const pad2 = (n: number) => String(n).padStart(2, "0")

// Rest mis-registration per plate. Plate 01 matches the brief: 40 down, 20 right.
function restOffsetFor(no: number) {
  if (no === 1) return { x: 20, y: 40 }
  const sign = no % 2 === 0 ? -1 : 1
  return { x: sign * (12 + ((no * 13) % 26)), y: 14 + ((no * 17) % 30) }
}

interface PlateProps {
  no: number
  title: string
  /** html-in-canvas available and motion allowed. */
  supported: boolean
  registered: boolean
  sound: PressSound
  onRegister: () => void
  hint?: JSX.Element
  spec: JSX.Element
  children: JSX.Element
}

export default function Plate(props: PlateProps) {
  let root!: HTMLElement
  let source!: HTMLCanvasElement
  let content!: HTMLDivElement
  let ghostWrap!: HTMLDivElement
  let ghostOut!: HTMLCanvasElement
  let handle!: HTMLButtonElement

  const rest = restOffsetFor(props.no)
  const offset = { x: rest.x, y: rest.y }
  const raw = { x: rest.x, y: rest.y }
  const grabStart = { x: 0, y: 0 }
  const grabOffset = { x: 0, y: 0 }
  const cursor = { x: -9999, y: -9999 }

  let ghost: GhostPlateInstance | null = null
  let dragging = false
  const [grabbing, setGrabbing] = createSignal(false)
  let lockAnim = -1
  let holdUntil = 0
  let raf = 0
  let running = false
  let dead = false

  const initialTransform = `translate3d(${rest.x}px, ${rest.y}px, 0)`

  function apply() {
    const t = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0)`
    ghostWrap.style.transform = t
    if (handle) handle.style.transform = t
  }

  function tryLock() {
    if (props.registered || lockAnim >= 0 || dead) return
    props.sound.thunk()
    ghost?.burst(0.9)
    lockAnim = 0
    props.onRegister()
  }

  function frame() {
    if (dead) return
    if (lockAnim >= 0) {
      // lock: ghost resolves to still ink and fades onto plate A
      lockAnim = Math.min(1, lockAnim + 1 / 24)
      const e = 1 - Math.pow(1 - lockAnim, 3)
      ghost?.setDistort(1 - e)
      ghostWrap.style.opacity = String(1 - e)
      ghostWrap.style.transform = `translate3d(${(offset.x * (1 - e)).toFixed(2)}px, ${(offset.y * (1 - e)).toFixed(2)}px, 0)`
      if (lockAnim >= 1) {
        running = false
        ghost?.destroy()
        ghost = null
        return
      }
    } else if (dragging) {
      offset.x += (raw.x - offset.x) * 0.35
      offset.y += (raw.y - offset.y) * 0.35
      // spring pulls toward registration; near the hole it snaps hard
      const d = Math.hypot(offset.x, offset.y)
      const magnet = d < 8 ? 0.4 : d < 28 ? (1 - d / 28) * 0.12 : 0
      offset.x -= offset.x * magnet
      offset.y -= offset.y * magnet
      apply()
      if (Math.hypot(offset.x, offset.y) < 3) tryLock()
    } else {
      // idle: hover at the rest offset, twitching toward the cursor
      if (performance.now() > holdUntil) {
        const rect = root.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const gx = clamp((cursor.x - cx) / 240, -1, 1) * 5
        const gy = clamp((cursor.y - cy) / 240, -1, 1) * 5
        offset.x += (rest.x + gx - offset.x) * 0.07
        offset.y += (rest.y + gy - offset.y) * 0.07
        apply()
      }
    }
    raf = requestAnimationFrame(frame)
  }

  function start() {
    if (running || dead) return
    running = true
    raf = requestAnimationFrame(frame)
  }

  function onPointerMove(event: PointerEvent) {
    cursor.x = event.clientX
    cursor.y = event.clientY
  }

  onMount(() => {
    if (!props.supported) return
    source.setAttribute("layoutsubtree", "true")
    window.addEventListener("pointermove", onPointerMove, { passive: true })

    const io = new IntersectionObserver(
      (entries) => {
        const near = entries[entries.length - 1]?.isIntersecting ?? false
        if (near && !props.registered && !ghost && !dead) {
          ghost = createGhostPlate(
            { source, content, output: ghostOut },
            { seed: props.no * 3.71 },
          )
          if (!ghost) {
            // WebGL2 missing under a working capture API: settle the plate
            // quietly so the sheet can still complete.
            props.onRegister()
            return
          }
          apply()
          start()
        }
      },
      { rootMargin: "200px" },
    )
    io.observe(root)

    onCleanup(() => {
      dead = true
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      ghost?.destroy()
      ghost = null
    })
  })

  function down(event: PointerEvent) {
    if (props.registered || lockAnim >= 0) return
    event.preventDefault()
    props.sound.unlock()
    handle.setPointerCapture(event.pointerId)
    dragging = true
    setGrabbing(true)
    grabStart.x = event.clientX
    grabStart.y = event.clientY
    grabOffset.x = offset.x
    grabOffset.y = offset.y
    raw.x = offset.x
    raw.y = offset.y
    ghost?.burst(0.9)
    start()
  }

  function move(event: PointerEvent) {
    if (!dragging) return
    raw.x = clamp(grabOffset.x + event.clientX - grabStart.x, -60, 60)
    raw.y = clamp(grabOffset.y + event.clientY - grabStart.y, -60, 60)
  }

  function up(event: PointerEvent) {
    if (!dragging) return
    dragging = false
    setGrabbing(false)
    ghost?.burst(0.7)
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId)
    }
    if (Math.hypot(offset.x, offset.y) < 3 || Math.hypot(raw.x, raw.y) < 3) {
      tryLock()
    }
  }

  function keys(event: KeyboardEvent) {
    if (props.registered || lockAnim >= 0) return
    const step = event.shiftKey ? 1 : 4
    if (event.key === "ArrowLeft") offset.x -= step
    else if (event.key === "ArrowRight") offset.x += step
    else if (event.key === "ArrowUp") offset.y -= step
    else if (event.key === "ArrowDown") offset.y += step
    else if (event.key === "Enter") {
      event.preventDefault()
      tryLock()
      return
    } else return
    event.preventDefault()
    props.sound.unlock()
    offset.x = clamp(offset.x, -60, 60)
    offset.y = clamp(offset.y, -60, 60)
    raw.x = offset.x
    raw.y = offset.y
    holdUntil = performance.now() + 1500
    ghost?.burst(0.4)
    apply()
    if (Math.hypot(offset.x, offset.y) < 3) tryLock()
  }

  return (
    <section
      ref={root}
      class="relative mx-auto w-full max-w-3xl px-5 py-12 sm:px-8"
      aria-label={`plate ${pad2(props.no)} — ${props.title}`}
    >
      <header class="mb-5 flex items-baseline justify-between border-b border-[#16130e]/20 pb-2 font-mono text-[10px] tracking-[0.3em] text-[#16130e]/60 uppercase">
        <span>plate {pad2(props.no)} / 09</span>
        <span>{props.title}</span>
      </header>

      <Show when={props.supported && !props.registered && props.hint}>
        <p class="or-hint mb-4 font-mono text-[11px] text-[#e86a2a]">{props.hint}</p>
      </Show>

      <div class="or-plate relative">
        <Show when={props.supported} fallback={<div>{props.children}</div>}>
          <canvas ref={source} class="block w-full">
            <div ref={content} class="w-full">
              {props.children}
            </div>
          </canvas>
          <div
            ref={ghostWrap}
            aria-hidden="true"
            class="pointer-events-none absolute inset-0"
            style={{ transform: initialTransform }}
          >
            <canvas ref={ghostOut} class="block h-full w-full" />
          </div>
          <Show when={!props.registered}>
            <button
              ref={handle}
              type="button"
              class="or-handle"
              classList={{ grabbing: grabbing() }}
              style={{ transform: initialTransform }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onKeyDown={keys}
              aria-label={`drag ghost plate ${pad2(props.no)} into register`}
              title="drag the ghost plate into register"
            >
              ⌖
            </button>
          </Show>
        </Show>
        <Show when={props.registered}>
          <div class="or-stamp" style={{ rotate: `${((props.no * 7) % 13) - 6}deg` }}>
            registered {pad2(props.no)}/09
          </div>
        </Show>
      </div>

      <div class="or-spec" attr:data-on={String(props.registered)}>
        {props.spec}
      </div>
    </section>
  )
}
