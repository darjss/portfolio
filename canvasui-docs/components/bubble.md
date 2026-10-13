# Bubble (Vanilla)

- Docs: https://canvasui.dev/docs/components/bubble
- Registry: https://canvasui.dev/r/bubble-vanilla.json (WebGL), https://canvasui.dev/r/bubble-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/bubble-vanilla`

## What it does

A glassy droplet that trails the cursor as blending metaballs and refracts the live page beneath it, with dispersion, frost, and an iridescent sheen. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/BubbleVanilla.ts`

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

export type BubbleOptions = {
  size?: number;
  trail?: number;
  follow?: number;
  blend?: number;
  speed?: number;
  refraction?: number;
  dispersion?: number;
  frost?: number;
  shine?: number;
  rim?: number;
  iridescence?: number;
  intensity?: number;
  tint?: [number, number, number];
  tintStrength?: number;
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  fallbackOpacity?: number;
};

export type BubbleElements = {
  source: HTMLCanvasElement;
  content: HTMLElement;
  output: HTMLCanvasElement;
};

export type BubbleInstance = {
  setOptions: (options: BubbleOptions) => void;
  resize: () => void;
  destroy: () => void;
};

const DEFAULTS: Required<BubbleOptions> = {
  size: 30,
  trail: 24,
  follow: 0.5,
  blend: 14,
  speed: 2,
  refraction: 80,
  dispersion: 1,
  frost: 0,
  shine: 0.25,
  rim: 0.5,
  iridescence: 1,
  intensity: 0.9,
  tint: [1, 1, 1],
  tintStrength: 0,
  colorA: [0.2902, 0.4549, 0.7216],
  colorB: [0.4118, 0.4118, 0.4157],
  fallbackOpacity: 1,
};

const MAX_TRAIL = 24;

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
void main () {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uMaxX;
uniform float uDpr;
uniform float uTime;
uniform float uHasContent;
uniform int uCount;
uniform vec2 uTrail[${MAX_TRAIL}];
uniform float uBaseRadius;
uniform float uBlend;
uniform float uRefraction;
uniform float uDispersion;
uniform float uFrost;
uniform float uShine;
uniform float uRim;
uniform float uIridescence;
uniform float uIntensity;
uniform vec3 uTint;
uniform float uTintStrength;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uFallbackAlpha;

const float EPS = 1e-4;
const int ITR = 16;

vec3 page (vec2 px, float lod) {
  vec2 uv = px / uResolution;
  uv.x = clamp(uv.x, 0.0005, uMaxX - 0.0005);
  uv.y = clamp(uv.y, 0.0005, 0.9995);
  return pow(textureLod(uContent, vec2(uv.x, 1.0 - uv.y), lod).rgb, vec3(2.2));
}

float rnd3D (vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
}

float noise3D (vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);

  float a000 = rnd3D(i);
  float a100 = rnd3D(i + vec3(1.0, 0.0, 0.0));
  float a010 = rnd3D(i + vec3(0.0, 1.0, 0.0));
  float a110 = rnd3D(i + vec3(1.0, 1.0, 0.0));
  float a001 = rnd3D(i + vec3(0.0, 0.0, 1.0));
  float a101 = rnd3D(i + vec3(1.0, 0.0, 1.0));
  float a011 = rnd3D(i + vec3(0.0, 1.0, 1.0));
  float a111 = rnd3D(i + vec3(1.0, 1.0, 1.0));

  vec3 u = f * f * (3.0 - 2.0 * f);

  float k0 = a000;
  float k1 = a100 - a000;
  float k2 = a010 - a000;
  float k3 = a001 - a000;
  float k4 = a000 - a100 - a010 + a110;
  float k5 = a000 - a010 - a001 + a011;
  float k6 = a000 - a100 - a001 + a101;
  float k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;

  return k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y +
    k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
}

float smoothMin (float d1, float d2, float k) {
  float h = exp(-k * d1) + exp(-k * d2);
  return -log(max(h, 1e-12)) / k;
}

float map (vec3 p) {
  float radius = uBaseRadius * float(uCount);
  float d = 1e5;
  for (int i = 0; i < ${MAX_TRAIL}; i++) {
    if (i >= uCount) break;
    float sphere = length(p - vec3(uTrail[i], 0.0)) -
      (radius - uBaseRadius * float(i));
    d = smoothMin(d, sphere, uBlend);
  }
  return d;
}

vec3 generateNormal (vec3 p) {
  return normalize(vec3(
    map(p + vec3(EPS, 0.0, 0.0)) - map(p + vec3(-EPS, 0.0, 0.0)),
    map(p + vec3(0.0, EPS, 0.0)) - map(p + vec3(0.0, -EPS, 0.0)),
    map(p + vec3(0.0, 0.0, EPS)) - map(p + vec3(0.0, 0.0, -EPS))));
}

vec3 dropletColor (vec3 normal, vec3 rayDir) {
  vec3 reflectDir = reflect(rayDir, normal);
  float noisePosTime = noise3D(reflectDir * 2.0 + uTime);
  float noiseNegTime = noise3D(reflectDir * 2.0 - uTime);
  vec3 color0 = uColorA * noisePosTime;
  vec3 color1 = uColorB * noiseNegTime;
  return (color0 + color1) * uIntensity;
}

void main () {
  vec2 frag = gl_FragCoord.xy;
  float minRes = min(uResolution.x, uResolution.y);
  vec2 p = (frag * 2.0 - uResolution) / minRes;

  vec3 ray = vec3(p, 1.0);
  vec3 rayDir = vec3(0.0, 0.0, -1.0);
  float dist = 0.0;

  for (int i = 0; i < ITR; ++i) {
    dist = map(ray);
    ray += rayDir * dist;
    if (dist < EPS || dist > 8.0) break;
  }

  float cov = 1.0 - smoothstep(0.0, 3.0 / minRes, dist);
  if (!(cov > 0.001)) {
    outColor = vec4(0.0);
    return;
  }

  vec3 n = generateNormal(ray);
  vec3 glints = pow(max(dropletColor(n, rayDir), 0.0), vec3(7.0));
  vec3 L = normalize(vec3(-0.5, 0.7, 0.6));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);

  vec3 color;
  float alpha = cov;
  if (uHasContent > 0.5) {
    float depth = uRefraction * uDpr;
    float ca = uDispersion * 0.03;
    vec3 rvR = refract(rayDir, n, 1.0 / (1.33 - ca));
    vec3 rvG = refract(rayDir, n, 1.0 / 1.33);
    vec3 rvB = refract(rayDir, n, 1.0 / (1.33 + ca));
    vec2 offR = rvR.xy * (depth / max(abs(rvR.z), 0.35));
    vec2 offG = rvG.xy * (depth / max(abs(rvG.z), 0.35));
    vec2 offB = rvB.xy * (depth / max(abs(rvB.z), 0.35));
    float lod = max(uFrost * 5.0, log2(1.0 + length(offG) * 0.05 / uDpr));
    vec3 refr = vec3(
      page(frag + offR, lod).r,
      page(frag + offG, lod).g,
      page(frag + offB, lod).b);
    refr *= mix(vec3(1.0), uTint, clamp(uTintStrength, 0.0, 1.0));
    float edge = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.5);
    refr *= 1.0 - 0.35 * uRim * edge;
    color = pow(max(refr, 0.0), vec3(1.0 / 2.2));
    color += glints * uIridescence;
    color += vec3(spec * uShine * 0.9);
  } else {
    float edge = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.5);
    vec3 filmTint = mix(vec3(0.9), uTint, clamp(uTintStrength, 0.0, 1.0));
    float fade = cov * clamp(uFallbackAlpha, 0.0, 1.0);
    vec3 light = glints * uIridescence * 0.65 + vec3(spec * uShine * 1.5) +
      filmTint * (0.55 * max(uRim, 0.4) * edge + 0.03);
    float a = fade * clamp(0.08 + 0.4 * edge, 0.0, 1.0);
    outColor = vec4(light * fade, a);
    return;
  }
  outColor = vec4(color * alpha, alpha);
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

export function createBubble(
  elements: BubbleElements,
  options: BubbleOptions = {},
): BubbleInstance | null {
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
      console.error("Bubble shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!;
  }

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

  const trailX = new Float32Array(MAX_TRAIL);
  const trailY = new Float32Array(MAX_TRAIL);
  const trailData = new Float32Array(MAX_TRAIL * 2);
  let headX = output.clientWidth / 2;
  let headY = output.clientHeight / 2;
  let targetX = headX;
  let targetY = headY;
  trailX.fill(headX);
  trailY.fill(headY);
  let presence = 0;
  let presenceTarget = 0;
  let hasPointer = false;
  let time = 0;

  function activeCount(): number {
    return Math.min(Math.max(Math.round(config.trail), 1), MAX_TRAIL);
  }

  function render() {
    uploadContent();
    const dpr = output.width / Math.max(output.clientWidth, 1);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.disable(gl!.SCISSOR_TEST);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    if (presence <= 0.004) return;

    const count = activeCount();
    const minRes = Math.min(output.width, output.height);
    const headRadius = Math.max(config.size, 4) * dpr * presence;
    const baseRadius = (headRadius * 2) / (minRes * count);
    const blend = Math.max(config.blend, 0.5);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      const dx = trailX[i] * dpr;
      const dy = output.height - trailY[i] * dpr;
      trailData[i * 2] = (dx * 2 - output.width) / minRes;
      trailData[i * 2 + 1] = (dy * 2 - output.height) / minRes;
      minX = Math.min(minX, dx);
      maxX = Math.max(maxX, dx);
      minY = Math.min(minY, dy);
      maxY = Math.max(maxY, dy);
    }

    const pad =
      headRadius +
      ((Math.log(count + 1) / blend) * minRes) / 2 +
      Math.abs(config.refraction) * dpr * 0.5 +
      32 * dpr;
    const sx = Math.max(0, Math.floor(minX - pad));
    const sy = Math.max(0, Math.floor(minY - pad));
    gl!.enable(gl!.SCISSOR_TEST);
    gl!.scissor(
      sx,
      sy,
      Math.min(output.width - sx, Math.ceil(maxX - minX + pad * 2)),
      Math.min(output.height - sy, Math.ceil(maxY - minY + pad * 2)),
    );

    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    gl!.uniform1f(uniforms.uMaxX, contentMaxX);
    gl!.uniform1f(uniforms.uDpr, dpr);
    gl!.uniform1f(uniforms.uTime, time);
    gl!.uniform1f(uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.uniform1i(uniforms.uCount, count);
    gl!.uniform2fv(uniforms["uTrail[0]"], trailData);
    gl!.uniform1f(uniforms.uBaseRadius, baseRadius);
    gl!.uniform1f(uniforms.uBlend, blend);
    gl!.uniform1f(uniforms.uRefraction, config.refraction);
    gl!.uniform1f(uniforms.uDispersion, Math.max(config.dispersion, 0));
    gl!.uniform1f(uniforms.uFrost, Math.min(Math.max(config.frost, 0), 1));
    gl!.uniform1f(uniforms.uShine, Math.max(config.shine, 0));
    gl!.uniform1f(uniforms.uRim, Math.min(Math.max(config.rim, 0), 2));
    gl!.uniform1f(uniforms.uIridescence, Math.max(config.iridescence, 0));
    gl!.uniform1f(uniforms.uIntensity, Math.max(config.intensity, 0));
    gl!.uniform3f(
      uniforms.uTint,
      config.tint[0],
      config.tint[1],
      config.tint[2],
    );
    gl!.uniform1f(
      uniforms.uTintStrength,
      Math.min(Math.max(config.tintStrength, 0), 1),
    );
    gl!.uniform3f(
      uniforms.uColorA,
      config.colorA[0],
      config.colorA[1],
      config.colorA[2],
    );
    gl!.uniform3f(
      uniforms.uColorB,
      config.colorB[0],
      config.colorB[1],
      config.colorB[2],
    );
    gl!.uniform1f(
      uniforms.uFallbackAlpha,
      Math.min(Math.max(config.fallbackOpacity, 0), 1),
    );
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    gl!.disable(gl!.SCISSOR_TEST);
  }

  let raf = 0;
  let lastTime = performance.now();
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
    if (!reducedMotion) time += delta * Math.max(config.speed, 0);

    const follow = Math.min(Math.max(config.follow, 0.02), 1);
    const kHead =
      reducedMotion || follow >= 1
        ? 1
        : 1 - Math.exp(-delta * (3 + follow * 30));
    const kScale = reducedMotion ? 1 : 1 - Math.exp(-delta * 10);

    headX += (targetX - headX) * kHead;
    headY += (targetY - headY) * kHead;
    for (let i = MAX_TRAIL - 1; i > 0; i--) {
      trailX[i] = trailX[i - 1];
      trailY[i] = trailY[i - 1];
    }
    trailX[0] = headX;
    trailY[0] = headY;
    let moved = Math.abs(targetX - headX) + Math.abs(targetY - headY);
    for (let i = 1; i < MAX_TRAIL; i++) {
      moved = Math.max(
        moved,
        Math.abs(trailX[i] - trailX[i - 1]) +
          Math.abs(trailY[i] - trailY[i - 1]),
      );
    }
    presence += (presenceTarget - presence) * kScale;

    render();

    const settled = reducedMotion
      ? moved < 0.1 &&
        Math.abs(presenceTarget - presence) < 0.002 &&
        !contentDirty
      : presence < 0.004 && presenceTarget === 0 && !contentDirty;
    if (settled) {
      presence = presenceTarget;
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

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    const rect = rectCache.current;
    targetX = event.clientX - rect.left;
    targetY = event.clientY - rect.top;
    if (!hasPointer) {
      headX = targetX;
      headY = targetY;
      trailX.fill(targetX);
      trailY.fill(targetY);
      hasPointer = true;
    }
    presenceTarget = 1;
    start();
  }

  function onPointerLeave() {
    presenceTarget = 0;
    hasPointer = false;
    start();
  }

  content.addEventListener("pointermove", onPointerMove, { passive: true });
  content.addEventListener("pointerleave", onPointerLeave, { passive: true });

  function onScroll() {
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

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

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof BubbleOptions] !== value,
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
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      content.removeEventListener("scroll", onScroll);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/BubbleWebGPU.ts`

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
  type Effect,
  type Gpu,
  type Surface,
} from "vgpu";
import type { Texture } from "vgpu";

