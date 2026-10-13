# Droplets (Vanilla)

- Docs: https://canvasui.dev/docs/components/droplets
- Registry: https://canvasui.dev/r/droplets-vanilla.json (WebGL), https://canvasui.dev/r/droplets-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/droplets-vanilla`

## What it does

Rain droplets that run down the screen and refract your page behind them. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/DropletsVanilla.ts`

```ts
const canvasDimensionLimits = new WeakMap<WebGLRenderingContext | WebGL2RenderingContext, number>();

/** Keep the existing DPR budget, then account for browser pinch zoom. */
function getCanvasPixelRatio(
  element: HTMLElement,
  context?: WebGLRenderingContext | WebGL2RenderingContext,
): number {
  const scale = window.visualViewport?.scale || 1;
  const requested = Math.min(window.devicePixelRatio || 1, 2) * scale;
  const width = Math.max(element.clientWidth, 1);
  const height = Math.max(element.clientHeight, 1);
  let maxDimension = 8192;
  if (context) {
    let limit = canvasDimensionLimits.get(context);
    if (limit === undefined) {
      limit = Math.min(
        maxDimension,
        context.getParameter(context.MAX_TEXTURE_SIZE),
        context.getParameter(context.MAX_RENDERBUFFER_SIZE),
      );
      canvasDimensionLimits.set(context, limit);
    }
    maxDimension = limit;
  }
  // Rendering the full element preserves its CSS position and native input
  // geometry while panning. Bound allocations when zooming large canvases.
  return Math.min(
    requested,
    maxDimension / Math.max(width, height),
    Math.sqrt(16_777_216 / (width * height)),
  );
}

/** Pinch zoom changes visualViewport without resizing the element's CSS box. */
function createCanvasResizeObserver(onResize: () => void) {
  const viewport = window.visualViewport;
  let frame = 0;
  let disconnected = false;
  const schedule = () => {
    if (frame || disconnected) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onResize();
    });
  };
  const observer = new ResizeObserver(schedule);
  window.addEventListener("resize", schedule, { passive: true });
  viewport?.addEventListener("resize", schedule, { passive: true });
  return {
    observe(element: Element, options?: ResizeObserverOptions) {
      observer.observe(element, options);
    },
    unobserve(element: Element) {
      observer.unobserve(element);
    },
    disconnect() {
      disconnected = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
    },
  };
}

type HtmlInCanvasContext = CanvasRenderingContext2D & {
  drawElementImage: (element: Element, x: number, y: number) => DOMMatrix | void;
};

type HtmlInCanvasElement = HTMLCanvasElement & {
  updateElementGeometry?: (
    element: Element,
    options: { canvasTransform: DOMMatrix },
  ) => void;
};

/** Configure the capture subtree for both generations of the experimental API. */
function prepareHtmlInCanvas(source: HTMLCanvasElement, content: HTMLElement) {
  if ("content" in source) {
    source.setAttribute("content", "drawable");
    content.setAttribute("drawable", "");
  } else {
    source.setAttribute("layoutsubtree", "");
  }
}

/** Capture pixels and keep the native DOM hit-test region aligned with them. */
function drawHtmlInCanvas(
  source: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  content: HTMLElement,
) {
  const transform = (context as HtmlInCanvasContext).drawElementImage(content, 0, 0);
  const canvas = source as HtmlInCanvasElement;
  // Chrome 154 decoupled geometry from drawing before enabling automatic 2D
  // synchronization. Older versions have no update method; newer versions
  // synchronize automatically and return void. Use the returned matrix as-is:
  // drawElementImage already accounts for the canvas's pixel density.
  if (transform && typeof canvas.updateElementGeometry === "function") {
    canvas.updateElementGeometry(content, { canvasTransform: transform });
  }
}

function createRectCache(element: Element) {
  let current = element.getBoundingClientRect();

  const refresh = () => {
    current = element.getBoundingClientRect();
  };

  const observer = new ResizeObserver(refresh);
  observer.observe(element);
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("scroll", refresh, {
    capture: true,
    passive: true,
  });

  return {
    get current() {
      return current;
    },
    destroy() {
      observer.disconnect();
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    },
  };
}

export interface DropletsOptions {
  /** How much rain falls, from a light drizzle to a downpour (0 to 1.25). */
  intensity?: number;
  /** Animation speed multiplier. */
  speed?: number;
  /** Size of the droplet pattern. Higher means smaller drops. */
  scale?: number;
  /** Width of the droplets and their trails. */
  dropWidth?: number;
  /** How elongated the falling droplets are. */
  dropLength?: number;
  /** How strongly droplets refract the content behind them. */
  refraction?: number;
  /** Background blur outside the droplets, like a fogged up window. */
  blur?: number;
  /** Darkens the edges of the canvas (0 to 1). */
  vignette?: number;
  /** How fast the running drops slide down. */
  fallSpeed?: number;
  /** Horizontal wiggle of the running drops. */
  wiggle?: number;
  /** Multiplier for the small static droplets. */
  staticDrops?: number;
  /** Wipe drops off the glass with the pointer. */
  interactive?: boolean;
  /** Radius of the cursor wipe, relative to the screen height. */
  interactionRadius?: number;
  /** How strongly the cursor wipes drops off the glass (0 to 1). */
  interactionStrength?: number;
  /** How much the wipe distorts the content behind it. */
  interactionDistortion?: number;
  /** Tint color layered over the content as [r, g, b] in 0-1 range. */
  tint?: [number, number, number];
  /** Strength of the tint (0 to 1). */
  tintStrength?: number;
}

