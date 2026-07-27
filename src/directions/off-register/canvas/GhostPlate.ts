// Ghost plate renderer for the off-register direction.
// Adapted from the canvasui.dev Asciify + VHS vanilla sources (archived in
// canvasui-docs/), merged into a single pass: the captured live DOM is redrawn
// as orange ASCII glyphs with VHS tracking noise, chromatic offset, grain, and
// drag-triggered glitch bursts. uDistort 1 -> 0 resolves the ghost into still
// ink right before the plate is retired.

export interface GhostPlateOptions {
  /** Per-plate phase offset so the nine ghosts never flicker in sync. */
  seed?: number
  /** Size of one glyph pixel in CSS pixels. Characters are 5x5 glyph pixels. */
  scale?: number
  /** Empty glyph pixels around each character (0 to 3). */
  spacing?: number
  /** Ghost ink color as [r, g, b] in 0-1 range. */
  ghost?: [number, number, number]
  /** Amount of VHS distortion (0 = still, 1 = full tracking noise). */
  distort?: number
}

export interface GhostPlateElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement
  /** Canvas the WebGL ghost renders to. */
  output: HTMLCanvasElement
}

export interface GhostPlateInstance {
  /** Set the distortion level live (1 = ghost, 0 = resolved ink). */
  setDistort: (value: number) => void
  /** Fire a glitch micro-burst (drag start/stop). */
  burst: (strength?: number) => void
  /** Re-read canvas size. */
  resize: () => void
  /** Stop the loop and release all GPU resources. */
  destroy: () => void
}

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null
  requestPaint?: () => void
}

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void
}

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false
  const probe = document.createElement("canvas") as PaintableCanvas
  const ctx = probe.getContext("2d") as ElementImageContext | null
  return Boolean(
    ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function",
  )
}

// Real-glyph ascii ramp (dark to bright), from the published Asciify source.
const ASCII_RAMP = [
  0, 128, 131200, 14336, 459200, 469440, 4357252, 18157905, 11512810, 15724526,
]

const MAX_GLYPHS = 16

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uGlyphPx;
uniform float uSpacing;
uniform uint uGlyphs[${MAX_GLYPHS}];
uniform int uGlyphCount;
uniform float uLod;
uniform float uTime;
uniform float uDistort;
uniform float uGlitch;
uniform float uSeed;
uniform vec3 uGhost;
uniform float uMaxX;

float glyphBit (int index, ivec2 p) {
  if (p.x < 0 || p.x > 4 || p.y < 0 || p.y > 4) return 0.0;
  uint bits = uGlyphs[index];
  return float((bits >> uint((4 - p.x) + 5 * p.y)) & 1u);
}

