// Frost creeping in from the viewport edges, like breath on a bus window.
// A lightweight 2D-canvas take on the Canvas UI Frost/Bubble pairing: frost
// grain grows in from the edges with an intensity bound to the real
// temperature, the cursor melts a clear patch, and the pane freezes back over.

export interface FrostOptions {
  /** Target intensity 0..1, read live (bound to temperature). */
  intensity: () => number
  /** Delay in ms before the frost starts creeping in. */
  activateAfterMs?: number
}

export interface FrostHandle {
  destroy: () => void
}

interface Melt {
  x: number
  y: number
  r: number
  life: number
}

export function createFrost(
  canvas: HTMLCanvasElement,
  options: FrostOptions,
): FrostHandle | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let width = 0
  let height = 0

  // Frost grain tile.
  const tile = document.createElement("canvas")
  tile.width = 160
  tile.height = 160
  const tctx = tile.getContext("2d")!
  for (let i = 0; i < 2600; i++) {
    const a = Math.random()
    tctx.fillStyle = `rgba(215,232,250,${(0.12 + a * 0.5).toFixed(3)})`
    const s = Math.random() < 0.06 ? 2 : 1
    tctx.fillRect(Math.random() * 160, Math.random() * 160, s, s)
  }
  // A few bright crystal streaks.
  tctx.strokeStyle = "rgba(230,242,255,0.35)"
  tctx.lineWidth = 1
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 160
    const y = Math.random() * 160
    tctx.beginPath()
    tctx.moveTo(x, y)
    tctx.lineTo(x + (Math.random() - 0.5) * 26, y + (Math.random() - 0.5) * 26)
    tctx.stroke()
  }

  // Persistent frost layer + its pre-masked base.
  const layer = document.createElement("canvas")
  const lctx = layer.getContext("2d")!
  const base = document.createElement("canvas")
  const bctx = base.getContext("2d")!

  let builtIntensity = -1
  let current = 0
  const startTime = performance.now()
  const activateAt = startTime + (options.activateAfterMs ?? 0)

  function buildBase(intensity: number) {
    builtIntensity = intensity
    base.width = width
    base.height = height
    bctx.clearRect(0, 0, width, height)
    if (intensity <= 0.001 || width === 0 || height === 0) return
    const pattern = bctx.createPattern(tile, "repeat")
    if (!pattern) return
    bctx.globalAlpha = 0.35 + 0.55 * intensity
    bctx.fillStyle = pattern
    bctx.fillRect(0, 0, width, height)
    bctx.globalAlpha = 1
    // Keep only the edges: transparent center, opaque rim. The clear center
    // shrinks as it gets colder.
    const maxR = Math.hypot(width, height) / 2
    const inner = maxR * (0.78 - 0.58 * intensity)
    const mask = bctx.createRadialGradient(
      width / 2, height / 2, Math.max(inner, 1),
      width / 2, height / 2, maxR,
    )
    mask.addColorStop(0, "rgba(0,0,0,0)")
    mask.addColorStop(1, "rgba(0,0,0,1)")
    bctx.globalCompositeOperation = "destination-in"
    bctx.fillStyle = mask
    bctx.fillRect(0, 0, width, height)
    bctx.globalCompositeOperation = "source-over"
  }

  function syncSize() {
    width = Math.max(1, canvas.clientWidth)
    height = Math.max(1, canvas.clientHeight)
    canvas.width = width
    canvas.height = height
    layer.width = width
    layer.height = height
    builtIntensity = -1
  }

  syncSize()
  const observer = new ResizeObserver(syncSize)
  observer.observe(canvas)

  const melts: Melt[] = []

  function onPointerMove(event: PointerEvent) {
    melts.push({ x: event.clientX, y: event.clientY, r: 74, life: 1 })
    if (melts.length > 48) melts.shift()
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true })

  let raf = 0
  let lastTime = performance.now()
  let destroyed = false

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - lastTime) / 1000, 1 / 10)
    lastTime = now

    const target = now < activateAt ? 0 : options.intensity()
    current += (target - current) * Math.min(delta * 0.8, 1)
    if (Math.abs(current - builtIntensity) > 0.01) buildBase(current)

    if (current > 0.003) {
      // Slow freeze-back.
      lctx.globalAlpha = 0.012 + 0.03 * current
      lctx.drawImage(base, 0, 0)
      lctx.globalAlpha = 1

      // Cursor melt.
      lctx.globalCompositeOperation = "destination-out"
      for (let i = melts.length - 1; i >= 0; i--) {
        const melt = melts[i]
        melt.life -= delta * 0.5
        if (melt.life <= 0) {
          melts.splice(i, 1)
          continue
        }
        const g = lctx.createRadialGradient(
          melt.x, melt.y, 1,
          melt.x, melt.y, melt.r,
        )
        g.addColorStop(0, `rgba(0,0,0,${(0.5 * melt.life).toFixed(3)})`)
        g.addColorStop(1, "rgba(0,0,0,0)")
        lctx.fillStyle = g
        lctx.beginPath()
        lctx.arc(melt.x, melt.y, melt.r, 0, Math.PI * 2)
        lctx.fill()
      }
      lctx.globalCompositeOperation = "source-over"

      ctx!.clearRect(0, 0, width, height)
      ctx!.drawImage(layer, 0, 0)
    } else {
      ctx!.clearRect(0, 0, width, height)
    }

    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
    },
  }
}
