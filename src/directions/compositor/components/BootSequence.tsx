// TTY boot log that types itself, then dissolves into drifting dust.
// The dissolve follows the canvasui "Particle Reveal" idea — bright pixels become
// grains that wander from their home position — hand-rolled here because the boot
// log is drawn directly to canvas and needs no html-in-canvas capture.

import { onCleanup, onMount } from "solid-js"

const LINES: Array<{ text: string; accent?: boolean }> = [
  { text: "dankmaterialshell v0.4.2 — wayland session" },
  { text: "[  ok  ] loading dankmaterialshell…" },
  { text: "[  ok  ] mounting /home/darjs…" },
  { text: "[  ok  ] pipewire… wireplumber…" },
  { text: "[  ok  ] starting dms greeter on seat0…" },
  { text: "compositor ready — welcome, darjs", accent: true },
]

const TYPE_MS = 1400
const DUST_MS = 1600

interface Grain {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  delay: number
  rose: boolean
}

export default function BootSequence(props: { onDone: () => void }) {
  let canvas!: HTMLCanvasElement

  onMount(() => {
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      props.onDone()
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const font = '14px "JetBrains Mono", ui-monospace, monospace'
    const lineHeight = 24
    const originX = () => Math.max(24, width / 2 - 320)
    const originY = () => Math.max(48, height / 2 - (LINES.length * lineHeight) / 2)

    const fullText = LINES.map((l) => l.text)
    const totalChars = fullText.reduce((n, t) => n + t.length, 0)

    const drawText = (progress: number) => {
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, width, height)
      ctx.font = font
      ctx.textBaseline = "top"
      let budget = Math.floor(progress * totalChars)
      let cursorX = 0
      let cursorY = 0
      for (let i = 0; i < fullText.length; i++) {
        const line = fullText[i]
        const shown = line.slice(0, Math.max(0, Math.min(line.length, budget)))
        budget -= line.length
        ctx.fillStyle = LINES[i].accent ? "#f43f5e" : "#a3a3a3"
        ctx.fillText(shown, originX(), originY() + i * lineHeight)
        if (shown.length < line.length || i === fullText.length - 1) {
          cursorX = originX() + ctx.measureText(shown).width
          cursorY = originY() + i * lineHeight
          if (shown.length < line.length) break
        }
      }
      if (progress < 1 && Math.floor(performance.now() / 400) % 2 === 0) {
        ctx.fillStyle = "#e5e5e5"
        ctx.fillRect(cursorX + 2, cursorY + 2, 8, 14)
      }
    }

    // Dust phase: sample the finished log into grains.
    let grains: Grain[] = []
    const harvest = () => {
      drawText(1)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const step = Math.max(2, Math.round(2 * dpr))
      const list: Grain[] = []
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const red = data[(y * canvas.width + x) * 4]
          const green = data[(y * canvas.width + x) * 4 + 1]
          // background is #0a0a0a; only bright text pixels become grains
          if (red < 60 && green < 60) continue
          list.push({
            x: x / dpr,
            y: y / dpr,
            vx: (Math.random() - 0.3) * 14,
            vy: -(6 + Math.random() * 22),
            size: step / dpr,
            delay: Math.random() * 0.35,
            rose: red > 200 && green < 120,
          })
        }
      }
      // keep at most 9000 grains, spread across the whole log
      const stride = Math.max(1, Math.ceil(list.length / 9000))
      grains = list.filter((_, i) => i % stride === 0)
    }

    let raf = 0
    let destroyed = false
    const start = performance.now()
    let dustStart = 0

    const frame = (now: number) => {
      if (destroyed) return
      const elapsed = now - start
      if (elapsed < TYPE_MS) {
        drawText(elapsed / TYPE_MS)
      } else {
        if (dustStart === 0) {
          dustStart = now
          harvest()
        }
        const t = (now - dustStart) / DUST_MS
        ctx.fillStyle = "#0a0a0a"
        ctx.fillRect(0, 0, width, height)
        for (const g of grains) {
          const local = Math.max(0, Math.min(1, (t - g.delay) / (1 - g.delay)))
          if (local <= 0) {
            ctx.globalAlpha = 1
            ctx.fillStyle = g.rose ? "#f43f5e" : "#a3a3a3"
            ctx.fillRect(g.x, g.y, g.size, g.size)
            continue
          }
          const wobble = Math.sin(local * 9 + g.x * 0.05) * 6 * local
          ctx.globalAlpha = 1 - local
          ctx.fillStyle = g.rose ? "#f43f5e" : "#8a8a8a"
          ctx.fillRect(
            g.x + g.vx * local + wobble,
            g.y + g.vy * local * 3,
            g.size,
            g.size,
          )
        }
        ctx.globalAlpha = 1
        if (t >= 1) {
          props.onDone()
          return
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    onCleanup(() => {
      destroyed = true
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    })
  })

  return (
    <canvas
      ref={canvas}
      class="fixed inset-0 z-[200] h-full w-full bg-[#0a0a0a]"
      aria-label="boot sequence"
    />
  )
}
