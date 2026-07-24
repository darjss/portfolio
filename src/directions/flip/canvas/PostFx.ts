// PostFx — full-frame post pass for the Flip direction.
// Adapted from canvasui-docs/components/vhs.md and glitch.md (PUBLISHED
// sources), merged into one pass, plus a Laser sweep adapted from
// canvasui-docs/components/laser.md's beam idea.
// Instead of capturing DOM through html-in-canvas, this pass samples the
// AsciiStage output canvas (uploaded as a texture each frame), so the tape
// damage, glitch bursts and laser rides on top of the ascii page.
// Scroll velocity feeds tracking errors and the laser. burst() fires glitch
// bursts on the beat grid. All GPU resources are released in destroy().

import {
  compileShader,
  createBlankTexture,
  createQuad,
  fitCanvas,
} from "./support"

export interface PostFxOptions {
  speed?: number
  wave?: number
  jitter?: number
  crease?: number
  switching?: number
  switchingHeight?: number
  bloom?: number
  aberration?: number
  acBeat?: number
  grain?: number
  scanlines?: number
  vignette?: number
  saturation?: number
  exposure?: number
  intensity?: number
  interval?: number
  duration?: number
  slices?: number
  shift?: number
  rgbShift?: number
  blocks?: number
  noise?: number
  laserColor?: [number, number, number]
}

export interface PostFxInstance {
  setOptions: (options: PostFxOptions) => void
  burst: (strength?: number) => void
  addScrollImpulse: (velocity: number, progress: number) => void
  laserSweep: () => void
  resize: () => void
  destroy: () => void
}

const DEFAULTS: Required<PostFxOptions> = {
  speed: 0.5,
  wave: 0.8,
  jitter: 0.2,
  crease: 0.1,
  switching: 0.05,
  switchingHeight: 0.02,
  bloom: 0.4,
  aberration: 2,
  acBeat: 1,
  grain: 0.08,
  scanlines: 0.1,
  vignette: 0.15,
  saturation: 1,
  exposure: 1,
  intensity: 1,
  interval: 0,
  duration: 0.4,
  slices: 24,
  shift: 30,
  rgbShift: 4,
  blocks: 0.5,
  noise: 0.35,
  laserColor: [0.957, 0.247, 0.369],
}

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uTime;
uniform float uWave;
uniform float uJitter;
uniform float uCrease;
uniform float uSwitching;
uniform float uSwitchHeight;
uniform float uBloom;
uniform float uAberration;
uniform float uAcBeat;
uniform float uGrain;
uniform float uScanlines;
uniform float uVignette;
uniform float uSaturation;
uniform float uExposure;
uniform float uCreaseNoise;
uniform float uSeed;
uniform float uAmp;
uniform float uSlices;
uniform float uShift;
uniform float uRgbShift;
uniform float uBlocks;
uniform float uNoise;
uniform float uLaserY;
uniform float uLaserAmp;
uniform vec3 uLaserColor;

#define PI 3.14159265

float hash (vec2 v) {
  return fract(sin(dot(v, vec2(89.44, 19.36))) * 22189.22);
}

