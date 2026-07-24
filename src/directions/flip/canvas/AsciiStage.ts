// AsciiStage — adapted from canvasui-docs/components/asciify.md (PUBLISHED source).
// Adaptations for the Flip direction:
// - The ascii pass covers the FULL page (baseStrength 1), not only a lens.
// - The cursor lens is inverted into a "Magnify" hole: inside the circle the
//   pass outputs transparent pixels so the raw, selectable, colorful DOM below
//   shows through (the flashlight-at-a-basement-show read).
// - A frost ring is drawn at the lens rim (frost at the lens rim).
// - uKick adds chromatic aberration kicks on the beat grid.
// RAF loop and GPU resources are fully released in destroy().

import {
  compileShader,
  createBlankTexture,
  createQuad,
  fitCanvas,
  type ElementImageContext,
  type PaintableCanvas,
} from "./support"

export interface AsciiStageOptions {
  radius?: number
  softness?: number
  scale?: number
  spacing?: number
  background?: [number, number, number]
  backgroundOpacity?: number
  contrast?: number
  brightness?: number
  strength?: number
  baseStrength?: number
  followSpeed?: number
  kick?: number
}

export interface AsciiStageElements {
  source: HTMLCanvasElement
  content: HTMLElement
  output: HTMLCanvasElement
}

export interface AsciiStageInstance {
  setOptions: (options: AsciiStageOptions) => void
  kick: (amount?: number) => void
  resize: () => void
  destroy: () => void
}

const CHARSET_ASCII = [
  0, 128, 131200, 14336, 459200, 469440, 4357252, 18157905, 11512810, 15724526,
]

const MAX_GLYPHS = 16

