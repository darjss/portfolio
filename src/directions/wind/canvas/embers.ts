// Blaze: ger-fire embers rising over the bio section. A lightweight
// 2D-canvas adaptation of canvasui-docs Blaze (sparks + glow, no smoke sim).

export interface EmberHandle {
  destroy: () => void
}

interface Ember {
  x: number
  y: number
  vy: number
  vx: number
  size: number
  life: number
  maxLife: number
  hue: number
}

export function createEmbers(canvas: HTMLCanvasElement): EmberHandle | null {
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

  const embers: Ember[] = []
  function spawn(): Ember {
    const maxLife = 2 + Math.random() * 3
    return {
      x: Math.random() * width,
      y: height + 6,
      vy: 26 + Math.random() * 46,
      vx: (Math.random() - 0.5) * 18,
      size: 1 + Math.random() * 2,
      life: 0,
      maxLife,
      hue: 18 + Math.random() * 22,
    }
  }

  let raf = 0
  let lastTime = performance.now()
  let destroyed = false
  let visible = true

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true
  })
  intersection.observe(canvas)

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - lastTime) / 1000, 1 / 20)
    lastTime = now

    if (visible) {
      const wanted = Math.min(Math.round(width / 22), 56)
      while (embers.length < wanted) embers.push(spawn())

      ctx!.clearRect(0, 0, width, height)
      for (let i = embers.length - 1; i >= 0; i--) {
        const ember = embers[i]
        ember.life += delta
        if (ember.life >= ember.maxLife || ember.y < -10) {
          embers[i] = spawn()
          continue
        }
        ember.y -= ember.vy * delta
        ember.x += (ember.vx + Math.sin(ember.life * 5 + ember.maxLife) * 9) * delta
        const fade = 1 - ember.life / ember.maxLife
        const flicker = 0.6 + 0.4 * Math.sin(ember.life * 22)
        ctx!.fillStyle = `hsla(${ember.hue}, 92%, 58%, ${(fade * flicker * 0.85).toFixed(3)})`
        ctx!.beginPath()
        ctx!.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      intersection.disconnect()
    },
  }
}
