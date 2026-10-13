# ForceField (Vanilla)

- Docs: https://canvasui.dev/docs/components/force-field
- Registry: https://canvasui.dev/r/force-field-vanilla.json (WebGL), https://canvasui.dev/r/force-field-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/force-field-vanilla`

## What it does

Projects an energy shield lattice over your live HTML. The cursor charges cells as it crosses them and every click detonates a shockwave ripple that refracts the page beneath, with bloom, grain, and a burning reveal dissolve. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/ForceFieldVanilla.ts`

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

export type ForceFieldShape = "hexagon" | "triangle" | "square";

export type ForceFieldGridReveal = "always" | "hover" | "click" | "both";

export interface ForceFieldOptions {
  /** Cell shape of the energy lattice. */
  shape?: ForceFieldShape;
  /** Field color as [r, g, b] in 0-1 range. */
  color?: [number, number, number];
  /** Color of the dissolve edge glow as [r, g, b] in 0-1 range. */
  edgeColor?: [number, number, number];
  /** Overall field opacity (0 to 1). */
  opacity?: number;
  /** Cells across the shorter screen axis (4 to 80). */
  cellScale?: number;
  /** Thickness of the lattice lines (0.005 to 0.2). */
  lineWidth?: number;
  /** Brightness of the lattice grid (0 to 1). */
  gridOpacity?: number;
  /** How the lattice is revealed: always visible, near the cursor, by click ripples, or both. */
  gridReveal?: ForceFieldGridReveal;
  /** Brightness of the revealed lattice in hover/click/both modes (0 to 3). */
  gridRevealStrength?: number;
  /** Radius of the hover reveal in CSS pixels (60 to 800). */
  gridRevealRadius?: number;
  /** Fade smoothness of the reveal edge (0.02 to 1). */
  gridFade?: number;
  /** Random per-cell flash speed (0 to 4). */
  flashSpeed?: number;
  /** Random per-cell flash brightness (0 to 1). */
  flashIntensity?: number;
  /** Scale of the drifting energy noise (0.5 to 12). */
  flowScale?: number;
  /** Drift speed of the energy noise (0 to 4). */
  flowSpeed?: number;
  /** Brightness of the energy noise (0 to 4). */
  flowIntensity?: number;
  /** Glow creeping in from the screen edges, the fresnel analog (0 to 4). */
  edgeGlow?: number;
  /** How far the edge glow reaches into the screen (0.02 to 0.6). */
  edgeFalloff?: number;
  /** Reveal progress. 1 is fully materialized, 0 is gone (noise dissolve). */
  reveal?: number;
  /** Scale of the dissolve noise (0.5 to 12). */
  dissolveScale?: number;
  /** Width of the burning dissolve edge (0.005 to 0.2). */
  dissolveWidth?: number;
  /** Brightness of the dissolve edge (0 to 12). */
  dissolveGlow?: number;
  /** Expansion speed of click ripples in screens per second (0.1 to 4). */
  rippleSpeed?: number;
  /** Ring thickness of click ripples (0.01 to 0.4). */
  rippleWidth?: number;
  /** How softly ripple rings feather into the page, 0 is tight, 1 is airy (0 to 1). */
  rippleBlend?: number;
  /** Lifetime of one ripple in seconds (0.3 to 5). */
  rippleDuration?: number;
  /** Brightness of ripples and impact flashes (0 to 8). */
  rippleIntensity?: number;
  /** Max radius a ripple can reach, in screens (0.1 to 2). */
  rippleMaxRadius?: number;
  /** Radius of the cell flash burst around an impact (0 to 0.5). */
  impactRadius?: number;
  /** How much ripples push the page outward and warp the lattice (0 to 60). */
  refraction?: number;
  /** Chromatic aberration inside refracted rings (0 to 8). */
  aberration?: number;
  /** Living heat-haze shimmer that warps the page beneath the field (0 to 2). */
  haze?: number;
  /** Lattice reacts to the page: cells over bright content glow brighter (0 to 1). */
  pageReact?: number;
  /** Tints the page toward the field color, like looking through the shield (0 to 1). */
  tint?: number;
  /** Glow following the cursor (0 to 3). */
  hoverGlow?: number;
  /** Radius of the cursor glow in CSS pixels (40 to 600). */
  hoverRadius?: number;
  /** Cells light up when the cursor crosses them (0 to 2). */
  hoverCharge?: number;
  /** Fade the field out around the cursor instead of intensifying it. */
  hideOnHover?: boolean;
  /** How much the page dims beneath the field (0 to 1). */
  dim?: number;
  /** Bloom amount applied to bright field energy (0 to 3). */
  bloom?: number;
  /** Bloom brightness cutoff (0 to 1). */
  bloomThreshold?: number;
  /** Animated film grain over the field (0 to 1). */
  grain?: number;
  /** Spawn ripples on click (default true). */
  clickRipples?: boolean;
  /** Called with the impact position in CSS pixels after each click. */
  onHit?: (x: number, y: number) => void;
}

export interface ForceFieldElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface ForceFieldInstance {
  /** Update effect options live. */
  setOptions: (options: ForceFieldOptions) => void;
  /** Spawn a ripple at CSS pixel coordinates relative to the output canvas. */
  impact: (x: number, y: number) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const MAX_HITS = 10;

const DEFAULTS: Required<Omit<ForceFieldOptions, "onHit">> & {
  onHit: ((x: number, y: number) => void) | null;
} = {
  shape: "hexagon",
  color: [0.15, 0.68, 1],
  edgeColor: [0.5, 0.8, 1],
  opacity: 0.9,
  cellScale: 16,
  lineWidth: 0.03,
  gridOpacity: 0.15,
  gridReveal: "click",
  gridRevealStrength: 1.5,
  gridRevealRadius: 250,
  gridFade: 0.35,
  flashSpeed: 0.6,
  flashIntensity: 0.1,
  flowScale: 3,
  flowSpeed: 0.5,
  flowIntensity: 0,
  edgeGlow: 0.2,
  edgeFalloff: 0.18,
  reveal: 1,
  dissolveScale: 3.5,
  dissolveWidth: 0.05,
  dissolveGlow: 6,
  rippleSpeed: 0.5,
  rippleWidth: 0.045,
  rippleBlend: 1,
  rippleDuration: 1.6,
  rippleIntensity: 0.1,
  rippleMaxRadius: 0.85,
  impactRadius: 0.16,
  refraction: 30,
  aberration: 2.5,
  haze: 0.5,
  pageReact: 0,
  tint: 0.1,
  hoverGlow: 0.25,
  hoverRadius: 350,
  hoverCharge: 1.6,
  hideOnHover: false,
  dim: 0,
  bloom: 1,
  bloomThreshold: 0.3,
  grain: 0.2,
  clickRipples: true,
  onHit: null,
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

const FIELD_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outEmission;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uTime;
uniform float uShape;
uniform vec3 uColor;
uniform vec3 uEdgeColor;
uniform float uOpacity;
uniform float uCellScale;
uniform float uLineWidth;
uniform float uGridOpacity;
uniform float uGridRevealMode;
uniform float uGridRevealStrength;
uniform float uGridRevealRadius;
uniform float uGridFade;
uniform float uFlashSpeed;
uniform float uFlashIntensity;
uniform float uFlowScale;
uniform float uFlowSpeed;
uniform float uFlowIntensity;
uniform float uEdgeGlow;
uniform float uEdgeFalloff;
uniform float uReveal;
uniform float uDissolveScale;
uniform float uDissolveWidth;
uniform float uDissolveGlow;
uniform vec2 uHitPos[10];
uniform float uHitTime[10];
uniform float uRippleSpeed;
uniform float uRippleWidth;
uniform float uRippleDuration;
uniform float uRippleIntensity;
uniform float uRippleMaxRadius;
uniform float uImpactRadius;
uniform float uRippleBlend;
uniform float uRefraction;
uniform float uAberration;
uniform vec2 uMouse;
uniform float uHoverGlow;
uniform float uHoverRadius;
uniform float uHoverCharge;
uniform float uHideOnHover;
uniform float uScroll;
uniform float uHaze;
uniform float uPageReact;
uniform float uTint;
uniform float uDim;
uniform float uHasContent;
uniform float uPageLum;

vec3 mod289v3(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v4(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289v4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float hash21(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec4 hexCell(vec2 p){
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
  bool first = dot(h.xy, h.xy) < dot(h.zw, h.zw);
  vec2 local = first ? h.xy : h.zw;
  vec2 id = first ? hC.xy : hC.zw + 0.5;
  vec2 cell = abs(local);
  float d = max(dot(cell, s * 0.5), cell.x);
  return vec4(d, 0.5, id);
}

vec4 triCell(vec2 p){
  vec2 l = vec2(p.x - p.y * 0.57735027, p.y * 1.15470054);
  vec2 id = floor(l);
  vec2 f = l - id;
  float upper = step(1.0, f.x + f.y);
  vec2 w = vec2(f.x + f.y * 0.5, f.y * 0.8660254);
  w = mix(w, vec2(1.5, 0.8660254) - w, upper);
  float d = min(
    w.y,
    min(
      dot(w, vec2(0.8660254, -0.5)),
      dot(w - vec2(1.0, 0.0), vec2(-0.8660254, -0.5))
    )
  );
  return vec4(0.2886751 - d, 0.2886751, id * 2.0 + vec2(upper, 0.0));
}

vec4 squareCell(vec2 p){
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 a = abs(f);
  float d = max(a.x, a.y);
  return vec4(d, 0.5, id);
}

vec4 cellInfo(vec2 p){
  if (uShape < 0.5) return hexCell(p);
  if (uShape < 1.5) return triCell(p);
  return squareCell(p);
}

float cellFlash(vec2 id){
  float rnd = hash21(id);
  float phase = rnd * 6.2831;
  float speed = 0.5 + rnd * 1.5;
  return smoothstep(0.6, 1.0, sin(uTime * uFlashSpeed * speed + phase)) * uFlashIntensity;
}

void main(){
  vec2 frag = vUv * uResolution;
  float minAxis = min(uResolution.x, uResolution.y);
  vec2 pageFrag = vec2(frag.x, frag.y - uScroll);
  vec2 st = pageFrag / minAxis;

  float dissolve = 0.0;
  float revealMask = 1.0;
  float dissolveEdge = 0.0;
  if (uReveal < 0.999) {
    dissolve = snoise(vec3(st * uDissolveScale, 3.7)) * 0.5 + 0.5;
    float revealGate = uReveal * (1.0 + uDissolveWidth * 2.0) - uDissolveWidth;
    revealMask = smoothstep(revealGate - uDissolveWidth, revealGate, 1.0 - dissolve);
    revealMask = 1.0 - revealMask;
    float edgeLow = smoothstep(revealGate - uDissolveWidth, revealGate - uDissolveWidth * 0.2, 1.0 - dissolve);
    float edgeHigh = smoothstep(revealGate - uDissolveWidth * 0.15, revealGate, 1.0 - dissolve);
    dissolveEdge = edgeLow * (1.0 - edgeHigh) * step(0.001, uReveal);
  }

  float ringContrib = 0.0;
  float impactBoost = 0.0;
  vec2 pushVec = vec2(0.0);
  float sigma = uRippleWidth * mix(0.6, 2.6, uRippleBlend);
  for (int i = 0; i < 10; i++) {
    float ht = uHitTime[i];
    float elapsed = uTime - ht;
    float isActive = step(0.0, ht) * step(0.0, elapsed) * step(elapsed, uRippleDuration);
    if (isActive < 0.5) continue;
    vec2 toHit = (pageFrag - uHitPos[i]) / minAxis;
    float dist = length(toHit);
    float ringR = min(elapsed * uRippleSpeed, uRippleMaxRadius);
    float noiseD = snoise(vec3(st * 5.0, elapsed * 2.0 + float(i))) * 0.03 * (1.0 - uRippleBlend * 0.7);
    float band = dist + noiseD - ringR;
    float g = exp(-band * band / (2.0 * sigma * sigma));
    float fade = 1.0 - smoothstep(uRippleDuration * 0.4, uRippleDuration, elapsed);
    fade *= fade;
    float radialFade = 1.0 - smoothstep(uRippleMaxRadius * 0.75, uRippleMaxRadius, ringR);
    float contrib = g * fade * radialFade;
    ringContrib += contrib;
    float zone = smoothstep(uImpactRadius, 0.0, dist);
    float zoneFade = 1.0 - smoothstep(0.0, uRippleDuration * 0.35, elapsed);
    impactBoost += zone * zoneFade;
    vec2 dir = dist > 0.0001 ? toHit / dist : vec2(0.0);
    float core = smoothstep(0.0, sigma * 2.5, dist) * smoothstep(0.0, sigma * 1.5, ringR);
    pushVec += dir * g * fade * radialFade * core;
  }
  ringContrib = min(ringContrib, 1.5);
  impactBoost = min(impactBoost, 1.0);

  vec2 fieldSt = st - pushVec * (uRefraction * 1.4 / minAxis);
  vec4 info = cellInfo(fieldSt * uCellScale);
  float lineDist = info.x;
  float halfSize = info.y;
  vec2 cellId = info.zw;
  float line = smoothstep(halfSize - uLineWidth, halfSize, lineDist);
  float flash = cellFlash(cellId);

  float flowNoise = 0.0;
  vec2 hazeVec = vec2(0.0);
  if (uFlowIntensity > 0.001 || uHaze > 0.001) {
    float t = uTime * uFlowSpeed;
    float fn1 = snoise(vec3(st * uFlowScale, t * 0.5));
    float fn2 = snoise(vec3(st * uFlowScale * 2.1 + 7.3, -t * 0.35));
    flowNoise = (fn1 * 0.6 + fn2 * 0.4) * 0.5 + 0.5;
    hazeVec = vec2(fn1, fn2) * uHaze;
  }

  vec2 bp = min(frag, uResolution - frag) / minAxis;
  float rr = max(uEdgeFalloff, 0.02);
  float hmix = clamp(0.5 + 0.5 * (bp.y - bp.x) / rr, 0.0, 1.0);
  float edgeDist = mix(bp.y, bp.x, hmix) - rr * hmix * (1.0 - hmix);
  float fresnel = pow(1.0 - smoothstep(0.0, uEdgeFalloff, edgeDist), 1.6) * uEdgeGlow;

  vec2 pageMouse = vec2(uMouse.x, uMouse.y - uScroll);
  vec2 mouseSt = pageMouse / minAxis;
  float mouseD = distance(pageFrag, pageMouse);
  float hover = exp(-mouseD * mouseD / (uHoverRadius * uHoverRadius * 0.5)) * uHoverGlow;
  vec2 hoverCell = cellInfo(mouseSt * uCellScale).zw;
  float sameCell = 1.0 - step(0.5, distance(hoverCell, cellId));
  float charge = sameCell * uHoverCharge;
  hover *= 1.0 - uHideOnHover;
  charge *= 1.0 - uHideOnHover;

  float revealHover = (uGridRevealMode == 1.0 || uGridRevealMode == 3.0) ? 1.0 : 0.0;
  float revealClick = (uGridRevealMode == 2.0 || uGridRevealMode == 3.0) ? 1.0 : 0.0;
  float allowHover = max(revealHover, uGridRevealMode == 0.0 ? 1.0 : 0.0);
  charge *= allowHover;
  float hoverMask = 1.0 - smoothstep(uGridRevealRadius * (1.0 - uGridFade), uGridRevealRadius, mouseD);
  hoverMask *= 1.0 - uHideOnHover;
  float gridBoost = (revealHover * hoverMask + revealClick * impactBoost) * uGridRevealStrength;

  float gridEnergy = line * (uGridOpacity + gridBoost + charge + flash + ringContrib * uRippleIntensity * 5.0);
  float energy = gridEnergy * (0.35 + fresnel * 0.4)
    + fresnel * 0.5
    + flash * 0.5
    + flowNoise * uFlowIntensity * (0.12 + fresnel * 0.25 + line * 0.15)
    + hover * (0.25 + line * 0.75 * allowHover)
    + ringContrib * uRippleIntensity;

  float hide = 1.0 - uHideOnHover * (1.0 - smoothstep(uHoverRadius * 0.35, uHoverRadius * 1.4, mouseD));

  vec2 warp = (-pushVec * uRefraction * 0.7 + hazeVec * 6.0) * revealMask * hide;
  vec2 refr = warp;
  vec2 cuv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 texel = 1.0 / uResolution;
  vec2 baseUv = clamp(cuv + refr * texel * vec2(1.0, -1.0), 0.0, 1.0);
  vec4 content;
  if (uHasContent > 0.5) {
    content = texture(uContent, baseUv);
    float ab = uAberration * min(length(warp), 24.0) / 24.0;
    if (ab > 0.01) {
      vec2 abOff = normalize(warp + vec2(1e-5)) * ab * texel * 3.0;
      content.r = texture(uContent, clamp(baseUv + abOff, 0.0, 1.0)).r;
      content.b = texture(uContent, clamp(baseUv - abOff, 0.0, 1.0)).b;
    }
    if (uPageReact > 0.001) {
      float pageL = dot(content.rgb, vec3(0.2126, 0.7152, 0.0722));
      energy *= mix(1.0, 0.3 + pageL * 1.6, uPageReact * revealMask);
    }
  } else {
    content = vec4(0.0);
  }

  energy *= revealMask * hide;

  float dimEff = uDim * revealMask * (1.0 - hover * 0.5);
  vec3 col = content.rgb * (1.0 - dimEff);
  if (uTint > 0.001) {
    vec3 membrane = uColor / max(max(uColor.r, max(uColor.g, uColor.b)), 0.001);
    col *= mix(vec3(1.0), membrane * 0.92 + 0.08, uTint * revealMask);
  }

  vec3 fieldGlow = uColor * energy * uOpacity;
  vec3 dissolveGlow = uEdgeColor * dissolveEdge * uDissolveGlow * hide;

  float dark = 1.0 - uPageLum;
  float darkMix = clamp(dark * 1.4 - 0.2, 0.0, 1.0);
  vec3 rawAdd = fieldGlow + dissolveGlow;
  vec3 additive = rawAdd / (1.0 + 0.45 * max(max(rawAdd.r, rawAdd.g), rawAdd.b));
  float aMax = max(max(additive.r, additive.g), additive.b);
  vec3 inked = col * exp(-(vec3(aMax) - additive) * 1.7) * (1.0 - 0.18 * min(aMax, 1.0));
  col = mix(inked, col + additive, darkMix);

  float alpha = max(content.a, clamp(energy * uOpacity + dissolveEdge, 0.0, 1.0));
  col = clamp(col, vec3(0.0), vec3(max(alpha, 0.001)));
  outColor = vec4(col, alpha);
  outEmission = vec4(rawAdd, 1.0);
}`;

