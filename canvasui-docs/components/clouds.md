# Clouds (Vanilla)

- Docs: https://canvasui.dev/docs/components/clouds
- Registry: https://canvasui.dev/r/clouds-vanilla.json (WebGL), https://canvasui.dev/r/clouds-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/clouds-vanilla`

## What it does

Procedural fog that drifts over your page and blurs what it covers. Cursor movement parts the clouds. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/CloudsVanilla.ts`

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

export interface CloudsOptions {
  scale?: number;
  speed?: number;
  cover?: number;
  density?: number;
  shading?: number;
  color?: [number, number, number] | "auto";
  opacity?: number;
  shadow?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowSoftness?: number;
  wind?: number;
  windRadius?: number;
  refraction?: number;
  fogBlur?: number;
  quality?: number;
}

export interface CloudsElements {
  source: HTMLCanvasElement;
  content: HTMLElement;
  output: HTMLCanvasElement;
}

export interface CloudsInstance {
  setOptions: (options: CloudsOptions) => void;
  resize: () => void;
  destroy: () => void;
}

type PaintableCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
  onpaint: (() => void) | null;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const DEFAULTS: Required<CloudsOptions> = {
  scale: 1,
  speed: 0.6,
  cover: 0.1,
  density: 2.5,
  shading: 0.1,
  color: "auto",
  opacity: 0.64,
  shadow: 0.06,
  shadowOffsetX: 200,
  shadowOffsetY: -10,
  shadowSoftness: 1,
  wind: 0.6,
  windRadius: 350,
  refraction: 0,
  fogBlur: 0,
  quality: 1,
};

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
void main () {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FIELD_FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec2 uOffset;
uniform float uTime;
uniform float uScale;
uniform float uCover;
uniform float uDensity;

const mat2 m = mat2(1.6, 1.2, -1.2, 1.6);

vec2 hash (vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise (vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h
    * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}

float fbm (vec2 n) {
  float total = 0.0;
  float amplitude = 0.1;
  for (int i = 0; i < 7; i++) {
    total += noise(n) * amplitude;
    n = m * n;
    amplitude *= 0.4;
  }
  return total;
}

void main () {
  vec2 p = gl_FragCoord.xy / uResolution + uOffset;
  vec2 asp = vec2(uResolution.x / uResolution.y, 1.0);
  float q = fbm(p * asp * uScale * 0.5);

  float r = 0.0;
  vec2 uv = p * asp * uScale;
  uv -= q - uTime;
  float weight = 0.8;
  for (int i = 0; i < 8; i++) {
    r += abs(weight * noise(uv));
    uv = m * uv + uTime;
    weight *= 0.7;
  }

  float f = 0.0;
  uv = p * asp * uScale;
  uv -= q - uTime;
  weight = 0.7;
  for (int i = 0; i < 8; i++) {
    f += weight * noise(uv);
    uv = m * uv + uTime;
    weight *= 0.6;
  }
  f *= r + f;

  float c = 0.0;
  float t2 = uTime * 2.0;
  uv = p * asp * uScale * 2.0;
  uv -= q - t2;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c += weight * noise(uv);
    uv = m * uv + t2;
    weight *= 0.6;
  }

  float c1 = 0.0;
  float t3 = uTime * 3.0;
  uv = p * asp * uScale * 3.0;
  uv -= q - t3;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c1 += abs(weight * noise(uv));
    uv = m * uv + t3;
    weight *= 0.6;
  }
  c += c1;

  float coverage = clamp(uCover + uDensity * f * r + c, 0.0, 1.0);
  outColor = vec4(coverage, clamp(c, 0.0, 1.0), 0.0, 1.0);
}`;

const WIND_FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uPrev;
uniform vec2 uResolution;
uniform float uDecay;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
uniform float uStrength;

