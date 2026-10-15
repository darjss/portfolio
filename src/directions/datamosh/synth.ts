const BPM = 160
const STEP = 60 / BPM / 4

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

const CHORDS = [
  [63, 66, 70, 73],
  [59, 63, 66, 70],
  [66, 70, 73, 77],
  [61, 65, 68, 71],
]
const ROOTS = [39, 35, 42, 37]
const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0]
const KICK_B = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0]
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
const CHOPS = [0, 3, 6, 8, 10, 11, 14]
const CHOP_DEGREE = [3, 2, 1, 2, 3, 1, 0]
const VOWELS = [
  [800, 1150, 2900],
  [400, 1600, 2700],
  [350, 1900, 2800],
  [450, 800, 2830],
]

export type Synth = ReturnType<typeof createSynth>

export function createSynth() {
  const ctx = new AudioContext()
  void ctx.resume()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 6
  comp.attack.value = 0.003
  comp.release.value = 0.12
  const master = ctx.createGain()
  master.gain.value = 0.7
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  master.connect(comp).connect(analyser).connect(ctx.destination)

  const duck = ctx.createGain()
  duck.connect(master)

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  const shaper = ctx.createWaveShaper()
  const curve = new Float32Array(1024)
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 4)
  shaper.curve = curve
  const subLow = ctx.createBiquadFilter()
  subLow.type = "lowpass"
  subLow.frequency.value = 1400
  const subGain = ctx.createGain()
  subGain.gain.value = 0.42
  shaper.connect(subLow).connect(subGain).connect(master)

  const kicks: number[] = []
  const snares: number[] = []

  const env = (gain: AudioParam, t: number, peak: number, attack: number, decay: number) => {
    gain.setValueAtTime(0.0001, t)
    gain.exponentialRampToValueAtTime(peak, t + attack)
    gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  const noiseSource = (t: number, length: number) => {
    const src = ctx.createBufferSource()
    src.buffer = noise
    src.start(t, Math.random() * 0.5, length)
    return src
  }

  const kick = (t: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(190, t)
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.07)
    env(gain.gain, t, 1, 0.002, 0.24)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.3)
    duck.gain.setValueAtTime(0.12, t)
    duck.gain.setTargetAtTime(1, t + 0.03, 0.07)
    kicks.push(t)
  }

  const sub = (t: number, note: number, length: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const f = midi(note)
    osc.frequency.setValueAtTime(f * 2, t)
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.04)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.9, t + 0.005)
    gain.gain.setTargetAtTime(0.5, t + 0.05, 0.2)
    gain.gain.setTargetAtTime(0.0001, t + length - 0.02, 0.02)
    osc.connect(gain).connect(shaper)
    osc.start(t)
    osc.stop(t + length + 0.1)
  }

  const snare = (t: number) => {
    const src = noiseSource(t, 0.25)
    const band = ctx.createBiquadFilter()
    band.type = "bandpass"
    band.frequency.value = 2200
    band.Q.value = 0.7
    const gain = ctx.createGain()
    env(gain.gain, t, 0.7, 0.002, 0.17)
    src.connect(band).connect(gain).connect(master)
    const body = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    body.type = "triangle"
    body.frequency.setValueAtTime(330, t)
    body.frequency.exponentialRampToValueAtTime(180, t + 0.08)
    env(bodyGain.gain, t, 0.5, 0.002, 0.09)
    body.connect(bodyGain).connect(master)
    body.start(t)
    body.stop(t + 0.15)
    snares.push(t)
  }

  const hat = (t: number, level: number) => {
    const src = noiseSource(t, 0.06)
    const high = ctx.createBiquadFilter()
    high.type = "highpass"
    high.frequency.value = 8000
    const gain = ctx.createGain()
    env(gain.gain, t, level, 0.001, 0.035)
    src.connect(high).connect(gain).connect(master)
  }

  const chord = (t: number, notes: number[], length: number) => {
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 2
    filter.frequency.setValueAtTime(7000, t)
    filter.frequency.exponentialRampToValueAtTime(1800, t + length)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01)
    gain.gain.setTargetAtTime(0.0001, t + length - 0.05, 0.04)
    filter.connect(gain).connect(duck)
    for (const note of notes) {
      for (const [detune, pan] of [
        [-22, -0.8],
        [-11, -0.4],
        [0, 0],
        [11, 0.4],
        [22, 0.8],
      ]) {
        const osc = ctx.createOscillator()
        const panner = ctx.createStereoPanner()
        osc.type = "sawtooth"
        osc.frequency.value = midi(note)
        osc.detune.value = detune
        panner.pan.value = pan
        osc.connect(panner).connect(filter)
        osc.start(t)
        osc.stop(t + length + 0.3)
      }
    }
  }

  const chop = (t: number, note: number, vowel: number[], length: number) => {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    const f = midi(note)
    osc.frequency.setValueAtTime(f * 0.94, t)
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.035)
    const vibrato = ctx.createOscillator()
    const depth = ctx.createGain()
    vibrato.frequency.value = 7
    depth.gain.value = f * 0.012
    vibrato.connect(depth).connect(osc.frequency)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.008)
    gain.gain.setTargetAtTime(0.0001, t + length * 0.8, 0.02)
    gain.connect(duck)
    vowel.forEach((formant, i) => {
      const band = ctx.createBiquadFilter()
      band.type = "bandpass"
      band.frequency.value = formant * 1.25
      band.Q.value = 9
      const level = ctx.createGain()
      level.gain.value = [1.4, 0.8, 0.45][i]
      osc.connect(band).connect(level).connect(gain)
    })
    osc.start(t)
    vibrato.start(t)
    osc.stop(t + length + 0.2)
    vibrato.stop(t + length + 0.2)
  }

  const schedule = (step: number, t: number) => {
    const s = step % 16
    const bar = Math.floor(step / 16) % 4
    const kickPattern = bar % 2 ? KICK_B : KICK
    if (s === 0) chord(t, CHORDS[bar], STEP * 16)
    if (kickPattern[s]) {
      kick(t)
      let next = s + 1
      while (next < 16 && !kickPattern[next]) next++
      sub(t, ROOTS[bar], (next - s) * STEP)
    }
    if (SNARE[s] || (bar === 3 && s >= 13)) snare(t)
    const roll = bar === 3 && s >= 12
    hat(t, s % 4 === 2 ? 0.32 : 0.16)
    if (roll || s % 8 === 7) hat(t + STEP / 2, 0.12)
    if (roll) hat(t + STEP / 4, 0.08)
    const chopIndex = CHOPS.indexOf(s)
    if (chopIndex >= 0 && bar !== 3) {
      const note = CHORDS[bar][CHOP_DEGREE[chopIndex]] + 12
      chop(t, note, VOWELS[(step >> 1) % VOWELS.length], STEP * (chopIndex === 6 ? 2 : 1))
    }
    if (bar === 3 && (s === 0 || s === 6)) chop(t, CHORDS[bar][3] + 12 + (s ? 2 : 0), VOWELS[0], STEP * 5)
  }

  let step = 0
  let next = ctx.currentTime + 0.08
  const start = next
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.15) {
      schedule(step++, next)
      next += STEP
    }
    const old = ctx.currentTime - 2
    while (kicks.length && kicks[0] < old) kicks.shift()
    while (snares.length && snares[0] < old) snares.shift()
  }, 25)

  const wave = new Float32Array(analyser.fftSize)
  let level = 0
  const latest = (times: number[], now: number) => {
    for (let i = times.length - 1; i >= 0; i--) if (times[i] <= now) return now - times[i]
    return 10
  }

  return {
    sample() {
      if (ctx.state !== "running") return { kick: 10, snare: 0, level: 0, bar: -1 }
      const now = ctx.currentTime
      analyser.getFloatTimeDomainData(wave)
      let sum = 0
      for (const v of wave) sum += v * v
      level += (Math.min(Math.sqrt(sum / wave.length) * 3, 1) - level) * 0.2
      return {
        kick: latest(kicks, now),
        snare: Math.exp(-latest(snares, now) / 0.07),
        level,
        bar: Math.floor((now - start) / (STEP * 16)),
      }
    },
    get playing() {
      return ctx.state === "running"
    },
    toggle() {
      return ctx.state === "running" ? ctx.suspend() : ctx.resume()
    },
    destroy() {
      clearInterval(timer)
      void ctx.close()
    },
  }
}
