# Cloth (Vanilla)

- Docs: https://canvasui.dev/docs/components/cloth
- Registry: https://canvasui.dev/r/cloth-vanilla.json (WebGL), https://canvasui.dev/r/cloth-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/cloth-vanilla`

## What it does

Hangs your live HTML on a piece of fabric rippling in the wind, with softly lit folds. Cursor strokes send waves across the cloth. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/ClothVanilla.ts`

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

export type ClothPin = "top" | "bottom" | "left" | "right";

export interface ClothOptions {
  /** Edge the cloth hangs from. The opposite side swings free. */
  pin?: ClothPin;
  /** Wind force driving the fabric (0 lets the waves die down). */
  wind?: number;
  /** Playback speed of the cloth motion. */
  speed?: number;
  /** Height of the fabric folds in CSS pixels. */
  amplitude?: number;
  /** How many CSS pixels the cloth billows toward the viewer on a gust. */
  drape?: number;
  /** Strength of the waves the cursor brushes across the fabric (0 disables). */
  brush?: number;
  /** Radius of the cursor's influence in CSS pixels. */
  brushSize?: number;
  /** How quickly waves settle (higher calms the fabric faster). */
  damping?: number;
  /** Strength of the directional lighting on the folds (0 to 1). */
  light?: number;
  /** Strength of the soft sheen on fold crests (0 to 1). */
  sheen?: number;
  /** Opacity of the contact shadow under the fabric (0 to 1). */
  shadow?: number;
  /** Corner radius of the fabric in CSS pixels. */
  cornerRadius?: number;
  /** Fabric color behind transparent content as RGB in the 0 to 1 range, or "auto" to sample the page background. */
  backing?: [number, number, number] | "auto";
  /** Perspective focal length in CSS pixels. Lower exaggerates the 3D depth. */
  perspective?: number;
}

export interface ClothElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface ClothInstance {
  /** Update effect options live. */
  setOptions: (options: ClothOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<ClothOptions> = {
  pin: "top",
  wind: 3,
  speed: 0.5,
  amplitude: 30,
  drape: 40,
  brush: 2.05,
  brushSize: 150,
  damping: 1,
  light: 0.5,
  sheen: 0.1,
  shadow: 0.25,
  cornerRadius: 20,
  backing: "auto",
  perspective: 1200,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const CLOTH_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aGrid;
layout(location = 1) in vec4 aData;
layout(location = 2) in vec2 aOffset;
uniform vec2 uRes;
uniform vec2 uOut;
uniform float uBleed;
uniform float uFocal;
out vec2 vUv;
out vec3 vNormal;
out float vFold;
out vec2 vLocal;

void main () {
  vUv = aGrid;
  float z = aData.x;
  vec2 nxy = aData.yz;
  vNormal = vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.04)));
  vFold = aData.w;

  vLocal = aGrid * uRes;
  vec2 px = vLocal + aOffset + vec2(uBleed);
  vec2 ndc = (px / uOut) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  float w = (uFocal - z) / uFocal;
  gl_Position = vec4(ndc, -z / uFocal, w);
}`;

const SDF_SNIPPET = `
float fabricDist (vec2 p, vec2 size, float radius) {
  vec2 half_ = size * 0.5;
  float r = min(radius, min(half_.x, half_.y));
  vec2 q = abs(p - half_) - (half_ - vec2(r));
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}`;

const CLOTH_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vNormal;
in float vFold;
in vec2 vLocal;
out vec4 outColor;
uniform sampler2D uContent;
uniform float uMaxX;
uniform float uLight;
uniform float uSheen;
uniform vec3 uBacking;
uniform vec2 uRes;
uniform float uRadius;
uniform float uDark;
${SDF_SNIPPET}

void main () {
  vec2 uv = clamp(vUv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
  vec4 tex = texture(uContent, uv);
  vec3 fabric = mix(uBacking, tex.rgb, tex.a);

  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(-0.3, 0.42, 0.86));
  float diffFlat = 0.58 + 0.42 * lightDir.z;
  float diff = 0.58 + 0.42 * dot(n, lightDir);
  float shade = mix(1.0, (diff / diffFlat) * vFold, uLight);
  vec3 lit = fabric * shade;

  vec3 halfway = normalize(lightDir + vec3(0.0, 0.0, 1.0));
  float specFlat = pow(halfway.z, 34.0);
  float spec =
    max(pow(max(dot(n, halfway), 0.0), 34.0) - specFlat, 0.0) /
    (1.0 - specFlat);
  lit += uSheen * spec * mix(vec3(1.0), fabric, 0.35);

  float broadFlat = pow(halfway.z, 6.0);
  float broad =
    max(pow(max(dot(n, halfway), 0.0), 6.0) - broadFlat, 0.0) /
    (1.0 - broadFlat);
  lit += uDark * uLight * 0.3 * broad * vec3(1.0);

  float d = fabricDist(vLocal, uRes, uRadius);

  float hemT = smoothstep(0.0, 6.0, -d);
  lit *= mix(1.0, mix(0.93, 1.0, hemT), uLight * (1.0 - uDark));
  lit += vec3(uDark * uLight * 0.08 * (1.0 - hemT));

  float alpha = clamp(0.5 - d, 0.0, 1.0);
  outColor = vec4(clamp(lit, 0.0, 1.0), 1.0) * alpha;
}`;

const SHADOW_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aGrid;
layout(location = 1) in vec4 aData;
layout(location = 2) in vec2 aOffset;
uniform vec2 uRes;
uniform vec2 uOut;
uniform float uBleed;
out vec2 vLocal;
out float vLift;

void main () {
  float z = aData.x;
  vLift = z;
  vLocal = aGrid * uRes;
  vec2 px =
    vLocal + aOffset + vec2(uBleed) + vec2(10.0, 14.0) + vec2(0.3, 0.42) * z;
  vec2 ndc = (px / uOut) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;

const SHADOW_FRAG = `#version 300 es
precision highp float;
in vec2 vLocal;
in float vLift;
out vec4 outColor;
uniform float uShadow;
uniform vec2 uRes;
uniform float uRadius;
uniform float uDark;
${SDF_SNIPPET}