export interface DropletsElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface DropletsInstance {
  /** Update effect options live. */
  setOptions: (options: DropletsOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<DropletsOptions> = {
  intensity: 0.5,
  speed: 1,
  scale: 0.4,
  dropWidth: 1,
  dropLength: 1,
  refraction: 0.2,
  blur: 0,
  vignette: 0,
  fallSpeed: 1,
  wiggle: 1,
  staticDrops: 0.2,
  interactive: true,
  interactionRadius: 0.3,
  interactionStrength: 0.6,
  interactionDistortion: 3,
  tint: [1, 1, 1],
  tintStrength: 0,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

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
uniform vec2 uOffset;
uniform float uTime;
uniform float uIntensity;
uniform float uScale;
uniform float uDropWidth;
uniform float uDropLength;
uniform float uRefraction;
uniform float uBlur;
uniform float uVignette;
uniform float uFallSpeed;
uniform float uWiggle;
uniform float uStaticDrops;
uniform float uMaxX;
uniform sampler2D uTrail;
uniform float uWipe;
uniform float uWipeDistort;
uniform vec3 uTint;
uniform float uTintStrength;
uniform float uHasContent;

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13 (float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float N (float t) {
  return fract(sin(t * 12345.564) * 7658.76);
}

float Saw (float b, float t) {
  return S(0.0, b, t) * S(1.0, b, t);
}

float sdEgg (vec2 p, float ra, float rb) {
  const float k = 1.7320508;
  p.x = abs(p.x);
  float r = ra - rb;
  return ((p.y < 0.0) ? length(vec2(p.x, p.y)) - r :
          (k * (p.x + r) < p.y) ? length(vec2(p.x, p.y - k * r)) :
          length(vec2(p.x + r, p.y)) - 2.0 * r) - rb;
}

vec2 DropLayer (vec2 uv, float t) {
  vec2 UV = uv;
  vec2 a = vec2(6.0, 1.0);
  vec2 grid = a * 2.0;

  vec2 id = floor(uv * grid);
  float gridFall = N(id.x) / 3.0 + 0.5;
  uv.y += t * gridFall / a.y;
  id = floor(uv * grid);
  uv.y += N(id.x);

  id = floor(uv * grid);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);

  float x = n.x - 0.5;
  float lambda = UV.y * 20.0;
  float wiggle = sin(lambda + sin(lambda));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5) * uWiggle;
  x *= 0.6;

  float slowStart = 0.85;
  float ti = fract(t * (gridFall + 0.1) + n.z);
  float y = (Saw(slowStart, ti) - 0.5) * 0.9 + 0.5;
  vec2 p = vec2(x, y);

  float dropShape = (ti > slowStart)
    ? -sin(6.2831853 * ti / (1.0 - slowStart)) * 0.5 - 0.5
    : 0.0;
  float d = sdEgg((st - p) * a.yx / vec2(uDropWidth, uDropLength), 0.0, dropShape);
  float diameter = N(id.x + id.y) / 7.0 + 0.2;
  float mainDrop = S(diameter / 1.5, 0.0, d);

  float r2 = S(1.0, y, st.y);
  float r = sqrt(r2);
  float cd = abs(st.x - x);
  float thickness = diameter * 0.95 * uDropWidth;
  float trail = S(thickness * r, 0.0, cd);
  float trailFront = S(-0.02, 0.02, st.y - y);
  trail *= r2 * trailFront * 0.5;

  y = UV.y;
  float trail2 = S((thickness - 0.15) * r, 0.0, cd);
  trail2 *= trailFront * n.z;
  float rndX = N(id.x) / 1.5 + 0.5;
  float rndY = N(st.y) / 40.0 + 0.05;
  y = fract(y * 11.0 * rndX) + (st.y - 0.5);
  float dd = length(st - vec2(x, y));
  float droplets = S(trail2 + rndY, 0.0, dd);

  float m = mainDrop + droplets * r * trailFront;
  return vec2(m, trail);
}

float StaticDrops (vec2 uv, float t) {
  uv *= 40.0;

  vec2 id = floor(uv);
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.6;
  uv = fract(uv) - 0.5;

  float d = length(uv - p);
  float drop = S(0.3 * clamp(uDropWidth, 0.4, 1.4), 0.0, d);

  float fade = Saw(0.1, fract(t + n.y));
  float intensity = fract(n.x * 27.0);
  return drop * fade * intensity;
}

vec2 Drops (vec2 uv, float t, float tFall, float l0, float l1, float l2, float wipe) {
  float s = StaticDrops(uv, t) * l0 * (1.0 - wipe);
  vec2 m1 = DropLayer(uv, tFall) * (l1 * (1.0 - wipe * 0.8));
  vec2 m2 = DropLayer(uv * 1.85, tFall) * (l2 * (1.0 - wipe * 0.8));

  float c = s + m1.x + m2.x;
  c = S(0.3, 1.0, c);

  return vec2(c, m1.y + m2.y);
}

void main () {
  vec2 uv = vUv;

  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  vec2 aspectUv = (uv + uOffset - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime * 0.2;
  float dropScale = clamp(min(uResolution.x, uResolution.y) / 900.0, 0.75, 1.35) * uScale;
  vec2 scaledUv = aspectUv * dropScale;

  float rainAmount = clamp(uIntensity, 0.0, 1.25);

  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0 * uStaticDrops;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);
  float tFall = t * uFallSpeed;

  float wipeMask = texture(uTrail, uv).r;
  float wipe = wipeMask * clamp(uWipe, 0.0, 1.0);

  vec2 c = Drops(scaledUv, t, tFall, staticDrops, layer1, layer2, wipe);

  vec2 e = vec2(0.001, 0.0);
  float cx = Drops(scaledUv + e, t, tFall, staticDrops, layer1, layer2, wipe).x;
  float cy = Drops(scaledUv + e.yx, t, tFall, staticDrops, layer1, layer2, wipe).x;
  vec2 normal = vec2(cx - c.x, cy - c.x);

  vec2 e2 = vec2(0.012, 0.0);
  float wx = texture(uTrail, uv + e2).r;
  float wy = texture(uTrail, uv + e2.yx).r;
  normal += vec2(wipeMask - wx, wipeMask - wy) * 0.05 * uWipeDistort * clamp(uWipe, 0.0, 1.0);

  vec2 refractedUv = clamp(uv + normal * uRefraction, vec2(0.001), vec2(uMaxX - 0.004, 0.999));
  float fog = clamp(uBlur, 0.0, 8.0) * mix(0.7, 1.0, rainAmount);
  float back = fog * (1.0 - clamp(c.y * 2.0, 0.0, 1.0)) * (1.0 - wipe);
  float focus = mix(back, 0.0, S(0.1, 0.2, c.x));

  if (uHasContent < 0.5) {
    float mask = S(0.02, 0.14, c.x);
    vec3 n3 = normalize(vec3(normal * 42.0, 1.0));
    vec3 L = normalize(vec3(-0.35, 0.75, 0.55));
    float spec = pow(max(dot(reflect(vec3(0.0, 0.0, -1.0), n3), L), 0.0), 34.0);
    float rim = clamp(length(normal) * 26.0, 0.0, 1.0);
    vec3 dropCol = mix(vec3(0.72), uTint, clamp(uTintStrength, 0.0, 1.0));
    vec3 colF = dropCol * (0.12 + 0.5 * rim) + vec3(spec);
    float alphaF = mask * clamp(0.1 + rim * 0.5 + spec * 0.9, 0.0, 1.0);
    outColor = vec4(clamp(colF, 0.0, 1.0) * alphaF, alphaF);
    return;
  }

  vec4 content = textureLod(uContent, vec2(refractedUv.x, 1.0 - refractedUv.y), focus);
  vec3 col = content.rgb;

  col = mix(col, uTint, clamp(uTintStrength, 0.0, 1.0) * 0.35);

  vec2 vignetteUv = uv - 0.5;
  col *= 1.0 - dot(vignetteUv, vignetteUv) * clamp(uVignette, 0.0, 1.0) * 2.0;

  outColor = vec4(col * content.a, content.a);
}`;

const TRAIL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPrev;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uAspect;
uniform float uRadius;
uniform float uDecay;
uniform float uDrain;
uniform float uSplat;

float capsule (vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main () {
  float prev = max(texture(uPrev, vUv).r * uDecay - uDrain, 0.0);
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uFrom.x * uAspect, uFrom.y);
  vec2 b = vec2(uTo.x * uAspect, uTo.y);
  float d = capsule(p, a, b);
  float m = smoothstep(uRadius, uRadius * 0.5, d) * uSplat;
  outColor = vec4(max(prev, m), 0.0, 0.0, 1.0);
}`;

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const ctx = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    ctx &&
    typeof ctx.drawElementImage === "function" &&
    typeof probe.requestPaint === "function",
  );
}

