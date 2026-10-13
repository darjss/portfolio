# Peel (Vanilla)

- Docs: https://canvasui.dev/docs/components/peel
- Registry: https://canvasui.dev/r/peel-vanilla.json (WebGL), https://canvasui.dev/r/peel-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/peel-vanilla`

## What it does

Peels your page back from a chosen edge as the cursor approaches, revealing a second layer underneath. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/PeelVanilla.ts`

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

export type PeelSide = "left" | "right" | "top" | "bottom";

export type PeelMode = "cursor" | "hover";

export interface PeelOptions {
  /** Edge the content peels from. */
  side?: PeelSide;
  /** How the peel is driven. "cursor" peels progressively as the pointer nears the edge, "hover" peels fully when the pointer enters the zone. */
  mode?: PeelMode;
  /** How many CSS pixels of the under layer are exposed at full peel. */
  reveal?: number;
  /** Width of the strip along the chosen edge that drives the peel, in CSS pixels. */
  zone?: number;
  /** Radius of the curl in CSS pixels. Smaller values fold sharper. */
  curl?: number;
  /** Extra lift at the middle of the peeling edge in CSS pixels. Negative values bow the sheet inwards. */
  bow?: number;
  /** Strength of the curl shading on the lifted sheet (0 to 1). */
  shade?: number;
  /** Strength of the shine along the peeling edge that follows the cursor (0 to 1). */
  shine?: number;
  /** Distance from the edge at which the shine starts to appear, in CSS pixels. 0 uses the full container span. */
  shineDistance?: number;
  /** Shine color as RGB in the 0 to 1 range, or "auto" to follow the page theme: light shine on dark backgrounds, dark shine on light ones. Re-resolves on theme changes. */
  shineColor?: [number, number, number] | "auto";
  /** How many CSS pixels the peeled edge bulges toward the cursor. */
  bulge?: number;
  /** Perspective focal length in CSS pixels. Lower values exaggerate the 3D depth. */
  perspective?: number;
  /** Seconds the peel takes to settle. Higher feels more damped. */
  smoothing?: number;
}

export interface PeelElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
  /** Element revealed underneath the peel. Kept hidden until the first capture is ready. */
  under?: HTMLElement;
}

export interface PeelInstance {
  /** Update effect options live. */
  setOptions: (options: PeelOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<PeelOptions> = {
  side: "left",
  mode: "cursor",
  reveal: 250,
  zone: 200,
  curl: 300,
  bow: 75,
  shade: 0.25,
  shine: 1,
  shineDistance: 1200,
  shineColor: "auto",
  bulge: 50,
  perspective: 2000,
  smoothing: 0.3,
};

const SIDE_INDEX: Record<PeelSide, number> = {
  left: 0,
  right: 1,
  top: 2,
  bottom: 3,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const SHEET_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aGrid;
uniform vec2 uRes;
uniform float uSide;
uniform float uPeel;
uniform float uReveal;
uniform float uCurl;
uniform float uBow;
uniform float uFocal;
uniform float uZone;
uniform float uBulge;
uniform vec2 uPointer;
out vec2 vUv;
out float vShade;
out vec2 vSide;

const float PI = 3.1415926;

void main () {
  vUv = aGrid;
  vec2 p = aGrid * uRes;
  float crossLen = (uSide < 1.5) ? uRes.y : uRes.x;
  float u; float v;
  if (uSide < 0.5) { u = p.x; v = p.y; }
  else if (uSide < 1.5) { u = uRes.x - p.x; v = p.y; }
  else if (uSide < 2.5) { u = p.y; v = p.x; }
  else { u = uRes.y - p.y; v = p.x; }

  float A = clamp(uPeel, 0.0, 1.0);
  float f = A * uReveal;
  float R = max(uCurl * A, 0.001);
  float c0 = f + R;

  float dvB = (uPointer.y - v) / max(crossLen * 0.28, 1.0);
  float prox = clamp(1.0 - uPointer.x / max(c0 + uZone, 1.0), 0.0, 1.0);
  float c = c0 + uBulge * A * prox * prox * exp(-dvB * dvB);

  float x = u;
  float z = 0.0;
  float sh = 0.0;
  if (A > 0.001 && u < c) {
    float theta = (c - u) / R;
    if (theta <= PI) {
      x = c - R * sin(theta);
      z = R * (1.0 - cos(theta));
    } else {
      x = c + (theta - PI) * R;
      z = 2.0 * R;
    }
    sh = sin(clamp(theta, 0.0, PI));
  }
  z += uBow * A * sin(PI * v / max(crossLen, 1.0)) * clamp(z / max(R, 1.0), 0.0, 1.5);
  z = clamp(z, -uFocal * 0.2, uFocal * 0.45);
  vShade = sh * smoothstep(0.0, 0.08, A);
  vSide = vec2(u, v);

  vec2 q;
  if (uSide < 0.5) q = vec2(x, v);
  else if (uSide < 1.5) q = vec2(uRes.x - x, v);
  else if (uSide < 2.5) q = vec2(v, x);
  else q = vec2(v, uRes.y - x);

  vec2 ndc = (q / uRes) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  float w = (uFocal - z) / uFocal;
  gl_Position = vec4(ndc, -z / uFocal, w);
}`;