void main () {
  float d = fabricDist(vLocal, uRes, uRadius);
  float a = uShadow * smoothstep(0.0, 30.0, -d);

  a *= mix(1.0, 0.55, clamp(vLift / 50.0, 0.0, 1.0));

  a *= mix(1.0, 0.55, uDark);
  vec3 tint = vec3(uDark);
  outColor = vec4(tint * a, a);
}`;

const SEG = 96;
const NODES = SEG + 1;
const DT = 1 / 120;
const WAVE_SPEED = 30;
const STIFFNESS = 0.55;
const FORCE_GAIN = 5.0;
const BLEED = 48;

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

export function createCloth(
  elements: ClothElements,
  options: ClothOptions = {},
): ClothInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, output } = elements;
  const wrapper = (output.parentElement ?? output) as HTMLElement;
  output.style.top = `${-BLEED}px`;
  output.style.left = `${-BLEED}px`;
  output.style.right = `${-BLEED}px`;
  output.style.bottom = `${-BLEED}px`;
  output.style.width = `calc(100% + ${BLEED * 2}px)`;
  output.style.height = `calc(100% + ${BLEED * 2}px)`;

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
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
      console.error("Cloth shader error:", gl!.getShaderInfoLog(shader));
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

  const cloth = link(CLOTH_VERT, CLOTH_FRAG);
  const shadow = link(SHADOW_VERT, SHADOW_FRAG);

  const gridVerts = new Float32Array(NODES * NODES * 2);
  for (let y = 0; y < NODES; y++) {
    for (let x = 0; x < NODES; x++) {
      const i = (y * NODES + x) * 2;
      gridVerts[i] = x / SEG;
      gridVerts[i + 1] = y / SEG;
    }
  }
  const gridIndices = new Uint32Array(SEG * SEG * 6);
  let offset = 0;
  for (let y = 0; y < SEG; y++) {
    for (let x = 0; x < SEG; x++) {
      const a = y * NODES + x;
      const b = a + 1;
      const c = a + NODES;
      const d = c + 1;
      gridIndices[offset++] = a;
      gridIndices[offset++] = c;
      gridIndices[offset++] = b;
      gridIndices[offset++] = b;
      gridIndices[offset++] = c;
      gridIndices[offset++] = d;
    }
  }

  const clothVao = gl.createVertexArray();
  gl.bindVertexArray(clothVao);
  const gridBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, gridVerts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const dataBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, NODES * NODES * 4 * 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
  const offsetBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, NODES * NODES * 2 * 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
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
      Math.max(0.05, content.clientWidth / Math.max(wrapper.clientWidth, 1)),
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

  let hCur = new Float32Array(NODES * NODES);
  let hPrev = new Float32Array(NODES * NODES);
  let hNext = new Float32Array(NODES * NODES);
  const vertexData = new Float32Array(NODES * NODES * 4);
  const offsetData = new Float32Array(NODES * NODES * 2);
  const zField = new Float32Array(NODES * NODES);
  const rowForce = new Float32Array(NODES);
  const colForce = new Float32Array(NODES);
  const hangCurve = new Float32Array(NODES);
  for (let a = 0; a < NODES; a++) {
    hangCurve[a] = Math.pow(a / SEG, 1.3);
  }

  let simTime = Math.random() * 60;
  let gust = 0.5;
  let fieldEnergy = 1;

  const pointer = { x: -1e5, y: -1e5, inside: false };
  const touch = { x: -1e5, y: -1e5, vx: 0, vy: 0, s: 0 };

  function axisFor(x: number, y: number): [number, number] {
    if (config.pin === "top") return [y, x];
    if (config.pin === "bottom") return [SEG - y, x];
    if (config.pin === "left") return [x, y];
    return [SEG - x, y];
  }

  function stepSim(dt: number) {
    const speed = Math.max(config.speed, 0);
    simTime += dt * speed;
    const t = simTime;
    const windAmp = FORCE_GAIN * Math.max(config.wind, 0) * gust;

    const kb1 = (Math.PI * 2) / (SEG / 1.5);
    const kb2 = (Math.PI * 2) / (SEG / 3.8);
    const ka = (Math.PI * 2) / (SEG / 2.2);
    const w1 = WAVE_SPEED * kb1;
    const w2 = WAVE_SPEED * kb2;
    const drift = 1.8 * Math.sin(0.23 * t);
    for (let b = 0; b < NODES; b++) {
      rowForce[b] =
        Math.sin(kb1 * b - w1 * t + drift) +
        0.45 * Math.sin(kb2 * b + w2 * t * 0.8 + 3.0);
    }
    for (let a = 0; a < NODES; a++) {
      colForce[a] = (0.7 + 0.3 * Math.sin(ka * a - 1.7 * t)) * hangCurve[a];
    }

    const c2 = WAVE_SPEED * WAVE_SPEED;
    const dt2 = dt * dt;
    const decay = Math.exp(-Math.min(Math.max(config.damping, 0.05), 8) * dt);
    for (let y = 0; y < NODES; y++) {
      const up = Math.max(y - 1, 0) * NODES;
      const down = Math.min(y + 1, SEG) * NODES;
      const row = y * NODES;
      for (let x = 0; x < NODES; x++) {
        const i = row + x;
        const l = row + Math.max(x - 1, 0);
        const r = row + Math.min(x + 1, SEG);
        const h = hCur[i];
        const lap = hCur[l] + hCur[r] + hCur[up + x] + hCur[down + x] - 4 * h;
        const [a, b] = axisFor(x, y);
        const force = windAmp * rowForce[b] * colForce[a];
        const acc = c2 * lap - STIFFNESS * h + force;
        const next = 2 * h - hPrev[i] + dt2 * acc;
        let value = h + (next - h) * decay;
        if (value > 3.5) value = 3.5;
        else if (value < -3.5) value = -3.5;
        hNext[i] = value;
      }
    }

    for (let b = 0; b < NODES; b++) {
      let x = b;
      let y = 0;
      if (config.pin === "bottom") y = SEG;
      else if (config.pin === "left") {
        x = 0;
        y = b;
      } else if (config.pin === "right") {
        x = SEG;
        y = b;
      }
      hNext[y * NODES + x] = 0;
    }

    const spent = hPrev;
    hPrev = hCur;
    hCur = hNext;
    hNext = spent;
  }

  function touchImprint(delta: number, width: number, height: number) {
    if (config.brush <= 0 || touch.s < 0.01) return;
    const cellW = width / SEG;
    const cellH = height / SEG;
    const radius = Math.max(config.brushSize, 12);
    const rx = radius / cellW;
    const ry = radius / cellH;
    const gx = touch.x / cellW;
    const gy = touch.y / cellH;
    const bx0 = Math.max(Math.ceil(gx - 2.5 * rx), 0);
    const bx1 = Math.min(Math.floor(gx + 2.5 * rx), SEG);
    const by0 = Math.max(Math.ceil(gy - 2.5 * ry), 0);
    const by1 = Math.min(Math.floor(gy + 2.5 * ry), SEG);
    const lift = 1.1 * Math.min(config.brush, 3) * touch.s;
    const rate = Math.min(delta * 4, 1);
    for (let y = by0; y <= by1; y++) {
      const oy = (y - gy) / ry;
      const row = y * NODES;
      for (let x = bx0; x <= bx1; x++) {
        const ox = (x - gx) / rx;
        const g = Math.exp(-(ox * ox + oy * oy));
        if (g < 0.02) continue;
        const i = row + x;
        const pull = rate * g;
        const goal = lift * g;
        hCur[i] += (goal - hCur[i]) * pull;
        hPrev[i] += (goal - hPrev[i]) * pull;
      }
    }
  }

  function foreshorten(
    axisStride: number,
    lineStride: number,
    ds: number,
    anchor: number,
    comp: number,
  ) {
    const ds2 = ds * ds;
    for (let l = 0; l < NODES; l++) {
      const base = l * lineStride;
      offsetData[(base + anchor * axisStride) * 2 + comp] = 0;
      let cum = 0;
      for (let k = anchor + 1; k < NODES; k++) {
        const i = base + k * axisStride;
        const dz = zField[i] - zField[i - axisStride];
        cum += ds - Math.sqrt(Math.max(ds2 - dz * dz, 0));
        offsetData[i * 2 + comp] = -cum;
      }
      cum = 0;
      for (let k = anchor - 1; k >= 0; k--) {
        const i = base + k * axisStride;
        const dz = zField[i] - zField[i + axisStride];
        cum += ds - Math.sqrt(Math.max(ds2 - dz * dz, 0));
        offsetData[i * 2 + comp] = cum;
      }
    }
  }

  function composeOffsets(width: number, height: number) {
    const cellW = width / SEG;
    const cellH = height / SEG;
    const mid = SEG >> 1;
    if (config.pin === "top" || config.pin === "bottom") {
      foreshorten(NODES, 1, cellH, config.pin === "top" ? 0 : SEG, 1);
      foreshorten(1, NODES, cellW, mid, 0);
    } else {
      foreshorten(1, NODES, cellW, config.pin === "left" ? 0 : SEG, 0);
      foreshorten(NODES, 1, cellH, mid, 1);
    }
  }

  function composeVertices(width: number, height: number) {
    const amp = Math.max(config.amplitude, 0);
    const drape = config.drape * (0.3 + 0.7 * gust);
    const cellW = width / SEG;
    const cellH = height / SEG;
    let energy = 0;

    for (let y = 0; y < NODES; y++) {
      const row = y * NODES;
      for (let x = 0; x < NODES; x++) {
        const i = row + x;
        const h = hCur[i];
        energy = Math.max(energy, Math.abs(h));
        const [a] = axisFor(x, y);
        zField[i] = amp * Math.tanh(h) + drape * hangCurve[a];
      }
    }
    fieldEnergy = energy;

    for (let y = 0; y < NODES; y++) {
      const up = Math.max(y - 1, 0) * NODES;
      const down = Math.min(y + 1, SEG) * NODES;
      const row = y * NODES;
      for (let x = 0; x < NODES; x++) {
        const i = row + x;
        const l = row + Math.max(x - 1, 0);
        const r = row + Math.min(x + 1, SEG);
        const dzdx = (zField[r] - zField[l]) / (2 * cellW);
        const dzdy = (zField[down + x] - zField[up + x]) / (2 * cellH);
        const inv = 1 / Math.hypot(dzdx, dzdy, 1);
        const curve =
          zField[l] +
          zField[r] +
          zField[up + x] +
          zField[down + x] -
          4 * zField[i];
        let fold = 1 - curve * 0.01;
        if (fold < 0.86) fold = 0.86;
        else if (fold > 1.06) fold = 1.06;
        const o = i * 4;
        vertexData[o] = zField[i];
        vertexData[o + 1] = -dzdx * inv;
        vertexData[o + 2] = -dzdy * inv;
        vertexData[o + 3] = fold;
      }
    }

    composeOffsets(width, height);
  }

  let backingRgb: [number, number, number] = [1, 1, 1];
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });

  function syncBacking() {
    if (config.backing !== "auto") {
      backingRgb = config.backing;
      return;
    }
    backingRgb = [1, 1, 1];
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
            backingRgb = [r / 255, g / 255, b / 255];
            break;
          }
        }
        el = el.parentElement;
      }
    }
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  syncCanvasSize();
  syncBacking();

  function render() {
    const resW = Math.max(wrapper.clientWidth, 1);
    const resH = Math.max(wrapper.clientHeight, 1);
    const outW = Math.max(output.clientWidth, 1);
    const outH = Math.max(output.clientHeight, 1);
    const light = Math.min(Math.max(config.light, 0), 1);
    const radius = Math.max(config.cornerRadius, 0);
    const shadowAlpha = Math.min(Math.max(config.shadow, 0), 1);
    const lum =
      0.299 * backingRgb[0] + 0.587 * backingRgb[1] + 0.114 * backingRgb[2];
    const dark = Math.min(Math.max((0.5 - lum) / 0.35, 0), 1);

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);

    gl!.bindVertexArray(clothVao);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, dataBuffer);
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, vertexData);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, offsetBuffer);
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, offsetData);

    gl!.useProgram(shadow.program);
    gl!.uniform2f(shadow.uniforms.uRes, resW, resH);
    gl!.uniform2f(shadow.uniforms.uOut, outW, outH);
    gl!.uniform1f(shadow.uniforms.uBleed, BLEED);
    gl!.uniform1f(shadow.uniforms.uShadow, shadowAlpha);
    gl!.uniform1f(shadow.uniforms.uRadius, radius);
    gl!.uniform1f(shadow.uniforms.uDark, dark);
    gl!.drawElements(gl!.TRIANGLES, gridIndices.length, gl!.UNSIGNED_INT, 0);

    gl!.useProgram(cloth.program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(cloth.uniforms.uContent, 0);
    gl!.uniform2f(cloth.uniforms.uRes, resW, resH);
    gl!.uniform2f(cloth.uniforms.uOut, outW, outH);
    gl!.uniform1f(cloth.uniforms.uBleed, BLEED);
    gl!.uniform1f(cloth.uniforms.uFocal, Math.max(config.perspective, 200));
    gl!.uniform1f(cloth.uniforms.uMaxX, contentMaxX);
    gl!.uniform1f(cloth.uniforms.uLight, light);
    gl!.uniform1f(cloth.uniforms.uSheen, Math.max(config.sheen, 0));
    gl!.uniform1f(cloth.uniforms.uRadius, radius);
    gl!.uniform1f(cloth.uniforms.uDark, dark);
    gl!.uniform3f(
      cloth.uniforms.uBacking,
      backingRgb[0],
      backingRgb[1],
      backingRgb[2],
    );
    gl!.drawElements(gl!.TRIANGLES, gridIndices.length, gl!.UNSIGNED_INT, 0);
    gl!.bindVertexArray(null);
  }

  let raf = 0;
  let lastTime = performance.now();
  let simDebt = 0;
  let destroyed = false;
  let running = false;
  let visible = true;

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;

    const width = Math.max(wrapper.clientWidth, 1);
    const height = Math.max(wrapper.clientHeight, 1);

    if (!reducedMotion) {
      const t = simTime;
      const target = Math.max(
        0.55 +
          0.35 * Math.sin(t * 0.31 + 1.3) +
          0.25 * Math.sin(t * 0.83) * (0.5 + 0.5 * Math.sin(t * 0.17)),
        0.15,
      );
      gust += (target - gust) * Math.min(delta * 2, 1);

      const sTarget = pointer.inside && config.brush > 0 ? 1 : 0;
      const sRate = pointer.inside ? 8 : 2.5;
      touch.s += (sTarget - touch.s) * Math.min(delta * sRate, 1);

      const omega = 14;
      touch.vx +=
        ((pointer.x - touch.x) * omega * omega - 2 * omega * touch.vx) * delta;
      touch.vy +=
        ((pointer.y - touch.y) * omega * omega - 2 * omega * touch.vy) * delta;
      touch.x += touch.vx * delta;
      touch.y += touch.vy * delta;
      touchImprint(delta, width, height);

      simDebt = Math.min(simDebt + delta, DT * 5);
      while (simDebt >= DT) {
        stepSim(DT);
        simDebt -= DT;
      }
    }

    composeVertices(width, height);
    render();

    if (
      reducedMotion ||
      (config.wind <= 0.001 && fieldEnergy < 0.004 && touch.s < 0.01)
    ) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!htmlInCanvas) return;
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
    syncBacking();
    start();
    window.clearTimeout(themeTimer);
    themeTimer = window.setTimeout(() => {
      syncBacking();
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

  const listenTarget = wrapper;

  const rectCache = createRectCache(wrapper);

  function onPointerMove(event: PointerEvent) {
    if (!htmlInCanvas) return;
    const rect = rectCache.current;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (touch.s < 0.01) {
      touch.x = x;
      touch.y = y;
      touch.vx = 0;
      touch.vy = 0;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.inside = true;
    start();
  }

  function onPointerLeave() {
    pointer.inside = false;
  }

  listenTarget.addEventListener("pointermove", onPointerMove);
  listenTarget.addEventListener("pointerleave", onPointerLeave);

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof ClothOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncBacking();
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
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(cloth.program);
      gl!.deleteShader(cloth.vert);
      gl!.deleteShader(cloth.frag);
      gl!.deleteProgram(shadow.program);
      gl!.deleteShader(shadow.vert);
      gl!.deleteShader(shadow.frag);
      gl!.deleteBuffer(gridBuffer);
      gl!.deleteBuffer(dataBuffer);
      gl!.deleteBuffer(offsetBuffer);
      gl!.deleteBuffer(indexBuffer);
      gl!.deleteVertexArray(clothVao);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/ClothWebGPU.ts`

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
  frame as gpuFrame,
  geometry,
  init,
  sampler,
  surface,
  type Draw,
  type Geometry,
  type Gpu,
  type Surface,
} from "vgpu";
import type { Texture } from "vgpu";

