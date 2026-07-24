// DesktopWindow — a riced Wayland window.
// Drag by the titlebar: the window follows with sway momentum and springs back
// straight on release (still typeable mid-wobble — it is live DOM throughout).
// With html-in-canvas, canvasui Cloth hangs the panel on fabric pinned at the
// titlebar; otherwise the same motion is a CSS/spring transform.

import { onCleanup, onMount, type JSX, type ParentProps } from "solid-js"
import { createSignal } from "solid-js"
import { createCloth } from "../canvas/cloth"
import Capture from "./Capture"

interface DesktopWindowProps extends ParentProps {
  title: string
  /** Position as fractions of the windows layer. */
  x: number
  y: number
  width: number
  z: number
  /** Stagger delay for the cloth-drape intro, ms. */
  introDelay: number
  reduced: boolean
  capture: boolean
  /** CSS tumble fallback while a workspace switch is in flight. */
  tumbling: boolean
  tumbleSeed: number
  onFocus: () => void
  onClose: () => void
  children: JSX.Element
}

function tumbleTransform(seed: number) {
  const dx = ((seed * 37) % 220) - 110
  const dy = ((seed * 53) % 160) - 40
  const rot = ((seed * 71) % 130) - 65
  const rx = ((seed * 29) % 70) - 35
  return `translate3d(${dx * 2.4}px, ${dy * 2 - 240}px, 0) rotate(${rot}deg) rotateX(${rx}deg) scale(0.72)`
}

export default function DesktopWindow(props: DesktopWindowProps) {
  const [delta, setDelta] = createSignal({ x: 0, y: 0 })
  const [wobble, setWobble] = createSignal({ rx: props.reduced ? 0 : -58, rz: 0 })
  const [visible, setVisible] = createSignal(props.reduced)

  // spring state
  const spring = { rx: wobble().rx, rz: 0, vrx: 0, vrz: 0 }
  let raf = 0
  let last = 0

  const springRunning = () => raf !== 0

  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    const k = 110
    const c = 11
    spring.vrx += (-k * spring.rx - c * spring.vrx) * dt
    spring.vrz += (-k * spring.rz - c * spring.vrz) * dt
    spring.rx += spring.vrx * dt
    spring.rz += spring.vrz * dt
    setWobble({ rx: spring.rx, rz: spring.rz })
    const settled =
      Math.abs(spring.rx) < 0.05 &&
      Math.abs(spring.rz) < 0.05 &&
      Math.abs(spring.vrx) < 0.5 &&
      Math.abs(spring.vrz) < 0.5
    if (settled) {
      spring.rx = 0
      spring.rz = 0
      setWobble({ rx: 0, rz: 0 })
      raf = 0
      return
    }
    raf = requestAnimationFrame(step)
  }

  const startSpring = () => {
    if (springRunning() || props.reduced) return
    last = performance.now()
    raf = requestAnimationFrame(step)
  }

  // intro drape
  let introTimer = 0
  onMount(() => {
    if (props.reduced) return
    introTimer = window.setTimeout(() => {
      setVisible(true)
      startSpring()
    }, props.introDelay)
  })

  // titlebar drag with sway momentum
  let dragging = false
  let px = 0
  let py = 0
  let vx = 0

  const onPointerDown = (event: PointerEvent) => {
    props.onFocus()
    dragging = true
    px = event.clientX
    py = event.clientY
    vx = 0
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    const dx = event.clientX - px
    const dy = event.clientY - py
    px = event.clientX
    py = event.clientY
    vx = vx * 0.7 + dx * 0.3
    setDelta((d) => ({ x: d.x + dx, y: d.y + dy }))
    if (!props.reduced) {
      spring.rz = Math.max(-9, Math.min(9, vx * 0.45))
      spring.rx = Math.max(-6, Math.min(6, -dy * 0.3))
      setWobble({ rx: spring.rx, rz: spring.rz })
    }
  }

  const onPointerUp = () => {
    if (!dragging) return
    dragging = false
    spring.vrz = vx * 6
    spring.vrx = 0
    startSpring()
  }

  onCleanup(() => {
    cancelAnimationFrame(raf)
    window.clearTimeout(introTimer)
  })

  const transform = () => {
    if (props.tumbling) return tumbleTransform(props.tumbleSeed)
    const d = delta()
    const w = wobble()
    return `translate3d(${d.x}px, ${d.y}px, 0) perspective(1200px) rotateX(${w.rx}deg) rotateZ(${w.rz}deg)`
  }

  return (
    <section
      class="absolute"
      style={{
        left: `${props.x * 100}%`,
        top: `${props.y * 100}%`,
        width: `${props.width}px`,
        "max-width": "94vw",
        "z-index": props.z,
        transform: transform(),
        "transform-origin": "top center",
        opacity: visible() ? 1 : 0,
        transition: props.tumbling
          ? "transform 0.55s cubic-bezier(0.25, 1.35, 0.4, 1)"
          : "none",
      }}
      aria-label={props.title}
      onPointerDown={() => props.onFocus()}
    >
      <Capture
        enabled={props.capture}
        sourceInFlow
        wrapperClass="relative w-full"
        contentClass="w-full"
        onInit={(els) => {
          if (!props.capture) return
          const instance = createCloth(els, {
            pin: "top",
            wind: 2,
            speed: 0.5,
            amplitude: 16,
            drape: 26,
            brush: 1.6,
            brushSize: 130,
            damping: 1.1,
            light: 0.5,
            sheen: 0.12,
            shadow: 0.25,
            cornerRadius: 12,
          })
          if (!instance) return
          return () => instance.destroy()
        }}
      >
        <div class="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/85 shadow-2xl shadow-black/60 backdrop-blur-md">
          <header
            class="flex h-8 cursor-grab items-center gap-2 border-b border-neutral-800 bg-white/[0.04] px-3 select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span class="h-2 w-2 rounded-full bg-rose-accent/80" />
            <span class="h-2 w-2 rounded-full bg-neutral-700" />
            <span class="truncate text-[11px] tracking-wider text-neutral-400">
              {props.title}
            </span>
            <span class="flex-1" />
            <button
              type="button"
              class="px-1 text-[11px] text-neutral-600 hover:text-rose-accent"
              aria-label={`close ${props.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                props.onClose()
              }}
            >
              ✕
            </button>
          </header>
          <div class="p-4 text-[13px] leading-relaxed text-neutral-300">
            {props.children}
          </div>
        </div>
      </Capture>
    </section>
  )
}