export function createDroplets(
  elements: DropletsElements,
  options: DropletsOptions = {},
): DropletsInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, output } = elements;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
    typeof sourceCtx.drawElementImage === "function" &&
    typeof paintable.requestPaint === "function",
  );

  if (htmlInCanvas) prepareHtmlInCanvas(source, content);

  let contentDirty = false;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset();
        drawHtmlInCanvas(source, sourceCtx!, content);
        contentDirty = true;
        wake();
      } catch {}
    };
  }

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Droplets shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const trailShader = compile(gl.FRAGMENT_SHADER, TRAIL_FRAG);

  function link(fragment: WebGLShader) {
    const prog = gl!.createProgram()!;
    gl!.attachShader(prog, vertexShader);
    gl!.attachShader(prog, fragment);
    gl!.linkProgram(prog);
    const locations: Record<string, WebGLUniformLocation> = {};
    const total = gl!.getProgramParameter(prog, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < total; i++) {
      const info = gl!.getActiveUniform(prog, i)!;
      locations[info.name] = gl!.getUniformLocation(prog, info.name)!;
    }
    return { program: prog, uniforms: locations };
  }

  const { program, uniforms } = link(fragmentShader);
  const { program: trailProgram, uniforms: trailUniforms } = link(trailShader);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const contentTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, contentTexture);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
  );
  gl.generateMipmap(gl.TEXTURE_2D);

  let contentMaxX = 1;

  function syncCanvasSize() {
    const dpr = getCanvasPixelRatio(output, gl!);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1)),
    );
    if (htmlInCanvas) {
      const sourceWidth = Math.max(1, Math.round(source.clientWidth * dpr));
      const sourceHeight = Math.max(1, Math.round(source.clientHeight * dpr));
      if (source.width !== sourceWidth || source.height !== sourceHeight) {
        source.width = sourceWidth;
        source.height = sourceHeight;
      }
      paintable.requestPaint!();
    }
  }

  syncCanvasSize();

  let trailWidth = 0;
  let trailHeight = 0;
  const trailTextures: WebGLTexture[] = [];
  const trailFramebuffers: WebGLFramebuffer[] = [];
  let trailIndex = 0;

  function ensureTrailTargets() {
    const width = Math.max(1, Math.round(output.width / 4));
    const height = Math.max(1, Math.round(output.height / 4));
    if (width === trailWidth && height === trailHeight && trailTextures.length)
      return;
    trailWidth = width;
    trailHeight = height;
    for (const texture of trailTextures) gl!.deleteTexture(texture);
    for (const framebuffer of trailFramebuffers)
      gl!.deleteFramebuffer(framebuffer);
    trailTextures.length = 0;
    trailFramebuffers.length = 0;
    for (let i = 0; i < 2; i++) {
      const texture = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA,
        width,
        height,
        0,
        gl!.RGBA,
        gl!.UNSIGNED_BYTE,
        null,
      );
      const framebuffer = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffer);
      gl!.framebufferTexture2D(
        gl!.FRAMEBUFFER,
        gl!.COLOR_ATTACHMENT0,
        gl!.TEXTURE_2D,
        texture,
        0,
      );
      gl!.clearColor(0, 0, 0, 1);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      trailTextures.push(texture);
      trailFramebuffers.push(framebuffer);
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  }

  const pointer = {
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    seen: false,
    moved: false,
  };

  function updateTrail(delta: number) {
    ensureTrailTargets();
    gl!.useProgram(trailProgram);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, trailTextures[trailIndex]);
    gl!.uniform1i(trailUniforms.uPrev, 0);
    gl!.uniform1f(trailUniforms.uDecay, Math.exp(-delta * 0.5));
    gl!.uniform1f(trailUniforms.uDrain, delta * 0.3);
    gl!.uniform1f(
      trailUniforms.uAspect,
      output.width / Math.max(output.height, 1),
    );
    gl!.uniform2f(trailUniforms.uFrom, pointer.px, pointer.py);
    gl!.uniform2f(trailUniforms.uTo, pointer.x, pointer.y);
    gl!.uniform1f(
      trailUniforms.uRadius,
      Math.max(config.interactionRadius, 0.01),
    );
    gl!.uniform1f(
      trailUniforms.uSplat,
      config.interactive && pointer.moved ? 1 : 0,
    );
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, trailFramebuffers[1 - trailIndex]);
    gl!.viewport(0, 0, trailWidth, trailHeight);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    trailIndex = 1 - trailIndex;
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.moved = false;
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source,
    );
    gl!.generateMipmap(gl!.TEXTURE_2D);
  }

  function render(timeSec: number) {
    uploadContent();
    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform1f(uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    gl!.uniform2f(
      uniforms.uOffset,
      content.scrollLeft / Math.max(content.clientWidth, 1),
      -content.scrollTop / Math.max(content.clientHeight, 1),
    );
    gl!.uniform1f(uniforms.uTime, timeSec);
    gl!.uniform1f(uniforms.uIntensity, config.intensity);
    gl!.uniform1f(uniforms.uScale, Math.max(config.scale, 0.01));
    gl!.uniform1f(uniforms.uDropWidth, Math.max(config.dropWidth, 0.05));
    gl!.uniform1f(uniforms.uDropLength, Math.max(config.dropLength, 0.05));
    gl!.uniform1f(uniforms.uRefraction, config.refraction);
    gl!.uniform1f(uniforms.uBlur, Math.max(config.blur, 0));
    gl!.uniform1f(uniforms.uVignette, config.vignette);
    gl!.uniform1f(uniforms.uFallSpeed, config.fallSpeed);
    gl!.uniform1f(uniforms.uWiggle, config.wiggle);
    gl!.uniform1f(uniforms.uStaticDrops, config.staticDrops);
    gl!.uniform1f(uniforms.uMaxX, contentMaxX);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, trailTextures[trailIndex]);
    gl!.uniform1i(uniforms.uTrail, 1);
    gl!.uniform1f(
      uniforms.uWipe,
      config.interactive
        ? Math.min(Math.max(config.interactionStrength, 0), 1)
        : 0,
    );
    gl!.uniform1f(
      uniforms.uWipeDistort,
      Math.max(config.interactionDistortion, 0),
    );
    gl!.uniform3f(
      uniforms.uTint,
      config.tint[0],
      config.tint[1],
      config.tint[2],
    );
    gl!.uniform1f(uniforms.uTintStrength, config.tintStrength);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0;
  let lastTime = performance.now();
  let elapsed = 0;
  let destroyed = false;
  let running = false;
  let visible = true;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    elapsed += delta * config.speed;
    updateTrail(delta);
    render(elapsed);
    if (reducedMotion && !contentDirty) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const observer = createCanvasResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);
  observer.observe(content);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  const listenTarget = output.parentElement ?? output;

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    if (!config.interactive || reducedMotion) return;
    const rect = rectCache.current;
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    if (!pointer.seen) {
      pointer.seen = true;
      pointer.px = x;
      pointer.py = y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.moved = true;
    start();
  }

  function onPointerLeave() {
    pointer.seen = false;
  }

  listenTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  listenTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });
  content.addEventListener("scroll", start, { passive: true });

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof DropletsOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      start();
    },
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      rectCache.destroy();
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      listenTarget.removeEventListener("pointermove", onPointerMove);
      listenTarget.removeEventListener("pointerleave", onPointerLeave);
      content.removeEventListener("scroll", start);
      gl!.deleteTexture(contentTexture);
      for (const texture of trailTextures) gl!.deleteTexture(texture);
      for (const framebuffer of trailFramebuffers)
        gl!.deleteFramebuffer(framebuffer);
      gl!.deleteProgram(program);
      gl!.deleteProgram(trailProgram);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteShader(trailShader);
      gl!.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/DropletsWebGPU.ts`

```ts
const canvasDimensionLimits = new WeakMap<WebGLRenderingContext | WebGL2RenderingContext, number>();

