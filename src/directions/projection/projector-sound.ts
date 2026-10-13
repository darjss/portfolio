export function createProjectorSound() {
  const ac = new AudioContext()
  const master = ac.createGain()
  master.gain.value = 0
  master.connect(ac.destination)
  master.gain.setTargetAtTime(0.7, ac.currentTime, 0.4)

  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
  const data = noise.getChannelData(0)
  let brown = 0
  for (let i = 0; i < data.length; i++) {
    brown = (brown + (Math.random() * 2 - 1) * 0.02) * 0.995
    data[i] = brown * 3.5
  }

  const click = ac.createBuffer(1, Math.round(ac.sampleRate * 0.022), ac.sampleRate)
  const clickData = click.getChannelData(0)
  for (let i = 0; i < clickData.length; i++) {
    const t = i / clickData.length
    clickData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 9) * (t < 0.04 ? t / 0.04 : 1)
  }

  const motorFilter = ac.createBiquadFilter()
  motorFilter.type = "lowpass"
  motorFilter.frequency.value = 260
  const motorGain = ac.createGain()
  motorGain.gain.value = 0.05
  motorFilter.connect(motorGain).connect(master)
  const motor = ac.createOscillator()
  motor.type = "sawtooth"
  motor.frequency.value = 12
  motor.frequency.setTargetAtTime(48, ac.currentTime, 0.5)
  motor.connect(motorFilter)
  const whine = ac.createOscillator()
  whine.type = "sine"
  whine.frequency.value = 40
  whine.frequency.setTargetAtTime(144, ac.currentTime, 0.5)
  const whineGain = ac.createGain()
  whineGain.gain.value = 0.018
  whine.connect(whineGain).connect(master)

  const fan = ac.createBufferSource()
  fan.buffer = noise
  fan.loop = true
  const fanFilter = ac.createBiquadFilter()
  fanFilter.type = "bandpass"
  fanFilter.frequency.value = 420
  fanFilter.Q.value = 0.6
  const fanGain = ac.createGain()
  fanGain.gain.value = 0.16
  fan.connect(fanFilter).connect(fanGain).connect(master)

  motor.start()
  whine.start()
  fan.start()

  let rate = 0.15
  let target = 1
  let level = 0.5
  let next = ac.currentTime + 0.05

  const tick = (time: number, freq: number, gain: number) => {
    const src = ac.createBufferSource()
    src.buffer = click
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = ac.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = freq
    filter.Q.value = 1.4
    const g = ac.createGain()
    g.gain.value = gain
    src.connect(filter).connect(g).connect(master)
    src.start(time)
  }

  const schedule = () => {
    rate += (target - rate) * 0.08
    const period = 1 / (24 * Math.max(rate, 0.1))
    while (next < ac.currentTime + 0.12) {
      tick(next, 2600 + Math.random() * 600, 0.22 * level * (0.8 + Math.random() * 0.3))
      tick(next + period * 0.38, 1300 + Math.random() * 300, 0.12 * level)
      next += period
    }
    motor.frequency.setTargetAtTime(48 * rate, ac.currentTime, 0.1)
    whine.frequency.setTargetAtTime(144 * rate, ac.currentTime, 0.1)
  }
  const timer = window.setInterval(schedule, 25)

  return {
    setSpeed(speed: number) {
      target = 1 + Math.min(speed, 3)
      level = 0.5 + Math.min(speed, 2) * 0.25
    },
    beep() {
      const o = ac.createOscillator()
      o.frequency.value = 1000
      const g = ac.createGain()
      g.gain.setValueAtTime(0.0001, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.005)
      g.gain.setValueAtTime(0.25, ac.currentTime + 0.042)
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05)
      o.connect(g).connect(master)
      o.start()
      o.stop(ac.currentTime + 0.06)
    },
    thump() {
      const src = ac.createBufferSource()
      src.buffer = noise
      const filter = ac.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = 180
      const g = ac.createGain()
      g.gain.setValueAtTime(0.9, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18)
      src.connect(filter).connect(g).connect(master)
      src.start()
      src.stop(ac.currentTime + 0.2)
    },
    stop() {
      window.clearInterval(timer)
      master.gain.setTargetAtTime(0, ac.currentTime, 0.15)
      window.setTimeout(() => void ac.close(), 600)
    },
  }
}

export type ProjectorSound = ReturnType<typeof createProjectorSound>
