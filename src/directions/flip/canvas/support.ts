// Shared html-in-canvas support, adapted from canvasui-docs/README.md.

export type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null
  requestPaint?: () => void
}

export type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void
}

export function supportsHtmlInCanvas() {
  if (typeof document === "undefined") return false
  const probe = document.createElement("canvas") as PaintableCanvas
  const ctx = probe.getContext("2d") as ElementImageContext | null
  return Boolean(
    ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function",
  )
}

export function supportsWebGL2() {
  if (typeof document === "undefined") return false
  const probe = document.createElement("canvas")
  const gl = probe.getContext("webgl2")
  const ok = Boolean(gl && !gl.isContextLost())
  gl?.getExtension("WEBGL_lose_context")?.loseContext()
  return ok
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return true
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export const QUAD_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  text: string,
  label: string,
) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, text)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`${label} shader error:`, gl.getShaderInfoLog(shader))
  }
  return shader
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vertText: string,
  fragText: string,
  label: string,
) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertText, label)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragText, label)
  const program = gl.createProgram()!
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`${label} link error:`, gl.getProgramInfoLog(program))
  }
  const uniforms: Record<string, WebGLUniformLocation> = {}
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!
  }
  return { program, vert, frag, uniforms }
}

export function createQuad(gl: WebGL2RenderingContext) {
  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  return quad
}

export function createBlankTexture(gl: WebGL2RenderingContext) {
  const texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  )
  return texture
}

export function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  return dpr
}