/** Keep the existing DPR budget, then account for browser pinch zoom. */
function getCanvasPixelRatio(
  element: HTMLElement,
  context?: WebGLRenderingContext | WebGL2RenderingContext,
): number {
  const scale = window.visualViewport?.scale || 1;
  const requested = Math.min(window.devicePixelRatio || 1, 2) * scale;
  const width = Math.max(element.clientWidth, 1);
  const height = Math.max(element.clientHeight, 1);
  let maxDimension = 8192;
  if (context) {
    let limit = canvasDimensionLimits.get(context);
    if (limit === undefined) {
      limit = Math.min(
        maxDimension,
        context.getParameter(context.MAX_TEXTURE_SIZE),
        context.getParameter(context.MAX_RENDERBUFFER_SIZE),
      );
      canvasDimensionLimits.set(context, limit);
    }
    maxDimension = limit;
  }
  // Rendering the full element preserves its CSS position and native input
  // geometry while panning. Bound allocations when zooming large canvases.
  return Math.min(
    requested,
    maxDimension / Math.max(width, height),
    Math.sqrt(16_777_216 / (width * height)),
  );
}

/** Pinch zoom changes visualViewport without resizing the element's CSS box. */
function createCanvasResizeObserver(onResize: () => void) {
  const viewport = window.visualViewport;
  let frame = 0;
  let disconnected = false;
  const schedule = () => {
    if (frame || disconnected) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onResize();
    });
  };
  const observer = new ResizeObserver(schedule);
  window.addEventListener("resize", schedule, { passive: true });
  viewport?.addEventListener("resize", schedule, { passive: true });
  return {
    observe(element: Element, options?: ResizeObserverOptions) {
      observer.observe(element, options);
    },
    unobserve(element: Element) {
      observer.unobserve(element);
    },
    disconnect() {
      disconnected = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
    },
  };
}

type HtmlInCanvasContext = CanvasRenderingContext2D & {
  drawElementImage: (element: Element, x: number, y: number) => DOMMatrix | void;
};

type HtmlInCanvasElement = HTMLCanvasElement & {
  updateElementGeometry?: (
    element: Element,
    options: { canvasTransform: DOMMatrix },
  ) => void;
};

/** Configure the capture subtree for both generations of the experimental API. */
function prepareHtmlInCanvas(source: HTMLCanvasElement, content: HTMLElement) {
  if ("content" in source) {
    source.setAttribute("content", "drawable");
    content.setAttribute("drawable", "");
  } else {
    source.setAttribute("layoutsubtree", "");
  }
}