const DEFAULTS: Required<AsciiStageOptions> = {
  radius: 0.2,
  softness: 0.35,
  scale: 2,
  spacing: 1,
  background: [0.039, 0.039, 0.039],
  backgroundOpacity: 1,
  contrast: 1.5,
  brightness: 0.04,
  strength: 1,
  baseStrength: 1,
  followSpeed: 8,
  kick: 0,
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
uniform float uGlyphPx;
uniform float uSpacing;
uniform uint uGlyphs[${MAX_GLYPHS}];
uniform int uGlyphCount;
uniform float uRadius;
uniform float uSoftness;
uniform vec2 uPointer;
uniform float uActive;
uniform vec3 uBg;
uniform float uBackingLum;
uniform float uBgOpacity;
uniform float uLod;
uniform float uContrast;
uniform float uBrightness;
uniform float uStrength;
uniform float uBase;
uniform float uMaxX;
uniform float uKick;
uniform float uTime;

#define S(a, b, t) smoothstep(a, b, t)

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

  float cellPx = (5.0 + 2.0 * uSpacing) * uGlyphPx;
  vec2 frag = uv * uResolution;
  vec2 cell = floor(frag / cellPx);
  vec2 cellUv = (cell + 0.5) * cellPx / uResolution;

  float aspect = uResolution.x / uResolution.y;
  float dist = length((cellUv - uPointer) * vec2(aspect, 1.0));
  float radius = max(uRadius * uActive, 1e-4);
  float inner = radius * (1.0 - clamp(uSoftness, 0.0, 1.0));
  float lens = (1.0 - S(inner, radius, dist)) * uActive;

  // full-page ascii with a hole at the lens (raw DOM shows through)
  float mask = clamp(uBase * (1.0 - lens), 0.0, 1.0)
    * clamp(uStrength, 0.0, 1.0);

  // frost ring on the lens rim
  float rim = exp(-pow((dist - radius) / max(radius * 0.1, 1e-3), 2.0)) * uActive;
  float frost = rim * (0.5 + 0.5 * hash21(cell + floor(uTime * 6.0)));

  float apply = mask < 0.003 ? 0.0 : step(hash21(cell), mask);

  vec2 sampleUv = clamp(cellUv, vec2(0.001), vec2(uMaxX - 0.002, 0.999));
  vec2 ca = (cellUv - uPointer) * uKick * 0.02;
  vec2 rUv = clamp(sampleUv + ca, vec2(0.001), vec2(uMaxX - 0.002, 0.999));
  vec2 bUv = clamp(sampleUv - ca, vec2(0.001), vec2(uMaxX - 0.002, 0.999));
  vec4 mid = textureLod(uContent, vec2(sampleUv.x, 1.0 - sampleUv.y), uLod);
  vec4 pixel = vec4(
    textureLod(uContent, vec2(rUv.x, 1.0 - rUv.y), uLod).r,
    mid.g,
    textureLod(uContent, vec2(bUv.x, 1.0 - bUv.y), uLod).b,
    mid.a);

  if (apply < 0.5) {
    if (frost > 0.02 && pixel.a > 0.01) {
      float f = clamp(frost, 0.0, 1.0);
      outColor = vec4(mix(uBg, vec3(0.82, 0.88, 0.94), f), f * pixel.a);
      return;
    }
    outColor = vec4(0.0);
    return;
  }

  float lum = dot(pixel.rgb, vec3(0.299, 0.587, 0.114));
  float amount = abs(lum - uBackingLum);
  amount = clamp((amount - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);

  int index = min(int(amount * float(uGlyphCount)), uGlyphCount - 1);

  ivec2 local = ivec2(floor((frag - cell * cellPx) / uGlyphPx));
  int pad = int(uSpacing);
  float on = glyphBit(index, ivec2(local.x - pad, local.y - pad));

  vec3 glyphColor = clamp(
    uBg + (pixel.rgb - uBg) / max(abs(lum - uBackingLum), 0.2),
    0.0, 1.0);
  vec3 col = mix(uBg, glyphColor, on);
  col = mix(col, vec3(0.85, 0.9, 0.95), clamp(frost * 0.55, 0.0, 1.0));
  float alpha = pixel.a * max(
    mix(clamp(uBgOpacity, 0.0, 1.0), 1.0, on),
    clamp(frost, 0.0, 1.0));
  outColor = vec4(col, alpha);
}`

export function createAsciiStage(
  elements: AsciiStageElements,
  options: AsciiStageOptions = {},
): AsciiStageInstance | null {
  const config = { ...DEFAULTS, ...options }
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

  let contentDirty = false
  let wake = () => {}

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset()
        sourceCtx!.drawElementImage!(content, 0, 0)
        contentDirty = true
        wake()
      } catch {}
    }
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERT, "AsciiStage")
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG, "AsciiStage")
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
    fitCanvas(output)
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1)),
    )
    if (htmlInCanvas) {
      const cssWidth = Math.max(1, Math.round(source.clientWidth))
      const cssHeight = Math.max(1, Math.round(source.clientHeight))
      if (source.width !== cssWidth || source.height !== cssHeight) {
        source.width = cssWidth
        source.height = cssHeight
      }
      paintable.requestPaint!()
    }
  }

  syncCanvasSize()

  let backingRgb: [number, number, number] = [0.039, 0.039, 0.039]
  let backingLum = 0.039
  const probe = document.createElement("canvas")
  probe.width = probe.height = 1
  const probeCtx = probe.getContext("2d", { willReadFrequently: true })

  function syncBacking() {
    if (probeCtx) {
      let el: Element | null = content
      while (el) {
        const bg = getComputedStyle(el).backgroundColor
        if (bg && bg !== "transparent") {
          probeCtx.clearRect(0, 0, 1, 1)
          probeCtx.fillStyle = bg
          probeCtx.fillRect(0, 0, 1, 1)
          const data = probeCtx.getImageData(0, 0, 1, 1).data
          if (data[3] > 0) {
            backingRgb = [data[0] / 255, data[1] / 255, data[2] / 255]
            break
          }
        }
        el = el.parentElement
      }
    }
    backingLum =
      0.299 * backingRgb[0] + 0.587 * backingRgb[1] + 0.114 * backingRgb[2]
  }

  syncBacking()

  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, target: 0 }
  const glyphData = new Uint32Array(MAX_GLYPHS)
  let time = 0

  function resolveGlyphs() {
    const count = Math.min(CHARSET_ASCII.length, MAX_GLYPHS)
    glyphData.fill(0)
    for (let i = 0; i < count; i++) glyphData[i] = CHARSET_ASCII[i] >>> 0
    return count
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return
    contentDirty = false
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source)
    gl!.generateMipmap(gl!.TEXTURE_2D)
  }

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
    const glyphCount = resolveGlyphs()
    gl!.uniform1uiv(uniforms["uGlyphs[0]"], glyphData)
    gl!.uniform1i(uniforms.uGlyphCount, glyphCount)
    gl!.uniform1f(uniforms.uRadius, Math.max(config.radius, 0.01))
    gl!.uniform1f(uniforms.uSoftness, config.softness)
    gl!.uniform2f(uniforms.uPointer, pointer.x, pointer.y)
    gl!.uniform1f(uniforms.uActive, pointer.active)
    gl!.uniform3f(uniforms.uBg, config.background[0], config.background[1], config.background[2])
    gl!.uniform1f(uniforms.uBackingLum, backingLum)
    gl!.uniform1f(uniforms.uBgOpacity, config.backgroundOpacity)
    gl!.uniform1f(uniforms.uContrast, Math.max(config.contrast, 0))
    gl!.uniform1f(uniforms.uBrightness, config.brightness)
    gl!.uniform1f(uniforms.uStrength, config.strength)
    gl!.uniform1f(uniforms.uBase, config.baseStrength)
    gl!.uniform1f(uniforms.uMaxX, contentMaxX)
    gl!.uniform1f(uniforms.uKick, config.kick)
    gl!.uniform1f(uniforms.uTime, time)
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
    config.kick *= Math.exp(-delta * 5)
    if (config.kick < 0.002) config.kick = 0
    const ease = 1 - Math.exp(-delta * Math.max(config.followSpeed, 0.5))
    pointer.x += (pointer.tx - pointer.x) * ease
    pointer.y += (pointer.ty - pointer.y) * ease
    pointer.active += (pointer.target - pointer.active) * ease
    const settled =
      config.kick === 0 &&
      Math.abs(pointer.tx - pointer.x) < 5e-4 &&
      Math.abs(pointer.ty - pointer.y) < 5e-4 &&
      Math.abs(pointer.target - pointer.active) < 1e-3
    if (settled) {
      pointer.x = pointer.tx
      pointer.y = pointer.ty
      pointer.active = pointer.target
    }
    render()
    if (settled && !contentDirty) {
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
    syncBacking()
    start()
  })
  observer.observe(output)
  observer.observe(content)

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true
    if (visible) start()
  })
  intersection.observe(output)

  const listenTarget = output.parentElement ?? output

  function onPointerMove(event: PointerEvent) {
    const rect = output.getBoundingClientRect()
    pointer.tx = (event.clientX - rect.left) / Math.max(rect.width, 1)
    pointer.ty = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1)
    pointer.target = 1
    start()
  }

  function onPointerLeave() {
    pointer.target = 0
    start()
  }

  listenTarget.addEventListener("pointermove", onPointerMove)
  listenTarget.addEventListener("pointerleave", onPointerLeave)

  return {
    setOptions(next) {
      Object.assign(config, next)
      syncBacking()
      start()
    },
    kick(amount = 1) {
      config.kick = Math.max(config.kick, amount)
      start()
    },
    resize() {
      syncCanvasSize()
      syncBacking()
      start()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      intersection.disconnect()
      listenTarget.removeEventListener("pointermove", onPointerMove)
      listenTarget.removeEventListener("pointerleave", onPointerLeave)
      gl!.deleteTexture(contentTexture)
      gl!.deleteProgram(program)
      gl!.deleteShader(vertexShader)
      gl!.deleteShader(fragmentShader)
      gl!.deleteBuffer(quad)
      if (htmlInCanvas) paintable.onpaint = null
    },
  }
}
