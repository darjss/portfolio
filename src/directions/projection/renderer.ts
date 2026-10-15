import { filmFrag, moteFrag, moteVert, quadVert, roomFrag, windFrag } from "./shaders"

type Rect = { x: number; y: number; w: number; h: number }

export type FilmFrame = {
  vw: number
  vh: number
  dpr: number
  time: number
  frame: number
  ap: Rect
  env: Rect
  weave: [number, number]
  slip: number
  kind: number
  t: number
  cue: number
  smear: number
  streak: [number, number]
  edge: number
  grain: number
  lamp: number
  tint: [number, number, number]
  beam: number
  refresh: boolean
}

const MOTES = 1400
const WIND_SCALE = 8
const WIND_RADIUS = 110

export function createRenderer(output: HTMLCanvasElement, source: HTMLCanvasElement) {
  const gl = output.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false })
  if (!gl) return null

  const compile = (type: number, text: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, text)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(shader))
    return shader
  }

  const program = (vert: string, frag: string) => {
    const p = gl.createProgram()!
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vert))
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p))
    const uniforms = new Map<string, WebGLUniformLocation>()
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i)!
      uniforms.set(info.name, gl.getUniformLocation(p, info.name)!)
    }
    return { p, u: (name: string) => uniforms.get(name) ?? null }
  }

  const film = program(quadVert, filmFrag)
  const room = program(quadVert, roomFrag)
  const motes = program(moteVert, moteFrag)
  const wind = program(quadVert, windFrag)

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const emptyVao = gl.createVertexArray()

  const texture = () => {
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    return t
  }

  const srcTex = texture()
  const targets = [0, 1].map(() => ({ tex: texture(), fbo: gl.createFramebuffer()! }))
  const winds = [0, 1].map(() => {
    const tex = texture()
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    return { tex, fbo: gl.createFramebuffer()! }
  })
  let current = 0
  let currentWind = 0
  let size = { w: 0, h: 0 }
  let windSize = { w: 1, h: 1 }
  let lastTime = 0
  const pointer = { x: -1, y: -1, px: -1, py: -1 }
  const onMove = (e: PointerEvent) => {
    if (pointer.x < 0) {
      pointer.px = e.clientX
      pointer.py = e.clientY
    }
    pointer.x = e.clientX
    pointer.y = e.clientY
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  const resize = (w: number, h: number) => {
    if (size.w === w && size.h === h) return
    size = { w, h }
    output.width = w
    output.height = h
    for (const target of targets) {
      gl.bindTexture(gl.TEXTURE_2D, target.tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.tex, 0)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    windSize = { w: Math.ceil(w / WIND_SCALE), h: Math.ceil(h / WIND_SCALE) }
    for (const target of winds) {
      gl.bindTexture(gl.TEXTURE_2D, target.tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, windSize.w, windSize.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.tex, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const upload = () => {
    gl.bindTexture(gl.TEXTURE_2D, srcTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.generateMipmap(gl.TEXTURE_2D)
  }

  const render = (f: FilmFrame) => {
    resize(Math.round(f.vw * f.dpr), Math.round(f.vh * f.dpr))
    gl.bindVertexArray(vao)

    if (f.refresh) {
      upload()
      const prev = targets[current]
      const next = targets[1 - current]
      gl.useProgram(film.p)
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo)
      gl.viewport(0, 0, size.w, size.h)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, srcTex)
      gl.uniform1i(film.u("uSrc"), 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, prev.tex)
      gl.uniform1i(film.u("uPrev"), 1)
      gl.uniform2f(film.u("uView"), f.vw, f.vh)
      gl.uniform1f(film.u("uDpr"), f.dpr)
      gl.uniform4f(film.u("uAp"), f.ap.x, f.ap.y, f.ap.w, f.ap.h)
      gl.uniform1f(film.u("uTime"), f.time)
      gl.uniform1f(film.u("uFrame"), f.frame)
      gl.uniform2f(film.u("uWeave"), f.weave[0], f.weave[1])
      gl.uniform1f(film.u("uSlip"), f.slip)
      gl.uniform1i(film.u("uKind"), f.kind)
      gl.uniform1f(film.u("uT"), f.t)
      gl.uniform1f(film.u("uCue"), f.cue)
      gl.uniform1f(film.u("uSmear"), f.smear)
      gl.uniform2f(film.u("uStreak"), f.streak[0], f.streak[1])
      gl.uniform1f(film.u("uEdge"), f.edge)
      gl.uniform1f(film.u("uGrain"), f.grain)
      gl.uniform1f(film.u("uLamp"), f.lamp)
      gl.uniform3f(film.u("uTint"), f.tint[0], f.tint[1], f.tint[2])
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindTexture(gl.TEXTURE_2D, next.tex)
      gl.generateMipmap(gl.TEXTURE_2D)
      current = 1 - current
    }

    const dt = Math.min(Math.max(f.time - lastTime, 0), 0.1)
    lastTime = f.time
    const moved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py) / f.vh
    const prevWind = winds[currentWind]
    currentWind = 1 - currentWind
    gl.useProgram(wind.p)
    gl.bindFramebuffer(gl.FRAMEBUFFER, winds[currentWind].fbo)
    gl.viewport(0, 0, windSize.w, windSize.h)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, prevWind.tex)
    gl.uniform1i(wind.u("uPrev"), 0)
    gl.uniform2f(wind.u("uRes"), windSize.w, windSize.h)
    gl.uniform1f(wind.u("uDecay"), Math.pow(0.5, dt / 1.1))
    gl.uniform2f(wind.u("uA"), pointer.px / f.vw, 1 - pointer.py / f.vh)
    gl.uniform2f(wind.u("uB"), pointer.x / f.vw, 1 - pointer.y / f.vh)
    gl.uniform1f(wind.u("uRadius"), WIND_RADIUS / f.vh)
    gl.uniform1f(wind.u("uStrength"), moved > 0 ? Math.min(0.2 + moved * 12, 1) * 0.5 : 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    pointer.px = pointer.x
    pointer.py = pointer.y

    const filmTex = targets[current].tex
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, size.w, size.h)
    gl.useProgram(room.p)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, winds[currentWind].tex)
    gl.uniform1i(room.u("uWind"), 1)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, filmTex)
    gl.uniform1i(room.u("uFilm"), 0)
    gl.uniform2f(room.u("uView"), f.vw, f.vh)
    gl.uniform1f(room.u("uDpr"), f.dpr)
    gl.uniform4f(room.u("uAp"), f.ap.x, f.ap.y, f.ap.w, f.ap.h)
    gl.uniform4f(room.u("uEnv"), f.env.x, f.env.y, f.env.w, f.env.h)
    gl.uniform1f(room.u("uTime"), f.time)
    gl.uniform1f(room.u("uLamp"), f.lamp)
    gl.uniform1f(room.u("uBeam"), f.beam)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    gl.bindVertexArray(emptyVao)
    gl.useProgram(motes.p)
    gl.uniform1i(motes.u("uFilm"), 0)
    gl.uniform1i(motes.u("uWind"), 1)
    gl.uniform2f(motes.u("uView"), f.vw, f.vh)
    gl.uniform1f(motes.u("uDpr"), f.dpr)
    gl.uniform4f(motes.u("uAp"), f.ap.x, f.ap.y, f.ap.w, f.ap.h)
    gl.uniform1f(motes.u("uTime"), f.time)
    gl.uniform1f(motes.u("uLamp"), f.lamp)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.drawArrays(gl.POINTS, 0, MOTES)
    gl.disable(gl.BLEND)
  }

  const destroy = () => {
    window.removeEventListener("pointermove", onMove)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  }

  return { render, destroy }
}