/** Capture pixels and keep the native DOM hit-test region aligned with them. */
function drawHtmlInCanvas(
  source: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  content: HTMLElement,
) {
  const transform = (context as HtmlInCanvasContext).drawElementImage(content, 0, 0);
  const canvas = source as HtmlInCanvasElement;
  // Chrome 154 decoupled geometry from drawing before enabling automatic 2D
  // synchronization. Older versions have no update method; newer versions
  // synchronize automatically and return void. Use the returned matrix as-is:
  // drawElementImage already accounts for the canvas's pixel density.
  if (transform && typeof canvas.updateElementGeometry === "function") {
    canvas.updateElementGeometry(content, { canvasTransform: transform });
  }
}

import {
  effect,
  frame as gpuFrame,
  init,
  sampler,
  surface,
  target,
  type Effect,
  type Gpu,
  type Surface,
  type Target,
} from "vgpu";
import type { Texture } from "vgpu";

export interface DropletsOptions {
  /** How much rain falls, from a light drizzle to a downpour (0 to 1.25). */
  intensity?: number;
  /** Animation speed multiplier. */
  speed?: number;
  /** Size of the droplet pattern. Higher means smaller drops. */
  scale?: number;
  /** Width of the droplets and their trails. */
  dropWidth?: number;
  /** How elongated the falling droplets are. */
  dropLength?: number;
  /** How strongly droplets refract the content behind them. */
  refraction?: number;
  /** Background blur outside the droplets, like a fogged up window. */
  blur?: number;
  /** Darkens the edges of the canvas (0 to 1). */
  vignette?: number;
  /** How fast the running drops slide down. */
  fallSpeed?: number;
  /** Horizontal wiggle of the running drops. */
  wiggle?: number;
  /** Multiplier for the small static droplets. */
  staticDrops?: number;
  /** Wipe drops off the glass with the pointer. */
  interactive?: boolean;
  /** Radius of the cursor wipe, relative to the screen height. */
  interactionRadius?: number;
  /** How strongly the cursor wipes drops off the glass (0 to 1). */
  interactionStrength?: number;
  /** How much the wipe distorts the content behind it. */
  interactionDistortion?: number;
  /** Tint color layered over the content as [r, g, b] in 0-1 range. */
  tint?: [number, number, number];
  /** Strength of the tint (0 to 1). */
  tintStrength?: number;
}

export interface DropletsElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGPU effect renders to. */
  output: HTMLCanvasElement;
}