float hash21 (vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main () {
  vec2 uv = vUv;
  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  float t = uTime;
  float d = uDistort;

  // VHS tracking: slow horizontal wave + per-line jitter
  uv.x += sin(uv.y * 24.0 + t * 1.7 + uSeed) * 0.0022 * d;
  float line = hash21(vec2(floor(uv.y * uResolution.y / 2.0), floor(t * 24.0) + uSeed));
  uv.x += (line - 0.5) * 0.004 * d;

  // glitch burst: torn horizontal slices
  if (uGlitch > 0.001) {
    float band = floor(uv.y * 18.0 + uSeed);
    float tick = floor(t * 17.0);
    float roll = hash21(vec2(band, tick));
    if (roll < uGlitch * 0.55) {
      uv.x += (hash21(vec2(band, tick + 7.0)) - 0.5) * 0.12 * uGlitch;
    }
  }
  uv.x = clamp(uv.x, 0.0005, uMaxX - 0.0005);

  // ascii cells
  float cellPx = (5.0 + 2.0 * uSpacing) * uGlyphPx;
  vec2 frag = uv * uResolution;
  vec2 cell = floor(frag / cellPx);
  vec2 cellUv = (cell + 0.5) * cellPx / uResolution;
  vec2 sampleUv = clamp(cellUv, vec2(0.001), vec2(uMaxX - 0.002, 0.999));

  // chromatic offset: three taps, red and blue drift apart with distortion
  float ab = 1.6 * d / max(uResolution.x, 1.0);
  vec4 pr = textureLod(uContent, vec2(clamp(sampleUv.x + ab, 0.001, uMaxX - 0.002), 1.0 - sampleUv.y), uLod);
  vec4 pg = textureLod(uContent, vec2(sampleUv.x, 1.0 - sampleUv.y), uLod);
  vec4 pb = textureLod(uContent, vec2(clamp(sampleUv.x - ab, 0.001, uMaxX - 0.002), 1.0 - sampleUv.y), uLod);
  float lumR = dot(pr.rgb, vec3(0.299, 0.587, 0.114));
  float lum  = dot(pg.rgb, vec3(0.299, 0.587, 0.114));
  float lumB = dot(pb.rgb, vec3(0.299, 0.587, 0.114));

  // ink-on-paper: darkness of the cell picks the glyph density
  float amount = clamp((1.0 - lum) * 2.2, 0.0, 1.0);
  int index = min(int(amount * float(uGlyphCount)), uGlyphCount - 1);

  ivec2 local = ivec2(floor((frag - cell * cellPx) / uGlyphPx));
  int pad = int(uSpacing);
  float on = glyphBit(index, ivec2(local.x - pad, local.y - pad));

  // animated grain + slow tracking flicker
  float grain = hash21(frag + vec2(fract(t) * 127.1, fract(t) * 311.7));
  on *= 0.72 + 0.5 * grain * d + 0.08 * sin(t * 40.0 + uSeed) * d;

  // scanlines
  float scan = 1.0 - 0.18 * d * (0.5 + 0.5 * sin(frag.y * 3.14159));

  // ghost ink with a chroma tinge from the split taps
  vec3 col = uGhost * scan;
  col += vec3(lumR - lum, 0.0, lumB - lum) * 0.6 * d;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(on, 0.0, 1.0) * pg.a * 0.92;
  if (alpha < 0.01) {
    outColor = vec4(0.0);
    return;
  }
  outColor = vec4(col, alpha);
}`;

export function createGhostPlate(
  elements: GhostPlateElements,
  options: GhostPlateOptions = {},
): GhostPlateInstance | null {
  const config = {
    seed: options.seed ?? 0,
    scale: options.scale ?? 2,
    spacing: options.spacing ?? 1,
    ghost: options.ghost ?? ([0.91, 0.416, 0.165] as [number, number, number]),
    distort: options.distort ?? 1,
  }
  const { source, content, output } = elements

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false,
  })
  if (!gl || gl.isContextLost()) return null

  const sourceCtx = source.getContext("2d") as ElementImageContext | null
  const paintable = source as PaintableCanvas
  const htmlInCanvas = Boolean(
    sourceCtx &&
      typeof sourceCtx.drawElementImage === "function" &&
      typeof paintable.requestPaint === "function",
  )
  if (!htmlInCanvas) return null

  let contentDirty = false
  let wake = () => {}

  paintable.onpaint = () => {
    try {
      sourceCtx!.reset()
      sourceCtx!.drawElementImage!(content, 0, 0)
      contentDirty = true
      wake()
    } catch {}
  }

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!
    gl!.shaderSource(shader, text)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("GhostPlate shader error:", gl!.getShaderInfoLog(shader))
    }
    return shader
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT)
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG)
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

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const contentTexture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, contentTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
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

  let contentMaxX = 1

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(output.clientWidth * dpr))
    const height = Math.max(1, Math.round(output.clientHeight * dpr))
    if (output.width !== width || output.height !== height) {
      output.width = width
      output.height = height
    }
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1)),
    )
    const cssWidth = Math.max(1, Math.round(source.clientWidth))
    const cssHeight = Math.max(1, Math.round(source.clientHeight))
    if (source.width !== cssWidth || source.height !== cssHeight) {
      source.width = cssWidth
      source.height = cssHeight
    }
    paintable.requestPaint!()
  }

  syncCanvasSize()

  const glyphData = new Uint32Array(MAX_GLYPHS)

  function resolveGlyphs(): number {
    const count = Math.min(ASCII_RAMP.length, MAX_GLYPHS)
    glyphData.fill(0)
    for (let i = 0; i < count; i++) glyphData[i] = ASCII_RAMP[i] >>> 0
    return count
  }

  function uploadContent() {
    if (!contentDirty) return
    contentDirty = false
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source)
    gl!.generateMipmap(gl!.TEXTURE_2D)
  }

  let time = config.seed
  let glitch = 0

  function render() {
    uploadContent()
    gl!.useProgram(program)
    gl!.activeTexture(gl!.TEXTURE0)
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.uniform1i(uniforms.uContent, 0)
    gl!.uniform2f(uniforms.uResolution, output.width, output.height)
    const dpr = output.width / Math.max(output.clientWidth, 1)
    const glyphCss = Math.max(config.scale, 0.5)
    const spacing = Math.round(Math.min(Math.max(config.spacing, 0), 3))
    gl!.uniform1f(uniforms.uGlyphPx, glyphCss * dpr)
    gl!.uniform1f(uniforms.uSpacing, spacing)
    gl!.uniform1f(
      uniforms.uLod,
      Math.max(0, Math.log2((5 + 2 * spacing) * glyphCss) - 1),
    )
    gl!.uniform1uiv(uniforms["uGlyphs[0]"], glyphData)
    gl!.uniform1i(uniforms.uGlyphCount, resolveGlyphs())
    gl!.uniform1f(uniforms.uTime, time)
    gl!.uniform1f(uniforms.uDistort, Math.min(Math.max(config.distort, 0), 1))
    gl!.uniform1f(uniforms.uGlitch, glitch)
    gl!.uniform1f(uniforms.uSeed, config.seed)
    gl!.uniform3f(uniforms.uGhost, config.ghost[0], config.ghost[1], config.ghost[2])
    gl!.uniform1f(uniforms.uMaxX, contentMaxX)
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
    const delta = Math.min((now - lastTime) / 1000, 1 / 30)
    lastTime = now
    time += delta
    glitch *= Math.exp(-delta * 5)
    if (glitch < 0.01) glitch = 0
    render()
    if (config.distort <= 0.001 && glitch === 0 && !contentDirty) {
      running = false
      return
    }
    raf = requestAnimationFrame(frame)
  }

  function start() {
    if (destroyed || running || !visible) return
    running = true
    lastTime = performance.now()
    raf = requestAnimationFrame(frame)
  }

  wake = start
  start()

  const observer = new ResizeObserver(() => {
    syncCanvasSize()
    start()
  })
  observer.observe(output)
  observer.observe(content)

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true
    if (visible) start()
  })
  intersection.observe(output)

  return {
    setDistort(value) {
      config.distort = Math.min(Math.max(value, 0), 1)
      start()
    },
    burst(strength = 1) {
      glitch = Math.max(glitch, strength)
      start()
    },
    resize() {
      syncCanvasSize()
      start()
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
      paintable.onpaint = null
      gl!.getExtension("WEBGL_lose_context")?.loseContext()
    },
  }
}
