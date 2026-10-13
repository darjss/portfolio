# Ripple (Vanilla)

- Docs: https://canvasui.dev/docs/components/ripple
- Registry: https://canvasui.dev/r/ripple-vanilla.json (WebGL), https://canvasui.dev/r/ripple-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/ripple-vanilla`

## What it does

Water ripples that spread from every click and refract the live page like a pond surface, with dispersion and light glints on the crests. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/RippleVanilla.ts`

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

export type RippleTrigger = "click" | "hover" | "none";

export interface RippleOptions {
  /** Height of the waves (0 to 3). */
  amplitude?: number;
  /** How fast the rings travel outward. 1 is normal speed. */
  speed?: number;
  /** Distance between wave crests in CSS pixels. */
  wavelength?: number;
  /** Number of crests in each wave train (1 to 8). */
  rings?: number;
  /** How quickly the waves lose energy (higher dies faster). */
  decay?: number;
  /** How strongly the waves bend the page content, in CSS pixels. */
  refraction?: number;
  /** Chromatic dispersion splitting colors along the wave slopes (0 to 1). */
  dispersion?: number;
  /** Intensity of the light glints on the wave crests (0 to 2). */
  shine?: number;
  /** What spawns ripples. "click" on press, "hover" also leaves a wake while moving, "none" only ambient. */
  trigger?: RippleTrigger;
  /** Seconds between ambient ripples at random positions. 0 disables them. */
  interval?: number;
}

export interface RippleElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface RippleInstance {
  /** Update effect options live. */
  setOptions: (options: RippleOptions) => void;
  /** Spawn a ripple at a position in CSS pixels relative to the element. */
  splash: (x: number, y: number, strength?: number) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<RippleOptions> = {
  amplitude: 0.5,
  speed: 0.65,
  wavelength: 80,
  rings: 2,
  decay: 1,
  refraction: 100,
  dispersion: 0.5,
  shine: 0.5,
  trigger: "click",
  interval: 0,
};

const MAX_RIPPLES = 12;
const BASE_SPEED = 340;

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
uniform vec4 uRipples[12];
uniform int uCount;
uniform float uSpeed;
uniform float uWavelength;
uniform float uWidth;
uniform float uDecay;
uniform float uRefraction;
uniform float uDispersion;
uniform float uShine;
uniform float uHasContent;
uniform float uMaxX;

vec4 page (vec2 p) {
  p.x = clamp(p.x, 0.0005, uMaxX - 0.0005);
  p.y = clamp(p.y, 0.0005, 0.9995);
  return texture(uContent, p);
}

void main () {
  vec2 pUv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 frag = pUv * uResolution;

  vec2 grad = vec2(0.0);
  float k = 6.28318530718 / uWavelength;
  float w2 = uWidth * uWidth;

  for (int i = 0; i < 12; i++) {
    if (i >= uCount) break;
    vec4 rp = uRipples[i];
    vec2 dv = frag - rp.xy;
    float r = length(dv);
    float front = uSpeed * rp.z;
    float s = r - front;
    float env = exp(-s * s / w2) * exp(-uDecay * rp.z) * rp.w;
    env *= smoothstep(0.0, 0.08, rp.z);
    env *= inversesqrt(1.0 + front / max(uWavelength, 1.0) * 0.2);
    if (env < 0.0015) continue;
    float dh = (k * cos(s * k) - 2.0 * s / w2 * sin(s * k)) * env;
    grad += dv / max(r, 1.0) * dh * uWavelength * 0.16;
  }

  float g = dot(grad, vec2(-0.55, -0.8));
  float glint = pow(clamp(g * 2.2, 0.0, 1.0), 2.0) * uShine;
  float shade = pow(clamp(-g * 1.6, 0.0, 1.0), 2.0) * uShine * 0.3;

  if (uHasContent < 0.5) {
    float a = clamp(glint * 0.9 + shade * 0.5, 0.0, 0.85);
    outColor = vec4(vec3(glint * 0.9), a);
    return;
  }

  vec2 offs = grad * uRefraction / uResolution;
  vec3 col;
  if (uDispersion > 0.001) {
    float d = uDispersion * 0.35;
    col = vec3(
      page(pUv + offs * (1.0 + d)).r,
      page(pUv + offs).g,
      page(pUv + offs * (1.0 - d)).b
    );
  } else {
    col = page(pUv + offs).rgb;
  }
  col += glint;
  col *= 1.0 - shade;
  outColor = vec4(col, 1.0);
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

export function createRipple(
  elements: RippleElements,
  options: RippleOptions = {},
): RippleInstance | null {
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
      console.error("Ripple shader error:", gl!.getShaderInfoLog(shader));
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
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name.replace("[0]", "")] = gl.getUniformLocation(
      program,
      info.name,
    )!;
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
      if (source.width !== sourceWidth|| source.height !== sourceHeight) {
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
  }

  type Wave = { x: number; y: number; age: number; amp: number };
  const ripples: Wave[] = [];
  const rippleData = new Float32Array(MAX_RIPPLES * 4);

  function splash(x: number, y: number, strength = 1) {
    if (reducedMotion) return;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, age: 0, amp: strength });
    start();
  }

  function pruneRipples(delta: number) {
    const diag = Math.hypot(output.clientWidth, output.clientHeight);
    const speedPx = BASE_SPEED * Math.max(config.speed, 0.05);
    const width = config.wavelength * Math.max(config.rings, 1) * 0.5;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.age += delta;
      const gone =
        rp.age * speedPx > diag + width * 3 ||
        Math.exp(-Math.max(config.decay, 0.05) * rp.age) * rp.amp < 0.012;
      if (gone) ripples.splice(i, 1);
    }
  }

  function render() {
    uploadContent();
    const dpr = output.width / Math.max(output.clientWidth, 1);
    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const rp = ripples[i];
      rippleData[i * 4] = rp ? rp.x * dpr : 0;
      rippleData[i * 4 + 1] = rp ? rp.y * dpr : 0;
      rippleData[i * 4 + 2] = rp ? rp.age : 0;
      rippleData[i * 4 + 3] = rp ? rp.amp * Math.max(config.amplitude, 0) : 0;
    }
    gl!.uniform4fv(uniforms.uRipples, rippleData);
    gl!.uniform1i(uniforms.uCount, ripples.length);
    gl!.uniform1f(uniforms.uSpeed, BASE_SPEED * Math.max(config.speed, 0.05) * dpr);
    gl!.uniform1f(uniforms.uWavelength, Math.max(config.wavelength, 4) * dpr);
    gl!.uniform1f(
      uniforms.uWidth,
      Math.max(config.wavelength, 4) * Math.max(config.rings, 1) * 0.5 * dpr,
    );
    gl!.uniform1f(uniforms.uDecay, Math.max(config.decay, 0.05));
    gl!.uniform1f(uniforms.uRefraction, Math.max(config.refraction, 0) * dpr);
    gl!.uniform1f(uniforms.uDispersion, Math.max(config.dispersion, 0));
    gl!.uniform1f(uniforms.uShine, Math.max(config.shine, 0));
    gl!.uniform1f(uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.uniform1f(uniforms.uMaxX, contentMaxX);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function renderIdle() {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    if (htmlInCanvas) {
      render();
    } else {
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
    }
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;
  let ambientTimer = 0;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function spawnAmbient() {
    const w = output.clientWidth;
    const h = output.clientHeight;
    if (w < 10 || h < 10) return;
    splash(
      w * (0.15 + Math.random() * 0.7),
      h * (0.15 + Math.random() * 0.7),
      0.6 + Math.random() * 0.5,
    );
  }

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 30);
    lastTime = now;
    if (!reducedMotion) {
      pruneRipples(delta);
      if (config.interval > 0) {
        ambientTimer += delta;
        if (ambientTimer >= config.interval) {
          ambientTimer = 0;
          spawnAmbient();
        }
      }
    }
    if (ripples.length > 0) {
      render();
    } else {
      renderIdle();
      if (!contentDirty && (config.interval <= 0 || reducedMotion)) {
        running = false;
        return;
      }
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

  function localPoint(event: PointerEvent): [number, number] {
    const rect = output.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  let hoverX = -1e5;
  let hoverY = -1e5;

  function onPointerDown(event: PointerEvent) {
    if (config.trigger === "none") return;
    const [x, y] = localPoint(event);
    splash(x, y, 1);
  }

  function onPointerMove(event: PointerEvent) {
    if (config.trigger !== "hover") return;
    const [x, y] = localPoint(event);
    if (Math.hypot(x - hoverX, y - hoverY) < 56) return;
    hoverX = x;
    hoverY = y;
    splash(x, y, 0.3);
  }

  content.addEventListener("pointerdown", onPointerDown, { passive: true });
  content.addEventListener("pointermove", onPointerMove, { passive: true });

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) ripples.length = 0;
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
          ([key, value]) => config[key as keyof RippleOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      start();
    },
    splash,
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      content.removeEventListener("pointerdown", onPointerDown);
      content.removeEventListener("pointermove", onPointerMove);
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

## Source (vanilla-webgpu): `components/canvasui/RippleWebGPU.ts`

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

export type RippleTrigger = "click" | "hover" | "none";

export interface RippleOptions {
  /** Height of the waves (0 to 3). */
  amplitude?: number;
  /** How fast the rings travel outward. 1 is normal speed. */
  speed?: number;
  /** Distance between wave crests in CSS pixels. */
  wavelength?: number;
  /** Number of crests in each wave train (1 to 8). */
  rings?: number;
  /** How quickly the waves lose energy (higher dies faster). */
  decay?: number;
  /** How strongly the waves bend the page content, in CSS pixels. */
  refraction?: number;
  /** Chromatic dispersion splitting colors along the wave slopes (0 to 1). */
  dispersion?: number;
  /** Intensity of the light glints on the wave crests (0 to 2). */
  shine?: number;
  /** What spawns ripples. "click" on press, "hover" also leaves a wake while moving, "none" only ambient. */
  trigger?: RippleTrigger;
  /** Seconds between ambient ripples at random positions. 0 disables them. */
  interval?: number;
}

export interface RippleElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGPU effect renders to. */
  output: HTMLCanvasElement;
}

export interface RippleInstance {
  /** Update effect options live. */
  setOptions: (options: RippleOptions) => void;
  /** Spawn a ripple at a position in CSS pixels relative to the element. */
  splash: (x: number, y: number, strength?: number) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<RippleOptions> = {
  amplitude: 0.5,
  speed: 0.65,
  wavelength: 80,
  rings: 2,
  decay: 1,
  refraction: 100,
  dispersion: 0.5,
  shine: 0.5,
  trigger: "click",
  interval: 0,
};

const MAX_RIPPLES = 12;
const BASE_SPEED = 340;

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const SHADER = /* wgsl */ `
struct Params {
  ripples: array<vec4f, 12>,
  resolution: vec2f,
  count: u32,
  speed: f32,
  wavelength: f32,
  width: f32,
  decay: f32,
  refraction: f32,
  dispersion: f32,
  shine: f32,
  hasContent: f32,
  maxX: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

fn page(p: vec2f) -> vec4f {
  let q = vec2f(
    clamp(p.x, 0.0005, params.maxX - 0.0005),
    clamp(p.y, 0.0005, 0.9995),
  );
  return textureSampleLevel(uContent, uSampler, q, 0.0);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // vgpu's uv is top-origin, which matches the captured page texture directly.
  let pUv = uv;
  let frag = pUv * params.resolution;

  var grad = vec2f(0.0);
  let k = 6.28318530718 / params.wavelength;
  let w2 = params.width * params.width;

  for (var i = 0u; i < 12u; i++) {
    if (i >= params.count) { break; }
    let rp = params.ripples[i];
    let dv = frag - rp.xy;
    let r = length(dv);
    let front = params.speed * rp.z;
    let s = r - front;
    var env = exp(-s * s / w2) * exp(-params.decay * rp.z) * rp.w;
    env *= smoothstep(0.0, 0.08, rp.z);
    env *= inverseSqrt(1.0 + front / max(params.wavelength, 1.0) * 0.2);
    if (env < 0.0015) { continue; }
    let dh = (k * cos(s * k) - 2.0 * s / w2 * sin(s * k)) * env;
    grad += dv / max(r, 1.0) * dh * params.wavelength * 0.16;
  }

  let g = dot(grad, vec2f(-0.55, -0.8));
  let glint = pow(clamp(g * 2.2, 0.0, 1.0), 2.0) * params.shine;
  let shade = pow(clamp(-g * 1.6, 0.0, 1.0), 2.0) * params.shine * 0.3;

  if (params.hasContent < 0.5) {
    let a = clamp(glint * 0.9 + shade * 0.5, 0.0, 0.85);
    return vec4f(vec3f(glint * 0.9), a);
  }

  let offs = grad * params.refraction / params.resolution;
  var col: vec3f;
  if (params.dispersion > 0.001) {
    let d = params.dispersion * 0.35;
    col = vec3f(
      page(pUv + offs * (1.0 + d)).r,
      page(pUv + offs).g,
      page(pUv + offs * (1.0 - d)).b,
    );
  } else {
    col = page(pUv + offs).rgb;
  }
  col += vec3f(glint);
  col *= 1.0 - shade;
  return vec4f(col, 1.0);
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

/** One WebGPU device per page, shared by every Ripple instance. */
function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

export function createRipple(
  elements: RippleElements,
  options: RippleOptions = {},
): RippleInstance | null {
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

  // GPU resources are created once the device resolves; everything before that
  // is plain DOM bookkeeping so the instance can be returned synchronously.
  let gpu: Gpu | null = null;
  let screen: Surface | null = null;
  let fx: Effect | null = null;
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

  function ensureContentTexture(): Texture {
    const w = Math.max(1, source.width);
    const h = Math.max(1, source.height);
    if (
      !contentTexture ||
      contentTexture.size[0] !== w ||
      contentTexture.size[1] !== h
    ) {
      // A new wrapper invalidates vgpu's cached bindings to the old texture.
      contentTexture?.destroy();
      contentTexture = gpu!.device.createTexture({
        size: [w, h],
        format: "rgba8unorm",
        usage: ["texture_binding", "copy_dst", "render_attachment"],
        label: "ripple.content",
      });
    }
    return contentTexture;
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
    fx!.set({ uContent: texture });
  }

  type Wave = { x: number; y: number; age: number; amp: number };
  const ripples: Wave[] = [];
  const rippleData: [number, number, number, number][] = Array.from(
    { length: MAX_RIPPLES },
    () => [0, 0, 0, 0],
  );

  function splash(x: number, y: number, strength = 1) {
    if (reducedMotion) return;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, age: 0, amp: strength });
    start();
  }