const BRIGHT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform float uThreshold;
void main(){
  vec4 c = texture(uScene, vUv);
  float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  float gate = smoothstep(uThreshold, uThreshold + 0.25, lum);
  outColor = vec4(c.rgb * gate, 1.0);
}`;

const KAWASE_DOWN_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform vec2 uTexel;
void main(){
  vec2 o = uTexel;
  vec4 sum = texture(uScene, vUv) * 4.0;
  sum += texture(uScene, vUv - o);
  sum += texture(uScene, vUv + o);
  sum += texture(uScene, vUv + vec2(o.x, -o.y));
  sum += texture(uScene, vUv - vec2(o.x, -o.y));
  outColor = sum * 0.125;
}`;

const KAWASE_UP_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBase;
uniform vec2 uTexel;
void main(){
  vec2 o = uTexel;
  vec4 sum = texture(uScene, vUv + vec2(-o.x * 2.0, 0.0));
  sum += texture(uScene, vUv + vec2(-o.x, o.y)) * 2.0;
  sum += texture(uScene, vUv + vec2(0.0, o.y * 2.0));
  sum += texture(uScene, vUv + vec2(o.x, o.y)) * 2.0;
  sum += texture(uScene, vUv + vec2(o.x * 2.0, 0.0));
  sum += texture(uScene, vUv + vec2(o.x, -o.y)) * 2.0;
  sum += texture(uScene, vUv + vec2(0.0, -o.y * 2.0));
  sum += texture(uScene, vUv + vec2(-o.x, -o.y)) * 2.0;
  outColor = mix(texture(uBase, vUv), sum / 12.0, 0.62);
}`;

const COMPOSITE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uPageLum;
float grainNoise(vec2 p, float t){
  vec3 v = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195) + t);
  v += dot(v, v.yzx + 19.19);
  return fract((v.x + v.y) * v.z) - 0.5;
}
void main(){
  vec4 scene = texture(uScene, vUv);
  vec3 bloom = texture(uBloom, vUv).rgb * uBloomStrength;
  float darkMix = clamp((1.0 - uPageLum) * 1.4 - 0.2, 0.0, 1.0);
  float bMax = max(max(bloom.r, bloom.g), bloom.b);
  vec3 inked = scene.rgb * exp(-(vec3(bMax) - bloom) * 1.1) * (1.0 - 0.1 * min(bMax, 1.0));
  vec3 col = mix(inked, scene.rgb + bloom, darkMix);
  float bloomLum = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
  float alpha = clamp(scene.a + bloomLum, 0.0, 1.0);
  float g = grainNoise(gl_FragCoord.xy, fract(uTime) + 0.1);
  col += g * uGrain * (0.15 + alpha * 0.25);
  col = clamp(col, vec3(0.0), vec3(max(alpha, 0.001)));
  outColor = vec4(col, alpha);
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

const SHAPE_INDEX: Record<ForceFieldShape, number> = {
  hexagon: 0,
  triangle: 1,
  square: 2,
};

const REVEAL_INDEX: Record<ForceFieldGridReveal, number> = {
  always: 0,
  hover: 1,
  click: 2,
  both: 3,
};

export function createForceField(
  elements: ForceFieldElements,
  options: ForceFieldOptions = {},
): ForceFieldInstance | null {
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

  const hdr = Boolean(
    gl.getExtension("EXT_color_buffer_float") ||
    gl.getExtension("EXT_color_buffer_half_float"),
  );

  const sourceCtx = source.getContext("2d") as ElementImageContext | null;
  const paintable = source as PaintableCanvas;
  const htmlInCanvas = Boolean(
    sourceCtx &&
    typeof sourceCtx.drawElementImage === "function" &&
    typeof paintable.requestPaint === "function",
  );

  if (htmlInCanvas) prepareHtmlInCanvas(source, content);

  let contentDirty = false;
  let pageLum = 0;
  let wake = () => {};

  function readPageLum(): number {
    try {
      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      if (!pctx) return 0;
      let el: Element | null = content;
      while (el instanceof Element) {
        const bgColor = getComputedStyle(el).backgroundColor;
        if (bgColor && bgColor !== "transparent") {
          pctx.clearRect(0, 0, 1, 1);
          pctx.fillStyle = bgColor;
          pctx.fillRect(0, 0, 1, 1);
          const d = pctx.getImageData(0, 0, 1, 1).data;
          if (d[3] > 128) {
            return (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
          }
        }
        el = el.parentElement;
      }
    } catch {}
    return 0;
  }

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
      console.error("ForceField shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  function link(frag: string): {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation>;
    shaders: WebGLShader[];
  } {
    const vs = compile(gl!.VERTEX_SHADER, VERT);
    const fs = compile(gl!.FRAGMENT_SHADER, frag);
    const program = gl!.createProgram()!;
    gl!.attachShader(program, vs);
    gl!.attachShader(program, fs);
    gl!.linkProgram(program);
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl!.getActiveUniform(program, i)!;
      const name = info.name.replace(/\[0\]$/, "");
      uniforms[name] = gl!.getUniformLocation(program, info.name)!;
    }
    return { program, uniforms, shaders: [vs, fs] };
  }

  const fieldPass = link(FIELD_FRAG);
  const brightPass = link(BRIGHT_FRAG);
  const downPass = link(KAWASE_DOWN_FRAG);
  const upPass = link(KAWASE_UP_FRAG);
  const compositePass = link(COMPOSITE_FRAG);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function makeTexture(): WebGLTexture {
    const texture = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return texture;
  }

  const contentTexture = makeTexture();
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

  interface Target {
    texture: WebGLTexture;
    emissionTexture: WebGLTexture | null;
    framebuffer: WebGLFramebuffer;
    width: number;
    height: number;
    float: boolean;
  }

  function allocPixels(width: number, height: number, float: boolean) {
    if (float && hdr) {
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA16F,
        width,
        height,
        0,
        gl!.RGBA,
        gl!.HALF_FLOAT,
        null,
      );
    } else {
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
    }
  }

  function makeTarget(
    width: number,
    height: number,
    emission = false,
    float = false,
  ): Target {
    const texture = makeTexture();
    allocPixels(width, height, float);
    let emissionTexture: WebGLTexture | null = null;
    if (emission) {
      emissionTexture = makeTexture();
      allocPixels(width, height, true);
    }
    const framebuffer = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffer);
    gl!.framebufferTexture2D(
      gl!.FRAMEBUFFER,
      gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D,
      texture,
      0,
    );
    if (emissionTexture) {
      gl!.framebufferTexture2D(
        gl!.FRAMEBUFFER,
        gl!.COLOR_ATTACHMENT1,
        gl!.TEXTURE_2D,
        emissionTexture,
        0,
      );
      gl!.drawBuffers([gl!.COLOR_ATTACHMENT0, gl!.COLOR_ATTACHMENT1]);
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    return { texture, emissionTexture, framebuffer, width, height, float };
  }

  function resizeTarget(target: Target, width: number, height: number) {
    if (target.width === width && target.height === height) return;
    target.width = width;
    target.height = height;
    gl!.bindTexture(gl!.TEXTURE_2D, target.texture);
    allocPixels(width, height, target.float);
    if (target.emissionTexture) {
      gl!.bindTexture(gl!.TEXTURE_2D, target.emissionTexture);
      allocPixels(width, height, true);
    }
  }

  const MIPS = 4;
  const sceneTarget = makeTarget(2, 2, true);
  const brightTarget = makeTarget(2, 2, false, true);
  const downTargets: Target[] = [];
  const upTargets: Target[] = [];
  for (let i = 0; i < MIPS; i++) {
    downTargets.push(makeTarget(2, 2, false, true));
    upTargets.push(makeTarget(2, 2, false, true));
  }

  const hitPos = new Float32Array(MAX_HITS * 2);
  const hitTime = new Float32Array(MAX_HITS).fill(-999);
  let hitIndex = 0;
  let mouseX = -9999;
  let mouseY = -9999;

  let dpr = 1;

  function syncCanvasSize() {
    dpr = getCanvasPixelRatio(output, gl!);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    resizeTarget(sceneTarget, width, height);
    let bw = Math.max(1, width >> 1);
    let bh = Math.max(1, height >> 1);
    resizeTarget(brightTarget, bw, bh);
    for (let i = 0; i < MIPS; i++) {
      bw = Math.max(1, bw >> 1);
      bh = Math.max(1, bh >> 1);
      resizeTarget(downTargets[i], bw, bh);
    }
    for (let i = MIPS - 1; i >= 0; i--) {
      const up =
        i === 0
          ? { width: brightTarget.width, height: brightTarget.height }
          : downTargets[i - 1];
      resizeTarget(upTargets[i], up.width, up.height);
    }
    if (htmlInCanvas) {
      const sourceWidth = Math.max(1, Math.round(source.clientWidth * dpr));
      const sourceHeight = Math.max(1, Math.round(source.clientHeight * dpr));
      if (
        source.width !== sourceWidth ||
        source.height !== sourceHeight
      ) {
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
    pageLum = readPageLum();
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source,
    );
    sourceCtx!.clearRect(0, 0, source.width, source.height);
  }

  function drawQuad() {
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function bindTargetTexture(unit: number, texture: WebGLTexture) {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
  }

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  let time = 3.7;

  function render() {
    uploadContent();
    const width = output.width;
    const height = output.height;

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, sceneTarget.framebuffer);
    gl!.viewport(0, 0, width, height);
    gl!.useProgram(fieldPass.program);
    const fu = fieldPass.uniforms;
    bindTargetTexture(0, contentTexture);
    gl!.uniform1i(fu.uContent, 0);
    gl!.uniform2f(fu.uResolution, width, height);
    gl!.uniform1f(fu.uTime, time);
    gl!.uniform1f(fu.uShape, SHAPE_INDEX[config.shape] ?? 0);
    gl!.uniform3f(fu.uColor, config.color[0], config.color[1], config.color[2]);
    gl!.uniform3f(
      fu.uEdgeColor,
      config.edgeColor[0],
      config.edgeColor[1],
      config.edgeColor[2],
    );
    gl!.uniform1f(fu.uOpacity, clamp(config.opacity, 0, 1));
    gl!.uniform1f(fu.uCellScale, clamp(config.cellScale, 4, 80));
    gl!.uniform1f(fu.uLineWidth, clamp(config.lineWidth, 0.005, 0.2));
    gl!.uniform1f(fu.uGridOpacity, clamp(config.gridOpacity, 0, 1));
    gl!.uniform1f(fu.uGridRevealMode, REVEAL_INDEX[config.gridReveal] ?? 2);
    gl!.uniform1f(
      fu.uGridRevealStrength,
      clamp(config.gridRevealStrength, 0, 3),
    );
    gl!.uniform1f(
      fu.uGridRevealRadius,
      clamp(config.gridRevealRadius, 60, 800) * dpr,
    );
    gl!.uniform1f(fu.uGridFade, clamp(config.gridFade, 0.02, 1));
    gl!.uniform1f(fu.uFlashSpeed, clamp(config.flashSpeed, 0, 4));
    gl!.uniform1f(fu.uFlashIntensity, clamp(config.flashIntensity, 0, 1));
    gl!.uniform1f(fu.uFlowScale, clamp(config.flowScale, 0.5, 12));
    gl!.uniform1f(fu.uFlowSpeed, clamp(config.flowSpeed, 0, 4));
    gl!.uniform1f(fu.uFlowIntensity, clamp(config.flowIntensity, 0, 4));
    gl!.uniform1f(fu.uEdgeGlow, clamp(config.edgeGlow, 0, 4));
    gl!.uniform1f(fu.uEdgeFalloff, clamp(config.edgeFalloff, 0.02, 0.6));
    gl!.uniform1f(fu.uReveal, clamp(config.reveal, 0, 1));
    gl!.uniform1f(fu.uDissolveScale, clamp(config.dissolveScale, 0.5, 12));
    gl!.uniform1f(fu.uDissolveWidth, clamp(config.dissolveWidth, 0.005, 0.2));
    gl!.uniform1f(fu.uDissolveGlow, clamp(config.dissolveGlow, 0, 12));
    gl!.uniform2fv(fu.uHitPos, hitPos);
    gl!.uniform1fv(fu.uHitTime, hitTime);
    gl!.uniform1f(fu.uRippleSpeed, clamp(config.rippleSpeed, 0.1, 4));
    gl!.uniform1f(fu.uRippleWidth, clamp(config.rippleWidth, 0.01, 0.4));
    gl!.uniform1f(fu.uRippleBlend, clamp(config.rippleBlend, 0, 1));
    gl!.uniform1f(fu.uRippleDuration, clamp(config.rippleDuration, 0.3, 5));
    gl!.uniform1f(fu.uRippleIntensity, clamp(config.rippleIntensity, 0, 8));
    gl!.uniform1f(fu.uRippleMaxRadius, clamp(config.rippleMaxRadius, 0.1, 2));
    gl!.uniform1f(fu.uImpactRadius, clamp(config.impactRadius, 0, 0.5));
    gl!.uniform1f(fu.uRefraction, clamp(config.refraction, 0, 60));
    gl!.uniform1f(fu.uAberration, clamp(config.aberration, 0, 8));
    gl!.uniform1f(fu.uHaze, clamp(config.haze, 0, 2));
    gl!.uniform1f(fu.uPageReact, clamp(config.pageReact, 0, 1));
    gl!.uniform1f(fu.uTint, clamp(config.tint, 0, 1));
    gl!.uniform2f(fu.uMouse, mouseX * dpr, height - mouseY * dpr);
    gl!.uniform1f(fu.uHoverGlow, clamp(config.hoverGlow, 0, 3));
    gl!.uniform1f(fu.uHoverRadius, clamp(config.hoverRadius, 40, 600) * dpr);
    gl!.uniform1f(fu.uHoverCharge, clamp(config.hoverCharge, 0, 2));
    gl!.uniform1f(fu.uHideOnHover, config.hideOnHover ? 1 : 0);
    gl!.uniform1f(fu.uScroll, content.scrollTop * dpr);
    gl!.uniform1f(fu.uDim, clamp(config.dim, 0, 1));
    gl!.uniform1f(fu.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.uniform1f(fu.uPageLum, pageLum);
    drawQuad();

    const bloomOn = config.bloom > 0.001;
    if (bloomOn) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, brightTarget.framebuffer);
      gl!.viewport(0, 0, brightTarget.width, brightTarget.height);
      gl!.useProgram(brightPass.program);
      bindTargetTexture(0, sceneTarget.emissionTexture!);
      gl!.uniform1i(brightPass.uniforms.uScene, 0);
      gl!.uniform1f(
        brightPass.uniforms.uThreshold,
        clamp(config.bloomThreshold, 0, 1),
      );
      drawQuad();

      let src: Target = brightTarget;
      for (let i = 0; i < MIPS; i++) {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, downTargets[i].framebuffer);
        gl!.viewport(0, 0, downTargets[i].width, downTargets[i].height);
        gl!.useProgram(downPass.program);
        bindTargetTexture(0, src.texture);
        gl!.uniform1i(downPass.uniforms.uScene, 0);
        gl!.uniform2f(
          downPass.uniforms.uTexel,
          0.5 / src.width,
          0.5 / src.height,
        );
        drawQuad();
        src = downTargets[i];
      }
      for (let i = MIPS - 1; i >= 0; i--) {
        const base = i === 0 ? brightTarget : downTargets[i - 1];
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, upTargets[i].framebuffer);
        gl!.viewport(0, 0, upTargets[i].width, upTargets[i].height);
        gl!.useProgram(upPass.program);
        bindTargetTexture(0, src.texture);
        gl!.uniform1i(upPass.uniforms.uScene, 0);
        bindTargetTexture(1, base.texture);
        gl!.uniform1i(upPass.uniforms.uBase, 1);
        gl!.uniform2f(upPass.uniforms.uTexel, 1 / src.width, 1 / src.height);
        drawQuad();
        src = upTargets[i];
      }
    }

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, width, height);
    gl!.useProgram(compositePass.program);
    bindTargetTexture(0, sceneTarget.texture);
    gl!.uniform1i(compositePass.uniforms.uScene, 0);
    bindTargetTexture(1, bloomOn ? upTargets[0].texture : sceneTarget.texture);
    gl!.uniform1i(compositePass.uniforms.uBloom, 1);
    gl!.uniform1f(
      compositePass.uniforms.uBloomStrength,
      bloomOn ? clamp(config.bloom, 0, 3) : 0,
    );
    gl!.uniform1f(compositePass.uniforms.uGrain, clamp(config.grain, 0, 1));
    gl!.uniform1f(compositePass.uniforms.uTime, time);
    gl!.uniform1f(compositePass.uniforms.uPageLum, pageLum);
    drawQuad();
  }

  let raf = 0;
  let lastTime = performance.now();
  let lastDraw = 0;
  let lastInput = 0;
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
    if (!reducedMotion) time += delta;
    let ripplesLive = false;
    for (let i = 0; i < MAX_HITS; i++) {
      if (
        hitTime[i] > -900 &&
        time - hitTime[i] < config.rippleDuration + 0.3
      ) {
        ripplesLive = true;
        break;
      }
    }
    const active =
      ripplesLive || now - lastInput < 500 || reducedMotion || contentDirty;
    if (active || now - lastDraw >= 31) {
      render();
      lastDraw = now;
    }
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

  function spawnHit(x: number, y: number) {
    const idx = hitIndex % MAX_HITS;
    hitIndex++;
    hitPos[idx * 2] = x * dpr;
    hitPos[idx * 2 + 1] = output.height - y * dpr - content.scrollTop * dpr;
    hitTime[idx] = time;
    lastInput = performance.now();
    start();
  }

  function onPointerDown(event: PointerEvent) {
    if (!config.clickRipples) return;
    const rect = output.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    spawnHit(x, y);
    config.onHit?.(x, y);
  }

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    const rect = rectCache.current;
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    lastInput = performance.now();
    start();
  }

  function onPointerLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }

  content.addEventListener("pointerdown", onPointerDown);
  content.addEventListener("pointermove", onPointerMove, { passive: true });
  content.addEventListener("pointerleave", onPointerLeave);

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);
  function onScroll() {
    lastInput = performance.now();
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

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
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === "function") continue;
        const prev = config[key as keyof typeof config];
        if (Array.isArray(value) && Array.isArray(prev)) {
          if (
            value.length !== prev.length ||
            value.some((item, i) => item !== prev[i])
          ) {
            changed = true;
            break;
          }
        } else if (prev !== value) {
          changed = true;
          break;
        }
      }
      Object.assign(config, next);
      if (!changed) return;
      syncCanvasSize();
      start();
    },
    impact(x, y) {
      spawnHit(x, y);
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
      content.removeEventListener("scroll", onScroll);
      content.removeEventListener("pointerdown", onPointerDown);
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      gl!.deleteTexture(contentTexture);
      gl!.deleteTexture(sceneTarget.texture);
      if (sceneTarget.emissionTexture)
        gl!.deleteTexture(sceneTarget.emissionTexture);
      gl!.deleteFramebuffer(sceneTarget.framebuffer);
      gl!.deleteTexture(brightTarget.texture);
      gl!.deleteFramebuffer(brightTarget.framebuffer);
      for (const target of [...downTargets, ...upTargets]) {
        gl!.deleteTexture(target.texture);
        gl!.deleteFramebuffer(target.framebuffer);
      }
      for (const pass of [
        fieldPass,
        brightPass,
        downPass,
        upPass,
        compositePass,
      ]) {
        gl!.deleteProgram(pass.program);
        for (const shader of pass.shaders) gl!.deleteShader(shader);
      }
      gl!.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/ForceFieldWebGPU.ts`

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
  type Texture,
} from "vgpu";

