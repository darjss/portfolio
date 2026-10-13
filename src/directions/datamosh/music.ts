import type { Pulse } from "./codec"

const TRACK_IDS = [1800020722, 1803726236, 1655225508, 1672465089, 1800020686, 1655225321]

type LookupResult = {
  trackId: number
  artistName: string
  trackName: string
  artworkUrl100: string
  trackViewUrl: string
  previewUrl?: string
}

export type Track = { artist: string; title: string; art: string; url: string; preview: string }

export async function loadTracks() {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${TRACK_IDS.join(",")}`)
  const { results }: { results: LookupResult[] } = await res.json()
  return TRACK_IDS.flatMap((id): Track[] => {
    const r = results.find((x) => x.trackId === id)
    if (!r?.previewUrl) return []
    return [{ artist: r.artistName, title: r.trackName, art: r.artworkUrl100, url: r.trackViewUrl.split("?")[0], preview: r.previewUrl }]
  })
}

export type Music = ReturnType<typeof createMusic>

export function createMusic(tracks: Track[], onTrack: (index: number) => void) {
  const ctx = new AudioContext()
  const audio = new Audio()
  audio.crossOrigin = "anonymous"
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  ctx.createMediaElementSource(audio).connect(analyser).connect(ctx.destination)
  const bins = new Uint8Array(analyser.frequencyBinCount)
  const binHz = ctx.sampleRate / analyser.fftSize

  let index = 0
  const play = (i: number) => {
    index = (i + tracks.length) % tracks.length
    audio.src = tracks[index].preview
    onTrack(index)
    void ctx.resume()
    return audio.play()
  }
  audio.addEventListener("ended", () => void play(index + 1))

  const band = (lo: number, hi: number) => {
    const a = Math.floor(lo / binHz)
    const b = Math.ceil(hi / binHz)
    let sum = 0
    for (let i = a; i <= b; i++) sum += bins[i]
    return sum / (b - a + 1) / 255
  }

  let lowAvg = 0
  let highAvg = 0
  let level = 0
  let lastKick = -10
  let lastSnare = -10
  let kicks = 0
  let lastSample = 0

  return {
    play,
    next: () => play(index + 1),
    prev: () => play(index - 1),
    get index() {
      return index
    },
    get playing() {
      return !audio.paused
    },
    toggle() {
      if (!audio.src) return play(0)
      return audio.paused ? audio.play() : audio.pause()
    },
    sample(): Pulse {
      if (audio.paused) return { pump: 0, snare: 0, level: 0, bar: -1 }
      analyser.getByteFrequencyData(bins)
      const now = ctx.currentTime
      const k = 1 - Math.exp(-Math.max(now - lastSample, 0) / 0.3)
      lastSample = now
      const low = band(40, 140)
      const high = band(1800, 6000)
      if (low > lowAvg * 1.18 && low > 0.4 && now - lastKick > 0.2) {
        lastKick = now
        kicks++
      }
      if (high > highAvg * 1.3 && high > 0.18 && now - lastSnare > 0.15) lastSnare = now
      lowAvg += (low - lowAvg) * k
      highAvg += (high - highAvg) * k
      level += (Math.min(band(40, 12000) * 1.8, 1) - level) * Math.min(k * 3, 1)
      return {
        pump: Math.exp(-(now - lastKick) / 0.09),
        snare: Math.exp(-(now - lastSnare) / 0.07),
        level,
        bar: Math.floor(kicks / 4),
      }
    },
    destroy() {
      audio.pause()
      audio.src = ""
      void ctx.close()
    },
  }
}