export interface DropletsInstance {
  /** Update effect options live. */
  setOptions: (options: DropletsOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<DropletsOptions> = {
  intensity: 0.5,
  speed: 1,
  scale: 0.4,
  dropWidth: 1,
  dropLength: 1,
  refraction: 0.2,
  blur: 0,
  vignette: 0,
  fallSpeed: 1,
  wiggle: 1,
  staticDrops: 0.2,
  interactive: true,
  interactionRadius: 0.3,
  interactionStrength: 0.6,
  interactionDistortion: 3,
  tint: [1, 1, 1],
  tintStrength: 0,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

type RectCache = {
  readonly current: DOMRect;
  destroy: () => void;
};

function createRectCache(element: Element): RectCache {
  let current = element.getBoundingClientRect();
  const refresh = () => {
    current = element.getBoundingClientRect();
  };
  const observer = new ResizeObserver(refresh);
  observer.observe(element);
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("scroll", refresh, { capture: true, passive: true });
  return {
    get current() {
      return current;
    },
    destroy() {
      observer.disconnect();
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    },
  };
}

const MAIN_SHADER = /* wgsl */ `
struct Params {
  resolution: vec2f,
  offset: vec2f,
  tint: vec3f,
  time: f32,
  intensity: f32,
  scale: f32,
  dropWidth: f32,
  dropLength: f32,
  refraction: f32,
  blur: f32,
  vignette: f32,
  fallSpeed: f32,
  wiggle: f32,
  staticDrops: f32,
  maxX: f32,
  wipe: f32,
  wipeDistort: f32,
  tintStrength: f32,
  hasContent: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uTrail: texture_2d<f32>;
@group(0) @binding(3) var uSampler: sampler;

fn S(a: f32, b: f32, t: f32) -> f32 { return smoothstep(a, b, t); }
fn topUv(uv: vec2f) -> vec2f { return vec2f(uv.x, 1.0 - uv.y); }

fn N13(p: f32) -> vec3f {
  var p3 = fract(vec3f(p) * vec3f(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + vec3f(19.19));
  return fract(vec3f(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

fn N(t: f32) -> f32 {
  return fract(sin(t * 12345.564) * 7658.76);
}

fn Saw(b: f32, t: f32) -> f32 {
  return S(0.0, b, t) * S(1.0, b, t);
}

fn sdEgg(pIn: vec2f, ra: f32, rb: f32) -> f32 {
  let k = 1.7320508;
  let p = vec2f(abs(pIn.x), pIn.y);
  let r = ra - rb;
  var d: f32;
  if (p.y < 0.0) {
    d = length(vec2f(p.x, p.y)) - r;
  } else if (k * (p.x + r) < p.y) {
    d = length(vec2f(p.x, p.y - k * r));
  } else {
    d = length(vec2f(p.x + r, p.y)) - 2.0 * r;
  }
  return d - rb;
}

fn DropLayer(uvIn: vec2f, t: f32) -> vec2f {
  var uv = uvIn;
  let UV = uv;
  let a = vec2f(6.0, 1.0);
  let grid = a * 2.0;

  var id = floor(uv * grid);
  let gridFall = N(id.x) / 3.0 + 0.5;
  uv = vec2f(uv.x, uv.y + t * gridFall / a.y);
  id = floor(uv * grid);
  uv = vec2f(uv.x, uv.y + N(id.x));

  id = floor(uv * grid);
  let st = fract(uv * grid) - vec2f(0.5, 0.0);
  let n = N13(id.x * 35.2 + id.y * 2376.1);

  var x = n.x - 0.5;
  let lambda = UV.y * 20.0;
  let wiggle = sin(lambda + sin(lambda));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5) * params.wiggle;
  x *= 0.6;

  let slowStart = 0.85;
  let ti = fract(t * (gridFall + 0.1) + n.z);
  var y = (Saw(slowStart, ti) - 0.5) * 0.9 + 0.5;
  let p = vec2f(x, y);

  let dropShape = select(0.0, -sin(6.2831853 * ti / (1.0 - slowStart)) * 0.5 - 0.5, ti > slowStart);
  let d = sdEgg((st - p) * a.yx / vec2f(params.dropWidth, params.dropLength), 0.0, dropShape);
  let diameter = N(id.x + id.y) / 7.0 + 0.2;
  let mainDrop = S(diameter / 1.5, 0.0, d);

  let r2 = S(1.0, y, st.y);
  let r = sqrt(r2);
  let cd = abs(st.x - x);
  let thickness = diameter * 0.95 * params.dropWidth;
  var trail = S(thickness * r, 0.0, cd);
  let trailFront = S(-0.02, 0.02, st.y - y);
  trail *= r2 * trailFront * 0.5;

  y = UV.y;
  let trail2 = S((thickness - 0.15) * r, 0.0, cd);
  let rndX = N(id.x) / 1.5 + 0.5;
  let rndY = N(st.y) / 40.0 + 0.05;
  y = fract(y * 11.0 * rndX) + (st.y - 0.5);
  let dd = length(st - vec2f(x, y));
  let droplets = S(trail2 * trailFront * n.z + rndY, 0.0, dd);

  let m = mainDrop + droplets * r * trailFront;
  return vec2f(m, trail);
}

fn StaticDrops(uvIn: vec2f, t: f32) -> f32 {
  var uv = uvIn * 40.0;

  let id = floor(uv);
  let n = N13(id.x * 107.45 + id.y * 3543.654);
  let p = (n.xy - vec2f(0.5)) * 0.6;
  uv = fract(uv) - vec2f(0.5);

  let d = length(uv - p);
  let drop = S(0.3 * clamp(params.dropWidth, 0.4, 1.4), 0.0, d);

  let fade = Saw(0.1, fract(t + n.y));
  let intensity = fract(n.x * 27.0);
  return drop * fade * intensity;
}

fn Drops(uv: vec2f, t: f32, tFall: f32, l0: f32, l1: f32, l2: f32, wipeValue: f32) -> vec2f {
  let s = StaticDrops(uv, t) * l0 * (1.0 - wipeValue);
  let m1 = DropLayer(uv, tFall) * (l1 * (1.0 - wipeValue * 0.8));
  let m2 = DropLayer(uv * 1.85, tFall) * (l2 * (1.0 - wipeValue * 0.8));

  var c = s + m1.x + m2.x;
  c = S(0.3, 1.0, c);

  return vec2f(c, m1.y + m2.y);
}

fn trailAt(uv: vec2f) -> f32 {
  return textureSampleLevel(uTrail, uSampler, topUv(uv), 0.0).r;
}

@fragment fn fs_main(@location(0) inUv: vec2f) -> @location(0) vec4f {
  let uv = vec2f(inUv.x, 1.0 - inUv.y);

  if (uv.x > params.maxX) {
    return vec4f(0.0);
  }

  let aspectUv = (uv + params.offset - vec2f(0.5)) * vec2f(params.resolution.x / params.resolution.y, 1.0);
  let t = params.time * 0.2;
  let dropScale = clamp(min(params.resolution.x, params.resolution.y) / 900.0, 0.75, 1.35) * params.scale;
  let scaledUv = aspectUv * dropScale;

  let rainAmount = clamp(params.intensity, 0.0, 1.25);

  let staticDropAmount = S(-0.5, 1.0, rainAmount) * 2.0 * params.staticDrops;
  let layer1 = S(0.25, 0.75, rainAmount);
  let layer2 = S(0.0, 0.5, rainAmount);
  let tFall = t * params.fallSpeed;

  let wipeMask = trailAt(uv);
  let wipeValue = wipeMask * clamp(params.wipe, 0.0, 1.0);

  let c = Drops(scaledUv, t, tFall, staticDropAmount, layer1, layer2, wipeValue);

  let e = vec2f(0.001, 0.0);
  let cx = Drops(scaledUv + e, t, tFall, staticDropAmount, layer1, layer2, wipeValue).x;
  let cy = Drops(scaledUv + e.yx, t, tFall, staticDropAmount, layer1, layer2, wipeValue).x;
  var normal = vec2f(cx - c.x, cy - c.x);

  let e2 = vec2f(0.012, 0.0);
  let wx = trailAt(uv + e2);
  let wy = trailAt(uv + e2.yx);
  normal += vec2f(wipeMask - wx, wipeMask - wy) * 0.05 * params.wipeDistort * clamp(params.wipe, 0.0, 1.0);

  let refractedUv = clamp(uv + normal * params.refraction, vec2f(0.001), vec2f(params.maxX - 0.004, 0.999));
  let fog = clamp(params.blur, 0.0, 8.0) * mix(0.7, 1.0, rainAmount);
  let back = fog * (1.0 - clamp(c.y * 2.0, 0.0, 1.0)) * (1.0 - wipeValue);
  let focus = mix(back, 0.0, S(0.1, 0.2, c.x));

  if (params.hasContent < 0.5) {
    let mask = S(0.02, 0.14, c.x);
    let n3 = normalize(vec3f(normal * 42.0, 1.0));
    let L = normalize(vec3f(-0.35, 0.75, 0.55));
    let spec = pow(max(dot(reflect(vec3f(0.0, 0.0, -1.0), n3), L), 0.0), 34.0);
    let rim = clamp(length(normal) * 26.0, 0.0, 1.0);
    let dropCol = mix(vec3f(0.72), params.tint, clamp(params.tintStrength, 0.0, 1.0));
    let colF = dropCol * (0.12 + 0.5 * rim) + vec3f(spec);
    let alphaF = mask * clamp(0.1 + rim * 0.5 + spec * 0.9, 0.0, 1.0);
    return vec4f(clamp(colF, vec3f(0.0), vec3f(1.0)) * alphaF, alphaF);
  }

  let content = textureSampleLevel(uContent, uSampler, topUv(refractedUv), focus);
  var col = content.rgb;

  col = mix(col, params.tint, clamp(params.tintStrength, 0.0, 1.0) * 0.35);

  let vignetteUv = uv - vec2f(0.5);
  col *= 1.0 - dot(vignetteUv, vignetteUv) * clamp(params.vignette, 0.0, 1.0) * 2.0;

  return vec4f(col * content.a, content.a);
}`;

const TRAIL_SHADER = /* wgsl */ `
struct TrailParams {
  fromPoint: vec2f,
  toPoint: vec2f,
  aspect: f32,
  radius: f32,
  decay: f32,
  drain: f32,
  splat: f32,
}

@group(0) @binding(0) var<uniform> params: TrailParams;
@group(0) @binding(1) var uPrev: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

fn capsule(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

@fragment fn fs_main(@location(0) inUv: vec2f) -> @location(0) vec4f {
  let uv = vec2f(inUv.x, 1.0 - inUv.y);
  let prev = max(textureSampleLevel(uPrev, uSampler, inUv, 0.0).r * params.decay - params.drain, 0.0);
  let p = vec2f(uv.x * params.aspect, uv.y);
  let a = vec2f(params.fromPoint.x * params.aspect, params.fromPoint.y);
  let b = vec2f(params.toPoint.x * params.aspect, params.toPoint.y);
  let d = capsule(p, a, b);
  let m = smoothstep(params.radius, params.radius * 0.5, d) * params.splat;
  return vec4f(max(prev, m), 0.0, 0.0, 1.0);
}`;

const MIPMAP_SHADER = /* wgsl */ `
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@group(0) @binding(0) var uSrc: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;

@vertex fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VSOut {
  let pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  let p = pos[vertexIndex];
  var out: VSOut;
  out.pos = vec4f(p, 0.0, 1.0);
  out.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  return out;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSampleLevel(uSrc, uSampler, uv, 0.0);
}`;

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas") as PaintableCanvas;
  const ctx = probe.getContext("2d") as ElementImageContext | null;
  return Boolean(
    ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function",
  );
}

/** True when the browser exposes WebGPU. The device itself is requested lazily. */
export function supportsWebGPU(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.gpu);
}

let sharedGpu: Promise<Gpu> | null = null;

/** One WebGPU device per page, shared by every Droplets instance. */
function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

function destroyTarget(value: Target | null) {
  (value as unknown as { destroy?: () => void } | null)?.destroy?.();
}

export function createDroplets(
  elements: DropletsElements,
  options: DropletsOptions = {},
): DropletsInstance | null {
  if (!supportsWebGPU()) return null;
  const config = { ...DEFAULTS, ...options };
  const { source, content, output } = elements;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
      typeof sourceCtx.drawElementImage === "function" &&
      typeof paintable.requestPaint === "function",
  );

