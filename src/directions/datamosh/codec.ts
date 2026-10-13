import type { ElementImageContext, PaintableCanvas } from "../../lab/html-in-canvas"

export const MB = 16

export type Pulse = { pump: number; snare: number; level: number; bar: number }

export type CodecStats = {
  type: "I" | "P"
  gop: number
  stale: number
  motion: number
  decoded: boolean
}

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const COMMON = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform float uDpr;
out vec4 outColor;
const float PI = 3.14159265;
const float MB = ${MB}.0;
vec2 cssOf(vec2 frag) { return vec2(frag.x, uRes.y - frag.y) / uDpr; }
vec2 uvOf(vec2 css) { return vec2(css.x * uDpr, uRes.y - css.y * uDpr) / uRes; }
vec3 toYcc(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  return vec3(y, (c.b - y) * 0.564, (c.r - y) * 0.713);
}
vec3 toRgb(vec3 q) {
  return vec3(q.x + 1.403 * q.z, q.x - 0.344 * q.y - 0.714 * q.z, q.x + 1.773 * q.y);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`

const MOSH = `${COMMON}
uniform sampler2D uPrev;
uniform sampler2D uFresh;
uniform highp sampler2D uField;
void main() {
  vec2 css = cssOf(gl_FragCoord.xy);
  vec4 f = texelFetch(uField, ivec2(css / MB), 0);
  vec4 prev = texture(uPrev, uvOf(css - f.xy));
  vec4 fresh = texture(uFresh, gl_FragCoord.xy / uRes);
  outColor = mix(prev, fresh, min(f.z, 1.0));
}`

const DCT = `${COMMON}
uniform sampler2D uFrame;
uniform int uN;
void main() {
  ivec2 t = ivec2(gl_FragCoord.xy);
  ivec2 block = t / 4;
  ivec2 kl = t % 4;
  float N = float(uN);
  ivec2 size = ivec2(uRes);
  vec3 sum = vec3(0.0);
  for (int y = 0; y < uN; y++) {
    float cy = cos((2.0 * float(y) + 1.0) * float(kl.y) * PI / (2.0 * N));
    for (int x = 0; x < uN; x++) {
      float cx = cos((2.0 * float(x) + 1.0) * float(kl.x) * PI / (2.0 * N));
      ivec2 p = min(block * uN + ivec2(x, y), size - 1);
      sum += toYcc(texelFetch(uFrame, ivec2(p.x, size.y - 1 - p.y), 0).rgb) * cx * cy;
    }
  }
  float ax = kl.x == 0 ? sqrt(1.0 / N) : sqrt(2.0 / N);
  float ay = kl.y == 0 ? sqrt(1.0 / N) : sqrt(2.0 / N);
  outColor = vec4(sum * ax * ay / N, 1.0);
}`

const DISPLAY = `${COMMON}
uniform sampler2D uFrame;
uniform sampler2D uCoef;
uniform highp sampler2D uField;
uniform int uN;
uniform float uDct;
uniform float uKey;
uniform float uPump;
uniform float uSnare;
uniform float uCrush;
uniform float uActivity;
uniform float uSeed;
const vec3 ACID = vec3(0.722, 1.0, 0.173);
const vec3 PINK = vec3(1.0, 0.18, 0.604);
const vec3 BLUE = vec3(0.176, 0.357, 1.0);

float bayer(ivec2 p) {
  int b[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(b[(p.y % 4) * 4 + (p.x % 4)]) + 0.5) / 16.0;
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 css = cssOf(frag);
  ivec2 mb = ivec2(css / MB);
  vec4 f = texelFetch(uField, mb, 0);
  float q = f.w;
  float motion = length(f.xy);

  float split = uSnare * (3.0 + 9.0 * hash12(vec2(float(mb.y), uSeed))) * uDpr;
  vec3 c = vec3(
    texture(uFrame, (frag + vec2(split, 0.0)) / uRes).r,
    texture(uFrame, frag / uRes).g,
    texture(uFrame, (frag - vec2(split, 0.0)) / uRes).b
  );
  vec3 ycc = toYcc(c);

  if (uDct > 0.5 && q > 0.01) {
    ivec2 pd = ivec2(frag.x, uRes.y - 1.0 - frag.y);
    ivec2 b = pd / uN;
    ivec2 xy = pd % uN;
    float N = float(uN);
    int keep = int(mix(6.5, 0.0, q));
    float qs = mix(0.01, 0.2, q);
    vec3 rec = vec3(0.0);
    for (int l = 0; l < 4; l++) {
      for (int k = 0; k < 4; k++) {
        if (k + l > keep) continue;
        vec3 coef = texelFetch(uCoef, b * 4 + ivec2(k, l), 0).rgb;
        vec3 s = qs * (1.0 + float(k + l) * 1.5) * vec3(1.0, 2.2, 2.2);
        coef = floor(coef / s + 0.5) * s;
        float ax = k == 0 ? sqrt(1.0 / N) : sqrt(2.0 / N);
        float ay = l == 0 ? sqrt(1.0 / N) : sqrt(2.0 / N);
        rec += coef * N * ax * ay
          * cos((2.0 * float(xy.x) + 1.0) * float(k) * PI / (2.0 * N))
          * cos((2.0 * float(xy.y) + 1.0) * float(l) * PI / (2.0 * N));
      }
    }
    ycc = mix(ycc, rec, smoothstep(0.0, 0.25, q));
  }

  float chroma = clamp(motion / 8.0 + q * 0.7, 0.0, 1.0);
  if (chroma > 0.01) {
    float cell = mix(2.0, MB, chroma);
    vec2 cc = (floor((css - f.xy * 0.8) / cell) + 0.5) * cell;
    vec3 coarse = toYcc(texture(uFrame, uvOf(cc)).rgb);
    ycc.yz = mix(ycc.yz, coarse.yz * 1.6, chroma);
  }

  vec3 col = toRgb(ycc);

  if (uCrush > 0.01) {
    float levels = mix(64.0, 3.0, pow(uCrush, 1.6));
    col = floor(col * levels + bayer(ivec2(css * 0.5))) / levels;
  }

  col *= 1.0 - uPump * 0.34;

  if (f.z > 1.5) col = mix(col, ACID, 0.28 * uActivity);

  vec2 inBlock = mod(css, MB);
  float grid = max(step(inBlock.x, 1.0), step(inBlock.y, 1.0));
  col = mix(col, ACID, uKey * grid * 0.9);
  col = mix(col, col * 0.5 + ACID * 0.5, uKey * 0.18);

  if (uActivity > 0.01 && motion > 1.5) {
    vec2 a = (vec2(mb) + 0.5) * MB;
    vec2 tip = a + f.xy / motion * min(motion * 1.4, MB * 0.46);
    float line = 1.0 - smoothstep(0.4, 1.1, segment(css, a, tip));
    col = mix(col, PINK, line * uActivity * 0.75);
    col = mix(col, ACID, (1.0 - smoothstep(0.6, 1.5, length(css - tip))) * uActivity * 0.75);
  }

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const fract = (x: number) => x - Math.floor(x)
const hash = (x: number, y: number, s: number) => fract(Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453)

type Target = { texture: WebGLTexture; fbo: WebGLFramebuffer }

export function createCodec(opts: {
  source: HTMLCanvasElement
  content: HTMLElement
  output: HTMLCanvasElement
  pulse: () => Pulse
  onStats: (stats: CodecStats) => void
}) {
  const { content, output, pulse, onStats } = opts
  const source = opts.source as PaintableCanvas & {
    updateElementGeometry: (element: Element, options: { canvasTransform: DOMMatrix }) => void
  }
  const sourceCtx = source.getContext("2d") as ElementImageContext | null
  const gl = output.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false })
  if (!gl || !sourceCtx) return null
  const dctOk = Boolean(gl.getExtension("EXT_color_buffer_float"))

  const compile = (frag: string) => {
    const program = gl.createProgram()
    for (const [type, text] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, frag],
    ] as const) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, text)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(shader))
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    const uniforms = new Map<string, WebGLUniformLocation>()
    const count: number = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)!.name
      uniforms.set(name, gl.getUniformLocation(program, name)!)
    }
    return { program, uniforms }
  }

  const mosh = compile(MOSH)
  const dct = compile(DCT)
  const display = compile(DISPLAY)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const texture = (filter: number) => {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  const target = (width: number, height: number, internal: number, format: number, type: number, filter: number): Target => {
    const tex = texture(filter)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, null)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return { texture: tex, fbo }
  }

  const fresh = texture(gl.LINEAR)
  const fieldTex = texture(gl.NEAREST)
  let frames: [Target, Target] | null = null
  let coef: Target | null = null

  let width = 1
  let height = 1
  let dpr = 1
  let n = 8
  let cols = 1
  let rows = 1
  let field = new Float32Array(4)
  let velocity = new Float32Array(2)
  let stale = new Uint8Array(1)
  let warmAt = new Float32Array(1)

  let hasFresh = false
  let decoded = false
  let warmStart = -1
  let seed = 1
  let key = 0
  let keyPending = false
  let sinceKey = 0
  let idleFor = 0
  let activity = 0
  let lastBar = -1
  let lastScroll = content.scrollTop
  const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4 }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = output.clientWidth
    const cssH = output.clientHeight
    width = Math.max(1, Math.round(cssW * dpr))
    height = Math.max(1, Math.round(cssH * dpr))
    output.width = source.width = width
    output.height = source.height = height
    n = Math.max(4, Math.round(8 * dpr))
    cols = Math.ceil(cssW / MB)
    rows = Math.ceil(cssH / MB)
    field = new Float32Array(cols * rows * 4)
    velocity = new Float32Array(cols * rows * 2)
    stale = new Uint8Array(cols * rows)
    warmAt = new Float32Array(cols * rows)
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        warmAt[r * cols + c] = 0.12 + (c / cols) * 0.45 + (r / rows) * 0.25 + hash(c, r, 9) * 0.25

    for (const t of frames ?? []) {
      gl.deleteTexture(t.texture)
      gl.deleteFramebuffer(t.fbo)
    }
    frames = [
      target(width, height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR),
      target(width, height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR),
    ]
    for (const t of frames) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
      gl.clearColor(0, 0.53, 0.04, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    if (coef) {
      gl.deleteTexture(coef.texture)
      gl.deleteFramebuffer(coef.fbo)
    }
    coef = dctOk
      ? target(Math.ceil(width / n) * 4, Math.ceil(height / n) * 4, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST)
      : null
    if (decoded) keyPending = true
    source.requestPaint()
  }

  source.onpaint = () => {
    sourceCtx.reset()
    try {
      source.updateElementGeometry(content, { canvasTransform: sourceCtx.drawElementImage(content, 0, 0) })
    } catch {
      return
    }
    gl.bindTexture(gl.TEXTURE_2D, fresh)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    hasFresh = true
  }

  const onMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 240) {
      pointer.px = e.clientX
      pointer.py = e.clientY
    }
    pointer.x = e.clientX
    pointer.y = e.clientY
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  const updateField = (dt: number, audio: Pulse, now: number) => {
    const still = reduced.matches
    const dy = still ? 0 : content.scrollTop - lastScroll
    lastScroll = content.scrollTop
    const pvx = still ? 0 : pointer.x - pointer.px
    const pvy = still ? 0 : pointer.y - pointer.py
    pointer.px = pointer.x
    pointer.py = pointer.y

    const energy = Math.abs(dy) + Math.hypot(pvx, pvy) * 0.6
    activity += ((energy > 0.5 ? 1 : 0) - activity) * (energy > 0.5 ? 0.35 : 0.08)

    const warm = (now - warmStart) / 2600

    if (!decoded && still) keyPending = true
    if (decoded) {
      idleFor = energy > 0.5 ? 0 : idleFor + dt
      const anyStale = stale.includes(1)
      if (anyStale && idleFor > 0.45) keyPending = true
      const gopHit = audio.bar >= 0 ? audio.bar !== lastBar && lastBar >= 0 : sinceKey > 90
      if (anyStale && energy > 0.5 && gopHit) keyPending = true
    }
    lastBar = audio.bar

    const keying = keyPending && hasFresh
    if (keying) {
      keyPending = false
      decoded = true
      key = 1
      sinceKey = 0
      seed = Math.floor(Math.random() * 1000)
    } else sinceKey++

    const damp = Math.pow(0.87, dt * 60)
    const radius = 150
    let staleCount = 0
    let motionSum = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        let vx = velocity[i * 2] * damp
        let vy = velocity[i * 2 + 1] * damp
        let refresh = 1

        if (keying) {
          vx = vy = 0
          stale[i] = 0
        } else if (!decoded) {
          const done = warm > warmAt[i]
          vx = done ? 0 : (hash(c, r, 3) - 0.5) * 2.4
          vy = done ? 0 : (hash(c, r, 5) - 0.5) * 2.4
          refresh = done ? (warm - dt * 0.4 < warmAt[i] ? 2 : 1) : 0
        } else {
          if (dy !== 0) {
            const band = Math.floor(r / 3)
            const run = Math.floor(c / (3 + Math.floor(hash(band, 1, seed) * 10)))
            const h = hash(run, band, seed)
            const gain = h < 0.1 ? 0 : h > 0.86 ? 2.4 : 0.75 + h * 0.5
            vx += (-dy * (hash(run, band, seed + 7) - 0.5) * 0.5 - vx) * 0.5
            vy += (-dy * gain - vy) * 0.5
          }
          if (pvx !== 0 || pvy !== 0) {
            const d = Math.hypot((c + 0.5) * MB - pointer.x, (r + 0.5) * MB - pointer.y)
            if (d < radius) {
              const w = (1 - d / radius) ** 2
              vx += pvx * w * 0.9
              vy += pvy * w * 0.9
            }
          }
          const m = Math.hypot(vx, vy)
          if (m > 48) {
            vx *= 48 / m
            vy *= 48 / m
          }
          if (m < 0.05) vx = vy = 0
          if (m > 0.6) stale[i] = 1
          if (stale[i]) refresh = Math.random() < 0.02 ? 2 : 0.06
        }

        const m = Math.hypot(vx, vy)
        velocity[i * 2] = vx
        velocity[i * 2 + 1] = vy
        field[i * 4] = vx
        field[i * 4 + 1] = vy
        field[i * 4 + 2] = refresh
        field[i * 4 + 3] = keying ? 0 : Math.min(1, m / 36 + stale[i] * 0.12)
        staleCount += stale[i]
        motionSum += m
      }
    }

    if (!decoded && warm >= 1.3) decoded = true
    return { keying, stale: staleCount / (cols * rows), motion: motionSum / (cols * rows) }
  }

  const draw = (p: { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation> }, values: Record<string, number | [number, number]>, textures: Record<string, WebGLTexture>) => {
    gl.useProgram(p.program)
    let unit = 0
    for (const [name, tex] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(p.uniforms.get(name) ?? null, unit++)
    }
    for (const [name, v] of Object.entries(values)) {
      const loc = p.uniforms.get(name) ?? null
      if (Array.isArray(v)) gl.uniform2f(loc, v[0], v[1])
      else if (name === "uN") gl.uniform1i(loc, v)
      else gl.uniform1f(loc, v)
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  let raf = 0
  let last = performance.now()
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 1 / 20)
    last = now
    source.requestPaint()
    if (!frames || !hasFresh) return
    if (warmStart < 0) warmStart = now

    const audio = reduced.matches ? { pump: 0, snare: 0, level: pulse().level, bar: -1 } : pulse()
    const stats = updateField(dt, audio, now)
    key *= Math.exp(-dt / 0.14)
    if (stats.keying) key = 1

    gl.bindTexture(gl.TEXTURE_2D, fieldTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, cols, rows, 0, gl.RGBA, gl.FLOAT, field)

    const [prev, next] = frames
    const base = { uRes: [width, height] as [number, number], uDpr: dpr }
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo)
    gl.viewport(0, 0, width, height)
    draw(mosh, base, { uPrev: prev.texture, uFresh: fresh, uField: fieldTex })
    frames = [next, prev]

    const useDct = coef !== null && field.some((v, i) => i % 4 === 3 && v > 0.01)
    if (useDct && coef) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, coef.fbo)
      gl.viewport(0, 0, Math.ceil(width / n) * 4, Math.ceil(height / n) * 4)
      draw(dct, { ...base, uN: n }, { uFrame: next.texture })
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, width, height)
    draw(
      display,
      {
        ...base,
        uN: n,
        uDct: useDct ? 1 : 0,
        uKey: key,
        uPump: audio.pump,
        uSnare: audio.snare,
        uCrush: Math.min(1, audio.level * 0.55 + activity * 0.35),
        uActivity: decoded ? activity : 0.8,
        uSeed: seed + Math.floor(now / 60),
      },
      { uFrame: next.texture, uCoef: coef?.texture ?? next.texture, uField: fieldTex },
    )

    onStats({
      type: key > 0.5 ? "I" : "P",
      gop: sinceKey,
      stale: stats.stale,
      motion: stats.motion,
      decoded,
    })
  }

  const observer = new ResizeObserver(resize)
  observer.observe(output)
  resize()
  raf = requestAnimationFrame(frame)

  return {
    keyframe() {
      keyPending = true
    },
    destroy() {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener("pointermove", onMove)
      source.onpaint = null
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}
