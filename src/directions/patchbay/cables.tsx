// Patch cables, rendered as live DOM (SVG) so the hex capture draws them
// floating with the modules. Each cable sags from its own weight and ripples
// when the pointer or a panel interaction disturbs it.

import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import type { ModuleId } from "./data"

export interface Cable {
  from: ModuleId
  to: ModuleId
}

interface Spring {
  s: number
  v: number
}

export function CableLayer(props: {
  container: () => HTMLElement | undefined
  cables: () => Cable[]
  armed: () => { from: ModuleId; x: number; y: number } | null
  accentOf: (id: ModuleId) => string
  reduced: boolean
  onRemove: (index: number) => void
  /** Register the disturb function: panel interactions call it to ripple cables. */
  disturbRef: (fn: (x: number, y: number, strength: number) => void) => void
}) {
  const [tick, setTick] = createSignal(0)
  const springs = new Map<string, Spring>()
  let pointer = { x: -1e4, y: -1e4 }
  let raf = 0

  const jackPointRaw = (id: ModuleId, side: "in" | "out") => {
    const el = props
      .container()
      ?.querySelector<HTMLElement>(
        `[data-jack-module="${id}"][data-jack-side="${side}"]`,
      )
    const box = props.container()?.getBoundingClientRect()
    if (!el || !box) return null
    const r = el.getBoundingClientRect()
    return {
      x: r.left + r.width / 2 - box.left,
      y: r.top + r.height / 2 - box.top,
    }
  }

  // Some jacks only exist on one side ("this site" is input-only).
  const jackPoint = (id: ModuleId, side: "in" | "out") => {
    tick() // re-measure against drifting modules every frame
    return jackPointRaw(id, side) ?? jackPointRaw(id, side === "in" ? "out" : "in")
  }

  const spring = (key: string) => {
    let s = springs.get(key)
    if (!s) {
      s = { s: 0, v: 0 }
      springs.set(key, s)
    }
    return s
  }

  const disturb = (x: number, y: number, strength: number) => {
    if (props.reduced) return
    for (const [, sp] of springs) sp.v += strength * (0.6 + Math.random() * 0.8)
    pointer = { x, y }
  }

  onMount(() => {
    props.disturbRef(disturb)

    const onMove = (e: PointerEvent) => {
      const box = props.container()?.getBoundingClientRect()
      if (!box) return
      pointer = { x: e.clientX - box.left, y: e.clientY - box.top }
    }
    window.addEventListener("pointermove", onMove, { passive: true })

    // Physics + tracking loop. Springs rest at their natural sag; the loop
    // keeps running so cable ends track the drifting modules.
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      if (!props.reduced) {
        for (const [key, sp] of springs) {
          const natural = 14 + (Math.abs(hash(key)) % 10)
          const acc = (natural - sp.s) * 60 - sp.v * 7
          sp.v += acc * dt
          sp.s += sp.v * dt
        }
      } else {
        for (const [key, sp] of springs) {
          sp.s = 14 + (Math.abs(hash(key)) % 10)
          sp.v = 0
        }
      }
      setTick((t) => t + 1)
      raf = requestAnimationFrame(frame)
    }
    const hash = (s: string) => {
      let h = 0
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
      return h
    }
    raf = requestAnimationFrame(frame)

    onCleanup(() => {
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
    })
  })

  const cablePath = (a: { x: number; y: number }, b: { x: number; y: number }, sag: number) => {
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2 + sag
    // Pointer proximity lifts the control point — the cable ripples aside.
    const d = Math.hypot(pointer.x - mx, pointer.y - my)
    const push = props.reduced ? 0 : Math.max(0, 1 - d / 120) * 26
    const py = my - push
    return `M ${a.x} ${a.y} Q ${mx} ${py} ${b.x} ${b.y}`
  }

  return (
    <svg class="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <For each={props.cables()}>
        {(cable, i) => {
          const a = () => jackPoint(cable.from, "out")
          const b = () => jackPoint(cable.to, "in")
          const key = `${cable.from}->${cable.to}`
          return (
            <Show when={a() && b()}>
              <g>
                {/* wide invisible hit path for unplugging */}
                <path
                  d={cablePath(a()!, b()!, spring(key).s)}
                  fill="none"
                  stroke="transparent"
                  stroke-width="12"
                  class="pointer-events-auto cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    props.onRemove(i())
                  }}
                />
                <path
                  d={cablePath(a()!, b()!, spring(key).s)}
                  fill="none"
                  stroke={props.accentOf(cable.from)}
                  stroke-width="2"
                  stroke-linecap="round"
                  opacity="0.85"
                />
                <circle cx={a()!.x} cy={a()!.y} r="4" fill={props.accentOf(cable.from)} />
                <circle cx={b()!.x} cy={b()!.y} r="4" fill={props.accentOf(cable.to)} />
              </g>
            </Show>
          )
        }}
      </For>
      <Show when={props.armed()}>
        {(armed) => {
          const a = () => jackPoint(armed().from, "out")
          return (
            <Show when={a()}>
              <path
                d={cablePath(a()!, { x: armed().x, y: armed().y }, 10)}
                fill="none"
                stroke={props.accentOf(armed().from)}
                stroke-width="2"
                stroke-dasharray="6 5"
                stroke-linecap="round"
                opacity="0.9"
              />
              <circle cx={a()!.x} cy={a()!.y} r="4" fill={props.accentOf(armed().from)} />
            </Show>
          )
        }}
      </Show>
    </svg>
  )
}
