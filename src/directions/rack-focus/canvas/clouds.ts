// Contained 2D fog that drifts behind the plate stack. Each cloud is pinned
// to a fixed depth between two focal planes, so a focus pull pushes it past
// the viewer with parallax. Pure canvas — no DOM capture needed.

export interface CloudsInstance {
  destroy: () => void
}

interface Cloud {
  depth: number // z position on the same axis as the planes (0..planeCount)
  x: number // base position, fraction of viewport
  y: number
  r: number // radius, fraction of the smaller viewport side
  drift: number // slow sideways drift speed
  alpha: number
}

const TEAL = [143, 184, 200] as const
const BLUE = [42, 74, 138] as const

export function createClouds(
  canvas: HTMLCanvasElement,
  options: { focus: () => number; still: boolean },
): CloudsInstance | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const clouds: Cloud[] = []
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 16; i++) {
    clouds.push({
      depth: 0.4 + rand() * 8.2,
      x: rand(),
      y: rand(),
      r: 0.16 + rand() * 0.3,
      drift: (rand() - 0.5) * 0.006,
      alpha: 0.05 + rand() * 0.06,
    })
  }

  let width = 0
  let height = 0
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    canvas.width = width
    canvas.height = height
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  const draw = (time: number) => {
    ctx.clearRect(0, 0, width, height)
    const minSide = Math.min(width, height)
    const focus = options.focus()
    for (const cloud of clouds) {
      const t = cloud.depth / 9
      const cr = Math.round(TEAL[0] + (BLUE[0] - TEAL[0]) * t)
      const cg = Math.round(TEAL[1] + (BLUE[1] - TEAL[1]) * t)
      const cb = Math.round(TEAL[2] + (BLUE[2] - TEAL[2]) * t)
      // parallax: a cloud slides opposite the pull as focus passes its depth
      const parallax = (focus - cloud.depth) * 0.09
      const cx = ((cloud.x + parallax + time * cloud.drift) % 1.2 + 1.2) % 1.2 - 0.1
      const cy = cloud.y + (focus - cloud.depth) * 0.02
      const radius = cloud.r * minSide
      const gradient = ctx.createRadialGradient(
        cx * width,
        cy * height,
        0,
        cx * width,
        cy * height,
        radius,
      )
      gradient.addColorStop(0, `rgba(${cr},${cg},${cb},${cloud.alpha})`)
      gradient.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
      ctx.fillStyle = gradient
      ctx.fillRect(cx * width - radius, cy * height - radius, radius * 2, radius * 2)
    }
  }

  let raf = 0
  let destroyed = false
  if (options.still) {
    draw(0)
  } else {
    const loop = (now: number) => {
      if (destroyed) return
      draw(now / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
  }

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
    },
  }
}
