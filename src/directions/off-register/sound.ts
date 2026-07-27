// Press sound engine for the off-register direction.
// A two-oscillator mains hum (slightly detuned = "out of phase") plus tape
// hiss runs while plates are unregistered. Each lock fires a mechanical
// thunk; the ninth lock silences the hum before one heavy press stroke.

export interface PressSound {
  /** Create/resume the AudioContext. Must be called from a user gesture. */
  unlock: () => void
  /** Hum loudness, 0 (silent) to 1 (full ghost chorus). */
  setHum: (level: number) => void
  /** Slow ramp to true silence — the signature moment. */
  silence: () => void
  /** Physical press thunk. Heavy = the full-registration stroke. */
  thunk: (heavy?: boolean) => void
  destroy: () => void
}

export function createPressSound(): PressSound {
  let ctx: AudioContext | null = null
  let humGain: GainNode | null = null
  let level = 1
  let dead = false

  function ensure() {
    if (ctx || typeof AudioContext === "undefined") return
    try {
      ctx = new AudioContext()
      humGain = ctx.createGain()
      humGain.gain.value = 0
      humGain.connect(ctx.destination)

      const filter = ctx.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = 260
      filter.connect(humGain)

      // two sawtooths a hair apart, beating against each other
      const low = ctx.createOscillator()
      low.type = "sawtooth"
      low.frequency.value = 50
      const lowGain = ctx.createGain()
      lowGain.gain.value = 0.5
      low.connect(lowGain).connect(filter)
      low.start()

      const high = ctx.createOscillator()
      high.type = "sawtooth"
      high.frequency.value = 100.7
      const highGain = ctx.createGain()
      highGain.gain.value = 0.18
      high.connect(highGain).connect(filter)
      high.start()

      // tape hiss
      const noiseLen = ctx.sampleRate * 2
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
      const noiseData = noiseBuf.getChannelData(0)
      for (let i = 0; i < noiseLen; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.25
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuf
      noise.loop = true
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = "bandpass"
      noiseFilter.frequency.value = 1800
      noiseFilter.Q.value = 0.6
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.06
      noise.connect(noiseFilter).connect(noiseGain).connect(humGain)
      noise.start()

      humGain.gain.linearRampToValueAtTime(0.05 * level, ctx.currentTime + 0.8)
    } catch {
      ctx = null
      humGain = null
    }
  }

  return {
    unlock() {
      if (dead) return
      ensure()
      if (ctx && ctx.state === "suspended") void ctx.resume()
    },
    setHum(next) {
      level = Math.min(Math.max(next, 0), 1)
      if (!ctx || !humGain || dead) return
      humGain.gain.cancelScheduledValues(ctx.currentTime)
      humGain.gain.linearRampToValueAtTime(0.05 * level, ctx.currentTime + 0.4)
    },
    silence() {
      level = 0
      if (!ctx || !humGain || dead) return
      humGain.gain.cancelScheduledValues(ctx.currentTime)
      humGain.gain.setValueAtTime(humGain.gain.value, ctx.currentTime)
      humGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4)
    },
    thunk(heavy = false) {
      if (!ctx || dead) return
      try {
        const t = ctx.currentTime
        // press thump: pitch-dropping sine body
        const osc = ctx.createOscillator()
        osc.type = "sine"
        osc.frequency.setValueAtTime(heavy ? 150 : 180, t)
        osc.frequency.exponentialRampToValueAtTime(heavy ? 32 : 48, t + (heavy ? 0.35 : 0.18))
        const oscGain = ctx.createGain()
        oscGain.gain.setValueAtTime(heavy ? 0.7 : 0.45, t)
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.55 : 0.25))
        osc.connect(oscGain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.6)

        // mechanical click: short filtered noise burst
        const len = Math.floor(ctx.sampleRate * 0.06)
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
        const click = ctx.createBufferSource()
        click.buffer = buf
        const band = ctx.createBiquadFilter()
        band.type = "bandpass"
        band.frequency.value = heavy ? 900 : 1400
        const clickGain = ctx.createGain()
        clickGain.gain.setValueAtTime(heavy ? 0.5 : 0.3, t)
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
        click.connect(band).connect(clickGain).connect(ctx.destination)
        click.start(t)
      } catch {}
    },
    destroy() {
      dead = true
      if (ctx) {
        void ctx.close().catch(() => {})
        ctx = null
        humGain = null
      }
    },
  }
}