export type ClothPin = "top" | "bottom" | "left" | "right";

export interface ClothOptions {
  /** Edge the cloth hangs from. The opposite side swings free. */
  pin?: ClothPin;
  /** Wind force driving the fabric (0 lets the waves die down). */
  wind?: number;
  /** Playback speed of the cloth motion. */
  speed?: number;
  /** Height of the fabric folds in CSS pixels. */
  amplitude?: number;
  /** How many CSS pixels the cloth billows toward the viewer on a gust. */
  drape?: number;
  /** Strength of the waves the cursor brushes across the fabric (0 disables). */
  brush?: number;
  /** Radius of the cursor's influence in CSS pixels. */
  brushSize?: number;
  /** How quickly waves settle (higher calms the fabric faster). */
  damping?: number;
  /** Strength of the directional lighting on the folds (0 to 1). */
  light?: number;
  /** Strength of the soft sheen on fold crests (0 to 1). */
  sheen?: number;
  /** Opacity of the contact shadow under the fabric (0 to 1). */
  shadow?: number;
  /** Corner radius of the fabric in CSS pixels. */
  cornerRadius?: number;
  /** Fabric color behind transparent content as RGB in the 0 to 1 range, or "auto" to sample the page background. */
  backing?: [number, number, number] | "auto";
  /** Perspective focal length in CSS pixels. Lower exaggerates the 3D depth. */
  perspective?: number;
}