  if (htmlInCanvas) prepareHtmlInCanvas(source, content);

  let contentDirty = false;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => {
      try {
        sourceCtx!.reset();
        drawHtmlInCanvas(source, sourceCtx!, content);
        contentDirty = true;
        wake();
      } catch {}
    };
  }

  let gpu: Gpu | null = null;
  let screen: Surface | null = null;
  let fx: Effect | null = null;
  let trailFx: Effect | null = null;
  let contentTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;
  let linearSampler: GPUSampler | null = null;
  let mipmapLayout: GPUBindGroupLayout | null = null;
  let mipmapPipeline: GPURenderPipeline | null = null;

  let contentMaxX = 1;

  function syncCanvasSize() {
    const dpr = getCanvasPixelRatio(output);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (screen) {
      const [w, h] = screen.size;
      if (w !== width || h !== height) screen.resize([width, height]);
    } else if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1)),
    );
    if (htmlInCanvas) {
      const sourceWidth = Math.max(1, Math.round(source.clientWidth * dpr));
      const sourceHeight = Math.max(1, Math.round(source.clientHeight * dpr));
      if (source.width !== sourceWidth || source.height !== sourceHeight) {
        source.width = sourceWidth;
        source.height = sourceHeight;
      }
      paintable.requestPaint!();
    }
  }

  syncCanvasSize();

  let trailWidth = 0;
  let trailHeight = 0;
  const trailTargets: [Target | null, Target | null] = [null, null];
  let trailIndex = 0;

  function clearTarget(value: Target) {
    gpuFrame(gpu!, (f) => f.pass({ target: value, clear: [0, 0, 0, 1] }, () => {}));
  }

  function ensureTrailTargets() {
    const width = Math.max(1, Math.round(output.width / 4));
    const height = Math.max(1, Math.round(output.height / 4));
    if (width === trailWidth && height === trailHeight && trailTargets[0] && trailTargets[1]) {
      return;
    }
    trailWidth = width;
    trailHeight = height;
    destroyTarget(trailTargets[0]);
    destroyTarget(trailTargets[1]);
    trailTargets[0] = target(gpu!, {
      size: [width, height],
      format: "rgba8unorm",
      label: "droplets.trail-a",
    });
    trailTargets[1] = target(gpu!, {
      size: [width, height],
      format: "rgba8unorm",
      label: "droplets.trail-b",
    });
    clearTarget(trailTargets[0]);
    clearTarget(trailTargets[1]);
    trailIndex = 0;
  }

  const pointer = {
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    seen: false,
    moved: false,
  };

  function updateTrail(delta: number): Target | null {
    if (!gpu || !trailFx) return null;
    ensureTrailTargets();
    const prev = trailTargets[trailIndex]!;
    const next = trailTargets[1 - trailIndex]!;
    trailFx.set({
      uPrev: prev,
      params: {
        decay: Math.exp(-delta * 0.5),
        drain: delta * 0.3,
        aspect: output.width / Math.max(output.height, 1),
        fromPoint: [pointer.px, pointer.py],
        toPoint: [pointer.x, pointer.y],
        radius: Math.max(config.interactionRadius, 0.01),
        splat: config.interactive && pointer.moved ? 1 : 0,
      },
    });
    trailIndex = 1 - trailIndex;
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.moved = false;
    return next;
  }

  function ensureContentTexture(): Texture {
    const width = Math.max(1, source.width);
    const height = Math.max(1, source.height);
    const mipLevelCount = mipLevelCountFor(width, height);
    if (
      !contentTexture ||
      contentTexture.size[0] !== width ||
      contentTexture.size[1] !== height ||
      contentTexture.mipLevelCount !== mipLevelCount
    ) {
      contentTexture?.destroy();
      contentTexture = gpu!.device.createTexture({
        size: [width, height],
        format: "rgba8unorm",
        usage: ["texture_binding", "copy_dst", "render_attachment"],
        mipLevelCount,
        label: "droplets.content",
      });
    }
    return contentTexture;
  }

  function mipLevelCountFor(width: number, height: number): number {
    return Math.floor(Math.log2(Math.max(width, height))) + 1;
  }

  function ensureMipmapPipeline(): GPURenderPipeline | null {
    if (!gpu || !linearSampler) return null;
    if (!mipmapLayout) {
      mipmapLayout = gpu.gpu.createBindGroupLayout({
        label: "droplets.mipmap.layout",
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { sampleType: "float", viewDimension: "2d" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: { type: "filtering" },
          },
        ],
      });
    }
    if (!mipmapPipeline) {
      const shaderModule = gpu.gpu.createShaderModule({
        label: "droplets.mipmap",
        code: MIPMAP_SHADER,
      });
      mipmapPipeline = gpu.gpu.createRenderPipeline({
        label: "droplets.mipmap",
        layout: gpu.gpu.createPipelineLayout({ bindGroupLayouts: [mipmapLayout] }),
        vertex: { module: shaderModule, entryPoint: "vs_main" },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [{ format: "rgba8unorm" }],
        },
        primitive: { topology: "triangle-list" },
      });
    }
    return mipmapPipeline;
  }

  function generateMipmaps(texture: Texture) {
    if (!gpu || !linearSampler || texture.mipLevelCount <= 1) return;
    const pipeline = ensureMipmapPipeline();
    if (!pipeline || !mipmapLayout) return;
    const encoder = gpu.gpu.createCommandEncoder({ label: "droplets.mipmap" });
    for (let level = 1; level < texture.mipLevelCount; level++) {
      const bindGroup = gpu.gpu.createBindGroup({
        label: "droplets.mipmap",
        layout: mipmapLayout,
        entries: [
          {
            binding: 0,
            resource: texture.gpu.createView({
              baseMipLevel: level - 1,
              mipLevelCount: 1,
            }),
          },
          { binding: 1, resource: linearSampler },
        ],
      });
      const pass = encoder.beginRenderPass({
        label: "droplets.mipmap",
        colorAttachments: [
          {
            view: texture.gpu.createView({ baseMipLevel: level, mipLevelCount: 1 }),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
    }
    gpu.gpu.queue.submit([encoder.finish()]);
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty || !gpu) return;
    contentDirty = false;
    const texture = ensureContentTexture();
    gpu.gpu.queue.copyExternalImageToTexture(
      { source },
      { texture: texture.gpu },
      [source.width, source.height],
    );
    generateMipmaps(texture);
    fx!.set({ uContent: texture });
  }

  function render(timeSec: number, trailTarget: Target | null) {
    if (!gpu || !fx || !screen) return;
    uploadContent();
    ensureTrailTargets();
    fx.set({
      uTrail: trailTargets[trailIndex]!,
      params: {
        hasContent: htmlInCanvas ? 1 : 0,
        resolution: [output.width, output.height],
        offset: [
          content.scrollLeft / Math.max(content.clientWidth, 1),
          -content.scrollTop / Math.max(content.clientHeight, 1),
        ],
        time: timeSec,
        intensity: config.intensity,
        scale: Math.max(config.scale, 0.01),
        dropWidth: Math.max(config.dropWidth, 0.05),
        dropLength: Math.max(config.dropLength, 0.05),
        refraction: config.refraction,
        blur: Math.max(config.blur, 0),
        vignette: config.vignette,
        fallSpeed: config.fallSpeed,
        wiggle: config.wiggle,
        staticDrops: config.staticDrops,
        maxX: contentMaxX,
        wipe: config.interactive
          ? Math.min(Math.max(config.interactionStrength, 0), 1)
          : 0,
        wipeDistort: Math.max(config.interactionDistortion, 0),
        tint: config.tint,
        tintStrength: config.tintStrength,
      },
    });
    gpuFrame(gpu, (f) => {
      if (trailTarget) f.pass(trailTarget, trailFx!);
      f.pass(screen!, fx!);
    });
  }

  function renderFallback() {
    if (!fallback2d || !htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    fallback2d.clearRect(0, 0, output.width, output.height);
    fallback2d.drawImage(source, 0, 0, output.width, output.height);
  }

  let raf = 0;
  let lastTime = performance.now();
  let elapsed = 0;
  let destroyed = false;
  let running = false;
  let visible = true;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    if (fallback2d) {
      renderFallback();
      running = false;
      return;
    }
    if (!gpu) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    elapsed += delta * config.speed;
    const trailTarget = updateTrail(delta);
    render(elapsed, trailTarget);
    if (reducedMotion && !contentDirty) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;

  acquireGpu()
    .then((device) => {
      if (destroyed) return;
      gpu = device;
      screen = surface(gpu, output, {
        autoResize: false,
        alphaMode: "premultiplied",
        label: "droplets",
      });
      linearSampler = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      ensureTrailTargets();
      trailFx = effect(gpu, TRAIL_SHADER, {
        label: "droplets.trail",
        set: { uSampler: linearSampler, uPrev: trailTargets[0]! },
      });
      fx = effect(gpu, MAIN_SHADER, {
        label: "droplets",
        set: {
          uSampler: linearSampler,
          uContent: ensureContentTexture(),
          uTrail: trailTargets[0]!,
        },
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Droplets: WebGPU unavailable, showing content without the effect.", error);
      fallback2d = output.getContext("2d");
      contentDirty = true;
      start();
    });

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  const observer = createCanvasResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);
  observer.observe(content);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  const listenTarget = output.parentElement ?? output;
  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    if (!config.interactive || reducedMotion) return;
    const rect = rectCache.current;
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    if (!pointer.seen) {
      pointer.seen = true;
      pointer.px = x;
      pointer.py = y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.moved = true;
    start();
  }

  function onPointerLeave() {
    pointer.seen = false;
  }

  listenTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  listenTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });
  content.addEventListener("scroll", start, { passive: true });

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof DropletsOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      start();
    },
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      rectCache.destroy();
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      listenTarget.removeEventListener("pointermove", onPointerMove);
      listenTarget.removeEventListener("pointerleave", onPointerLeave);
      content.removeEventListener("scroll", start);
      contentTexture?.destroy();
      destroyTarget(trailTargets[0]);
      destroyTarget(trailTargets[1]);
      screen?.dispose();
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