void main () {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float prev = texture(uPrev, uv).r * uDecay;
  vec2 asp = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = uv * asp;
  vec2 a = uA * asp;
  vec2 b = uB * asp;
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h) / max(uRadius, 1e-4);
  float stamp = exp(-d * d * 3.0) * uStrength;
  outColor = vec4(clamp(prev + stamp, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

const COMPOSITE_FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uField;
uniform sampler2D uContent;
uniform sampler2D uWind;
uniform vec2 uResolution;
uniform vec2 uContentScale;
uniform vec3 uBase;
uniform float uShading;
uniform float uOpacity;
uniform float uShadow;
uniform vec2 uShadowShift;
uniform float uShadowLod;
uniform float uWindAmt;
uniform float uRefraction;
uniform float uFogBlur;
uniform float uHasContent;

void main () {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 field = texture(uField, uv).rg;
  float wind = texture(uWind, uv).r * uWindAmt;
  float cov = field.r - wind;
  float mist = smoothstep(0.04, 0.9, cov);
  float cloudA = mist * uOpacity;

  float lum = dot(uBase, vec3(0.299, 0.587, 0.114));
  float sh = clamp(field.g, 0.0, 1.0);
  float k = uShading * 0.35;
  vec3 cloudRGB = lum > 0.5
    ? uBase - vec3((1.0 - sh) * k)
    : uBase + vec3(sh * k);
  cloudRGB = clamp(cloudRGB, 0.0, 1.0);

  vec2 sUv = uv + uShadowShift;
  float s = textureLod(uField, sUv, uShadowLod).r
    - texture(uWind, sUv).r * uWindAmt;
  float shadowA = smoothstep(0.35, 1.0, s) * uShadow * (1.0 - mist);

  float a;
  vec3 rgb;
  if (uHasContent > 0.5) {
    vec2 e = vec2(8.0) / uResolution;
    float gx = texture(uField, uv + vec2(e.x, 0.0)).r
      - texture(uField, uv - vec2(e.x, 0.0)).r;
    float gy = texture(uField, uv + vec2(0.0, e.y)).r
      - texture(uField, uv - vec2(0.0, e.y)).r;
    vec2 rUv = uv + vec2(gx, gy) * uRefraction * mist;
    vec3 fogged = textureLod(
      uContent, vec2(rUv.x, 1.0 - rUv.y) * uContentScale, mist * uFogBlur * 5.0
    ).rgb;
    vec3 layer = mix(fogged, cloudRGB, cloudA) * (1.0 - shadowA);
    float aF = smoothstep(0.02, 0.2, mist);
    a = aF + shadowA * (1.0 - aF);
    rgb = layer * aF;
  } else {
    a = cloudA + shadowA * (1.0 - cloudA);
    rgb = cloudRGB * cloudA;
  }
  outColor = vec4(rgb, a);
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

export function createClouds(
  elements: CloudsElements,
  options: CloudsOptions = {},
): CloudsInstance | null {
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
      console.error("Clouds shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  function link(fragSource: string) {
    const vs = compile(gl!.VERTEX_SHADER, VERT);
    const fs = compile(gl!.FRAGMENT_SHADER, fragSource);
    const program = gl!.createProgram()!;
    gl!.attachShader(program, vs);
    gl!.attachShader(program, fs);
    gl!.linkProgram(program);
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl!.getActiveUniform(program, i)!;
      uniforms[info.name] = gl!.getUniformLocation(program, info.name)!;
    }
    return { program, vs, fs, uniforms };
  }

  const field = link(FIELD_FRAG);
  const windPass = link(WIND_FRAG);
  const composite = link(COMPOSITE_FRAG);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const fieldTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

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
    new Uint8Array([0, 0, 0, 255]),
  );
  gl.generateMipmap(gl.TEXTURE_2D);

  function makeWindTexture() {
    const texture = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return texture;
  }
  const windTextures = [makeWindTexture(), makeWindTexture()];
  let windIndex = 0;

  const fbo = gl.createFramebuffer();

  let fieldW = 0;
  let fieldH = 0;
  let contentScaleX = 1;
  let contentScaleY = 1;

  let baseColor: [number, number, number] = [1, 1, 1];
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });

  function syncBaseColor() {
    if (config.color !== "auto") {
      baseColor = config.color;
      return;
    }
    if (!probeCtx) return;
    let el: Element | null = content;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "transparent") {
        probeCtx.clearRect(0, 0, 1, 1);
        probeCtx.fillStyle = bg;
        probeCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
        if (a > 0) {
          baseColor = [r / 255, g / 255, b / 255];
          return;
        }
      }
      el = el.parentElement;
    }
    baseColor = [1, 1, 1];
  }

  function syncCanvasSize() {
    const cw = content.clientWidth;
    const ch = content.clientHeight;
    if (cw > 0 && ch > 0) {
      const wpx = `${cw}px`;
      const hpx = `${ch}px`;
      if (output.style.width !== wpx) output.style.width = wpx;
      if (output.style.height !== hpx) output.style.height = hpx;
    }
    const dpr = getCanvasPixelRatio(output, gl!);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    contentScaleX = htmlInCanvas
      ? Math.min(1, cw / Math.max(source.clientWidth, 1))
      : 1;
    contentScaleY = htmlInCanvas
      ? Math.min(1, ch / Math.max(source.clientHeight, 1))
      : 1;
    const quality = Math.min(Math.max(config.quality, 0.2), 1);
    const cap = 1440 / Math.max(output.clientWidth, 1);
    const q = Math.min(quality, cap);
    const nextW = Math.max(16, Math.round(output.clientWidth * q));
    const nextH = Math.max(16, Math.round(output.clientHeight * q));
    if (nextW !== fieldW || nextH !== fieldH) {
      fieldW = nextW;
      fieldH = nextH;
      gl!.bindTexture(gl!.TEXTURE_2D, fieldTexture);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA,
        fieldW,
        fieldH,
        0,
        gl!.RGBA,
        gl!.UNSIGNED_BYTE,
        null,
      );
      gl!.generateMipmap(gl!.TEXTURE_2D);
      for (const texture of windTextures) {
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        gl!.texImage2D(
          gl!.TEXTURE_2D,
          0,
          gl!.RGBA,
          fieldW,
          fieldH,
          0,
          gl!.RGBA,
          gl!.UNSIGNED_BYTE,
          null,
        );
      }
    }
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
  syncBaseColor();

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

  let pointerX = 0.5;
  let pointerY = 0.5;
  let prevPointerX = 0.5;
  let prevPointerY = 0.5;
  let hasPointer = false;
  let lastPointerMove = 0;

  let time = Math.random() * 64;

  function render(delta: number) {
    uploadContent();

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(
      gl!.FRAMEBUFFER,
      gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D,
      fieldTexture,
      0,
    );
    gl!.viewport(0, 0, fieldW, fieldH);
    gl!.useProgram(field.program);
    gl!.uniform2f(field.uniforms.uResolution, fieldW, fieldH);
    gl!.uniform2f(
      field.uniforms.uOffset,
      content.scrollLeft / Math.max(content.clientWidth, 1),
      -content.scrollTop / Math.max(content.clientHeight, 1),
    );
    gl!.uniform1f(field.uniforms.uTime, time);
    gl!.uniform1f(field.uniforms.uScale, Math.max(config.scale, 0.05));
    gl!.uniform1f(field.uniforms.uCover, Math.max(config.cover, 0));
    gl!.uniform1f(field.uniforms.uDensity, Math.max(config.density, 0));
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

    const prevWind = windTextures[windIndex];
    const nextWind = windTextures[1 - windIndex];
    windIndex = 1 - windIndex;
    gl!.framebufferTexture2D(
      gl!.FRAMEBUFFER,
      gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D,
      nextWind,
      0,
    );
    gl!.useProgram(windPass.program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, prevWind);
    gl!.uniform1i(windPass.uniforms.uPrev, 0);
    gl!.uniform2f(windPass.uniforms.uResolution, fieldW, fieldH);
    gl!.uniform1f(windPass.uniforms.uDecay, Math.pow(0.5, delta / 0.7));
    const moved = Math.hypot(pointerX - prevPointerX, pointerY - prevPointerY);
    const stamping = hasPointer && moved > 0;
    gl!.uniform2f(windPass.uniforms.uA, prevPointerX, prevPointerY);
    gl!.uniform2f(windPass.uniforms.uB, pointerX, pointerY);
    gl!.uniform1f(
      windPass.uniforms.uRadius,
      Math.max(config.windRadius, 1) / Math.max(output.clientHeight, 1),
    );
    gl!.uniform1f(
      windPass.uniforms.uStrength,
      stamping ? Math.min(0.2 + moved * 12, 1) * 0.5 : 0,
    );
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    prevPointerX = pointerX;
    prevPointerY = pointerY;

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.bindTexture(gl!.TEXTURE_2D, fieldTexture);
    gl!.generateMipmap(gl!.TEXTURE_2D);

    gl!.viewport(0, 0, output.width, output.height);
    gl!.useProgram(composite.program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, fieldTexture);
    gl!.uniform1i(composite.uniforms.uField, 0);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(composite.uniforms.uContent, 1);
    gl!.activeTexture(gl!.TEXTURE2);
    gl!.bindTexture(gl!.TEXTURE_2D, nextWind);
    gl!.uniform1i(composite.uniforms.uWind, 2);
    gl!.uniform2f(composite.uniforms.uResolution, output.width, output.height);
    gl!.uniform2f(
      composite.uniforms.uContentScale,
      contentScaleX,
      contentScaleY,
    );
    gl!.uniform3f(
      composite.uniforms.uBase,
      baseColor[0],
      baseColor[1],
      baseColor[2],
    );
    gl!.uniform1f(
      composite.uniforms.uOpacity,
      Math.min(Math.max(config.opacity, 0), 1),
    );
    gl!.uniform1f(composite.uniforms.uShading, Math.max(config.shading, 0));
    gl!.uniform1f(
      composite.uniforms.uShadow,
      Math.min(Math.max(config.shadow, 0), 1),
    );
    gl!.uniform2f(
      composite.uniforms.uShadowShift,
      -config.shadowOffsetX / Math.max(output.clientWidth, 1),
      config.shadowOffsetY / Math.max(output.clientHeight, 1),
    );
    gl!.uniform1f(
      composite.uniforms.uShadowLod,
      Math.min(Math.max(config.shadowSoftness, 0), 1) * 4,
    );
    gl!.uniform1f(
      composite.uniforms.uWindAmt,
      Math.min(Math.max(config.wind, 0), 1),
    );
    gl!.uniform1f(
      composite.uniforms.uRefraction,
      Math.max(config.refraction, 0) / Math.max(output.clientWidth, 1),
    );
    gl!.uniform1f(
      composite.uniforms.uFogBlur,
      Math.min(Math.max(config.fogBlur, 0), 1),
    );
    gl!.uniform1f(composite.uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
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
    if (!reducedMotion) time += delta * config.speed * 0.03;
    render(delta);
    const windActive = now - lastPointerMove < 3000;
    if (reducedMotion && !windActive && !contentDirty) {
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

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    const rect = rectCache.current;
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    if (!hasPointer) {
      prevPointerX = x;
      prevPointerY = y;
      hasPointer = true;
    }
    pointerX = x;
    pointerY = y;
    lastPointerMove = performance.now();
    start();
  }

  function onPointerLeave() {
    hasPointer = false;
  }

  content.addEventListener("pointermove", onPointerMove, { passive: true });
  content.addEventListener("pointerleave", onPointerLeave, { passive: true });
  content.addEventListener("scroll", start, { passive: true });

  let themeTimer = 0;
  function onThemeShift() {
    syncBaseColor();
    start();
    window.clearTimeout(themeTimer);
    themeTimer = window.setTimeout(() => {
      syncBaseColor();
      start();
    }, 300);
  }

  const themeObserver = new MutationObserver(onThemeShift);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  const schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  schemeQuery.addEventListener("change", onThemeShift);

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof CloudsOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncCanvasSize();
      syncBaseColor();
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
      themeObserver.disconnect();
      schemeQuery.removeEventListener("change", onThemeShift);
      window.clearTimeout(themeTimer);
      motionQuery.removeEventListener("change", onMotionChange);
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      content.removeEventListener("scroll", start);
      if (htmlInCanvas) paintable.onpaint = null;
      gl!.deleteTexture(fieldTexture);
      gl!.deleteTexture(contentTexture);
      gl!.deleteTexture(windTextures[0]);
      gl!.deleteTexture(windTextures[1]);
      gl!.deleteFramebuffer(fbo);
      gl!.deleteProgram(field.program);
      gl!.deleteProgram(windPass.program);
      gl!.deleteProgram(composite.program);
      gl!.deleteShader(field.vs);
      gl!.deleteShader(field.fs);
      gl!.deleteShader(windPass.vs);
      gl!.deleteShader(windPass.fs);
      gl!.deleteShader(composite.vs);
      gl!.deleteShader(composite.fs);
      gl!.deleteBuffer(quad);
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/CloudsWebGPU.ts`

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

export interface CloudsOptions {
  scale?: number;
  speed?: number;
  cover?: number;
  density?: number;
  shading?: number;
  color?: [number, number, number] | "auto";
  opacity?: number;
  shadow?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowSoftness?: number;
  wind?: number;
  windRadius?: number;
  refraction?: number;
  fogBlur?: number;
  quality?: number;
}

export interface CloudsElements {
  source: HTMLCanvasElement;
  content: HTMLElement;
  output: HTMLCanvasElement;
}

export interface CloudsInstance {
  setOptions: (options: CloudsOptions) => void;
  resize: () => void;
  destroy: () => void;
}

type PaintableCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
  onpaint: (() => void) | null;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const DEFAULTS: Required<CloudsOptions> = {
  scale: 1,
  speed: 0.6,
  cover: 0.1,
  density: 2.5,
  shading: 0.1,
  color: "auto",
  opacity: 0.64,
  shadow: 0.06,
  shadowOffsetX: 200,
  shadowOffsetY: -10,
  shadowSoftness: 1,
  wind: 0.6,
  windRadius: 350,
  refraction: 0,
  fogBlur: 0,
  quality: 1,
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

const FIELD_SHADER = /* wgsl */ `
struct Params {
  resolution: vec2f,
  offset: vec2f,
  time: f32,
  scale: f32,
  cover: f32,
  density: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

const m = mat2x2f(vec2f(1.6, 1.2), vec2f(-1.2, 1.6));

fn hash(pIn: vec2f) -> vec2f {
  var p = vec2f(dot(pIn, vec2f(127.1, 311.7)), dot(pIn, vec2f(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

fn noise(p: vec2f) -> f32 {
  let K1 = 0.366025404;
  let K2 = 0.211324865;
  let i = floor(p + (p.x + p.y) * K1);
  let a = p - i + (i.x + i.y) * K2;
  let o = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), a.x > a.y);
  let b = a - o + K2;
  let c = a - vec2f(1.0) + 2.0 * K2;
  let h = max(0.5 - vec3f(dot(a, a), dot(b, b), dot(c, c)), vec3f(0.0));
  let n = h * h * h * h *
    vec3f(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + vec2f(1.0))));
  return dot(n, vec3f(70.0));
}

fn fbm(nIn: vec2f) -> f32 {
  var n = nIn;
  var total = 0.0;
  var amplitude = 0.1;
  for (var i = 0; i < 7; i++) {
    total += noise(n) * amplitude;
    n = m * n;
    amplitude *= 0.4;
  }
  return total;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = vec2f(uv.x, 1.0 - uv.y) + params.offset;
  let asp = vec2f(params.resolution.x / params.resolution.y, 1.0);
  let q = fbm(p * asp * params.scale * 0.5);

  var r = 0.0;
  var cloudUv = p * asp * params.scale;
  cloudUv -= q - params.time;
  var weight = 0.8;
  for (var i = 0; i < 8; i++) {
    r += abs(weight * noise(cloudUv));
    cloudUv = m * cloudUv + params.time;
    weight *= 0.7;
  }

  var f = 0.0;
  cloudUv = p * asp * params.scale;
  cloudUv -= q - params.time;
  weight = 0.7;
  for (var i = 0; i < 8; i++) {
    f += weight * noise(cloudUv);
    cloudUv = m * cloudUv + params.time;
    weight *= 0.6;
  }
  f *= r + f;

  var c = 0.0;
  let t2 = params.time * 2.0;
  cloudUv = p * asp * params.scale * 2.0;
  cloudUv -= q - t2;
  weight = 0.4;
  for (var i = 0; i < 7; i++) {
    c += weight * noise(cloudUv);
    cloudUv = m * cloudUv + t2;
    weight *= 0.6;
  }

  var c1 = 0.0;
  let t3 = params.time * 3.0;
  cloudUv = p * asp * params.scale * 3.0;
  cloudUv -= q - t3;
  weight = 0.4;
  for (var i = 0; i < 7; i++) {
    c1 += abs(weight * noise(cloudUv));
    cloudUv = m * cloudUv + t3;
    weight *= 0.6;
  }
  c += c1;

  let coverage = clamp(params.cover + params.density * f * r + c, 0.0, 1.0);
  return vec4f(coverage, clamp(c, 0.0, 1.0), 0.0, 1.0);
}`;

const WIND_SHADER = /* wgsl */ `
struct Params {
  resolution: vec2f,
  a: vec2f,
  b: vec2f,
  decay: f32,
  radius: f32,
  strength: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uPrev: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let bottomUv = vec2f(uv.x, 1.0 - uv.y);
  let prev = textureSampleLevel(uPrev, uSampler, uv, 0.0).r * params.decay;
  let asp = vec2f(params.resolution.x / params.resolution.y, 1.0);
  let p = bottomUv * asp;
  let a = params.a * asp;
  let b = params.b * asp;
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
  let d = length(pa - ba * h) / max(params.radius, 0.0001);
  let stamp = exp(-d * d * 3.0) * params.strength;
  return vec4f(clamp(prev + stamp, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

const COMPOSITE_SHADER = /* wgsl */ `
struct Params {
  base: vec4f,
  resolution: vec2f,
  contentScale: vec2f,
  shading: f32,
  opacity: f32,
  shadow: f32,
  shadowLod: f32,
  shadowShift: vec2f,
  windAmt: f32,
  refraction: f32,
  fogBlur: f32,
  hasContent: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uField: texture_2d<f32>;
@group(0) @binding(2) var uContent: texture_2d<f32>;
@group(0) @binding(3) var uWind: texture_2d<f32>;
@group(0) @binding(4) var uSampler: sampler;

fn topFromBottom(uv: vec2f) -> vec2f {
  return vec2f(uv.x, 1.0 - uv.y);
}

fn fieldAtBottom(uv: vec2f) -> vec2f {
  return textureSampleLevel(uField, uSampler, topFromBottom(uv), 0.0).rg;
}

fn windAtBottom(uv: vec2f) -> f32 {
  return textureSampleLevel(uWind, uSampler, topFromBottom(uv), 0.0).r;
}

fn blurredFieldAtBottom(uv: vec2f) -> f32 {
  return textureSampleLevel(uField, uSampler, topFromBottom(uv), params.shadowLod).r;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let bottomUv = vec2f(uv.x, 1.0 - uv.y);
  let field = fieldAtBottom(bottomUv);
  let wind = windAtBottom(bottomUv) * params.windAmt;
  let cov = field.r - wind;
  let mist = smoothstep(0.04, 0.9, cov);
  let cloudA = mist * params.opacity;

  let lum = dot(params.base.rgb, vec3f(0.299, 0.587, 0.114));
  let sh = clamp(field.g, 0.0, 1.0);
  let k = params.shading * 0.35;
  var cloudRGB = select(
    params.base.rgb + vec3f(sh * k),
    params.base.rgb - vec3f((1.0 - sh) * k),
    lum > 0.5);
  cloudRGB = clamp(cloudRGB, vec3f(0.0), vec3f(1.0));

  let sUv = bottomUv + params.shadowShift;
  let s = blurredFieldAtBottom(sUv) - windAtBottom(sUv) * params.windAmt;
  let shadowA = smoothstep(0.35, 1.0, s) * params.shadow * (1.0 - mist);

  if (params.hasContent > 0.5) {
    let e = vec2f(8.0) / params.resolution;
    let gx = fieldAtBottom(bottomUv + vec2f(e.x, 0.0)).r
      - fieldAtBottom(bottomUv - vec2f(e.x, 0.0)).r;
    let gy = fieldAtBottom(bottomUv + vec2f(0.0, e.y)).r
      - fieldAtBottom(bottomUv - vec2f(0.0, e.y)).r;
    let rUv = bottomUv + vec2f(gx, gy) * params.refraction * mist;
    let contentUv = topFromBottom(rUv) * params.contentScale;
    let fogged = textureSampleLevel(uContent, uSampler, contentUv, mist * params.fogBlur * 5.0).rgb;
    let layer = mix(fogged, cloudRGB, cloudA) * (1.0 - shadowA);
    let aF = smoothstep(0.02, 0.2, mist);
    let a = aF + shadowA * (1.0 - aF);
    return vec4f(layer * aF, a);
  }

  let a = cloudA + shadowA * (1.0 - cloudA);
  return vec4f(cloudRGB * cloudA, a);
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

function destroyTarget(value: Target | null) {
  (value as unknown as { destroy(): void } | null)?.destroy();
}

function mipLevelCountFor(width: number, height: number): number {
  return Math.floor(Math.log2(Math.max(width, height))) + 1;
}

export function createClouds(
  elements: CloudsElements,
  options: CloudsOptions = {},
): CloudsInstance | null {
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
  let fieldFx: Effect | null = null;
  let windFx: Effect | null = null;
  let compositeFx: Effect | null = null;
  let linearSampler: GPUSampler | null = null;
  let mipmapLayout: GPUBindGroupLayout | null = null;
  let mipmapPipeline: GPURenderPipeline | null = null;
  let fieldTarget: Target | null = null;
  let fieldTexture: Texture | null = null;
  let windTargets: [Target, Target] | null = null;
  let contentTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;
  let fieldW = 0;
  let fieldH = 0;
  let contentScaleX = 1;
  let contentScaleY = 1;

  let baseColor: [number, number, number] = [1, 1, 1];
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });

  function syncBaseColor() {
    if (config.color !== "auto") {
      baseColor = config.color;
      return;
    }
    if (!probeCtx) return;
    let el: Element | null = content;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "transparent") {
        probeCtx.clearRect(0, 0, 1, 1);
        probeCtx.fillStyle = bg;
        probeCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
        if (a > 0) {
          baseColor = [r / 255, g / 255, b / 255];
          return;
        }
      }
      el = el.parentElement;
    }
    baseColor = [1, 1, 1];
  }

  function ensureTargets() {
    if (!gpu) return;
    const size: [number, number] = [fieldW, fieldH];
    if (!fieldTarget) {
      fieldTarget = target(gpu, {
        size,
        format: "rgba8unorm",
        clearColor: [0, 0, 0, 1],
        label: "clouds.field",
      });
      windTargets = [
        target(gpu, {
          size,
          format: "rgba8unorm",
          clearColor: [0, 0, 0, 1],
          label: "clouds.wind-a",
        }),
        target(gpu, {
          size,
          format: "rgba8unorm",
          clearColor: [0, 0, 0, 1],
          label: "clouds.wind-b",
        }),
      ];
    }
    for (const t of [fieldTarget, ...(windTargets ?? [])]) {
      if (t && (t.size[0] !== fieldW || t.size[1] !== fieldH)) t.resize(size);
    }
    const mipLevelCount = mipLevelCountFor(fieldW, fieldH);
    if (
      !fieldTexture ||
      fieldTexture.size[0] !== fieldW ||
      fieldTexture.size[1] !== fieldH ||
      fieldTexture.mipLevelCount !== mipLevelCount
    ) {
      fieldTexture?.destroy();
      fieldTexture = gpu.device.createTexture({
        size,
        format: "rgba8unorm",
        usage: ["texture_binding", "copy_dst", "render_attachment"],
        mipLevelCount,
        label: "clouds.field-mips",
      });
    }
  }

  function syncCanvasSize() {
    const cw = content.clientWidth;
    const ch = content.clientHeight;
    if (cw > 0 && ch > 0) {
      const wpx = `${cw}px`;
      const hpx = `${ch}px`;
      if (output.style.width !== wpx) output.style.width = wpx;
      if (output.style.height !== hpx) output.style.height = hpx;
    }
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
    contentScaleX = htmlInCanvas ? Math.min(1, cw / Math.max(source.clientWidth, 1)) : 1;
    contentScaleY = htmlInCanvas ? Math.min(1, ch / Math.max(source.clientHeight, 1)) : 1;
    const quality = Math.min(Math.max(config.quality, 0.2), 1);
    const cap = 1440 / Math.max(output.clientWidth, 1);
    const q = Math.min(quality, cap);
    fieldW = Math.max(16, Math.round(output.clientWidth * q));
    fieldH = Math.max(16, Math.round(output.clientHeight * q));
    ensureTargets();
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
  syncBaseColor();

  function ensureMipmapPipeline(): GPURenderPipeline | null {
    if (!gpu || !linearSampler) return null;
    if (!mipmapLayout) {
      mipmapLayout = gpu.gpu.createBindGroupLayout({
        label: "clouds.mipmap.layout",
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
        label: "clouds.mipmap",
        code: MIPMAP_SHADER,
      });
      mipmapPipeline = gpu.gpu.createRenderPipeline({
        label: "clouds.mipmap",
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
    const encoder = gpu.gpu.createCommandEncoder({ label: "clouds.mipmap" });
    for (let level = 1; level < texture.mipLevelCount; level++) {
      const bindGroup = gpu.gpu.createBindGroup({
        label: "clouds.mipmap",
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
        label: "clouds.mipmap",
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
        label: "clouds.content",
      });
    }
    return contentTexture;
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty || !gpu || !compositeFx) return;
    contentDirty = false;
    const texture = ensureContentTexture();
    gpu.gpu.queue.copyExternalImageToTexture(
      { source },
      { texture: texture.gpu, mipLevel: 0 },
      [source.width, source.height],
    );
    generateMipmaps(texture);
    compositeFx.set({ uContent: texture });
  }

  let pointerX = 0.5;
  let pointerY = 0.5;
  let prevPointerX = 0.5;
  let prevPointerY = 0.5;
  let hasPointer = false;
  let lastPointerMove = 0;
  let windIndex = 0;
  let time = Math.random() * 64;

  function render(delta: number) {
    if (
      !gpu ||
      !screen ||
      !fieldFx ||
      !windFx ||
      !compositeFx ||
      !fieldTarget ||
      !fieldTexture ||
      !windTargets
    ) {
      return;
    }
    uploadContent();

    fieldFx.set({
      params: {
        resolution: [fieldW, fieldH],
        offset: [
          content.scrollLeft / Math.max(content.clientWidth, 1),
          -content.scrollTop / Math.max(content.clientHeight, 1),
        ],
        time,
        scale: Math.max(config.scale, 0.05),
        cover: Math.max(config.cover, 0),
        density: Math.max(config.density, 0),
      },
    });
    fieldFx.draw(fieldTarget);
    const fieldEncoder = gpu.gpu.createCommandEncoder({ label: "clouds.field-copy" });
    fieldEncoder.copyTextureToTexture(
      { texture: fieldTarget.color.gpu },
      { texture: fieldTexture.gpu, mipLevel: 0 },
      [fieldW, fieldH],
    );
    gpu.gpu.queue.submit([fieldEncoder.finish()]);
    generateMipmaps(fieldTexture);

    const prevWind = windTargets[windIndex];
    const nextWind = windTargets[1 - windIndex];
    windIndex = 1 - windIndex;
    const moved = Math.hypot(pointerX - prevPointerX, pointerY - prevPointerY);
    const stamping = hasPointer && moved > 0;
    windFx.set({
      uPrev: prevWind,
      params: {
        resolution: [fieldW, fieldH],
        a: [prevPointerX, prevPointerY],
        b: [pointerX, pointerY],
        decay: Math.pow(0.5, delta / 0.7),
        radius: Math.max(config.windRadius, 1) / Math.max(output.clientHeight, 1),
        strength: stamping ? Math.min(0.2 + moved * 12, 1) * 0.5 : 0,
      },
    });
    windFx.draw(nextWind);
    prevPointerX = pointerX;
    prevPointerY = pointerY;

    compositeFx.set({
      uField: fieldTexture,
      uWind: nextWind,
      params: {
        base: [...baseColor, 0],
        resolution: screen.size,
        contentScale: [contentScaleX, contentScaleY],
        shading: Math.max(config.shading, 0),
        opacity: Math.min(Math.max(config.opacity, 0), 1),
        shadow: Math.min(Math.max(config.shadow, 0), 1),
        shadowLod: Math.min(Math.max(config.shadowSoftness, 0), 1) * 4,
        shadowShift: [
          -config.shadowOffsetX / Math.max(output.clientWidth, 1),
          config.shadowOffsetY / Math.max(output.clientHeight, 1),
        ],
        windAmt: Math.min(Math.max(config.wind, 0), 1),
        refraction: Math.max(config.refraction, 0) / Math.max(output.clientWidth, 1),
        fogBlur: Math.min(Math.max(config.fogBlur, 0), 1),
        hasContent: htmlInCanvas ? 1 : 0,
      },
    });
    gpuFrame(gpu, (f) => f.pass(screen!, compositeFx!));
  }

  function renderFallback() {
    if (!fallback2d || !htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    fallback2d.clearRect(0, 0, output.width, output.height);
    fallback2d.drawImage(source, 0, 0, output.width, output.height);
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
    if (!reducedMotion) time += delta * config.speed * 0.03;
    render(delta);
    const windActive = now - lastPointerMove < 3000;
    if (reducedMotion && !windActive && !contentDirty) {
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
        label: "clouds",
      });
      linearSampler = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      fieldFx = effect(gpu, FIELD_SHADER, { label: "clouds.field" });
      windFx = effect(gpu, WIND_SHADER, {
        label: "clouds.wind",
        set: { uSampler: linearSampler },
      });
      compositeFx = effect(gpu, COMPOSITE_SHADER, {
        label: "clouds.composite",
        set: { uSampler: linearSampler, uContent: ensureContentTexture() },
      });
      syncCanvasSize();
      ensureTargets();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Clouds: WebGPU unavailable, showing content without the effect.", error);
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

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    const rect = rectCache.current;
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    if (!hasPointer) {
      prevPointerX = x;
      prevPointerY = y;
      hasPointer = true;
    }
    pointerX = x;
    pointerY = y;
    lastPointerMove = performance.now();
    start();
  }

  function onPointerLeave() {
    hasPointer = false;
  }

  content.addEventListener("pointermove", onPointerMove, { passive: true });
  content.addEventListener("pointerleave", onPointerLeave, { passive: true });
  content.addEventListener("scroll", start, { passive: true });

  let themeTimer = 0;
  function onThemeShift() {
    syncBaseColor();
    start();
    window.clearTimeout(themeTimer);
    themeTimer = window.setTimeout(() => {
      syncBaseColor();
      start();
    }, 300);
  }

  const themeObserver = new MutationObserver(onThemeShift);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  const schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  schemeQuery.addEventListener("change", onThemeShift);

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof CloudsOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncCanvasSize();
      syncBaseColor();
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
      themeObserver.disconnect();
      schemeQuery.removeEventListener("change", onThemeShift);
      window.clearTimeout(themeTimer);
      motionQuery.removeEventListener("change", onMotionChange);
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      content.removeEventListener("scroll", start);
      if (htmlInCanvas) paintable.onpaint = null;
      contentTexture?.destroy();
      fieldTexture?.destroy();
      destroyTarget(fieldTarget);
      if (windTargets) {
        destroyTarget(windTargets[0]);
        destroyTarget(windTargets[1]);
      }
      screen?.dispose();
    },
  };
}

```