float hash12 (vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float iHash (vec2 v, vec2 r) {
  float h00 = hash(floor(v * r + vec2(0.0, 0.0)) / r);
  float h10 = hash(floor(v * r + vec2(1.0, 0.0)) / r);
  float h01 = hash(floor(v * r + vec2(0.0, 1.0)) / r);
  float h11 = hash(floor(v * r + vec2(1.0, 1.0)) / r);
  vec2 ip = smoothstep(vec2(0.0), vec2(1.0), mod(v * r, 1.0));
  return (h00 * (1.0 - ip.x) + h10 * ip.x) * (1.0 - ip.y)
    + (h01 * (1.0 - ip.x) + h11 * ip.x) * ip.y;
}

float noiseN (vec2 v) {
  float sum = 0.0;
  float s = 2.0;
  for (int i = 1; i < 7; i++) {
    sum += iHash(v + vec2(i), vec2(2.0 * s)) / s;
    s *= 2.0;
  }
  return sum;
}

vec4 page (vec2 p) {
  p = clamp(p, vec2(0.0005), vec2(0.9995));
  return texture(uContent, vec2(p.x, 1.0 - p.y));
}

void main () {
  vec2 uv = vUv;
  float t = uTime;

  // glitch tear (adapted from glitch.md)
  float e = uAmp;
  vec2 guv = uv;
  if (e > 0.001) {
    float band = floor(uv.y * uSlices);
    float pick = hash12(vec2(band, uSeed));
    float tear = step(1.0 - 0.3 * min(e, 1.0), pick);
    float dir = hash12(vec2(band, uSeed + 13.0)) * 2.0 - 1.0;
    guv.x += tear * dir * e * uShift / uResolution.x;

    float sub = floor(uv.y * uSlices * 7.0);
    float micro = hash12(vec2(sub, uSeed + 29.0));
    guv.x += (micro - 0.5) * e * uNoise * 3.0 / uResolution.x;

    vec2 cell = floor(guv * vec2(10.0, uSlices * 0.5));
    float br = hash12(cell + uSeed * 0.0173);
    if (br > 1.0 - 0.14 * uBlocks * min(e, 1.0)) {
      vec2 jump = vec2(
        hash12(cell + uSeed + 3.1) - 0.5,
        hash12(cell + uSeed + 7.7) - 0.5);
      guv += jump * vec2(0.08, 0.02) * e;
    }
  }

  // vhs tape damage (adapted from vhs.md)
  vec2 uvn = guv;
  float lineNoise = 0.0;
  if (uJitter + uCrease + uSwitching > 0.0) {
    lineNoise = noiseN(vec2(uvn.y * 100.0, t * 10.0));
  }
  if (uWave > 0.0) {
    uvn.x += (noiseN(vec2(uvn.y, t)) - 0.5) * 0.005 * uWave;
  }
  uvn.x += (lineNoise - 0.5) * 0.01 * uJitter;

  float tcPhase = clamp(
    (sin(uvn.y * 8.0 - t * PI * 1.2) - 0.92) * uCreaseNoise,
    0.0, 0.01) * 10.0 * uCrease;
  float tcNoise = max(lineNoise - 0.5, 0.0);
  uvn.x -= tcNoise * tcPhase;

  float snPhase = smoothstep(max(uSwitchHeight, 1e-4), 0.0, uvn.y) * uSwitching;
  uvn.y += snPhase * 0.3;
  uvn.x += snPhase * ((lineNoise - 0.5) * 0.2);

  float split = uRgbShift * e / uResolution.x;
  vec4 base = page(uvn);
  vec3 col = vec3(
    page(uvn + vec2(split, 0.0)).r,
    base.g,
    page(uvn - vec2(split, 0.0)).b);
  col *= 1.0 - tcPhase;
  col = mix(col, col.yzx, clamp(snPhase, 0.0, 1.0));

  if (uBloom > 0.0) {
    float px = uAberration / max(uResolution.x, 1.0);
    vec3 bloomSum = vec3(0.0);
    for (int i = -8; i <= 2; i++) {
      vec3 s = page(uvn + vec2(float(i) * px, 0.0)).rgb;
      if (i >= -4) bloomSum.r += s.r;
      if (i >= -6 && i <= 0) bloomSum.g += s.g;
      if (i <= -2) bloomSum.b += s.b;
    }
    bloomSum *= 0.1;
    col = mix(col, (col + bloomSum) / 1.7, clamp(uBloom, 0.0, 1.0));
  }

  if (uAcBeat > 0.0) {
    col *= 1.0 + clamp(
      noiseN(vec2(0.0, uv.y + t * 0.2)) * 0.6 - 0.25, 0.0, 0.1) * uAcBeat;
  }

  float g = hash(uv * uResolution + fract(t) * vec2(127.1, 311.7)) - 0.5;
  col += g * uGrain;
  if (e > 0.001 && uNoise > 0.001) {
    float row = floor(uv.y * uResolution.y);
    float flicker = hash12(vec2(row, uSeed + 41.0));
    float lines = step(0.985 - 0.01 * uNoise * e, flicker);
    col.rgb += (g * 0.22 + lines * 0.35) * uNoise * min(e, 1.0) * base.a;
  }

  float scan = sin(uv.y * uResolution.y * PI) * 0.5;
  col *= 1.0 - uScanlines * 0.35 * scan;

  vec2 vd = (uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  col *= 1.0 - uVignette * smoothstep(0.4, 1.1, length(vd));

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, clamp(uSaturation, 0.0, 2.0));
  col *= uExposure;

  // laser sweep (adapted from laser.md beam)
  float ld = abs(uv.y - uLaserY);
  float beam = exp(-ld * 260.0) + exp(-ld * 42.0) * 0.35;
  col += uLaserColor * beam * uLaserAmp * base.a;

  float alpha = max(base.a, clamp(snPhase + tcPhase, 0.0, 1.0));
  outColor = vec4(clamp(col, 0.0, 1.0), alpha);
}`

function hash1(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

export function createPostFx(
  input: HTMLCanvasElement,
  output: HTMLCanvasElement,
  options: PostFxOptions = {},
): PostFxInstance | null {
  const config = { ...DEFAULTS, ...options }

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
  })
  if (!gl || gl.isContextLost()) return null

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERT, "PostFx")
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG, "PostFx")
  const program = gl.createProgram()!
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  const uniforms: Record<string, WebGLUniformLocation> = {}
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i)!
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!
  }

  const quad = createQuad(gl)
  const contentTexture = createBlankTexture(gl)

  function syncCanvasSize() {
    fitCanvas(output)
  }
  syncCanvasSize()

  let time = 0
  let burstAt = -10
  let burstSeed = 1
  let burstBoost = 1
  let envelope = 0
  let scrollVel = 0
  let scrollProgress = 0
  let sweepT = -1

  function advanceTimeline(delta: number) {
    time += delta * config.speed
    scrollVel *= Math.exp(-delta * 2.5)
    const sinceBurst = time - burstAt
    const duration = Math.max(config.duration, 0.05)
    if (sinceBurst >= 0 && sinceBurst < duration) {
      const tail = 1 - Math.pow(sinceBurst / duration, 2)
      envelope = tail * (0.7 + 0.3 * hash1(burstSeed + Math.floor(time * 24)))
    } else {
      envelope = 0
      if (config.interval > 0 && sinceBurst >= duration) {
        burstAt = time + Math.max(config.interval, 0.3) * (0.75 + 0.5 * Math.random())
        burstSeed = Math.floor(Math.random() * 1000)
        burstBoost = 1
      }
    }
    if (sweepT >= 0) {
      sweepT += delta / 0.9
      if (sweepT >= 1) sweepT = -1
    }
  }

  const fract = (x: number) => x - Math.floor(x)
  const hash2 = (x: number, y: number) =>
    fract(Math.sin(x * 89.44 + y * 19.36) * 22189.22)
  const smooth01 = (x: number) => x * x * (3 - 2 * x)
  function iHashCpu(vx: number, vy: number, r: number) {
    const fx = Math.floor(vx * r)
    const fy = Math.floor(vy * r)
    const h00 = hash2(fx / r, fy / r)
    const h10 = hash2((fx + 1) / r, fy / r)
    const h01 = hash2(fx / r, (fy + 1) / r)
    const h11 = hash2((fx + 1) / r, (fy + 1) / r)
    const ix = smooth01(fract(vx * r))
    const iy = smooth01(fract(vy * r))
    return (
      (h00 * (1 - ix) + h10 * ix) * (1 - iy) + (h01 * (1 - ix) + h11 * ix) * iy
    )
  }
  function noiseCpu(vx: number, vy: number) {
    let sum = 0
    let s = 2
    for (let i = 1; i < 7; i++) {
      sum += iHashCpu(vx + i, vy + i, 2 * s) / s
      s *= 2
    }
    return sum
  }

  function render() {
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, input)

    const dpr = output.width / Math.max(output.clientWidth, 1)
    const amp = envelope * Math.max(config.intensity, 0) * burstBoost
    const jitter = Math.max(config.jitter, 0) + scrollVel * 1.6
    const switching = Math.max(config.switching, 0) + scrollVel * 0.9
    const wave = Math.max(config.wave, 0) + scrollVel * 1.2

    let laserY = 1 - scrollProgress
    let laserAmp = Math.min(0.85, scrollVel * 1.4)
    if (sweepT >= 0) {
      laserY = sweepT
      laserAmp = Math.max(laserAmp, Math.sin(sweepT * Math.PI) * 1.2)
    }

    gl!.useProgram(program)
    gl!.activeTexture(gl!.TEXTURE0)
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.uniform1i(uniforms.uContent, 0)
    gl!.uniform2f(uniforms.uResolution, output.width, output.height)
    gl!.uniform1f(uniforms.uTime, time)
    gl!.uniform1f(uniforms.uWave, wave)
    gl!.uniform1f(uniforms.uJitter, jitter)
    gl!.uniform1f(uniforms.uCrease, Math.max(config.crease, 0))
    gl!.uniform1f(uniforms.uSwitching, switching)
    gl!.uniform1f(uniforms.uSwitchHeight, Math.max(config.switchingHeight, 0))
    gl!.uniform1f(uniforms.uBloom, config.bloom)
    gl!.uniform1f(uniforms.uAberration, Math.max(config.aberration, 0) * dpr)
    gl!.uniform1f(uniforms.uAcBeat, Math.max(config.acBeat, 0))
    gl!.uniform1f(uniforms.uGrain, Math.max(config.grain, 0))
    gl!.uniform1f(uniforms.uScanlines, Math.max(config.scanlines, 0))
    gl!.uniform1f(uniforms.uVignette, Math.max(config.vignette, 0))
    gl!.uniform1f(uniforms.uSaturation, config.saturation)
    gl!.uniform1f(uniforms.uExposure, Math.max(config.exposure, 0))
    gl!.uniform1f(uniforms.uCreaseNoise, noiseCpu(time, time))
    gl!.uniform1f(uniforms.uSeed, Math.floor(time * 24) + burstSeed)
    gl!.uniform1f(uniforms.uAmp, amp)
    gl!.uniform1f(uniforms.uSlices, Math.max(config.slices, 3))
    gl!.uniform1f(uniforms.uShift, Math.max(config.shift, 0) * dpr)
    gl!.uniform1f(uniforms.uRgbShift, Math.max(config.rgbShift, 0) * dpr)
    gl!.uniform1f(uniforms.uBlocks, Math.min(Math.max(config.blocks, 0), 1))
    gl!.uniform1f(uniforms.uNoise, Math.min(Math.max(config.noise, 0), 1))
    gl!.uniform1f(uniforms.uLaserY, laserY)
    gl!.uniform1f(uniforms.uLaserAmp, laserAmp)
    gl!.uniform3f(
      uniforms.uLaserColor,
      config.laserColor[0],
      config.laserColor[1],
      config.laserColor[2],
    )
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
    gl!.viewport(0, 0, output.width, output.height)
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
  }

  let raf = 0
  let lastTime = performance.now()
  let destroyed = false
  let running = false
  let visible = true

  function frame(now: number) {
    if (destroyed) return
    if (!visible) {
      running = false
      return
    }
    const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 30)
    lastTime = now
    advanceTimeline(delta)
    render()
    raf = requestAnimationFrame(frame)
  }

  function start() {
    if (destroyed || running || !visible) return
    running = true
    lastTime = performance.now()
    raf = requestAnimationFrame(frame)
  }

  start()

  const observer = new ResizeObserver(() => {
    syncCanvasSize()
  })
  observer.observe(output)

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true
    if (visible) start()
  })
  intersection.observe(output)

  return {
    setOptions(next) {
      Object.assign(config, next)
    },
    burst(strength = 1) {
      burstAt = time
      burstSeed = Math.floor(Math.random() * 1000)
      burstBoost = strength
      start()
    },
    addScrollImpulse(velocity, progress) {
      scrollVel = Math.min(1.5, scrollVel + Math.min(Math.abs(velocity), 1.5))
      scrollProgress = progress
    },
    laserSweep() {
      if (sweepT < 0) sweepT = 0
      start()
    },
    resize() {
      syncCanvasSize()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      intersection.disconnect()
      gl!.deleteTexture(contentTexture)
      gl!.deleteProgram(program)
      gl!.deleteShader(vertexShader)
      gl!.deleteShader(fragmentShader)
      gl!.deleteBuffer(quad)
    },
  }
}