const SHEET_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in float vShade;
in vec2 vSide;
out vec4 outColor;
uniform sampler2D uContent;
uniform float uShade;
uniform float uMaxX;
uniform float uShine;
uniform vec3 uShineColor;
uniform float uCross;
uniform float uSpan;
uniform vec2 uPointer;

void main () {
  vec2 uv = clamp(vUv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
  vec4 tex = texture(uContent, uv);
  float sh = 1.0 - clamp(uShade, 0.0, 1.0) * 0.7 * pow(max(vShade, 0.0), 1.3);
  float du = max(vSide.x, 0.0);
  float line = exp(-du / 2.5) + exp(-du / 18.0) * 0.25;
  float dv = (vSide.y - uPointer.y) / max(uCross * 0.45, 1.0);
  float prox = clamp(1.0 - uPointer.x / max(uSpan, 1.0), 0.0, 1.0);
  float shine = uShine * line * exp(-dv * dv) * prox * prox;
  vec3 rgb = mix(tex.rgb * sh, uShineColor, clamp(shine, 0.0, 1.0));
  outColor = vec4(rgb * tex.a, tex.a);
}`;

const SEG = 96;

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

export function createPeel(
  elements: PeelElements,
  options: PeelOptions = {},
): PeelInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, output, under } = elements;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: true,
    stencil: false,
    antialias: true,
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

  let wake = () => {};
  let capture = () => {};

  if (htmlInCanvas) {
    paintable.onpaint = () => capture();
  }

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Peel shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  function link(vertText: string, fragText: string) {
    const vert = compile(gl!.VERTEX_SHADER, vertText);
    const frag = compile(gl!.FRAGMENT_SHADER, fragText);
    const program = gl!.createProgram()!;
    gl!.attachShader(program, vert);
    gl!.attachShader(program, frag);
    gl!.linkProgram(program);
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl!.getActiveUniform(program, i)!;
      uniforms[info.name] = gl!.getUniformLocation(program, info.name)!;
    }
    return { program, vert, frag, uniforms };
  }

  const sheet = link(SHEET_VERT, SHEET_FRAG);

  const gridVerts = new Float32Array((SEG + 1) * (SEG + 1) * 2);
  for (let y = 0; y <= SEG; y++) {
    for (let x = 0; x <= SEG; x++) {
      const i = (y * (SEG + 1) + x) * 2;
      gridVerts[i] = x / SEG;
      gridVerts[i + 1] = y / SEG;
    }
  }
  const gridIndices = new Uint32Array(SEG * SEG * 6);
  let offset = 0;
  for (let y = 0; y < SEG; y++) {
    for (let x = 0; x < SEG; x++) {
      const a = y * (SEG + 1) + x;
      const b = a + 1;
      const c = a + SEG + 1;
      const d = c + 1;
      gridIndices[offset++] = a;
      gridIndices[offset++] = c;
      gridIndices[offset++] = b;
      gridIndices[offset++] = b;
      gridIndices[offset++] = c;
      gridIndices[offset++] = d;
    }
  }

  const sheetVao = gl.createVertexArray();
  gl.bindVertexArray(sheetVao);
  const gridBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, gridVerts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, gridIndices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

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
  let hasTexture = false;

  if (under && htmlInCanvas) under.style.visibility = "hidden";

  capture = () => {
    if (!htmlInCanvas) return;
    try {
      sourceCtx!.reset();
      drawHtmlInCanvas(source, sourceCtx!, content);
      gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA,
        gl!.RGBA,
        gl!.UNSIGNED_BYTE,
        source,
      );
      sourceCtx!.reset();
      hasTexture = true;
      wake();
    } catch {}
  };

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

  const peel = { a: 0, target: 0 };
  const FAR = 1e4;
  const pointer = { u: FAR, v: 0, su: FAR, sv: 0 };

  let shineRgb: [number, number, number] = [1, 1, 1];
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });

  function syncShineColor() {
    if (config.shineColor !== "auto") {
      shineRgb = config.shineColor;
      return;
    }
    let luminance = 1;
    if (probeCtx) {
      let el: Element | null = content;
      while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "transparent") {
          probeCtx.clearRect(0, 0, 1, 1);
          probeCtx.fillStyle = bg;
          probeCtx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
          if (a > 0) {
            luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            break;
          }
        }
        el = el.parentElement;
      }
    }
    shineRgb = luminance > 0.5 ? [0, 0, 0] : [1, 1, 1];
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  syncCanvasSize();
  syncShineColor();

  function render() {
    if (under && hasTexture && under.style.visibility === "hidden") {
      under.style.visibility = "";
    }
    const w = Math.max(output.clientWidth, 1);
    const h = Math.max(output.clientHeight, 1);
    const side = SIDE_INDEX[config.side] ?? 0;

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clearDepth(1);
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);

    gl!.enable(gl!.DEPTH_TEST);
    gl!.depthFunc(gl!.LEQUAL);
    gl!.useProgram(sheet.program);
    gl!.bindVertexArray(sheetVao);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(sheet.uniforms.uContent, 0);
    gl!.uniform2f(sheet.uniforms.uRes, w, h);
    gl!.uniform1f(sheet.uniforms.uSide, side);
    gl!.uniform1f(sheet.uniforms.uPeel, peel.a);
    gl!.uniform1f(sheet.uniforms.uReveal, Math.max(config.reveal, 0));
    gl!.uniform1f(sheet.uniforms.uCurl, Math.max(config.curl, 1));
    gl!.uniform1f(sheet.uniforms.uBow, config.bow);
    gl!.uniform1f(sheet.uniforms.uFocal, Math.max(config.perspective, 200));
    gl!.uniform1f(sheet.uniforms.uShade, config.shade);
    gl!.uniform1f(sheet.uniforms.uZone, Math.max(config.zone, 1));
    gl!.uniform1f(sheet.uniforms.uBulge, Math.max(config.bulge, 0));
    gl!.uniform1f(sheet.uniforms.uShine, Math.max(config.shine, 0));
    gl!.uniform3f(
      sheet.uniforms.uShineColor,
      shineRgb[0],
      shineRgb[1],
      shineRgb[2],
    );
    gl!.uniform1f(sheet.uniforms.uCross, side < 1.5 ? h : w);
    gl!.uniform1f(
      sheet.uniforms.uSpan,
      config.shineDistance > 0 ? config.shineDistance : side < 1.5 ? w : h,
    );
    gl!.uniform2f(sheet.uniforms.uPointer, pointer.su, pointer.sv);
    gl!.uniform1f(sheet.uniforms.uMaxX, contentMaxX);
    gl!.drawElements(gl!.TRIANGLES, gridIndices.length, gl!.UNSIGNED_INT, 0);
    gl!.bindVertexArray(null);
    gl!.disable(gl!.DEPTH_TEST);
  }

  function syncContentEvents() {
    const A = peel.a;
    const R = Math.max(config.curl * A, 0.001);
    const c = A * config.reveal + R + Math.max(config.bulge, 0) * A;
    const tailEnd = Math.max(c, 2 * c - Math.PI * R);
    const blocked = A > 0.02 && pointer.u < tailEnd;
    const next = blocked ? "none" : "auto";
    if (content.style.pointerEvents !== next) {
      content.style.pointerEvents = next;
    }
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;

  function updateTarget() {
    if (config.mode === "hover") {
      const open = peel.target > 0.5;
      const limit = open ? peel.a * config.reveal + config.zone : config.zone;
      peel.target = pointer.u < limit ? 1 : 0;
      return;
    }
    const span = Math.max(config.zone + peel.a * config.reveal, 1);
    peel.target = Math.min(1, Math.max(0, 1 - pointer.u / span));
  }

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    const tau = Math.max(config.smoothing, 1e-4);
    const k = reducedMotion ? 1 : 1 - Math.exp(-delta / tau);
    const kp = reducedMotion ? 1 : 1 - Math.exp(-delta / (tau * 0.45));
    pointer.su += (pointer.u - pointer.su) * kp;
    pointer.sv += (pointer.v - pointer.sv) * kp;
    updateTarget();
    peel.a += (peel.target - peel.a) * k;
    syncContentEvents();
    render();
    const settle = 0.5 / Math.max(config.reveal + config.curl, 1);
    if (
      Math.abs(peel.target - peel.a) < settle &&
      Math.abs(pointer.u - pointer.su) < 0.5 &&
      Math.abs(pointer.v - pointer.sv) < 0.5
    ) {
      peel.a = peel.target;
      pointer.su = pointer.u;
      pointer.sv = pointer.v;
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

  let themeTimer = 0;
  function onThemeShift() {
    syncShineColor();
    start();
    window.clearTimeout(themeTimer);
    themeTimer = window.setTimeout(() => {
      syncShineColor();
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

  function sideDistance(x: number, y: number, rect: DOMRect): number {
    if (config.side === "right") return rect.width - x;
    if (config.side === "top") return y;
    if (config.side === "bottom") return rect.height - y;
    return x;
  }

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    if (!htmlInCanvas) return;
    const rect = rectCache.current;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.u = sideDistance(x, y, rect);
    pointer.v = config.side === "top" || config.side === "bottom" ? x : y;
    updateTarget();
    start();
  }

  function onPointerLeave() {
    pointer.u = FAR;
    peel.target = 0;
    start();
  }

  listenTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  listenTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof PeelOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncShineColor();
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
      listenTarget.removeEventListener("pointermove", onPointerMove);
      listenTarget.removeEventListener("pointerleave", onPointerLeave);
      content.style.pointerEvents = "";
      if (under) under.style.visibility = "";
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(sheet.program);
      gl!.deleteShader(sheet.vert);
      gl!.deleteShader(sheet.frag);
      gl!.deleteBuffer(gridBuffer);
      gl!.deleteBuffer(indexBuffer);
      gl!.deleteVertexArray(sheetVao);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/PeelWebGPU.ts`

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
  draw,
  effect,
  frame as gpuFrame,
  geometry,
  init,
  sampler,
  surface,
  target,
  type Draw,
  type Effect,
  type Geometry,
  type Gpu,
  type Surface,
  type Target,
  type Texture,
} from "vgpu";