export type ForceFieldShape = "hexagon" | "triangle" | "square";

export type ForceFieldGridReveal = "always" | "hover" | "click" | "both";

export interface ForceFieldOptions {
  /** Cell shape of the energy lattice. */
  shape?: ForceFieldShape;
  /** Field color as [r, g, b] in 0-1 range. */
  color?: [number, number, number];
  /** Color of the dissolve edge glow as [r, g, b] in 0-1 range. */
  edgeColor?: [number, number, number];
  /** Overall field opacity (0 to 1). */
  opacity?: number;
  /** Cells across the shorter screen axis (4 to 80). */
  cellScale?: number;
  /** Thickness of the lattice lines (0.005 to 0.2). */
  lineWidth?: number;
  /** Brightness of the lattice grid (0 to 1). */
  gridOpacity?: number;
  /** How the lattice is revealed: always visible, near the cursor, by click ripples, or both. */
  gridReveal?: ForceFieldGridReveal;
  /** Brightness of the revealed lattice in hover/click/both modes (0 to 3). */
  gridRevealStrength?: number;
  /** Radius of the hover reveal in CSS pixels (60 to 800). */
  gridRevealRadius?: number;
  /** Fade smoothness of the reveal edge (0.02 to 1). */
  gridFade?: number;
  /** Random per-cell flash speed (0 to 4). */
  flashSpeed?: number;
  /** Random per-cell flash brightness (0 to 1). */
  flashIntensity?: number;
  /** Scale of the drifting energy noise (0.5 to 12). */
  flowScale?: number;
  /** Drift speed of the energy noise (0 to 4). */
  flowSpeed?: number;
  /** Brightness of the energy noise (0 to 4). */
  flowIntensity?: number;
  /** Glow creeping in from the screen edges, the fresnel analog (0 to 4). */
  edgeGlow?: number;
  /** How far the edge glow reaches into the screen (0.02 to 0.6). */
  edgeFalloff?: number;
  /** Reveal progress. 1 is fully materialized, 0 is gone (noise dissolve). */
  reveal?: number;
  /** Scale of the dissolve noise (0.5 to 12). */
  dissolveScale?: number;
  /** Width of the burning dissolve edge (0.005 to 0.2). */
  dissolveWidth?: number;
  /** Brightness of the dissolve edge (0 to 12). */
  dissolveGlow?: number;
  /** Expansion speed of click ripples in screens per second (0.1 to 4). */
  rippleSpeed?: number;
  /** Ring thickness of click ripples (0.01 to 0.4). */
  rippleWidth?: number;
  /** How softly ripple rings feather into the page, 0 is tight, 1 is airy (0 to 1). */
  rippleBlend?: number;
  /** Lifetime of one ripple in seconds (0.3 to 5). */
  rippleDuration?: number;
  /** Brightness of ripples and impact flashes (0 to 8). */
  rippleIntensity?: number;
  /** Max radius a ripple can reach, in screens (0.1 to 2). */
  rippleMaxRadius?: number;
  /** Radius of the cell flash burst around an impact (0 to 0.5). */
  impactRadius?: number;
  /** How much ripples push the page outward and warp the lattice (0 to 60). */
  refraction?: number;
  /** Chromatic aberration inside refracted rings (0 to 8). */
  aberration?: number;
  /** Living heat-haze shimmer that warps the page beneath the field (0 to 2). */
  haze?: number;
  /** Lattice reacts to the page: cells over bright content glow brighter (0 to 1). */
  pageReact?: number;
  /** Tints the page toward the field color, like looking through the shield (0 to 1). */
  tint?: number;
  /** Glow following the cursor (0 to 3). */
  hoverGlow?: number;
  /** Radius of the cursor glow in CSS pixels (40 to 600). */
  hoverRadius?: number;
  /** Cells light up when the cursor crosses them (0 to 2). */
  hoverCharge?: number;
  /** Fade the field out around the cursor instead of intensifying it. */
  hideOnHover?: boolean;
  /** How much the page dims beneath the field (0 to 1). */
  dim?: number;
  /** Bloom amount applied to bright field energy (0 to 3). */
  bloom?: number;
  /** Bloom brightness cutoff (0 to 1). */
  bloomThreshold?: number;
  /** Animated film grain over the field (0 to 1). */
  grain?: number;
  /** Spawn ripples on click (default true). */
  clickRipples?: boolean;
  /** Called with the impact position in CSS pixels after each click. */
  onHit?: (x: number, y: number) => void;
}

