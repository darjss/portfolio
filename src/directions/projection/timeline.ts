export const reels = [
  { id: "opening", label: "titles", aspect: 1.85, length: 2.4 },
  { id: "golomt", label: "reel 1", aspect: 1.37, length: 5.4 },
  { id: "erxes", label: "reel 2", aspect: 1.85, length: 6.4 },
  { id: "amerik", label: "reel 3", aspect: 1.66, length: 3.2 },
  { id: "projects", label: "reel 4", aspect: 2.39, length: 7.5 },
  { id: "credits", label: "end", aspect: 1.85, length: 4.5 },
] as const

export type ReelId = (typeof reels)[number]["id"]

export const changeovers = ["splice", "burn", "runout", "burn", "splice"] as const
export type Changeover = (typeof changeovers)[number]

export const LOGICAL_HEIGHT = 720
export const TRANSITION_HALF = 0.22

const starts = reels.map((_, i) => reels.slice(0, i).reduce((sum, r) => sum + r.length, 0))
export const totalLength = starts[starts.length - 1] + reels[reels.length - 1].length

export const reelStart = (i: number) => starts[i]

export const locate = (s: number) => {
  const pos = Math.min(Math.max(s, 0), totalLength)
  let index = 0
  for (let i = 0; i < reels.length; i++) if (pos >= starts[i]) index = i
  const local = Math.min(Math.max((pos - starts[index]) / reels[index].length, 0), 1)
  let change: { kind: Changeover; t: number; from: number; to: number } | null = null
  for (let i = 1; i < reels.length; i++) {
    const t = (pos - starts[i]) / TRANSITION_HALF
    if (t > -1 && t < 1) change = { kind: changeovers[i - 1], t, from: i - 1, to: i }
  }
  return { index, local, change }
}

export const aperture = (aspect: number, vw: number, vh: number) => {
  const maxW = vw * 0.9
  const maxH = vh * 0.7
  const w = Math.min(maxW, maxH * aspect)
  const h = w / aspect
  const cx = vw / 2
  const cy = vh * 0.425
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

export const window01 = (x: number, a: number, b: number, fadeIn: number, fadeOut: number) =>
  smoothstep(a, a + fadeIn, x) * (1 - smoothstep(b - fadeOut, b, x))