  function pruneRipples(delta: number) {
    const diag = Math.hypot(output.clientWidth, output.clientHeight);
    const speedPx = BASE_SPEED * Math.max(config.speed, 0.05);
    const width = config.wavelength * Math.max(config.rings, 1) * 0.5;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.age += delta;
      const gone =
        rp.age * speedPx > diag + width * 3 ||
        Math.exp(-Math.max(config.decay, 0.05) * rp.age) * rp.amp < 0.012;
      if (gone) ripples.splice(i, 1);
    }
  }

  function render() {
    if (!gpu || !fx || !screen) return;
    uploadContent();
    const dpr = dprNow;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const rp = ripples[i];
      const slot = rippleData[i];
      slot[0] = rp ? rp.x * dpr : 0;
      slot[1] = rp ? rp.y * dpr : 0;
      slot[2] = rp ? rp.age : 0;
      slot[3] = rp ? rp.amp * Math.max(config.amplitude, 0) : 0;
    }
    const [width, height] = screen.size;
    fx.set({
      params: {
        ripples: rippleData,
        resolution: [width, height],
        count: ripples.length,
        speed: BASE_SPEED * Math.max(config.speed, 0.05) * dpr,
        wavelength: Math.max(config.wavelength, 4) * dpr,
        width: Math.max(config.wavelength, 4) * Math.max(config.rings, 1) * 0.5 * dpr,
        decay: Math.max(config.decay, 0.05),
        refraction: Math.max(config.refraction, 0) * dpr,
        dispersion: Math.max(config.dispersion, 0),
        shine: Math.max(config.shine, 0),
        hasContent: htmlInCanvas ? 1 : 0,
        maxX: contentMaxX,
      },
    });
    // Surfaces can only be drawn inside frame(); one pass, one command buffer.
    gpuFrame(gpu, (f) => f.pass(screen!, fx!));
  }

  function renderIdle() {
    if (htmlInCanvas) {
      render();
    } else if (gpu && screen) {
      // Nothing to show without ripples: leave the overlay fully transparent.
      gpuFrame(gpu, (f) => f.pass({ target: screen!, clear: [0, 0, 0, 0] }, () => {}));
    }
  }

  /** Without a GPU device the page still has to show: blit the capture as-is. */
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
  let ambientTimer = 0;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function spawnAmbient() {
    const w = output.clientWidth;
    const h = output.clientHeight;
    if (w < 10 || h < 10) return;
    splash(
      w * (0.15 + Math.random() * 0.7),
      h * (0.15 + Math.random() * 0.7),
      0.6 + Math.random() * 0.5,
    );
  }

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
      // Device still initializing: keep the loop parked until it resolves.
      running = false;
      return;
    }
    const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 30);
    lastTime = now;
    if (!reducedMotion) {
      pruneRipples(delta);
      if (config.interval > 0) {
        ambientTimer += delta;
        if (ambientTimer >= config.interval) {
          ambientTimer = 0;
          spawnAmbient();
        }
      }
    }
    if (ripples.length > 0) {
      render();
    } else {
      renderIdle();
      if (!contentDirty && (config.interval <= 0 || reducedMotion)) {
        running = false;
        return;
      }
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
        label: "ripple",
      });
      const linear = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      fx = effect(gpu, SHADER, {
        label: "ripple",
        set: { uSampler: linear, uContent: ensureContentTexture() },
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Ripple: WebGPU unavailable, showing content without the effect.", error);
      fallback2d = output.getContext("2d");
      contentDirty = true;
      start();
    });

  function localPoint(event: PointerEvent): [number, number] {
    const rect = output.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  let hoverX = -1e5;
  let hoverY = -1e5;

  function onPointerDown(event: PointerEvent) {
    if (config.trigger === "none") return;
    const [x, y] = localPoint(event);
    splash(x, y, 1);
  }

  function onPointerMove(event: PointerEvent) {
    if (config.trigger !== "hover") return;
    const [x, y] = localPoint(event);
    if (Math.hypot(x - hoverX, y - hoverY) < 56) return;
    hoverX = x;
    hoverY = y;
    splash(x, y, 0.3);
  }

  content.addEventListener("pointerdown", onPointerDown, { passive: true });
  content.addEventListener("pointermove", onPointerMove, { passive: true });

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) ripples.length = 0;
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
          ([key, value]) => config[key as keyof RippleOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      start();
    },
    splash,
    resize() {
      syncCanvasSize();
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      content.removeEventListener("pointerdown", onPointerDown);
      content.removeEventListener("pointermove", onPointerMove);
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