export interface ForceFieldElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGPU effect renders to. */
  output: HTMLCanvasElement;
}

export interface ForceFieldInstance {
  /** Update effect options live. */
  setOptions: (options: ForceFieldOptions) => void;
  /** Spawn a ripple at CSS pixel coordinates relative to the output canvas. */
  impact: (x: number, y: number) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const MAX_HITS = 10;
const MIPS = 4;

const DEFAULTS: Required<Omit<ForceFieldOptions, "onHit">> & {
  onHit: ((x: number, y: number) => void) | null;
} = {
  shape: "hexagon",
  color: [0.15, 0.68, 1],
  edgeColor: [0.5, 0.8, 1],
  opacity: 0.9,
  cellScale: 16,
  lineWidth: 0.03,
  gridOpacity: 0.15,
  gridReveal: "click",
  gridRevealStrength: 1.5,
  gridRevealRadius: 250,
  gridFade: 0.35,
  flashSpeed: 0.6,
  flashIntensity: 0.1,
  flowScale: 3,
  flowSpeed: 0.5,
  flowIntensity: 0,
  edgeGlow: 0.2,
  edgeFalloff: 0.18,
  reveal: 1,
  dissolveScale: 3.5,
  dissolveWidth: 0.05,
  dissolveGlow: 6,
  rippleSpeed: 0.5,
  rippleWidth: 0.045,
  rippleBlend: 1,
  rippleDuration: 1.6,
  rippleIntensity: 0.1,
  rippleMaxRadius: 0.85,
  impactRadius: 0.16,
  refraction: 30,
  aberration: 2.5,
  haze: 0.5,
  pageReact: 0,
  tint: 0.1,
  hoverGlow: 0.25,
  hoverRadius: 350,
  hoverCharge: 1.6,
  hideOnHover: false,
  dim: 0,
  bloom: 1,
  bloomThreshold: 0.3,
  grain: 0.2,
  clickRipples: true,
  onHit: null,
};

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

const FIELD_SHADER = /* wgsl */ `
struct FieldParams {
  hits: array<vec4f, 10>,
  resolution: vec2f,
  color: vec3f,
  edgeColor: vec3f,
  mouse: vec2f,
  time: f32,
  shape: f32,
  opacity: f32,
  cellScale: f32,
  lineWidth: f32,
  gridOpacity: f32,
  gridRevealMode: f32,
  gridRevealStrength: f32,
  gridRevealRadius: f32,
  gridFade: f32,
  flashSpeed: f32,
  flashIntensity: f32,
  flowScale: f32,
  flowSpeed: f32,
  flowIntensity: f32,
  edgeGlow: f32,
  edgeFalloff: f32,
  reveal: f32,
  dissolveScale: f32,
  dissolveWidth: f32,
  dissolveGlow: f32,
  rippleSpeed: f32,
  rippleWidth: f32,
  rippleDuration: f32,
  rippleIntensity: f32,
  rippleMaxRadius: f32,
  impactRadius: f32,
  rippleBlend: f32,
  refraction: f32,
  aberration: f32,
  hoverGlow: f32,
  hoverRadius: f32,
  hoverCharge: f32,
  hideOnHover: f32,
  scroll: f32,
  haze: f32,
  pageReact: f32,
  tint: f32,
  dim: f32,
  hasContent: f32,
  pageLum: f32,
}

struct FieldOut {
  @location(0) color: vec4f,
  @location(1) emission: vec4f,
}

@group(0) @binding(0) var<uniform> params: FieldParams;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

fn mod289v3(x: vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289v4(x: vec4f) -> vec4f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute(x: vec4f) -> vec4f { return mod289v4(((x * 34.0) + 1.0) * x); }
fn taylorInvSqrt(r: vec4f) -> vec4f { return 1.79284291400159 - 0.85373472095314 * r; }

fn snoise(v: vec3f) -> f32 {
  let C = vec2f(1.0 / 6.0, 1.0 / 3.0);
  let D = vec4f(0.0, 0.5, 1.0, 2.0);
  var i = floor(v + dot(v, C.yyy));
  let x0 = v - i + dot(i, C.xxx);
  let g = step(x0.yzx, x0.xyz);
  let l = 1.0 - g;
  let i1 = min(g.xyz, l.zxy);
  let i2 = max(g.xyz, l.zxy);
  let x1 = x0 - i1 + C.xxx;
  let x2 = x0 - i2 + C.yyy;
  let x3 = x0 - D.yyy;
  i = mod289v3(i);
  let p = permute(permute(permute(
    i.z + vec4f(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4f(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4f(0.0, i1.x, i2.x, 1.0));
  let n_ = 0.142857142857;
  let ns = n_ * D.wyz - D.xzx;
  let j = p - 49.0 * floor(p * ns.z * ns.z);
  let x_ = floor(j * ns.z);
  let y_ = floor(j - 7.0 * x_);
  let x = x_ * ns.x + ns.yyyy;
  let y = y_ * ns.x + ns.yyyy;
  let h = 1.0 - abs(x) - abs(y);
  let b0 = vec4f(x.xy, y.xy);
  let b1 = vec4f(x.zw, y.zw);
  let s0 = floor(b0) * 2.0 + 1.0;
  let s1 = floor(b1) * 2.0 + 1.0;
  let sh = -step(h, vec4f(0.0));
  let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  let a1 = b1.xzyw + s1.xzyw * sh.zzww;
  var p0 = vec3f(a0.xy, h.x);
  var p1 = vec3f(a0.zw, h.y);
  var p2 = vec3f(a1.xy, h.z);
  var p3 = vec3f(a1.zw, h.w);
  let norm = taylorInvSqrt(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  var m = max(0.6 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
  m = m * m;
  return 42.0 * dot(m * m, vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

fn hash21(pIn: vec2f) -> f32 {
  var p = fract(pIn * vec2f(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

fn hexCell(p: vec2f) -> vec4f {
  let s = vec2f(1.0, 1.7320508);
  let hC = floor(vec4f(p, p - vec2f(0.5, 1.0)) / s.xyxy) + 0.5;
  let h = vec4f(p - hC.xy * s, p - (hC.zw + 0.5) * s);
  let first = dot(h.xy, h.xy) < dot(h.zw, h.zw);
  let local = select(h.zw, h.xy, first);
  let id = select(hC.zw + 0.5, hC.xy, first);
  let cell = abs(local);
  let d = max(dot(cell, s * 0.5), cell.x);
  return vec4f(d, 0.5, id);
}

fn triCell(p: vec2f) -> vec4f {
  let l = vec2f(p.x - p.y * 0.57735027, p.y * 1.15470054);
  let id = floor(l);
  let f = l - id;
  let upper = step(1.0, f.x + f.y);
  var w = vec2f(f.x + f.y * 0.5, f.y * 0.8660254);
  w = mix(w, vec2f(1.5, 0.8660254) - w, upper);
  let d = min(
    w.y,
    min(
      dot(w, vec2f(0.8660254, -0.5)),
      dot(w - vec2f(1.0, 0.0), vec2f(-0.8660254, -0.5))
    )
  );
  return vec4f(0.2886751 - d, 0.2886751, id * 2.0 + vec2f(upper, 0.0));
}

fn squareCell(p: vec2f) -> vec4f {
  let id = floor(p);
  let f = fract(p) - 0.5;
  let a = abs(f);
  let d = max(a.x, a.y);
  return vec4f(d, 0.5, id);
}

fn cellInfo(p: vec2f) -> vec4f {
  if (params.shape < 0.5) { return hexCell(p); }
  if (params.shape < 1.5) { return triCell(p); }
  return squareCell(p);
}

fn cellFlash(id: vec2f) -> f32 {
  let rnd = hash21(id);
  let phase = rnd * 6.2831;
  let speed = 0.5 + rnd * 1.5;
  return smoothstep(0.6, 1.0, sin(params.time * params.flashSpeed * speed + phase)) * params.flashIntensity;
}

@fragment fn fs_main(@location(0) inUv: vec2f) -> FieldOut {
  let screenUv = vec2f(inUv.x, 1.0 - inUv.y);
  let frag = screenUv * params.resolution;
  let minAxis = min(params.resolution.x, params.resolution.y);
  let pageFrag = vec2f(frag.x, frag.y - params.scroll);
  let st = pageFrag / minAxis;

  var revealMask = 1.0;
  var dissolveEdge = 0.0;
  if (params.reveal < 0.999) {
    let dissolve = snoise(vec3f(st * params.dissolveScale, 3.7)) * 0.5 + 0.5;
    let revealGate = params.reveal * (1.0 + params.dissolveWidth * 2.0) - params.dissolveWidth;
    revealMask = smoothstep(revealGate - params.dissolveWidth, revealGate, 1.0 - dissolve);
    revealMask = 1.0 - revealMask;
    let edgeLow = smoothstep(revealGate - params.dissolveWidth, revealGate - params.dissolveWidth * 0.2, 1.0 - dissolve);
    let edgeHigh = smoothstep(revealGate - params.dissolveWidth * 0.15, revealGate, 1.0 - dissolve);
    dissolveEdge = edgeLow * (1.0 - edgeHigh) * step(0.001, params.reveal);
  }

  var ringContrib = 0.0;
  var impactBoost = 0.0;
  var pushVec = vec2f(0.0);
  let sigma = params.rippleWidth * mix(0.6, 2.6, params.rippleBlend);
  for (var i = 0u; i < 10u; i++) {
    let hit = params.hits[i];
    let elapsed = params.time - hit.z;
    let isActive = step(0.0, hit.z) * step(0.0, elapsed) * step(elapsed, params.rippleDuration);
    if (isActive < 0.5) { continue; }
    let toHit = (pageFrag - hit.xy) / minAxis;
    let dist = length(toHit);
    let ringR = min(elapsed * params.rippleSpeed, params.rippleMaxRadius);
    let noiseD = snoise(vec3f(st * 5.0, elapsed * 2.0 + f32(i))) * 0.03 * (1.0 - params.rippleBlend * 0.7);
    let band = dist + noiseD - ringR;
    let g = exp(-band * band / (2.0 * sigma * sigma));
    var fade = 1.0 - smoothstep(params.rippleDuration * 0.4, params.rippleDuration, elapsed);
    fade *= fade;
    let radialFade = 1.0 - smoothstep(params.rippleMaxRadius * 0.75, params.rippleMaxRadius, ringR);
    let contrib = g * fade * radialFade;
    ringContrib += contrib;
    let zone = smoothstep(params.impactRadius, 0.0, dist);
    let zoneFade = 1.0 - smoothstep(0.0, params.rippleDuration * 0.35, elapsed);
    impactBoost += zone * zoneFade;
    let dir = select(vec2f(0.0), toHit / dist, dist > 0.0001);
    let core = smoothstep(0.0, sigma * 2.5, dist) * smoothstep(0.0, sigma * 1.5, ringR);
    pushVec += dir * g * fade * radialFade * core;
  }
  ringContrib = min(ringContrib, 1.5);
  impactBoost = min(impactBoost, 1.0);

  let fieldSt = st - pushVec * (params.refraction * 1.4 / minAxis);
  let info = cellInfo(fieldSt * params.cellScale);
  let lineDist = info.x;
  let halfSize = info.y;
  let cellId = info.zw;
  let line = smoothstep(halfSize - params.lineWidth, halfSize, lineDist);
  let flash = cellFlash(cellId);

  var flowNoise = 0.0;
  var hazeVec = vec2f(0.0);
  if (params.flowIntensity > 0.001 || params.haze > 0.001) {
    let t = params.time * params.flowSpeed;
    let fn1 = snoise(vec3f(st * params.flowScale, t * 0.5));
    let fn2 = snoise(vec3f(st * params.flowScale * 2.1 + 7.3, -t * 0.35));
    flowNoise = (fn1 * 0.6 + fn2 * 0.4) * 0.5 + 0.5;
    hazeVec = vec2f(fn1, fn2) * params.haze;
  }

  let bp = min(frag, params.resolution - frag) / minAxis;
  let rr = max(params.edgeFalloff, 0.02);
  let hmix = clamp(0.5 + 0.5 * (bp.y - bp.x) / rr, 0.0, 1.0);
  let edgeDist = mix(bp.y, bp.x, hmix) - rr * hmix * (1.0 - hmix);
  let fresnel = pow(1.0 - smoothstep(0.0, params.edgeFalloff, edgeDist), 1.6) * params.edgeGlow;

  let pageMouse = vec2f(params.mouse.x, params.mouse.y - params.scroll);
  let mouseSt = pageMouse / minAxis;
  let mouseD = distance(pageFrag, pageMouse);
  var hover = exp(-mouseD * mouseD / (params.hoverRadius * params.hoverRadius * 0.5)) * params.hoverGlow;
  let hoverCell = cellInfo(mouseSt * params.cellScale).zw;
  let sameCell = 1.0 - step(0.5, distance(hoverCell, cellId));
  var charge = sameCell * params.hoverCharge;
  hover *= 1.0 - params.hideOnHover;
  charge *= 1.0 - params.hideOnHover;

  let revealHover = select(0.0, 1.0, params.gridRevealMode == 1.0 || params.gridRevealMode == 3.0);
  let revealClick = select(0.0, 1.0, params.gridRevealMode == 2.0 || params.gridRevealMode == 3.0);
  let allowHover = max(revealHover, select(0.0, 1.0, params.gridRevealMode == 0.0));
  charge *= allowHover;
  var hoverMask = 1.0 - smoothstep(params.gridRevealRadius * (1.0 - params.gridFade), params.gridRevealRadius, mouseD);
  hoverMask *= 1.0 - params.hideOnHover;
  let gridBoost = (revealHover * hoverMask + revealClick * impactBoost) * params.gridRevealStrength;

  let gridEnergy = line * (params.gridOpacity + gridBoost + charge + flash + ringContrib * params.rippleIntensity * 5.0);
  var energy = gridEnergy * (0.35 + fresnel * 0.4)
    + fresnel * 0.5
    + flash * 0.5
    + flowNoise * params.flowIntensity * (0.12 + fresnel * 0.25 + line * 0.15)
    + hover * (0.25 + line * 0.75 * allowHover)
    + ringContrib * params.rippleIntensity;

  let hide = 1.0 - params.hideOnHover * (1.0 - smoothstep(params.hoverRadius * 0.35, params.hoverRadius * 1.4, mouseD));

  let warp = (-pushVec * params.refraction * 0.7 + hazeVec * 6.0) * revealMask * hide;
  let refr = warp;
  let texel = 1.0 / params.resolution;
  let baseUv = clamp(inUv + refr * texel * vec2f(1.0, -1.0), vec2f(0.0), vec2f(1.0));
  var content: vec4f;
  if (params.hasContent > 0.5) {
    content = textureSampleLevel(uContent, uSampler, baseUv, 0.0);
    let ab = params.aberration * min(length(warp), 24.0) / 24.0;
    if (ab > 0.01) {
      let abOff = normalize(warp + vec2f(1e-5)) * ab * texel * 3.0;
      content.r = textureSampleLevel(uContent, uSampler, clamp(baseUv + abOff, vec2f(0.0), vec2f(1.0)), 0.0).r;
      content.b = textureSampleLevel(uContent, uSampler, clamp(baseUv - abOff, vec2f(0.0), vec2f(1.0)), 0.0).b;
    }
    if (params.pageReact > 0.001) {
      let pageL = dot(content.rgb, vec3f(0.2126, 0.7152, 0.0722));
      energy *= mix(1.0, 0.3 + pageL * 1.6, params.pageReact * revealMask);
    }
  } else {
    content = vec4f(0.0);
  }

  energy *= revealMask * hide;

  let dimEff = params.dim * revealMask * (1.0 - hover * 0.5);
  var col = content.rgb * (1.0 - dimEff);
  if (params.tint > 0.001) {
    let membrane = params.color / max(max(params.color.r, max(params.color.g, params.color.b)), 0.001);
    col *= mix(vec3f(1.0), membrane * 0.92 + 0.08, params.tint * revealMask);
  }

  let fieldGlow = params.color * energy * params.opacity;
  let dissolveGlow = params.edgeColor * dissolveEdge * params.dissolveGlow * hide;

  let dark = 1.0 - params.pageLum;
  let darkMix = clamp(dark * 1.4 - 0.2, 0.0, 1.0);
  let rawAdd = fieldGlow + dissolveGlow;
  let additive = rawAdd / (1.0 + 0.45 * max(max(rawAdd.r, rawAdd.g), rawAdd.b));
  let aMax = max(max(additive.r, additive.g), additive.b);
  let inked = col * exp(-(vec3f(aMax) - additive) * 1.7) * (1.0 - 0.18 * min(aMax, 1.0));
  col = mix(inked, col + additive, darkMix);

  let alpha = max(content.a, clamp(energy * params.opacity + dissolveEdge, 0.0, 1.0));
  col = clamp(col, vec3f(0.0), vec3f(max(alpha, 0.001)));
  var out: FieldOut;
  out.color = vec4f(col, alpha);
  out.emission = vec4f(rawAdd, 1.0);
  return out;
}`;

const BRIGHT_SHADER = /* wgsl */ `
struct BrightParams {
  threshold: f32,
}

@group(0) @binding(0) var<uniform> params: BrightParams;
@group(0) @binding(1) var uScene: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let c = textureSampleLevel(uScene, uSampler, uv, 0.0);
  let lum = dot(c.rgb, vec3f(0.2126, 0.7152, 0.0722));
  let gate = smoothstep(params.threshold, params.threshold + 0.25, lum);
  return vec4f(c.rgb * gate, 1.0);
}`;

const KAWASE_DOWN_SHADER = /* wgsl */ `
struct BlurParams {
  texel: vec2f,
}

@group(0) @binding(0) var<uniform> params: BlurParams;
@group(0) @binding(1) var uScene: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let o = params.texel;
  var sum = textureSampleLevel(uScene, uSampler, uv, 0.0) * 4.0;
  sum += textureSampleLevel(uScene, uSampler, uv - o, 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv + o, 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(o.x, -o.y), 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv - vec2f(o.x, -o.y), 0.0);
  return sum * 0.125;
}`;

const KAWASE_UP_SHADER = /* wgsl */ `
struct BlurParams {
  texel: vec2f,
}

@group(0) @binding(0) var<uniform> params: BlurParams;
@group(0) @binding(1) var uScene: texture_2d<f32>;
@group(0) @binding(2) var uBase: texture_2d<f32>;
@group(0) @binding(3) var uSampler: sampler;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let o = params.texel;
  var sum = textureSampleLevel(uScene, uSampler, uv + vec2f(-o.x * 2.0, 0.0), 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(-o.x, o.y), 0.0) * 2.0;
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(0.0, o.y * 2.0), 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(o.x, o.y), 0.0) * 2.0;
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(o.x * 2.0, 0.0), 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(o.x, -o.y), 0.0) * 2.0;
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(0.0, -o.y * 2.0), 0.0);
  sum += textureSampleLevel(uScene, uSampler, uv + vec2f(-o.x, -o.y), 0.0) * 2.0;
  let base = textureSampleLevel(uBase, uSampler, uv, 0.0);
  return mix(base, sum / 12.0, 0.62);
}`;

const COMPOSITE_SHADER = /* wgsl */ `
struct CompositeParams {
  resolution: vec2f,
  bloomStrength: f32,
  grain: f32,
  time: f32,
  pageLum: f32,
}

@group(0) @binding(0) var<uniform> params: CompositeParams;
@group(0) @binding(1) var uScene: texture_2d<f32>;
@group(0) @binding(2) var uBloom: texture_2d<f32>;
@group(0) @binding(3) var uSampler: sampler;

fn grainNoise(p: vec2f, t: f32) -> f32 {
  var v = fract(vec3f(p.xyx) * vec3f(443.897, 441.423, 437.195) + t);
  v += dot(v, v.yzx + 19.19);
  return fract((v.x + v.y) * v.z) - 0.5;
}

@fragment fn fs_main(@location(0) uv: vec2f, @builtin(position) pos: vec4f) -> @location(0) vec4f {
  let scene = textureSampleLevel(uScene, uSampler, uv, 0.0);
  let bloom = textureSampleLevel(uBloom, uSampler, uv, 0.0).rgb * params.bloomStrength;
  let darkMix = clamp((1.0 - params.pageLum) * 1.4 - 0.2, 0.0, 1.0);
  let bMax = max(max(bloom.r, bloom.g), bloom.b);
  let inked = scene.rgb * exp(-(vec3f(bMax) - bloom) * 1.1) * (1.0 - 0.1 * min(bMax, 1.0));
  var col = mix(inked, scene.rgb + bloom, darkMix);
  let bloomLum = dot(bloom, vec3f(0.2126, 0.7152, 0.0722));
  let alpha = clamp(scene.a + bloomLum, 0.0, 1.0);
  let g = grainNoise(vec2f(pos.x, params.resolution.y - pos.y), fract(params.time) + 0.1);
  col += g * params.grain * (0.15 + alpha * 0.25);
  col = clamp(col, vec3f(0.0), vec3f(max(alpha, 0.001)));
  return vec4f(col, alpha);
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

/** One WebGPU device per page, shared by every ForceField instance. */
function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

const SHAPE_INDEX: Record<ForceFieldShape, number> = {
  hexagon: 0,
  triangle: 1,
  square: 2,
};

const REVEAL_INDEX: Record<ForceFieldGridReveal, number> = {
  always: 0,
  hover: 1,
  click: 2,
  both: 3,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function destroyTarget(t: Target | null) {
  (t as unknown as { destroy?: () => void } | null)?.destroy?.();
}

export function createForceField(
  elements: ForceFieldElements,
  options: ForceFieldOptions = {},
): ForceFieldInstance | null {
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

  let gpu: Gpu | null = null;
  let screen: Surface | null = null;
  let fieldFx: Effect | null = null;
  let brightFx: Effect | null = null;
  let downFx: Effect | null = null;
  let upFx: Effect | null = null;
  let compositeFx: Effect | null = null;
  let sceneTarget: Target | null = null;
  let brightTarget: Target | null = null;
  const downTargets: Target[] = [];
  const upTargets: Target[] = [];
  let contentTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;
  let contentDirty = false;
  let pageLum = 0;
  let wake = () => {};

  function readPageLum(): number {
    try {
      const probe = document.createElement("canvas");
      probe.width = probe.height = 1;
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      if (!pctx) return 0;
      let el: Element | null = content;
      while (el instanceof Element) {
        const bgColor = getComputedStyle(el).backgroundColor;
        if (bgColor && bgColor !== "transparent") {
          pctx.clearRect(0, 0, 1, 1);
          pctx.fillStyle = bgColor;
          pctx.fillRect(0, 0, 1, 1);
          const d = pctx.getImageData(0, 0, 1, 1).data;
          if (d[3] > 128) {
            return (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
          }
        }
        el = el.parentElement;
      }
    } catch {}
    return 0;
  }

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

  const hitData: [number, number, number, number][] = Array.from(
    { length: MAX_HITS },
    () => [0, 0, -999, 0],
  );
  let hitIndex = 0;
  let mouseX = -9999;
  let mouseY = -9999;
  let dpr = 1;

  function resizeGpuTargets(width: number, height: number) {
    if (!sceneTarget || !brightTarget) return;
    if (sceneTarget.size[0] !== width || sceneTarget.size[1] !== height) {
      sceneTarget.resize([width, height]);
    }
    let bw = Math.max(1, width >> 1);
    let bh = Math.max(1, height >> 1);
    if (brightTarget.size[0] !== bw || brightTarget.size[1] !== bh) {
      brightTarget.resize([bw, bh]);
    }
    for (let i = 0; i < MIPS; i++) {
      bw = Math.max(1, bw >> 1);
      bh = Math.max(1, bh >> 1);
      const down = downTargets[i];
      if (down.size[0] !== bw || down.size[1] !== bh) down.resize([bw, bh]);
    }
    for (let i = MIPS - 1; i >= 0; i--) {
      const up = i === 0 ? brightTarget : downTargets[i - 1];
      const targetUp = upTargets[i];
      if (targetUp.size[0] !== up.size[0] || targetUp.size[1] !== up.size[1]) {
        targetUp.resize([up.size[0], up.size[1]]);
      }
    }
  }

  function syncCanvasSize() {
    dpr = getCanvasPixelRatio(output);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (screen) {
      const [w, h] = screen.size;
      if (w !== width || h !== height) screen.resize([width, height]);
    } else if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    resizeGpuTargets(width, height);
    if (htmlInCanvas) {
      const sourceWidth = Math.max(1, Math.round(source.clientWidth * dpr));
      const sourceHeight = Math.max(1, Math.round(source.clientHeight * dpr));
      if (
        source.width !== sourceWidth ||
        source.height !== sourceHeight
      ) {
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
        label: "force-field.content",
      });
    }
    return contentTexture;
  }

  function uploadContent() {
    if (!htmlInCanvas || !contentDirty || !gpu) return;
    contentDirty = false;
    pageLum = readPageLum();
    const texture = ensureContentTexture();
    gpu.gpu.queue.copyExternalImageToTexture(
      { source },
      { texture: texture.gpu },
      [source.width, source.height],
    );
    fieldFx?.set({ uContent: texture });
    sourceCtx!.clearRect(0, 0, source.width, source.height);
  }

  function renderFallback() {
    if (!fallback2d || !htmlInCanvas || !contentDirty) return;
    contentDirty = false;
    fallback2d.clearRect(0, 0, output.width, output.height);
    fallback2d.drawImage(source, 0, 0, output.width, output.height);
    sourceCtx!.clearRect(0, 0, source.width, source.height);
  }

  let time = 3.7;

  function render() {
    if (
      !gpu ||
      !screen ||
      !fieldFx ||
      !brightFx ||
      !downFx ||
      !upFx ||
      !compositeFx ||
      !sceneTarget ||
      !brightTarget
    )
      return;
    uploadContent();
    const width = output.width;
    const height = output.height;

    fieldFx.set({
      params: {
        hits: hitData,
        resolution: [width, height],
        time,
        shape: SHAPE_INDEX[config.shape] ?? 0,
        color: config.color,
        edgeColor: config.edgeColor,
        opacity: clamp(config.opacity, 0, 1),
        cellScale: clamp(config.cellScale, 4, 80),
        lineWidth: clamp(config.lineWidth, 0.005, 0.2),
        gridOpacity: clamp(config.gridOpacity, 0, 1),
        gridRevealMode: REVEAL_INDEX[config.gridReveal] ?? 2,
        gridRevealStrength: clamp(config.gridRevealStrength, 0, 3),
        gridRevealRadius: clamp(config.gridRevealRadius, 60, 800) * dpr,
        gridFade: clamp(config.gridFade, 0.02, 1),
        flashSpeed: clamp(config.flashSpeed, 0, 4),
        flashIntensity: clamp(config.flashIntensity, 0, 1),
        flowScale: clamp(config.flowScale, 0.5, 12),
        flowSpeed: clamp(config.flowSpeed, 0, 4),
        flowIntensity: clamp(config.flowIntensity, 0, 4),
        edgeGlow: clamp(config.edgeGlow, 0, 4),
        edgeFalloff: clamp(config.edgeFalloff, 0.02, 0.6),
        reveal: clamp(config.reveal, 0, 1),
        dissolveScale: clamp(config.dissolveScale, 0.5, 12),
        dissolveWidth: clamp(config.dissolveWidth, 0.005, 0.2),
        dissolveGlow: clamp(config.dissolveGlow, 0, 12),
        rippleSpeed: clamp(config.rippleSpeed, 0.1, 4),
        rippleWidth: clamp(config.rippleWidth, 0.01, 0.4),
        rippleBlend: clamp(config.rippleBlend, 0, 1),
        rippleDuration: clamp(config.rippleDuration, 0.3, 5),
        rippleIntensity: clamp(config.rippleIntensity, 0, 8),
        rippleMaxRadius: clamp(config.rippleMaxRadius, 0.1, 2),
        impactRadius: clamp(config.impactRadius, 0, 0.5),
        refraction: clamp(config.refraction, 0, 60),
        aberration: clamp(config.aberration, 0, 8),
        haze: clamp(config.haze, 0, 2),
        pageReact: clamp(config.pageReact, 0, 1),
        tint: clamp(config.tint, 0, 1),
        mouse: [mouseX * dpr, height - mouseY * dpr],
        hoverGlow: clamp(config.hoverGlow, 0, 3),
        hoverRadius: clamp(config.hoverRadius, 40, 600) * dpr,
        hoverCharge: clamp(config.hoverCharge, 0, 2),
        hideOnHover: config.hideOnHover ? 1 : 0,
        scroll: content.scrollTop * dpr,
        dim: clamp(config.dim, 0, 1),
        hasContent: htmlInCanvas ? 1 : 0,
        pageLum,
      },
    });
    const bloomOn = config.bloom > 0.001;
    gpuFrame(gpu, (f) => {
      f.pass(sceneTarget!, fieldFx!);

      if (bloomOn) {
        brightFx!.set({
          uScene: sceneTarget!.colors[1],
          params: { threshold: clamp(config.bloomThreshold, 0, 1) },
        });
        f.pass(brightTarget!, brightFx!);

        let src: Target = brightTarget!;
        for (let i = 0; i < MIPS; i++) {
          const dst = downTargets[i];
          downFx!.set({
            uScene: src,
            params: { texel: [0.5 / src.size[0], 0.5 / src.size[1]] },
          });
          f.pass(dst, downFx!);
          src = dst;
        }
        for (let i = MIPS - 1; i >= 0; i--) {
          const base = i === 0 ? brightTarget! : downTargets[i - 1];
          const dst = upTargets[i];
          upFx!.set({
            uScene: src,
            uBase: base,
            params: { texel: [1 / src.size[0], 1 / src.size[1]] },
          });
          f.pass(dst, upFx!);
          src = dst;
        }
      }

      compositeFx!.set({
        uScene: sceneTarget!,
        uBloom: bloomOn ? upTargets[0] : sceneTarget!,
        params: {
          resolution: [width, height],
          bloomStrength: bloomOn ? clamp(config.bloom, 0, 3) : 0,
          grain: clamp(config.grain, 0, 1),
          time,
          pageLum,
        },
      });
      f.pass(screen!, compositeFx!);
    });
  }

  let raf = 0;
  let lastTime = performance.now();
  let lastDraw = 0;
  let lastInput = 0;
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
    if (!reducedMotion) time += delta;
    let ripplesLive = false;
    for (let i = 0; i < MAX_HITS; i++) {
      if (
        hitData[i][2] > -900 &&
        time - hitData[i][2] < config.rippleDuration + 0.3
      ) {
        ripplesLive = true;
        break;
      }
    }
    const active =
      ripplesLive || now - lastInput < 500 || reducedMotion || contentDirty;
    if (active || now - lastDraw >= 31) {
      render();
      lastDraw = now;
    }
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
        label: "force-field",
      });
      sceneTarget = target(gpu, {
        size: [Math.max(1, output.width), Math.max(1, output.height)],
        colors: [{ format: "rgba8unorm" }, { format: "rgba16float" }],
        label: "force-field.scene",
      });
      brightTarget = target(gpu, {
        size: [2, 2],
        format: "rgba16float",
        label: "force-field.bright",
      });
      for (let i = 0; i < MIPS; i++) {
        downTargets.push(
          target(gpu, {
            size: [2, 2],
            format: "rgba16float",
            label: `force-field.down-${i}`,
          }),
        );
        upTargets.push(
          target(gpu, {
            size: [2, 2],
            format: "rgba16float",
            label: `force-field.up-${i}`,
          }),
        );
      }
      const linear = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      fieldFx = effect(gpu, FIELD_SHADER, {
        label: "force-field.field",
        set: { uSampler: linear, uContent: ensureContentTexture() },
      });
      brightFx = effect(gpu, BRIGHT_SHADER, {
        label: "force-field.bright",
        set: { uSampler: linear },
      });
      downFx = effect(gpu, KAWASE_DOWN_SHADER, {
        label: "force-field.down",
        set: { uSampler: linear },
      });
      upFx = effect(gpu, KAWASE_UP_SHADER, {
        label: "force-field.up",
        set: { uSampler: linear },
      });
      compositeFx = effect(gpu, COMPOSITE_SHADER, {
        label: "force-field.composite",
        set: { uSampler: linear },
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn(
        "ForceField: WebGPU unavailable, showing content without the effect.",
        error,
      );
      fallback2d = output.getContext("2d");
      contentDirty = true;
      start();
    });

  function spawnHit(x: number, y: number) {
    const idx = hitIndex % MAX_HITS;
    hitIndex++;
    hitData[idx][0] = x * dpr;
    hitData[idx][1] = output.height - y * dpr - content.scrollTop * dpr;
    hitData[idx][2] = time;
    lastInput = performance.now();
    start();
  }

  function onPointerDown(event: PointerEvent) {
    if (!config.clickRipples) return;
    const rect = output.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    spawnHit(x, y);
    config.onHit?.(x, y);
  }

  const rectCache = createRectCache(output);

  function onPointerMove(event: PointerEvent) {
    const rect = rectCache.current;
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    lastInput = performance.now();
    start();
  }

  function onPointerLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }

  content.addEventListener("pointerdown", onPointerDown);
  content.addEventListener("pointermove", onPointerMove, { passive: true });
  content.addEventListener("pointerleave", onPointerLeave);

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);

  function onScroll() {
    lastInput = performance.now();
    start();
  }
  content.addEventListener("scroll", onScroll, { passive: true });

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
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === "function") continue;
        const prev = config[key as keyof typeof config];
        if (Array.isArray(value) && Array.isArray(prev)) {
          if (
            value.length !== prev.length ||
            value.some((item, i) => item !== prev[i])
          ) {
            changed = true;
            break;
          }
        } else if (prev !== value) {
          changed = true;
          break;
        }
      }
      Object.assign(config, next);
      if (!changed) return;
      syncCanvasSize();
      start();
    },
    impact(x, y) {
      spawnHit(x, y);
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
      content.removeEventListener("scroll", onScroll);
      content.removeEventListener("pointerdown", onPointerDown);
      content.removeEventListener("pointermove", onPointerMove);
      content.removeEventListener("pointerleave", onPointerLeave);
      contentTexture?.destroy();
      destroyTarget(sceneTarget);
      destroyTarget(brightTarget);
      for (const target of [...downTargets, ...upTargets]) destroyTarget(target);
      screen?.dispose();
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