export type PeelSide = "left" | "right" | "top" | "bottom";

export type PeelMode = "cursor" | "hover";

export interface PeelOptions {
  /** Edge the content peels from. */
  side?: PeelSide;
  /** How the peel is driven. "cursor" peels progressively as the pointer nears the edge, "hover" peels fully when the pointer enters the zone. */
  mode?: PeelMode;
  /** How many CSS pixels of the under layer are exposed at full peel. */
  reveal?: number;
  /** Width of the strip along the chosen edge that drives the peel, in CSS pixels. */
  zone?: number;
  /** Radius of the curl in CSS pixels. Smaller values fold sharper. */
  curl?: number;
  /** Extra lift at the middle of the peeling edge in CSS pixels. Negative values bow the sheet inwards. */
  bow?: number;
  /** Strength of the curl shading on the lifted sheet (0 to 1). */
  shade?: number;
  /** Strength of the shine along the peeling edge that follows the cursor (0 to 1). */
  shine?: number;
  /** Distance from the edge at which the shine starts to appear, in CSS pixels. 0 uses the full container span. */
  shineDistance?: number;
  /** Shine color as RGB in the 0 to 1 range, or "auto" to follow the page theme: light shine on dark backgrounds, dark shine on light ones. Re-resolves on theme changes. */
  shineColor?: [number, number, number] | "auto";
  /** How many CSS pixels the peeled edge bulges toward the cursor. */
  bulge?: number;
  /** Perspective focal length in CSS pixels. Lower values exaggerate the 3D depth. */
  perspective?: number;
  /** Seconds the peel takes to settle. Higher feels more damped. */
  smoothing?: number;
}

