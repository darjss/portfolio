// Droplets: full-viewport precipitation mode. Streaks slanted by the real
// wind. A lightweight 2D-canvas adaptation of canvasui-docs Droplets.

export interface RainOptions {
  /** Precipitation in mm, read live. Zero pauses the loop. */
  amount: () => number
  /** Wind direction in degrees (where the wind comes from). */
  windDirection: () => number
}

export interface RainHandle {
  destroy: () => void
}

interface Drop {
  x: number
  y: number
  speed: number
  length: number
}

export function createRain(
  canvas: HTMLCanvasElement,
  options: RainOptions,
): RainHandle | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let width = 0
  let height = 0

  function syncSize() {
    width = Math.max(1, canvas.clientWidth)
    height = Math.max(1, canvas.clientHeight)
    canvas.width = width
    canvas.height = height
  }
  syncSize()
  const observer = new ResizeObserver(syncSize)
  observer.observe(canvas)

  const drops: Drop[] = []
  function spawn(): Drop {
    return {
      x: Math.random() * (width + 200) - 100,
      y: Math.random() * -height,
      speed: 500 + Math.random() * 420,
      length: 10 + Math.random() * 16,
    }
  }

  let raf = 0
  let lastTime = performance.now()
  let destroyed = false
  let running = false

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - lastTime) / 1000, 1 / 20)
    lastTime = now

    const amount = options.amount()
    if (amount <= 0.001) {
      running = false
      ctx!.clearRect(0, 0, width, height)
      return
    }

    const wanted = Math.min(Math.round(amount * 50) + 24, 180)
    while (drops.length < wanted) drops.push(spawn())
    if (drops.length > wanted) drops.length = wanted

    // Slant the streaks along the wind vector.
    const radians = ((options.windDirection() + 180) * Math.PI) / 180
    const slant = Math.sin(radians) * 0.35

    ctx!.clearRect(0, 0, width, height)
    ctx!.strokeStyle = "rgba(170,196,228,0.4)"
    ctx!.lineWidth = 1
    ctx!.beginPath()
    for (const drop of drops) {
      drop.y += drop.speed * delta
      drop.x += drop.speed * slant * delta
      if (drop.y > height + 20) {
        drop.y = -20
        drop.x = Math.random() * (width + 200) - 100
      }
      ctx!.moveTo(drop.x, drop.y)
      ctx!.lineTo(drop.x - drop.length * slant, drop.y - drop.length)
    }
    ctx!.stroke()

    raf = requestAnimationFrame(frame)
  }

  // Poll until precipitation starts so the loop can sleep on dry days.
  let pollTimer = 0
  function poll() {
    if (destroyed) return
    if (options.amount() > 0.001 && !running) {
      running = true
      lastTime = performance.now()
      raf = requestAnimationFrame(frame)
    }
    pollTimer = window.setTimeout(poll, 2000)
  }
  poll()

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      window.clearTimeout(pollTimer)
      observer.disconnect()
    },
  }
}
