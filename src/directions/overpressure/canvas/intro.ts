// Intro — pure WebGL2 particle object.
// A scattered point field snaps together into the "darjs" logotype, holds,
// then detonates outward. CPU-simulated points, GPU-drawn with additive
// blending. No html-in-canvas, no three — works in every WebGL2 browser.

export interface IntroHandle {
  destroy: () => void
}

const PINK: [number, number, number] = [0.91, 0.63, 0.71] // #e8a0b4
const ASSEMBLE_MS = 1400
const HOLD_MS = 800
const BLAST_MS = 1100
const TOTAL_MS = ASSEMBLE_MS + HOLD_MS + BLAST_MS

function sampleText(text: string, maxPoints: number) {
  const w = 720
  const h = 200
  const off = document.createElement("canvas")
  off.width = w
  off.height = h
  const ctx = off.getContext("2d", { willReadFrequently: true })!
  ctx.fillStyle = "#fff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `700 150px "JetBrains Mono", ui-monospace, monospace`
  ctx.fillText(text, w / 2, h / 2 + 8)
  const data = ctx.getImageData(0, 0, w, h).data
  const pts: number[] = []
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 120) pts.push(x / w, y / h)
    }
  }
  // Decimate to the budget.
  while (pts.length / 2 > maxPoints) {
    const i = Math.floor(Math.random() * (pts.length / 2)) * 2
    pts.splice(i, 2)
  }
  return pts
}

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec2 aSizeAlpha;
uniform vec2 uScale;
uniform float uDpr;
out vec3 vColor;
out float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aSizeAlpha.y;
  gl_Position = vec4(aPos * uScale, 0.0, 1.0);
  gl_PointSize = aSizeAlpha.x * uDpr;
}`

const FRAG = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float disc = smoothstep(0.5, 0.12, d);
  outColor = vec4(vColor * disc * vAlpha, disc * vAlpha);
}`

export function createIntro(
  canvas: HTMLCanvasElement,
  text: string,
  onDone: () => void,
): IntroHandle | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  })
  if (!gl || gl.isContextLost()) return null

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pts = sampleText(text, 5200)
  const count = pts.length / 2

  // Aspect-corrected targets centered on screen.
  const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1)
  const targetW = Math.min(1.5, 0.34 * aspect * 2)
  const targetH = targetW * (200 / 720)

  const pos = new Float32Array(count * 2)
  const vel = new Float32Array(count * 2)
  const target = new Float32Array(count * 2)
  const color = new Float32Array(count * 3)
  const sizeAlpha = new Float32Array(count * 2)
  const delay = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Scattered start positions on a wide disc.
    const a = Math.random() * Math.PI * 2
    const r = 0.6 + Math.random() * 1.6
    pos[i * 2] = Math.cos(a) * r
    pos[i * 2 + 1] = Math.sin(a) * r
    target[i * 2] = (pts[i * 2] - 0.5) * targetW
    target[i * 2 + 1] = (0.5 - pts[i * 2 + 1]) * targetH
    const pink = Math.random() < 0.32
    const shade = 0.72 + Math.random() * 0.28
    color[i * 3] = (pink ? PINK[0] : 0.92) * shade
    color[i * 3 + 1] = (pink ? PINK[1] : 0.92) * shade
    color[i * 3 + 2] = (pink ? PINK[2] : 0.95) * shade
    sizeAlpha[i * 2] = 1.6 + Math.random() * 2.4
    sizeAlpha[i * 2 + 1] = 0 // alpha ramps in
    delay[i] = Math.random() * 0.45
  }

  function compile(type: number, src: string) {
    const shader = gl!.createShader(type)!
    gl!.shaderSource(shader, src)
    gl!.compileShader(shader)
    return shader
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.useProgram(program)

  const posBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const colorBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf)
  gl.bufferData(gl.ARRAY_BUFFER, color, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)

  const sizeBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf)
  gl.bufferData(gl.ARRAY_BUFFER, sizeAlpha, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(2)
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0)

  const uScale = gl.getUniformLocation(program, "uScale")
  const uDpr = gl.getUniformLocation(program, "uDpr")
  gl.uniform1f(uDpr, dpr)

  gl.disable(gl.BLEND)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
  gl.clearColor(0, 0, 0, 0)

  let raf = 0
  let destroyed = false
  let done = false
  let blasted = false
  const t0 = performance.now()

  function resize() {
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl!.viewport(0, 0, canvas.width, canvas.height)
    const a = canvas.clientWidth / Math.max(canvas.clientHeight, 1)
    // Positions are authored in a space where x spans [-aspect, aspect].
    gl!.uniform2f(uScale, 1 / Math.max(a, 0.5), 1)
  }
  resize()

  function detonate() {
    for (let i = 0; i < count; i++) {
      const x = pos[i * 2]
      const y = pos[i * 2 + 1]
      const len = Math.hypot(x, y) || 1
      const speed = 0.010 + Math.random() * 0.030
      // Outward blast plus a tangential curl.
      vel[i * 2] = (x / len) * speed + (-y / len) * speed * 0.6
      vel[i * 2 + 1] = (y / len) * speed + (x / len) * speed * 0.6
    }
  }

  function frame(now: number) {
    if (destroyed) return
    const t = now - t0
    const assembling = t < ASSEMBLE_MS
    const blasting = t >= ASSEMBLE_MS + HOLD_MS
    if (blasting && !blasted) {
      blasted = true
      detonate()
    }
    const blastT = Math.max(0, t - ASSEMBLE_MS - HOLD_MS) / BLAST_MS

    for (let i = 0; i < count; i++) {
      const ix = i * 2
      if (assembling) {
        // Spring toward target with a per-particle stagger — the "snap".
        const local = Math.min(1, Math.max(0, t / ASSEMBLE_MS - delay[i]))
        const k = 0.06 + local * local * 0.24
        pos[ix] += (target[ix] - pos[ix]) * k
        pos[ix + 1] += (target[ix + 1] - pos[ix + 1]) * k
        sizeAlpha[ix + 1] = Math.min(1, local * 2.2)
      } else if (!blasting) {
        // Hold: micro shimmer so the logotype feels pressurized.
        pos[ix] = target[ix] + (Math.random() - 0.5) * 0.0022
        pos[ix + 1] = target[ix + 1] + (Math.random() - 0.5) * 0.0022
        sizeAlpha[ix + 1] = 1
      } else {
        pos[ix] += vel[ix]
        pos[ix + 1] += vel[ix + 1]
        vel[ix] *= 0.985
        vel[ix + 1] *= 0.985
        sizeAlpha[ix + 1] = Math.max(0, 1 - blastT * blastT)
      }
    }

    resize()
    gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf)
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, pos)
    gl!.bindBuffer(gl!.ARRAY_BUFFER, sizeBuf)
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, sizeAlpha)
    gl!.drawArrays(gl!.POINTS, 0, count)

    if (t >= TOTAL_MS) {
      if (!done) {
        done = true
        onDone()
      }
      return
    }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      gl!.deleteBuffer(posBuf)
      gl!.deleteBuffer(colorBuf)
      gl!.deleteBuffer(sizeBuf)
      gl!.deleteProgram(program)
      gl!.deleteShader(vs)
      gl!.deleteShader(fs)
    },
  }
}