export interface ClothElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGPU effect renders to. */
  output: HTMLCanvasElement;
}

export interface ClothInstance {
  /** Update effect options live. */
  setOptions: (options: ClothOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<ClothOptions> = {
  pin: "top",
  wind: 3,
  speed: 0.5,
  amplitude: 30,
  drape: 40,
  brush: 2.05,
  brushSize: 150,
  damping: 1,
  light: 0.5,
  sheen: 0.1,
  shadow: 0.25,
  cornerRadius: 20,
  backing: "auto",
  perspective: 1200,
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const SDF_SNIPPET = `
fn fabricDist(p: vec2f, size: vec2f, radius: f32) -> f32 {
  let half_ = size * 0.5;
  let r = min(radius, min(half_.x, half_.y));
  let q = abs(p - half_) - (half_ - vec2f(r));
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}`;

const CLOTH_SHADER = /* wgsl */ `
struct Params {
  backing: vec4f,
  res: vec2f,
  out: vec2f,
  bleed: f32,
  focal: f32,
  maxX: f32,
  light: f32,
  sheen: f32,
  radius: f32,
  dark: f32,
}

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) fold: f32,
  @location(3) local: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

${SDF_SNIPPET}

@vertex fn vs_main(
  @location(0) grid: vec2f,
  @location(1) data: vec4f,
  @location(2) offset: vec2f,
) -> VSOut {
  var out: VSOut;
  out.uv = grid;
  let z = data.x;
  let nxy = data.yz;
  out.normal = vec3f(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.04)));
  out.fold = data.w;
  out.local = grid * params.res;
  let px = out.local + offset + vec2f(params.bleed);
  var ndc = (px / params.out) * 2.0 - vec2f(1.0);
  ndc = vec2f(ndc.x, -ndc.y);
  let w = (params.focal - z) / params.focal;
  out.pos = vec4f(ndc, 0.0, w);
  return out;
}

@fragment fn fs_main(in: VSOut) -> @location(0) vec4f {
  let uv = clamp(in.uv, vec2f(0.001), vec2f(params.maxX - 0.001, 0.999));
  let tex = textureSampleLevel(uContent, uSampler, uv, 0.0);
  let fabric = mix(params.backing.rgb, tex.rgb, tex.a);

  let n = normalize(in.normal);
  let lightDir = normalize(vec3f(-0.3, 0.42, 0.86));
  let diffFlat = 0.58 + 0.42 * lightDir.z;
  let diff = 0.58 + 0.42 * dot(n, lightDir);
  let shade = mix(1.0, (diff / diffFlat) * in.fold, params.light);
  var lit = fabric * shade;

  let halfway = normalize(lightDir + vec3f(0.0, 0.0, 1.0));
  let specFlat = pow(halfway.z, 34.0);
  let spec =
    max(pow(max(dot(n, halfway), 0.0), 34.0) - specFlat, 0.0) /
    (1.0 - specFlat);
  lit += params.sheen * spec * mix(vec3f(1.0), fabric, 0.35);

  let broadFlat = pow(halfway.z, 6.0);
  let broad =
    max(pow(max(dot(n, halfway), 0.0), 6.0) - broadFlat, 0.0) /
    (1.0 - broadFlat);
  lit += params.dark * params.light * 0.3 * broad * vec3f(1.0);

  let d = fabricDist(in.local, params.res, params.radius);

  let hemT = smoothstep(0.0, 6.0, -d);
  lit *= mix(1.0, mix(0.93, 1.0, hemT), params.light * (1.0 - params.dark));
  lit += vec3f(params.dark * params.light * 0.08 * (1.0 - hemT));

  let alpha = clamp(0.5 - d, 0.0, 1.0);
  return vec4f(clamp(lit, vec3f(0.0), vec3f(1.0)), 1.0) * alpha;
}`;

const SHADOW_SHADER = /* wgsl */ `
struct Params {
  res: vec2f,
  out: vec2f,
  bleed: f32,
  shadow: f32,
  radius: f32,
  dark: f32,
}

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) local: vec2f,
  @location(1) lift: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

${SDF_SNIPPET}

@vertex fn vs_main(
  @location(0) grid: vec2f,
  @location(1) data: vec4f,
  @location(2) offset: vec2f,
) -> VSOut {
  var out: VSOut;
  let z = data.x;
  out.lift = z;
  out.local = grid * params.res;
  let px = out.local + offset + vec2f(params.bleed) + vec2f(10.0, 14.0) + vec2f(0.3, 0.42) * z;
  var ndc = (px / params.out) * 2.0 - vec2f(1.0);
  ndc = vec2f(ndc.x, -ndc.y);
  out.pos = vec4f(ndc, 0.0, 1.0);
  return out;
}

@fragment fn fs_main(in: VSOut) -> @location(0) vec4f {
  let d = fabricDist(in.local, params.res, params.radius);
  var a = params.shadow * smoothstep(0.0, 30.0, -d);
  a *= mix(1.0, 0.55, clamp(in.lift / 50.0, 0.0, 1.0));
  a *= mix(1.0, 0.55, params.dark);
  let tint = vec3f(params.dark);
  return vec4f(tint * a, a);
}`;

const SEG = 96;
const NODES = SEG + 1;
const DT = 1 / 120;
const WAVE_SPEED = 30;
const STIFFNESS = 0.55;
const FORCE_GAIN = 5.0;
const BLEED = 48;

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

/** One WebGPU device per page, shared by every Cloth instance. */
function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

function createRectCache(element: Element) {
  return {
    get current() {
      return element.getBoundingClientRect();
    },
    destroy() {},
  };
}

export function createCloth(
  elements: ClothElements,
  options: ClothOptions = {},
): ClothInstance | null {
  if (!supportsWebGPU()) return null;
  const config = { ...DEFAULTS, ...options };
  const { source, content, output } = elements;
  const wrapper = (output.parentElement ?? output) as HTMLElement;
  output.style.top = `${-BLEED}px`;
  output.style.left = `${-BLEED}px`;
  output.style.right = `${-BLEED}px`;
  output.style.bottom = `${-BLEED}px`;
  output.style.width = `calc(100% + ${BLEED * 2}px)`;
  output.style.height = `calc(100% + ${BLEED * 2}px)`;

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
      typeof sourceCtx.drawElementImage === "function" &&
      typeof paintable.requestPaint === "function",
  );

  if (htmlInCanvas) prepareHtmlInCanvas(source, content);

  let wake = () => {};
  let contentDirty = false;

  if (htmlInCanvas) {
    paintable.onpaint = () => capture();
  }

  let gpu: Gpu | null = null;
  let screen: Surface | null = null;
  let clothDraw: Draw | null = null;
  let shadowDraw: Draw | null = null;
  let clothGeometry: Geometry | null = null;
  let contentTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;

  const gridVerts = new Float32Array(NODES * NODES * 2);
  for (let y = 0; y < NODES; y++) {
    for (let x = 0; x < NODES; x++) {
      const i = (y * NODES + x) * 2;
      gridVerts[i] = x / SEG;
      gridVerts[i + 1] = y / SEG;
    }
  }
  const gridIndices = new Uint32Array(SEG * SEG * 6);
  let indexOffset = 0;
  for (let y = 0; y < SEG; y++) {
    for (let x = 0; x < SEG; x++) {
      const a = y * NODES + x;
      const b = a + 1;
      const c = a + NODES;
      const d = c + 1;
      gridIndices[indexOffset++] = a;
      gridIndices[indexOffset++] = c;
      gridIndices[indexOffset++] = b;
      gridIndices[indexOffset++] = b;
      gridIndices[indexOffset++] = c;
      gridIndices[indexOffset++] = d;
    }
  }

  let contentMaxX = 1;

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
        label: "cloth.content",
      });
    }
    return contentTexture;
  }

  function capture() {
    if (!htmlInCanvas) return;
    try {
      sourceCtx!.reset();
      drawHtmlInCanvas(source, sourceCtx!, content);
      contentDirty = true;
      wake();
    } catch {}
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty || !gpu || !clothDraw) return;
    contentDirty = false;
    const texture = ensureContentTexture();
    gpu.gpu.queue.copyExternalImageToTexture(
      { source },
      { texture: texture.gpu },
      [source.width, source.height],
    );
    clothDraw.set({ uContent: texture });
    sourceCtx!.reset();
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
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(wrapper.clientWidth, 1)),
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

  let hCur = new Float32Array(NODES * NODES);
  let hPrev = new Float32Array(NODES * NODES);
  let hNext = new Float32Array(NODES * NODES);
  const vertexData = new Float32Array(NODES * NODES * 4);
  const offsetData = new Float32Array(NODES * NODES * 2);
  const zField = new Float32Array(NODES * NODES);
  const rowForce = new Float32Array(NODES);
  const colForce = new Float32Array(NODES);
  const hangCurve = new Float32Array(NODES);
  for (let a = 0; a < NODES; a++) {
    hangCurve[a] = Math.pow(a / SEG, 1.3);
  }

  let simTime = Math.random() * 60;
  let gust = 0.5;
  let fieldEnergy = 1;

  const pointer = { x: -1e5, y: -1e5, inside: false };
  const touch = { x: -1e5, y: -1e5, vx: 0, vy: 0, s: 0 };

  function axisFor(x: number, y: number): [number, number] {
    if (config.pin === "top") return [y, x];
    if (config.pin === "bottom") return [SEG - y, x];
    if (config.pin === "left") return [x, y];
    return [SEG - x, y];
  }

  function stepSim(dt: number) {
    const speed = Math.max(config.speed, 0);
    simTime += dt * speed;
    const t = simTime;
    const windAmp = FORCE_GAIN * Math.max(config.wind, 0) * gust;

    const kb1 = (Math.PI * 2) / (SEG / 1.5);
    const kb2 = (Math.PI * 2) / (SEG / 3.8);
    const ka = (Math.PI * 2) / (SEG / 2.2);
    const w1 = WAVE_SPEED * kb1;
    const w2 = WAVE_SPEED * kb2;
    const drift = 1.8 * Math.sin(0.23 * t);
    for (let b = 0; b < NODES; b++) {
      rowForce[b] =
        Math.sin(kb1 * b - w1 * t + drift) +
        0.45 * Math.sin(kb2 * b + w2 * t * 0.8 + 3.0);
    }
    for (let a = 0; a < NODES; a++) {
      colForce[a] = (0.7 + 0.3 * Math.sin(ka * a - 1.7 * t)) * hangCurve[a];
    }

    const c2 = WAVE_SPEED * WAVE_SPEED;
    const dt2 = dt * dt;
    const decay = Math.exp(-Math.min(Math.max(config.damping, 0.05), 8) * dt);
    for (let y = 0; y < NODES; y++) {
      const up = Math.max(y - 1, 0) * NODES;
      const down = Math.min(y + 1, SEG) * NODES;
      const row = y * NODES;
      for (let x = 0; x < NODES; x++) {
        const i = row + x;
        const l = row + Math.max(x - 1, 0);
        const r = row + Math.min(x + 1, SEG);
        const h = hCur[i];
        const lap = hCur[l] + hCur[r] + hCur[up + x] + hCur[down + x] - 4 * h;
        const [a, b] = axisFor(x, y);
        const force = windAmp * rowForce[b] * colForce[a];
        const acc = c2 * lap - STIFFNESS * h + force;
        const next = 2 * h - hPrev[i] + dt2 * acc;
        let value = h + (next - h) * decay;
        if (value > 3.5) value = 3.5;
        else if (value < -3.5) value = -3.5;
        hNext[i] = value;
      }
    }

    for (let b = 0; b < NODES; b++) {
      let x = b;
      let y = 0;
      if (config.pin === "bottom") y = SEG;
      else if (config.pin === "left") {
        x = 0;
        y = b;
      } else if (config.pin === "right") {
        x = SEG;
        y = b;
      }
      hNext[y * NODES + x] = 0;
    }

    const spent = hPrev;
    hPrev = hCur;
    hCur = hNext;
    hNext = spent;
  }

  function touchImprint(delta: number, width: number, height: number) {
    if (config.brush <= 0 || touch.s < 0.01) return;
    const cellW = width / SEG;
    const cellH = height / SEG;
    const radius = Math.max(config.brushSize, 12);
    const rx = radius / cellW;
    const ry = radius / cellH;
    const gx = touch.x / cellW;
    const gy = touch.y / cellH;
    const bx0 = Math.max(Math.ceil(gx - 2.5 * rx), 0);
    const bx1 = Math.min(Math.floor(gx + 2.5 * rx), SEG);
    const by0 = Math.max(Math.ceil(gy - 2.5 * ry), 0);
    const by1 = Math.min(Math.floor(gy + 2.5 * ry), SEG);
    const lift = 1.1 * Math.min(config.brush, 3) * touch.s;
    const rate = Math.min(delta * 4, 1);
    for (let y = by0; y <= by1; y++) {
      const oy = (y - gy) / ry;
      const row = y * NODES;
      for (let x = bx0; x <= bx1; x++) {
        const ox = (x - gx) / rx;
        const g = Math.exp(-(ox * ox + oy * oy));
        if (g < 0.02) continue;
        const i = row + x;
        const pull = rate * g;
        const goal = lift * g;
        hCur[i] += (goal - hCur[i]) * pull;
        hPrev[i] += (goal - hPrev[i]) * pull;
      }
    }
  }

  function foreshorten(
    axisStride: number,
    lineStride: number,
    ds: number,
    anchor: number,
    comp: number,
  ) {
    const ds2 = ds * ds;
    for (let l = 0; l < NODES; l++) {
      const base = l * lineStride;
      offsetData[(base + anchor * axisStride) * 2 + comp] = 0;
      let cum = 0;
      for (let k = anchor + 1; k < NODES; k++) {
        const i = base + k * axisStride;
        const dz = zField[i] - zField[i - axisStride];
        cum += ds - Math.sqrt(Math.max(ds2 - dz * dz, 0));
        offsetData[i * 2 + comp] = -cum;
      }
      cum = 0;
      for (let k = anchor - 1; k >= 0; k--) {
        const i = base + k * axisStride;
        const dz = zField[i] - zField[i + axisStride];
        cum += ds - Math.sqrt(Math.max(ds2 - dz * dz, 0));
        offsetData[i * 2 + comp] = cum;
      }
    }
  }

  function composeOffsets(width: number, height: number) {
    const cellW = width / SEG;
    const cellH = height / SEG;
    const mid = SEG >> 1;
    if (config.pin === "top" || config.pin === "bottom") {
      foreshorten(NODES, 1, cellH, config.pin === "top" ? 0 : SEG, 1);
      foreshorten(1, NODES, cellW, mid, 0);
    } else {
      foreshorten(1, NODES, cellW, config.pin === "left" ? 0 : SEG, 0);
      foreshorten(NODES, 1, cellH, mid, 1);
    }
  }

  function composeVertices(width: number, height: number) {
    const amp = Math.max(config.amplitude, 0);
    const drape = config.drape * (0.3 + 0.7 * gust);
    const cellW = width / SEG;
    const cellH = height / SEG;
    let energy = 0;

    for (let y = 0; y < NODES; y++) {
      const row = y * NODES;
      for (let x = 0; x < NODES; x++) {
        const i = row + x;
        const h = hCur[i];
        energy = Math.max(energy, Math.abs(h));
        const [a] = axisFor(x, y);
        zField[i] = amp * Math.tanh(h) + drape * hangCurve[a];
      }
    }
    fieldEnergy = energy;

    for (let y = 0; y < NODES; y++) {
      const up = Math.max(y - 1, 0) * NODES;
      const down = Math.min(y + 1, SEG) * NODES;
      const row = y * NODES;
      for (let x = 0; x < NODES; x++) {
        const i = row + x;
        const l = row + Math.max(x - 1, 0);
        const r = row + Math.min(x + 1, SEG);
        const dzdx = (zField[r] - zField[l]) / (2 * cellW);
        const dzdy = (zField[down + x] - zField[up + x]) / (2 * cellH);
        const inv = 1 / Math.hypot(dzdx, dzdy, 1);
        const curve =
          zField[l] +
          zField[r] +
          zField[up + x] +
          zField[down + x] -
          4 * zField[i];
        let fold = 1 - curve * 0.01;
        if (fold < 0.86) fold = 0.86;
        else if (fold > 1.06) fold = 1.06;
        const o = i * 4;
        vertexData[o] = zField[i];
        vertexData[o + 1] = -dzdx * inv;
        vertexData[o + 2] = -dzdy * inv;
        vertexData[o + 3] = fold;
      }
    }

    composeOffsets(width, height);
  }

  let backingRgb: [number, number, number] = [1, 1, 1];
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });

  function syncBacking() {
    if (config.backing !== "auto") {
      backingRgb = config.backing;
      return;
    }
    backingRgb = [1, 1, 1];
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
            backingRgb = [r / 255, g / 255, b / 255];
            break;
          }
        }
        el = el.parentElement;
      }
    }
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  syncCanvasSize();
  syncBacking();

  function renderFallback() {
    if (!fallback2d || !htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    fallback2d.clearRect(0, 0, output.width, output.height);
    fallback2d.drawImage(source, 0, 0, output.width, output.height);
    sourceCtx!.reset();
  }

  function render() {
    if (!gpu || !screen || !clothDraw || !shadowDraw || !clothGeometry) return;
    uploadContent();
    const resW = Math.max(wrapper.clientWidth, 1);
    const resH = Math.max(wrapper.clientHeight, 1);
    const outW = Math.max(output.clientWidth, 1);
    const outH = Math.max(output.clientHeight, 1);
    const light = Math.min(Math.max(config.light, 0), 1);
    const radius = Math.max(config.cornerRadius, 0);
    const shadowAlpha = Math.min(Math.max(config.shadow, 0), 1);
    const lum =
      0.299 * backingRgb[0] + 0.587 * backingRgb[1] + 0.114 * backingRgb[2];
    const dark = Math.min(Math.max((0.5 - lum) / 0.35, 0), 1);

    clothGeometry.buffers[1].write(vertexData);
    clothGeometry.buffers[2].write(offsetData);

    shadowDraw.set({
      params: {
        res: [resW, resH],
        out: [outW, outH],
        bleed: BLEED,
        shadow: shadowAlpha,
        radius,
        dark,
      },
    });
    clothDraw.set({
      params: {
        backing: [backingRgb[0], backingRgb[1], backingRgb[2], 0],
        res: [resW, resH],
        out: [outW, outH],
        bleed: BLEED,
        focal: Math.max(config.perspective, 200),
        maxX: contentMaxX,
        light,
        sheen: Math.max(config.sheen, 0),
        radius,
        dark,
      },
    });

    gpuFrame(gpu, (f) => {
      f.pass({ target: screen!, clear: [0, 0, 0, 0] }, shadowDraw!);
      f.pass({ target: screen!, clear: false }, clothDraw!);
    });
  }

  let raf = 0;
  let lastTime = performance.now();
  let simDebt = 0;
  let destroyed = false;
  let running = false;
  let visible = true;

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
    const delta = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;

    const width = Math.max(wrapper.clientWidth, 1);
    const height = Math.max(wrapper.clientHeight, 1);

    if (!reducedMotion) {
      const t = simTime;
      const target = Math.max(
        0.55 +
          0.35 * Math.sin(t * 0.31 + 1.3) +
          0.25 * Math.sin(t * 0.83) * (0.5 + 0.5 * Math.sin(t * 0.17)),
        0.15,
      );
      gust += (target - gust) * Math.min(delta * 2, 1);

      const sTarget = pointer.inside && config.brush > 0 ? 1 : 0;
      const sRate = pointer.inside ? 8 : 2.5;
      touch.s += (sTarget - touch.s) * Math.min(delta * sRate, 1);

      const omega = 14;
      touch.vx +=
        ((pointer.x - touch.x) * omega * omega - 2 * omega * touch.vx) * delta;
      touch.vy +=
        ((pointer.y - touch.y) * omega * omega - 2 * omega * touch.vy) * delta;
      touch.x += touch.vx * delta;
      touch.y += touch.vy * delta;
      touchImprint(delta, width, height);

      simDebt = Math.min(simDebt + delta, DT * 5);
      while (simDebt >= DT) {
        stepSim(DT);
        simDebt -= DT;
      }
    }

    composeVertices(width, height);
    render();

    if (
      reducedMotion ||
      (config.wind <= 0.001 && fieldEnergy < 0.004 && touch.s < 0.01)
    ) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!htmlInCanvas) return;
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
        label: "cloth",
      });
      const linear = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      clothGeometry = geometry(gpu, {
        label: "cloth.mesh",
        topology: "triangle-list",
        buffers: [
          { data: gridVerts, attributes: { grid: "float32x2" }, label: "cloth.grid" },
          { data: vertexData, attributes: { data: "float32x4" }, label: "cloth.data" },
          { data: offsetData, attributes: { offset: "float32x2" }, label: "cloth.offset" },
        ],
        indices: gridIndices,
      });
      clothDraw = draw(gpu, {
        label: "cloth",
        shader: CLOTH_SHADER,
        geometry: clothGeometry,
        blend: "premultiplied",
        set: { uContent: ensureContentTexture(), uSampler: linear },
      });
      shadowDraw = draw(gpu, {
        label: "cloth.shadow",
        shader: SHADOW_SHADER,
        geometry: clothGeometry,
        blend: "premultiplied",
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Cloth: WebGPU unavailable, showing content without the effect.", error);
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
    syncBacking();
    start();
    window.clearTimeout(themeTimer);
    themeTimer = window.setTimeout(() => {
      syncBacking();
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

  const listenTarget = wrapper;
  const rectCache = createRectCache(wrapper);

  function onPointerMove(event: PointerEvent) {
    if (!htmlInCanvas) return;
    const rect = rectCache.current;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (touch.s < 0.01) {
      touch.x = x;
      touch.y = y;
      touch.vx = 0;
      touch.vy = 0;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.inside = true;
    start();
  }

  function onPointerLeave() {
    pointer.inside = false;
  }

  listenTarget.addEventListener("pointermove", onPointerMove);
  listenTarget.addEventListener("pointerleave", onPointerLeave);

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof ClothOptions] !== value,
        )
      )
        return;
      Object.assign(config, next);
      syncBacking();
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
      contentTexture?.destroy();
      clothGeometry?.destroy();
      screen?.dispose();
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

