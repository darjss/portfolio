// Easter egg: a dithered horse silhouette gallops through the sky layer every
// so often. 1-bit pixel art, checkerboard-stippled like the Canvas UI Dithered
// Object aesthetic, drawn on a small 2D canvas.

export interface HorseHandle {
  destroy: () => void
}

const BODY = [
  "......................####..........",
  "......................#####.........",
  "......................##..##........",
  "......................#....#........",
  ".....................##.............",
  "................######..............",
  ".........#################..........",
  ".....######################.........",
  "...########################.........",
  "..#######################...........",
  "....####################............",
]

const LEGS_A = [
  ".....###....####....###.............",
  "....##......##.......##.............",
  "...##.......##........##............",
  "...#........#..........#............",
  "..##.......##..........##...........",
]

const LEGS_B = [
  ".....###....####....###.............",
  "......##.....###...###..............",
  ".......##.....##.###................",
  ".....................#..............",
  "....................................",
]

const ROWS = BODY.length + LEGS_A.length
const COLS = BODY[0].length

const SCALE = 4

export function createHorse(canvas: HTMLCanvasElement): HorseHandle | null {
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

  function drawFrame(frame: string[], px: number, py: number) {
    const rows = [...BODY, ...frame]
    ctx!.fillStyle = "rgba(244,63,94,0.55)"
    for (let y = 0; y < ROWS; y++) {
      const row = rows[y]
      for (let x = 0; x < COLS; x++) {
        if (row[x] !== "#") continue
        // Checkerboard stipple: a 1-bit Bayer feel.
        if ((x + y) % 2 === 0) {
          ctx!.fillRect(px + x * SCALE, py + y * SCALE, SCALE, SCALE)
        } else {
          ctx!.globalAlpha = 0.45
          ctx!.fillRect(px + x * SCALE, py + y * SCALE, SCALE - 1, SCALE - 1)
          ctx!.globalAlpha = 1
        }
      }
    }
  }

  const spriteW = COLS * SCALE
  let galloping = false
  let start = 0
  let nextRun = performance.now() + 9000 + Math.random() * 14000

  let raf = 0
  let destroyed = false

  function frame(now: number) {
    if (destroyed) return

    if (!galloping && now >= nextRun) {
      galloping = true
      start = now
    }

    ctx!.clearRect(0, 0, width, height)

    if (galloping) {
      const duration = 5200
      const t = (now - start) / duration
      if (t >= 1) {
        galloping = false
        nextRun = now + 16000 + Math.random() * 22000
      } else {
        const px = -spriteW + t * (width + spriteW * 2)
        const py = height * 0.22 + Math.sin(t * Math.PI * 10) * 4
        const legs = Math.floor(now / 130) % 2 === 0 ? LEGS_A : LEGS_B
        drawFrame(legs, px, py)
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
    },
  }
}
