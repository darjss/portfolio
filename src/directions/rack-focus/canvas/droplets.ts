// Droplets on the lens: short refracted streaks that run down the glass
// while a focus pull is in flight, then dry up when the plane settles.

export interface DropletsInstance {
  destroy: () => void
}

interface Drop {
  x: number
  y: number
  length: number
  speed: number
  wobble: number
  phase: number
  life: number
}

export function createDroplets(
  canvas: HTMLCanvasElement,
  options: { activity: () => number },
): DropletsInstance | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const drops: Drop[] = []
  let spawnCarry = 0

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

  let raf = 0
  let last = performance.now()
  let destroyed = false

  const loop = (now: number) => {
    if (destroyed) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const activity = Math.min(Math.max(options.activity(), 0), 1)

    spawnCarry += activity * 26 * dt
    while (spawnCarry >= 1 && drops.length < 48) {
      spawnCarry -= 1
      drops.push({
        x: Math.random(),
        y: -0.05 - Math.random() * 0.1,
        length: 0.03 + Math.random() * 0.07,
        speed: 0.25 + Math.random() * 0.5,
        wobble: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        life: 1,
      })
    }

    ctx.clearRect(0, 0, width, height)
    for (let i = drops.length - 1; i >= 0; i--) {
      const drop = drops[i]
      drop.y += drop.speed * dt
      drop.life = Math.min(drop.life, (1.05 - drop.y) * 4)
      if (drop.y > 1.1 || drop.life <= 0) {
        drops.splice(i, 1)
        continue
      }
      const dpr = width / Math.max(canvas.clientWidth, 1)
      const x = drop.x * width + Math.sin(now / 300 + drop.phase) * drop.wobble * dpr
      const y = drop.y * height
      const gradient = ctx.createLinearGradient(x, y - drop.length * height, x, y)
      gradient.addColorStop(0, "rgba(143,184,200,0)")
      gradient.addColorStop(1, `rgba(200,226,236,${0.28 * drop.life})`)
      ctx.strokeStyle = gradient
      ctx.lineWidth = 1.2 * dpr
      ctx.beginPath()
      ctx.moveTo(x, y - drop.length * height)
      ctx.lineTo(x, y)
      ctx.stroke()
      // the bright head of the drop
      ctx.fillStyle = `rgba(220,240,248,${0.35 * drop.life})`
      ctx.beginPath()
      ctx.arc(x, y, 1.6 * dpr, 0, Math.PI * 2)
      ctx.fill()
    }

    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
    },
  }
}