export type BubbleOptions = {
  size?: number;
  trail?: number;
  follow?: number;
  blend?: number;
  speed?: number;
  refraction?: number;
  dispersion?: number;
  frost?: number;
  shine?: number;
  rim?: number;
  iridescence?: number;
  intensity?: number;
  tint?: [number, number, number];
  tintStrength?: number;
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  fallbackOpacity?: number;
};

export type BubbleElements = {
  source: HTMLCanvasElement;
  content: HTMLElement;
  output: HTMLCanvasElement;
};

export type BubbleInstance = {
  setOptions: (options: BubbleOptions) => void;
  resize: () => void;
  destroy: () => void;
};

const DEFAULTS: Required<BubbleOptions> = {
  size: 30,
  trail: 24,
  follow: 0.5,
  blend: 14,
  speed: 2,
  refraction: 80,
  dispersion: 1,
  frost: 0,
  shine: 0.25,
  rim: 0.5,
  iridescence: 1,
  intensity: 0.9,
  tint: [1, 1, 1],
  tintStrength: 0,
  colorA: [0.2902, 0.4549, 0.7216],
  colorB: [0.4118, 0.4118, 0.4157],
  fallbackOpacity: 1,
};

const MAX_TRAIL = 24;

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

function createRectCache(element: Element) {
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

const SHADER = /* wgsl */ `
struct Params {
  trail: array<vec4f, 24>,
  tint: vec4f,
  colorA: vec4f,
  colorB: vec4f,
  resolution: vec2f,
  maxX: f32,
  dpr: f32,
  time: f32,
  hasContent: f32,
  count: u32,
  baseRadius: f32,
  blend: f32,
  refraction: f32,
  dispersion: f32,
  frost: f32,
  shine: f32,
  rim: f32,
  iridescence: f32,
  intensity: f32,
  tintStrength: f32,
  fallbackAlpha: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

const EPS = 0.0001;
const ITR = 16;

fn page(px: vec2f, lod: f32) -> vec3f {
  var uv = px / params.resolution;
  uv.x = clamp(uv.x, 0.0005, params.maxX - 0.0005);
  uv.y = clamp(uv.y, 0.0005, 0.9995);
  return pow(textureSampleLevel(uContent, uSampler, vec2f(uv.x, 1.0 - uv.y), lod).rgb, vec3f(2.2));
}

fn rnd3D(p: vec3f) -> f32 {
  return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453123);
}

fn noise3D(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let a000 = rnd3D(i);
  let a100 = rnd3D(i + vec3f(1.0, 0.0, 0.0));
  let a010 = rnd3D(i + vec3f(0.0, 1.0, 0.0));
  let a110 = rnd3D(i + vec3f(1.0, 1.0, 0.0));
  let a001 = rnd3D(i + vec3f(0.0, 0.0, 1.0));
  let a101 = rnd3D(i + vec3f(1.0, 0.0, 1.0));
  let a011 = rnd3D(i + vec3f(0.0, 1.0, 1.0));
  let a111 = rnd3D(i + vec3f(1.0, 1.0, 1.0));
  let u = f * f * (3.0 - 2.0 * f);
  let k0 = a000;
  let k1 = a100 - a000;
  let k2 = a010 - a000;
  let k3 = a001 - a000;
  let k4 = a000 - a100 - a010 + a110;
  let k5 = a000 - a010 - a001 + a011;
  let k6 = a000 - a100 - a001 + a101;
  let k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;
  return k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y +
    k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
}

fn smoothMin(d1: f32, d2: f32, k: f32) -> f32 {
  let h = exp(-k * d1) + exp(-k * d2);
  return -log(max(h, 0.000000000001)) / k;
}

fn mapBubble(p: vec3f) -> f32 {
  let radius = params.baseRadius * f32(params.count);
  var d = 100000.0;
  for (var i = 0u; i < 24u; i++) {
    if (i >= params.count) { break; }
    let sphere = length(p - vec3f(params.trail[i].xy, 0.0)) -
      (radius - params.baseRadius * f32(i));
    d = smoothMin(d, sphere, params.blend);
  }
  return d;
}

fn generateNormal(p: vec3f) -> vec3f {
  return normalize(vec3f(
    mapBubble(p + vec3f(EPS, 0.0, 0.0)) - mapBubble(p + vec3f(-EPS, 0.0, 0.0)),
    mapBubble(p + vec3f(0.0, EPS, 0.0)) - mapBubble(p + vec3f(0.0, -EPS, 0.0)),
    mapBubble(p + vec3f(0.0, 0.0, EPS)) - mapBubble(p + vec3f(0.0, 0.0, -EPS))));
}

fn dropletColor(normal: vec3f, rayDir: vec3f) -> vec3f {
  let reflectDir = reflect(rayDir, normal);
  let noisePosTime = noise3D(reflectDir * 2.0 + params.time);
  let noiseNegTime = noise3D(reflectDir * 2.0 - params.time);
  let color0 = params.colorA.rgb * noisePosTime;
  let color1 = params.colorB.rgb * noiseNegTime;
  return (color0 + color1) * params.intensity;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let frag = vec2f(uv.x * params.resolution.x, (1.0 - uv.y) * params.resolution.y);
  let minRes = min(params.resolution.x, params.resolution.y);
  let p = (frag * 2.0 - params.resolution) / minRes;
  var ray = vec3f(p, 1.0);
  let rayDir = vec3f(0.0, 0.0, -1.0);
  var dist = 0.0;

  for (var i = 0; i < ITR; i++) {
    dist = mapBubble(ray);
    ray += rayDir * dist;
    if (dist < EPS || dist > 8.0) { break; }
  }

  let cov = 1.0 - smoothstep(0.0, 3.0 / minRes, dist);
  if (!(cov > 0.001)) {
    return vec4f(0.0);
  }

  let n = generateNormal(ray);
  let glints = pow(max(dropletColor(n, rayDir), vec3f(0.0)), vec3f(7.0));
  let L = normalize(vec3f(-0.5, 0.7, 0.6));
  let spec = pow(max(dot(reflect(-L, n), vec3f(0.0, 0.0, 1.0)), 0.0), 60.0);

  if (params.hasContent > 0.5) {
    let depth = params.refraction * params.dpr;
    let ca = params.dispersion * 0.03;
    let rvR = refract(rayDir, n, 1.0 / (1.33 - ca));
    let rvG = refract(rayDir, n, 1.0 / 1.33);
    let rvB = refract(rayDir, n, 1.0 / (1.33 + ca));
    let offR = rvR.xy * (depth / max(abs(rvR.z), 0.35));
    let offG = rvG.xy * (depth / max(abs(rvG.z), 0.35));
    let offB = rvB.xy * (depth / max(abs(rvB.z), 0.35));
    let lod = max(params.frost * 5.0, log2(1.0 + length(offG) * 0.05 / params.dpr));
    var refr = vec3f(
      page(frag + offR, lod).r,
      page(frag + offG, lod).g,
      page(frag + offB, lod).b);
    refr *= mix(vec3f(1.0), params.tint.rgb, clamp(params.tintStrength, 0.0, 1.0));
    let edge = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.5);
    refr *= 1.0 - 0.35 * params.rim * edge;
    var color = pow(max(refr, vec3f(0.0)), vec3f(1.0 / 2.2));
    color += glints * params.iridescence;
    color += vec3f(spec * params.shine * 0.9);
    return vec4f(color * cov, cov);
  }

  let edge = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.5);
  let filmTint = mix(vec3f(0.9), params.tint.rgb, clamp(params.tintStrength, 0.0, 1.0));
  let fade = cov * clamp(params.fallbackAlpha, 0.0, 1.0);
  let light = glints * params.iridescence * 0.65 + vec3f(spec * params.shine * 1.5) +
    filmTint * (0.55 * max(params.rim, 0.4) * edge + 0.03);
  let a = fade * clamp(0.08 + 0.4 * edge, 0.0, 1.0);
  return vec4f(light * fade, a);
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

function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

function mipLevelCountFor(width: number, height: number): number {
  return Math.floor(Math.log2(Math.max(width, height))) + 1;
}

export function createBubble(
  elements: BubbleElements,
  options: BubbleOptions = {},
): BubbleInstance | null {
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
  let linearSampler: GPUSampler | null = null;
  let mipmapLayout: GPUBindGroupLayout | null = null;
  let mipmapPipeline: GPURenderPipeline | null = null;
  let contentTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;
  let contentMaxX = 1;
  let dprNow = 1;

  function syncCanvasSize() {
    const dpr = getCanvasPixelRatio(output);
    dprNow = dpr;
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

  function ensureMipmapPipeline(): GPURenderPipeline | null {
    if (!gpu || !linearSampler) return null;
    if (!mipmapLayout) {
      mipmapLayout = gpu.gpu.createBindGroupLayout({
        label: "bubble.mipmap.layout",
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
        label: "bubble.mipmap",
        code: MIPMAP_SHADER,
      });
      mipmapPipeline = gpu.gpu.createRenderPipeline({
        label: "bubble.mipmap",
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
    const encoder = gpu.gpu.createCommandEncoder({ label: "bubble.mipmap" });
    for (let level = 1; level < texture.mipLevelCount; level++) {
      const bindGroup = gpu.gpu.createBindGroup({
        label: "bubble.mipmap",
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
        label: "bubble.mipmap",
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

  function ensureContentTexture(): Texture {
    const w = Math.max(1, source.width);
    const h = Math.max(1, source.height);
    const mipLevelCount = mipLevelCountFor(w, h);
    if (
      !contentTexture ||
      contentTexture.size[0] !== w ||
      contentTexture.size[1] !== h ||
      contentTexture.mipLevelCount !== mipLevelCount
    ) {
      contentTexture?.destroy();
      contentTexture = gpu!.device.createTexture({
        size: [w, h],
        format: "rgba8unorm",
        usage: ["texture_binding", "copy_dst", "render_attachment"],
        mipLevelCount,
        label: "bubble.content",
      });
    }
    return contentTexture;
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty || !gpu || !fx) return;
    contentDirty = false;
    const texture = ensureContentTexture();
    gpu.gpu.queue.copyExternalImageToTexture(
      { source },
      { texture: texture.gpu, mipLevel: 0 },
      [source.width, source.height],
    );
    generateMipmaps(texture);
    fx.set({ uContent: texture });
  }

  function clearScreen() {
    if (!gpu || !screen) return;
    gpuFrame(gpu, (f) => f.pass({ target: screen!, clear: [0, 0, 0, 0] }, () => {}));
  }

  function renderFallback() {
    if (!fallback2d || !htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    fallback2d.clearRect(0, 0, output.width, output.height);
    fallback2d.drawImage(source, 0, 0, output.width, output.height);
  }

  const trailX = new Float32Array(MAX_TRAIL);
  const trailY = new Float32Array(MAX_TRAIL);
  const trailData: [number, number, number, number][] = Array.from(
    { length: MAX_TRAIL },
    () => [0, 0, 0, 0],
  );
  let headX = output.clientWidth / 2;
  let headY = output.clientHeight / 2;
  let targetX = headX;
  let targetY = headY;
  trailX.fill(headX);
  trailY.fill(headY);
  let presence = 0;
  let presenceTarget = 0;
  let hasPointer = false;
  let time = 0;

  function activeCount(): number {
    return Math.min(Math.max(Math.round(config.trail), 1), MAX_TRAIL);
  }

  function render() {
    if (!gpu || !fx || !screen) return;
    uploadContent();
    if (presence <= 0.004) {
      clearScreen();
      return;
    }
    const dpr = dprNow;
    const [width, height] = screen.size;
    const count = activeCount();
    const minRes = Math.min(width, height);
    const headRadius = Math.max(config.size, 4) * dpr * presence;
    const baseRadius = (headRadius * 2) / (minRes * count);
    const blend = Math.max(config.blend, 0.5);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < MAX_TRAIL; i++) {
      const dx = trailX[i] * dpr;
      const dy = height - trailY[i] * dpr;
      trailData[i][0] = (dx * 2 - width) / minRes;
      trailData[i][1] = (dy * 2 - height) / minRes;
      if (i < count) {
        minX = Math.min(minX, dx);
        maxX = Math.max(maxX, dx);
        minY = Math.min(minY, dy);
        maxY = Math.max(maxY, dy);
      }
    }

    const pad =
      headRadius +
      ((Math.log(count + 1) / blend) * minRes) / 2 +
      Math.abs(config.refraction) * dpr * 0.5 +
      32 * dpr;
    const sx = Math.min(width - 1, Math.max(0, Math.floor(minX - pad)));
    const sy = Math.min(height - 1, Math.max(0, Math.floor(minY - pad)));
    const sw = Math.max(
      1,
      Math.min(width - sx, Math.ceil(maxX - minX + pad * 2)),
    );
    const sh = Math.max(
      1,
      Math.min(height - sy, Math.ceil(maxY - minY + pad * 2)),
    );
    const scissorY = Math.max(0, height - sy - sh);

    fx.set({
      params: {
        trail: trailData,
        tint: [...config.tint, 0],
        colorA: [...config.colorA, 0],
        colorB: [...config.colorB, 0],
        resolution: [width, height],
        maxX: contentMaxX,
        dpr,
        time,
        hasContent: htmlInCanvas ? 1 : 0,
        count,
        baseRadius,
        blend,
        refraction: config.refraction,
        dispersion: Math.max(config.dispersion, 0),
        frost: Math.min(Math.max(config.frost, 0), 1),
        shine: Math.max(config.shine, 0),
        rim: Math.min(Math.max(config.rim, 0), 2),
        iridescence: Math.max(config.iridescence, 0),
        intensity: Math.max(config.intensity, 0),
        tintStrength: Math.min(Math.max(config.tintStrength, 0), 1),
        fallbackAlpha: Math.min(Math.max(config.fallbackOpacity, 0), 1),
      },
    });
    gpuFrame(gpu, (f) =>
      f.pass(
        { target: screen!, clear: [0, 0, 0, 0], scissor: [sx, scissorY, sw, sh] },
        fx!,
      ),
    );
  }

  let raf = 0;
  let lastTime = performance.now();
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
    if (!reducedMotion) time += delta * Math.max(config.speed, 0);

    const follow = Math.min(Math.max(config.follow, 0.02), 1);
    const kHead =
      reducedMotion || follow >= 1 ? 1 : 1 - Math.exp(-delta * (3 + follow * 30));
    const kScale = reducedMotion ? 1 : 1 - Math.exp(-delta * 10);

    headX += (targetX - headX) * kHead;
    headY += (targetY - headY) * kHead;
    for (let i = MAX_TRAIL - 1; i > 0; i--) {
      trailX[i] = trailX[i - 1];
      trailY[i] = trailY[i - 1];
    }
    trailX[0] = headX;
    trailY[0] = headY;
    let moved = Math.abs(targetX - headX) + Math.abs(targetY - headY);
    for (let i = 1; i < MAX_TRAIL; i++) {
      moved = Math.max(
        moved,
        Math.abs(trailX[i] - trailX[i - 1]) + Math.abs(trailY[i] - trailY[i - 1]),
      );
    }
    presence += (presenceTarget - presence) * kScale;

    render();

    const settled = reducedMotion
      ? moved < 0.1 && Math.abs(presenceTarget - presence) < 0.002 && !contentDirty
      : presence < 0.004 && presenceTarget === 0 && !contentDirty;
    if (settled) {
      presence = presenceTarget;
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
        label: "bubble",
      });
      linearSampler = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      fx = effect(gpu, SHADER, {
        label: "bubble",
        set: { uSampler: linearSampler, uContent: ensureContentTexture() },
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Bubble: WebGPU unavailable, showing content without the effect.", error);
      fallback2d = output.getContext("2d");
      contentDirty = true;
      start();
    });

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    const rect = rectCache.current;
    targetX = event.clientX - rect.left;
    targetY = event.clientY - rect.top;
    if (!hasPointer) {
      headX = targetX;
      headY = targetY;
      trailX.fill(targetX);
      trailY.fill(targetY);
      hasPointer = true;
    }
    presenceTarget = 1;
    start();
  }

  function onPointerLeave() {
    presenceTarget = 0;
    hasPointer = false;
    start();
  }

  content.addEventListener("pointermove", onPointerMove, { passive: true });
  content.addEventListener("pointerleave", onPointerLeave, { passive: true });

  function onScroll() {
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

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

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof BubbleOptions] !== value,
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
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      content.removeEventListener("scroll", onScroll);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      contentTexture?.destroy();
      screen?.dispose();
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