export interface PeelElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGPU effect renders to. */
  output: HTMLCanvasElement;
  /** Element revealed underneath the peel. Kept hidden until the first capture is ready. */
  under?: HTMLElement;
}

export interface PeelInstance {
  /** Update effect options live. */
  setOptions: (options: PeelOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<PeelOptions> = {
  side: "left",
  mode: "cursor",
  reveal: 250,
  zone: 200,
  curl: 300,
  bow: 75,
  shade: 0.25,
  shine: 1,
  shineDistance: 1200,
  shineColor: "auto",
  bulge: 50,
  perspective: 2000,
  smoothing: 0.3,
};

const SIDE_INDEX: Record<PeelSide, number> = {
  left: 0,
  right: 1,
  top: 2,
  bottom: 3,
};

const SEG = 96;

interface RectCache {
  readonly current: DOMRect;
  destroy: () => void;
}

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

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const SHEET_SHADER = /* wgsl */ `
struct Params {
  resolution: vec2f,
  pointer: vec2f,
  shineColor: vec3f,
  side: f32,
  peel: f32,
  reveal: f32,
  curl: f32,
  bow: f32,
  focal: f32,
  zone: f32,
  bulge: f32,
  shade: f32,
  shine: f32,
  cross: f32,
  span: f32,
  maxX: f32,
}

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) shade: f32,
  @location(2) sidePos: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

const PI = 3.1415926;

@vertex fn vs_main(@location(0) aGrid: vec2f) -> VSOut {
  var out: VSOut;
  out.uv = aGrid;
  let p = aGrid * params.resolution;
  let crossLen = select(params.resolution.x, params.resolution.y, params.side < 1.5);
  var u: f32;
  var v: f32;
  if (params.side < 0.5) {
    u = p.x;
    v = p.y;
  } else if (params.side < 1.5) {
    u = params.resolution.x - p.x;
    v = p.y;
  } else if (params.side < 2.5) {
    u = p.y;
    v = p.x;
  } else {
    u = params.resolution.y - p.y;
    v = p.x;
  }

  let A = clamp(params.peel, 0.0, 1.0);
  let f = A * params.reveal;
  let R = max(params.curl * A, 0.001);
  let c0 = f + R;

  let dvB = (params.pointer.y - v) / max(crossLen * 0.28, 1.0);
  let prox = clamp(1.0 - params.pointer.x / max(c0 + params.zone, 1.0), 0.0, 1.0);
  let c = c0 + params.bulge * A * prox * prox * exp(-dvB * dvB);

  var x = u;
  var z = 0.0;
  var sh = 0.0;
  if (A > 0.001 && u < c) {
    let theta = (c - u) / R;
    if (theta <= PI) {
      x = c - R * sin(theta);
      z = R * (1.0 - cos(theta));
    } else {
      x = c + (theta - PI) * R;
      z = 2.0 * R;
    }
    sh = sin(clamp(theta, 0.0, PI));
  }
  z += params.bow * A * sin(PI * v / max(crossLen, 1.0)) * clamp(z / max(R, 1.0), 0.0, 1.5);
  z = clamp(z, -params.focal * 0.2, params.focal * 0.45);
  out.shade = sh * smoothstep(0.0, 0.08, A);
  out.sidePos = vec2f(u, v);

  var q: vec2f;
  if (params.side < 0.5) {
    q = vec2f(x, v);
  } else if (params.side < 1.5) {
    q = vec2f(params.resolution.x - x, v);
  } else if (params.side < 2.5) {
    q = vec2f(v, x);
  } else {
    q = vec2f(v, params.resolution.y - x);
  }

  var ndc = (q / params.resolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  let w = (params.focal - z) / params.focal;
  let depth = clamp(0.5 - z / (2.0 * max(params.focal - z, 1e-3)), 0.0, 1.0);
  out.position = vec4f(ndc, depth * w, w);
  return out;
}

@fragment fn fs_main(in: VSOut) -> @location(0) vec4f {
  let uv = clamp(in.uv, vec2f(0.001), vec2f(params.maxX - 0.001, 0.999));
  let tex = textureSampleLevel(uContent, uSampler, uv, 0.0);
  let sh = 1.0 - clamp(params.shade, 0.0, 1.0) * 0.7 * pow(max(in.shade, 0.0), 1.3);
  let du = max(in.sidePos.x, 0.0);
  let line = exp(-du / 2.5) + exp(-du / 18.0) * 0.25;
  let dv = (in.sidePos.y - params.pointer.y) / max(params.cross * 0.45, 1.0);
  let prox = clamp(1.0 - params.pointer.x / max(params.span, 1.0), 0.0, 1.0);
  let shine = params.shine * line * exp(-dv * dv) * prox * prox;
  let rgb = mix(tex.rgb * sh, params.shineColor, clamp(shine, 0.0, 1.0));
  return vec4f(rgb * tex.a, tex.a);
}`;

const COMPOSITE_SHADER = /* wgsl */ `
@group(0) @binding(0) var uScene: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSampleLevel(uScene, uSampler, uv, 0.0);
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

/** One WebGPU device per page, shared by every Peel instance. */
function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

export function createPeel(
  elements: PeelElements,
  options: PeelOptions = {},
): PeelInstance | null {
  if (!supportsWebGPU()) return null;
  const config = { ...DEFAULTS, ...options };
  const { source, content, output, under } = elements;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
      typeof sourceCtx.drawElementImage === "function" &&
      typeof paintable.requestPaint === "function",
  );

  if (htmlInCanvas) prepareHtmlInCanvas(source, content);

  let gpu: Gpu | null = null;
  let screen: Surface | null = null;
  let scene: Target | null = null;
  let sheetDraw: Draw | null = null;
  let sheetGeometry: Geometry | null = null;
  let compositeFx: Effect | null = null;
  let contentTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;
  let contentDirty = false;
  let contentMaxX = 1;
  let hasTexture = false;
  let wake = () => {};
  let capture = () => {};

  if (under && htmlInCanvas) under.style.visibility = "hidden";

  if (htmlInCanvas) {
    paintable.onpaint = () => capture();
  }

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
    if (scene) {
      const [w, h] = scene.size;
      if (w !== width || h !== height) scene.resize([width, height]);
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
        label: "peel.content",
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
    sourceCtx!.reset();
    sheetDraw?.set({ uContent: texture });
    hasTexture = true;
  }

  function renderFallback() {
    if (!fallback2d || !htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    fallback2d.clearRect(0, 0, output.width, output.height);
    fallback2d.drawImage(source, 0, 0, output.width, output.height);
    if (under) under.style.visibility = "";
  }

  capture = () => {
    if (!htmlInCanvas) return;
    try {
      sourceCtx!.reset();
      drawHtmlInCanvas(source, sourceCtx!, content);
      contentDirty = true;
      wake();
    } catch {}
  };

  const peel = { a: 0, target: 0 };
  const FAR = 1e4;
  const pointer = { u: FAR, v: 0, su: FAR, sv: 0 };

  let shineRgb: [number, number, number] = [1, 1, 1];
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });

  function syncShineColor() {
    if (config.shineColor !== "auto") {
      shineRgb = config.shineColor;
      return;
    }
    let luminance = 1;
    if (probeCtx) {
      let el: Element | null = content;
      while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== "transparent") {
          probeCtx.clearRect(0, 0, 1, 1);
          probeCtx.fillStyle = bg;
          probeCtx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = probeCtx.getImageData(0, 0, 1, 1).data;
          if (a > 0) {
            luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            break;
          }
        }
        el = el.parentElement;
      }
    }
    shineRgb = luminance > 0.5 ? [0, 0, 0] : [1, 1, 1];
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  syncCanvasSize();
  syncShineColor();

  function render() {
    if (!gpu || !scene || !sheetDraw || !compositeFx || !screen) return;
    uploadContent();
    if (under && hasTexture && under.style.visibility === "hidden") {
      under.style.visibility = "";
    }
    const w = Math.max(output.clientWidth, 1);
    const h = Math.max(output.clientHeight, 1);
    const side = SIDE_INDEX[config.side] ?? 0;
    sheetDraw.set({
      params: {
        resolution: [w, h],
        side,
        peel: peel.a,
        reveal: Math.max(config.reveal, 0),
        curl: Math.max(config.curl, 1),
        bow: config.bow,
        focal: Math.max(config.perspective, 200),
        shade: config.shade,
        zone: Math.max(config.zone, 1),
        bulge: Math.max(config.bulge, 0),
        shine: Math.max(config.shine, 0),
        shineColor: shineRgb,
        cross: side < 1.5 ? h : w,
        span: config.shineDistance > 0 ? config.shineDistance : side < 1.5 ? w : h,
        pointer: [pointer.su, pointer.sv],
        maxX: contentMaxX,
      },
    });
    gpuFrame(gpu, (f) => {
      f.pass(
        { target: scene!, clear: [0, 0, 0, 0], clearDepth: 1 },
        sheetDraw!,
      );
      f.pass({ target: screen!, clear: [0, 0, 0, 0] }, compositeFx!);
    });
  }

  function syncContentEvents() {
    const A = peel.a;
    const R = Math.max(config.curl * A, 0.001);
    const c = A * config.reveal + R + Math.max(config.bulge, 0) * A;
    const tailEnd = Math.max(c, 2 * c - Math.PI * R);
    const blocked = A > 0.02 && pointer.u < tailEnd;
    const next = blocked ? "none" : "auto";
    if (content.style.pointerEvents !== next) {
      content.style.pointerEvents = next;
    }
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;

  function updateTarget() {
    if (config.mode === "hover") {
      const open = peel.target > 0.5;
      const limit = open ? peel.a * config.reveal + config.zone : config.zone;
      peel.target = pointer.u < limit ? 1 : 0;
      return;
    }
    const span = Math.max(config.zone + peel.a * config.reveal, 1);
    peel.target = Math.min(1, Math.max(0, 1 - pointer.u / span));
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
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    const tau = Math.max(config.smoothing, 1e-4);
    const k = reducedMotion ? 1 : 1 - Math.exp(-delta / tau);
    const kp = reducedMotion ? 1 : 1 - Math.exp(-delta / (tau * 0.45));
    pointer.su += (pointer.u - pointer.su) * kp;
    pointer.sv += (pointer.v - pointer.sv) * kp;
    updateTarget();
    peel.a += (peel.target - peel.a) * k;
    syncContentEvents();
    render();
    const settle = 0.5 / Math.max(config.reveal + config.curl, 1);
    if (
      !contentDirty &&
      Math.abs(peel.target - peel.a) < settle &&
      Math.abs(pointer.u - pointer.su) < 0.5 &&
      Math.abs(pointer.v - pointer.sv) < 0.5
    ) {
      peel.a = peel.target;
      pointer.su = pointer.u;
      pointer.sv = pointer.v;
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
        label: "peel",
      });
      scene = target(gpu, {
        size: [Math.max(1, output.width), Math.max(1, output.height)],
        format: "rgba8unorm",
        depth: "depth24plus",
        clearColor: [0, 0, 0, 0],
        label: "peel.scene",
      });
      const gridVerts = new Float32Array((SEG + 1) * (SEG + 1) * 2);
      for (let y = 0; y <= SEG; y++) {
        for (let x = 0; x <= SEG; x++) {
          const i = (y * (SEG + 1) + x) * 2;
          gridVerts[i] = x / SEG;
          gridVerts[i + 1] = y / SEG;
        }
      }
      const gridIndices = new Uint32Array(SEG * SEG * 6);
      let offset = 0;
      for (let y = 0; y < SEG; y++) {
        for (let x = 0; x < SEG; x++) {
          const a = y * (SEG + 1) + x;
          const b = a + 1;
          const c = a + SEG + 1;
          const d = c + 1;
          gridIndices[offset++] = a;
          gridIndices[offset++] = c;
          gridIndices[offset++] = b;
          gridIndices[offset++] = b;
          gridIndices[offset++] = c;
          gridIndices[offset++] = d;
        }
      }
      sheetGeometry = geometry(gpu, {
        buffers: [{ data: gridVerts, attributes: { aGrid: "float32x2" } }],
        indices: gridIndices,
        topology: "triangle-list",
        label: "peel.grid",
      });
      const linear = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      sheetDraw = draw(gpu, {
        shader: SHEET_SHADER,
        geometry: sheetGeometry,
        blend: "premultiplied",
        depth: { compare: "less-equal", write: true },
        set: { uSampler: linear, uContent: ensureContentTexture() },
        label: "peel.sheet",
      });
      compositeFx = effect(gpu, COMPOSITE_SHADER, {
        blend: "premultiplied",
        set: { uSampler: linear, uScene: scene },
        label: "peel.composite",
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Peel: WebGPU unavailable, showing content without the effect.", error);
      fallback2d = output.getContext("2d");
      contentDirty = true;
      start();
    });

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  let themeTimer = 0;
  function onThemeShift() {
    syncShineColor();
    start();
    window.clearTimeout(themeTimer);
    themeTimer = window.setTimeout(() => {
      syncShineColor();
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

  function sideDistance(x: number, y: number, rect: DOMRect): number {
    if (config.side === "right") return rect.width - x;
    if (config.side === "top") return y;
    if (config.side === "bottom") return rect.height - y;
    return x;
  }

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    if (!htmlInCanvas) return;
    const rect = rectCache.current;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.u = sideDistance(x, y, rect);
    pointer.v = config.side === "top" || config.side === "bottom" ? x : y;
    updateTarget();
    start();
  }

  function onPointerLeave() {
    pointer.u = FAR;
    peel.target = 0;
    start();
  }

  listenTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  listenTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof PeelOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncShineColor();
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
      listenTarget.removeEventListener("pointermove", onPointerMove);
      listenTarget.removeEventListener("pointerleave", onPointerLeave);
      content.style.pointerEvents = "";
      if (under) under.style.visibility = "";
      contentTexture?.destroy();
      sheetGeometry?.destroy();
      (scene as unknown as { destroy?: () => void } | null)?.destroy?.();
      screen?.dispose();
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

