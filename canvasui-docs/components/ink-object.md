# InkObject (Vanilla)

- Docs: https://canvasui.dev/docs/components/ink-object
- Registry: https://canvasui.dev/r/ink-object-vanilla.json (WebGL), https://canvasui.dev/r/ink-object-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/ink-object-vanilla`

## What it does

Renders any GLB/glTF model, SVG, or image in a floating studio scene as hand-pressed ink strokes that break into dashes as the tone lightens, with ragged bleed and dry-brush grain. Built on three.js.

## Dependencies

- three

## Source (vanilla): `components/canvasui/InkObjectVanilla.ts`

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

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface InkObjectOptions {
  /** URL of the asset to display: GLB/glTF, SVG, PNG, JPEG, WebP, or GIF. Object URLs from a file input work too. The format is sniffed from the bytes, not the extension. */
  src?: string;
  /** Enable the ink pass. Turn off to see the raw render. */
  ink?: boolean;
  /** Color of the ink strokes. */
  inkColor?: string;
  /** Distance between stroke centers in CSS pixels. */
  lineSpacing?: number;
  /** Thickness of the strokes relative to the line spacing (0 to 1.5). */
  strokeWeight?: number;
  /** Angle of the stroke lines in degrees. */
  angle?: number;
  /** Length scale of the dash breakup along each stroke, in CSS pixels. */
  dashLength?: number;
  /** How aggressively strokes break into dashes as the tone lightens (0 keeps solid lines). */
  variation?: number;
  /** Ragged ink bleed along the stroke edges (0 to 1). */
  bleed?: number;
  /** Dry-brush speckle eaten out of the ink (0 to 1). */
  grain?: number;
  /** Hand-pressed waviness of the stroke lines (0 to 1). */
  wobble?: number;
  /** How far the stroke lines ride the surface height read from the depth buffer, so they wrap a 3D form. Flat art is unaffected. */
  relief?: number;
  /** Extrusion depth of 2D assets (SVG or image) as a fraction of their longest side. */
  depth?: number;
  /** Slope of the tone-to-ink ramp. Higher crushes midtones into solid black or bare paper. */
  contrast?: number;
  /** Tone that lands at half ink coverage. Raise it to ink only the darkest areas. */
  threshold?: number;
  /** Softness of the stroke edges (0 is a hard letterpress edge). */
  softness?: number;
  /** Ink the light areas instead of the dark ones. */
  invert?: boolean;
  /** Paper color behind the ink. Empty string keeps the canvas transparent. */
  background?: string;
  /** Accent color of the ring light in the studio environment. */
  highlight?: string;
  /** Brightness of the studio environment lighting. */
  environmentIntensity?: number;
  /** Roughness override applied to every material (0 to 1). Negative keeps the asset's own values. */
  roughness?: number;
  /** Size of the longest side of the object in scene units. The camera sits about 4 units away. */
  scale?: number;
  /** Horizontal offset of the object in scene units. */
  xOffset?: number;
  /** Vertical offset of the object in scene units. */
  yOffset?: number;
  /** Strength of the floating bob animation (0 disables). */
  floatIntensity?: number;
  /** Strength of the idle rocking rotation (0 disables). */
  rotationIntensity?: number;
  /** Speed of the float and rocking animation. */
  floatSpeed?: number;
  /** Let the user orbit the camera by dragging. */
  orbit?: boolean;
  /** Let the user zoom with the scroll wheel or pinch. */
  zoom?: boolean;
  /** Spin the camera around the object turntable-style. */
  autoRotate?: boolean;
  /** Turntable speed when autoRotate is on. */
  autoRotateSpeed?: number;
  /** Camera field of view in degrees. */
  fov?: number;
  /** Camera distance from the center of the object. */
  cameraDistance?: number;
  /** Base URL of the Draco decoder, fetched only when a model needs it. */
  dracoDecoderPath?: string;
  /** Called after an asset finishes loading. */
  onLoad?: (() => void) | null;
  /** Called when an asset fails to load. */
  onError?: ((error: unknown) => void) | null;
}

export interface InkObjectElements {
  /** Canvas the scene renders to. */
  canvas: HTMLCanvasElement;
}

export interface InkObjectInstance {
  /** Update options live. Changing src loads the new asset. */
  setOptions: (options: InkObjectOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<InkObjectOptions> = {
  src: "",
  ink: true,
  inkColor: "#111111",
  lineSpacing: 8,
  strokeWeight: 1,
  angle: 0,
  dashLength: 14,
  variation: 1,
  bleed: 0.35,
  grain: 0.32,
  wobble: 0.3,
  relief: 0.5,
  depth: 0.08,
  contrast: 2.2,
  threshold: 0.2,
  softness: 0.4,
  invert: false,
  background: "",
  highlight: "#066aff",
  environmentIntensity: 0.5,
  roughness: 0.35,
  scale: 3,
  xOffset: 0,
  yOffset: 0,
  floatIntensity: 0,
  rotationIntensity: 0,
  floatSpeed: 2,
  orbit: true,
  zoom: false,
  autoRotate: false,
  autoRotateSpeed: 2,
  fov: 65,
  cameraDistance: 4.2,
  dracoDecoderPath: "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  onLoad: null,
  onError: null,
};

const POST_VERT = `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const POST_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform vec2 uDir;
uniform float uPixelRatio;
uniform float uCamNear;
uniform float uCamFar;
uniform float uHeightCenter;
uniform float uHeightSpan;
uniform float uRelief;
uniform float uSpacing;
uniform float uWeight;
uniform float uDash;
uniform float uVariation;
uniform float uBleed;
uniform float uGrain;
uniform float uWobble;
uniform float uContrast;
uniform float uThreshold;
uniform float uSoftness;
uniform float uInvert;
uniform float uInk;
uniform float uPaperAlpha;
uniform vec3 uInkColor;
uniform vec3 uPaperColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
  return vnoise(p) * 0.65 + vnoise(p * 2.07 + 7.3) * 0.35;
}

float fbm3(vec2 p) {
  return vnoise(p) * 0.55 + vnoise(p * 2.11 + 3.1) * 0.3 + vnoise(p * 4.13 + 11.7) * 0.15;
}

/** Rotates screen pixels into stroke space, where x runs along a stroke. */
vec2 toStroke(vec2 p) {
  return vec2(p.x * uDir.x + p.y * uDir.y, p.y * uDir.x - p.x * uDir.y);
}

/** Rotates stroke space back to screen pixels. */
vec2 toScreen(vec2 p) {
  return vec2(p.x * uDir.x - p.y * uDir.y, p.x * uDir.y + p.y * uDir.x);
}

/** Returns the inked tone weighted by coverage in x, and the coverage in y. */
vec2 sampleTone(vec2 pixel) {
  vec2 uv = pixel / uResolution;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec2(0.0);
  vec4 tex = texture(tDiffuse, uv);
  float alpha = clamp(tex.a, 0.0, 1.0);
  if (alpha <= 0.0) return vec2(0.0);
  float luma = dot(toSrgb(tex.rgb / alpha), LUMA);
  float tone = uInvert > 0.5 ? luma : 1.0 - luma;
  return vec2(tone * alpha, alpha);
}

/**
 * Surface height in 0..1 from the scene depth buffer, normalised around the
 * model so the usable range covers the object rather than the whole frustum.
 * Bare background resolves to the neutral 0.5 so relief fades out at the edges.
 */
float sampleHeight(vec2 pixel) {
  vec2 uv = pixel / uResolution;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.5;
  float alpha = clamp(texture(tDiffuse, uv).a, 0.0, 1.0);
  float depth = texture(tDepth, uv).x;
  float viewZ = (uCamNear * uCamFar) / ((uCamFar - uCamNear) * depth - uCamFar);
  float height = clamp(0.5 + (uHeightCenter + viewZ) / (2.0 * uHeightSpan), 0.0, 1.0);
  return mix(0.5, height, smoothstep(0.0, 0.6, alpha));
}

void main() {
  vec4 raw = texture(tDiffuse, vUv);
  if (uInk < 0.5) {
    outColor = vec4(toSrgb(raw.rgb) * raw.a, raw.a);
    return;
  }

  vec2 frag = vUv * uResolution;
  vec2 q = toStroke(frag);
  vec2 n = q / uSpacing;

  // Rows are pushed around by the surface height, so a stroke crossing a raised
  // form bends with it and the line pattern reads as volume, not as a flat fill.
  float relief = (sampleHeight(frag) - 0.5) * uRelief * uSpacing * 2.0;
  float wobble = (fbm2(n * vec2(0.06, 0.11)) - 0.5) * uWobble * uSpacing;
  float shift = wobble + relief;
  float lineY = q.y + shift;
  float row = floor(lineY / uSpacing);
  float center = (row + 0.5) * uSpacing;
  float within = lineY - center;

  // Tone is read on the stroke centreline, so a stroke's weight tracks the tone
  // it actually covers and stays stable instead of shimmering per pixel.
  vec2 band = vec2(q.x, center - shift);
  vec2 bandStep = toScreen(vec2(0.0, uSpacing * 0.22));
  vec2 tone =
    sampleTone(toScreen(band)) * 3.0 +
    sampleTone(toScreen(band) - bandStep) +
    sampleTone(toScreen(band) + bandStep);
  float presence = smoothstep(0.03, 0.45, clamp(tone.y * 0.2, 0.0, 1.0));
  float level = tone.x / max(tone.y, 1e-4);

  // Highlights are allowed to fall all the way to bare paper. Clamping them to
  // a floor instead paints a faint bead over every lit pixel, which reads as a
  // mechanical screen rather than a drawing.
  float amount = clamp(0.5 + (level - uThreshold) * uContrast, 0.0, 1.0) * presence;
  float mark = smoothstep(0.0, 0.02, amount);

  // The stroke is laid down as a chain of ink beads. Dark tone stretches them
  // until they fuse into a solid bar; light tone shrinks them back into
  // separate dots, which is what gives the print its speckled highlights.
  float pitch = max(uDash, 2.0);
  // Every row starts its bead chain at its own offset, otherwise the beads line
  // up into visible columns and the hatching reads as a printed dot screen.
  float rowPhase = hash21(vec2(row * 0.73 + 5.1, 8.2)) * pitch;
  float qx = q.x + rowPhase;
  float cell = floor(qx / pitch);
  float rowJitter = 0.88 + 0.24 * hash21(vec2(row, 3.3));
  // Strokes hold a hairline of paper between them until the tone is nearly
  // black, then swell past their neighbours and flood into a solid mass.
  float fill = mix(0.18, 0.80, amount) + 0.34 * smoothstep(0.90, 1.0, amount);
  float maxHalf = 0.5 * uSpacing * uWeight * rowJitter * fill;
  // Beads stretch with tone: short and isolated in the light, long enough to
  // overlap their neighbours and read as one solid stroke in the shadows.
  float lenScale = mix(mix(2.6, 0.3, clamp(uVariation, 0.0, 1.0)), 2.6, amount);

  float d = -uSpacing * 4.0;
  for (int i = -2; i <= 2; i++) {
    float ci = cell + float(i);
    float r1 = hash21(vec2(ci, row * 1.7 + 0.5));
    float r2 = hash21(vec2(ci + 31.4, row * 2.3 + 0.5));
    float r3 = hash21(vec2(ci + 77.7, row * 3.9 + 0.5));
    // Faint tone drops beads at random instead of shrinking them uniformly, so
    // highlights thin out into irregular speckle and then into clean paper. The
    // dropout is scaled by variation so that at 0 the strokes stay unbroken and
    // only their weight carries the tone, the way an engraving reads.
    float keep = mix(1.0, clamp(amount * 3.6 + 0.1, 0.0, 1.0), clamp(uVariation, 0.0, 1.0));
    if (hash21(vec2(ci + 13.7, row * 5.1 + 2.0)) > keep) continue;
    float beadX = (ci + 0.5 + (r1 - 0.5) * 0.5) * pitch;
    float beadY = (r3 - 0.5) * 0.22 * uSpacing;
    float beadHalf = pitch * 0.5 * max(lenScale, 0.04) * (0.75 + 0.5 * r2);
    float u = (qx - beadX) / beadHalf;
    float k = 1.0 - u * u;
    if (k > 0.0) {
      d = max(d, maxHalf * (0.82 + 0.36 * r2) * sqrt(k) - abs(within - beadY));
    }
  }

  d += (fbm2(n * vec2(1.5, 3.1) + 19.0) - 0.5) * uBleed * uSpacing * 0.3 * mark;
  d -= max(vnoise(n * vec2(5.3, 9.7) + 61.0) - 0.5, 0.0) * uGrain * uSpacing * 0.5 * mark;
  d -= (1.0 - mark) * uSpacing * 4.0;

  float aa = mix(0.2, 1.6, clamp(uSoftness, 0.0, 1.0)) * uPixelRatio;
  float ink = smoothstep(-aa, aa, d);

  vec3 inkColor = toSrgb(uInkColor);
  vec3 paperColor = toSrgb(uPaperColor);
  float paper = uPaperAlpha * (1.0 - ink);
  outColor = vec4(inkColor * ink + paperColor * paper, ink + paper);
}`;

interface FormerDef {
  kind: "ring" | "box";
  intensity: number;
  position: [number, number, number];
  scale: [number, number, number];
  lookAtCenter?: boolean;
  withLight?: boolean;
}

const ROOM_BLOCKS: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}> = [
  {
    position: [-10.906, -1, 1.846],
    rotation: [0, -0.195, 0],
    scale: [2.328, 7.905, 4.651],
  },
  {
    position: [-5.607, -0.754, -0.758],
    rotation: [0, 0.994, 0],
    scale: [1.97, 1.534, 3.955],
  },
  {
    position: [6.167, -0.16, 7.803],
    rotation: [0, 0.561, 0],
    scale: [3.927, 6.285, 3.687],
  },
  {
    position: [-2.017, 0.018, 6.124],
    rotation: [0, 0.333, 0],
    scale: [2.002, 4.566, 2.064],
  },
  {
    position: [2.291, -0.756, -2.621],
    rotation: [0, -0.286, 0],
    scale: [1.546, 1.552, 1.496],
  },
  {
    position: [-2.193, -0.369, -5.547],
    rotation: [0, 0.516, 0],
    scale: [3.875, 3.487, 2.986],
  },
];

const ROOM_FORMERS: FormerDef[] = [
  {
    kind: "ring",
    intensity: 15,
    position: [2, 3, -2],
    scale: [10, 10, 10],
    lookAtCenter: true,
  },
  {
    kind: "box",
    intensity: 80,
    position: [-14, 10, 8],
    scale: [0.1, 2.5, 2.5],
  },
  {
    kind: "box",
    intensity: 80,
    position: [-14, 14, -4],
    scale: [0.1, 2.5, 2.5],
    withLight: true,
  },
  {
    kind: "box",
    intensity: 23,
    position: [14, 12, 0],
    scale: [0.1, 5, 5],
    withLight: true,
  },
  {
    kind: "box",
    intensity: 16,
    position: [0, 9, 14],
    scale: [5, 5, 0.1],
    withLight: true,
  },
  {
    kind: "box",
    intensity: 80,
    position: [7, 8, -14],
    scale: [2.5, 2.5, 0.1],
    withLight: true,
  },
  {
    kind: "box",
    intensity: 80,
    position: [-7, 16, -14],
    scale: [2.5, 2.5, 0.1],
    withLight: true,
  },
  {
    kind: "box",
    intensity: 1,
    position: [0, 20, 0],
    scale: [0.1, 0.1, 0.1],
    withLight: true,
  },
  {
    kind: "box",
    intensity: 20,
    position: [0, 15, 0],
    scale: [10, 1, 10],
    withLight: true,
  },
];

const CAMERA_DIR = new THREE.Vector3(0, -1, 4).normalize();
const MODEL_LIFT = 0.3;
const RASTER_SIZE = 2048;
const TRACE_SIZE = 512;
const ALPHA_CUTOFF = 127;
const SIMPLIFY_TOLERANCE = 1;
const MIN_AREA = 6;
const MAX_CONTOURS = 64;
const BEVEL_SIZE = 0.006;
type AssetKind = "glb" | "gltf" | "svg" | "bitmap";

function sniffKind(bytes: Uint8Array): AssetKind | null {
  if (bytes.length < 4) return null;
  const ascii = (start: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      if (bytes[start + i] !== text.charCodeAt(i)) return false;
    }
    return true;
  };
  if (ascii(0, "glTF")) return "glb";
  if (bytes[0] === 0x89 && ascii(1, "PNG")) return "bitmap";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "bitmap";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "bitmap";
  if (ascii(0, "GIF8")) return "bitmap";
  let head = "";
  try {
    head = new TextDecoder()
      .decode(bytes.subarray(0, 2048))
      .replace(/^\uFEFF/, "")
      .trimStart();
  } catch {
    return null;
  }
  if (head.startsWith("{")) return "gltf";
  if (head.startsWith("<")) return head.includes("<svg") ? "svg" : null;
  return null;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function decodeWithImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the image"));
    };
    image.src = url;
  });
}

async function decodeWithBitmap(blob: Blob): Promise<HTMLCanvasElement | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height, 1);
    const scale = Math.min(1, RASTER_SIZE / longest);
    const canvas = drawToCanvas(
      bitmap,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    bitmap.close();
    return canvas;
  } catch {
    return null;
  }
}

async function decodeImage(
  blob: Blob,
  kind: AssetKind,
): Promise<HTMLCanvasElement> {
  const vector = kind === "svg";
  if (!vector) {
    const decoded = await decodeWithBitmap(blob);
    if (decoded) return decoded;
  }
  const image = await decodeWithImage(blob);
  const width = image.naturalWidth || RASTER_SIZE;
  const height = image.naturalHeight || RASTER_SIZE;
  const longest = Math.max(width, height, 1);
  const scale = vector
    ? RASTER_SIZE / longest
    : Math.min(1, RASTER_SIZE / longest);
  return drawToCanvas(image, width * scale, height * scale);
}

function traceContours(inside: Uint8Array, width: number, height: number) {
  const segments: number[] = [];
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const base = y * width + x;
      const code =
        inside[base] |
        (inside[base + 1] << 1) |
        (inside[base + width + 1] << 2) |
        (inside[base + width] << 3);
      if (code === 0 || code === 15) continue;
      const top = x + 0.5;
      const right = y + 0.5;
      switch (code) {
        case 1:
        case 14:
          segments.push(x, right, top, y);
          break;
        case 2:
        case 13:
          segments.push(top, y, x + 1, right);
          break;
        case 3:
        case 12:
          segments.push(x, right, x + 1, right);
          break;
        case 4:
        case 11:
          segments.push(x + 1, right, top, y + 1);
          break;
        case 6:
        case 9:
          segments.push(top, y, top, y + 1);
          break;
        case 7:
        case 8:
          segments.push(x, right, top, y + 1);
          break;
        case 5:
          segments.push(x, right, top, y, x + 1, right, top, y + 1);
          break;
        default:
          segments.push(top, y, x + 1, right, x, right, top, y + 1);
          break;
      }
    }
  }

  const count = segments.length / 4;
  const stride = width * 2 + 1;
  const ends = new Map<number, number[]>();
  const keyAt = (index: number) =>
    segments[index * 2 + 1] * 2 * stride + segments[index * 2] * 2;
  for (let i = 0; i < count; i++) {
    for (const end of [i * 2, i * 2 + 1]) {
      const key = keyAt(end);
      const bucket = ends.get(key);
      if (bucket) bucket.push(i);
      else ends.set(key, [i]);
    }
  }

  const used = new Uint8Array(count);
  const contours: number[][] = [];
  for (let start = 0; start < count; start++) {
    if (used[start]) continue;
    const points: number[] = [];
    let current = start;
    let x = segments[start * 4];
    let y = segments[start * 4 + 1];
    while (current >= 0 && !used[current]) {
      used[current] = 1;
      const head = current * 4;
      const forward = segments[head] === x && segments[head + 1] === y;
      x = forward ? segments[head + 2] : segments[head];
      y = forward ? segments[head + 3] : segments[head + 1];
      points.push(x, y);
      const bucket = ends.get(y * 2 * stride + x * 2);
      let next = -1;
      if (bucket) {
        for (const candidate of bucket) {
          if (!used[candidate]) {
            next = candidate;
            break;
          }
        }
      }
      current = next;
    }
    if (points.length >= 8) contours.push(points);
  }
  return contours;
}

function simplify(points: number[], tolerance: number) {
  const count = points.length / 2;
  if (count < 4) return points;
  const keep = new Uint8Array(count);
  keep[0] = 1;
  keep[count - 1] = 1;
  const stack = [0, count - 1];
  const toleranceSq = tolerance * tolerance;
  while (stack.length) {
    const last = stack.pop() as number;
    const first = stack.pop() as number;
    if (last - first < 2) continue;
    const ax = points[first * 2];
    const ay = points[first * 2 + 1];
    const dx = points[last * 2] - ax;
    const dy = points[last * 2 + 1] - ay;
    const lengthSq = dx * dx + dy * dy;
    let farthest = -1;
    let farthestSq = toleranceSq;
    for (let i = first + 1; i < last; i++) {
      const px = points[i * 2] - ax;
      const py = points[i * 2 + 1] - ay;
      const t = lengthSq > 0 ? (px * dx + py * dy) / lengthSq : 0;
      const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
      const ox = px - dx * clamped;
      const oy = py - dy * clamped;
      const distanceSq = ox * ox + oy * oy;
      if (distanceSq > farthestSq) {
        farthest = i;
        farthestSq = distanceSq;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push(first, farthest, farthest, last);
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    if (keep[i]) result.push(points[i * 2], points[i * 2 + 1]);
  }
  return result;
}

function ringArea(points: number[]) {
  let area = 0;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    area += (points[j] - points[i]) * (points[j + 1] + points[i + 1]);
  }
  return Math.abs(area) / 2;
}

function ringContains(points: number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const yi = points[i + 1];
    const yj = points[j + 1];
    if (yi > y === yj > y) continue;
    const t = (y - yi) / (yj - yi);
    if (x < points[i] + t * (points[j] - points[i])) inside = !inside;
  }
  return inside;
}

function buildShapes(
  canvas: HTMLCanvasElement,
  aspectW: number,
  aspectH: number,
) {
  const rectangle = () =>
    new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(aspectW, 0),
      new THREE.Vector2(aspectW, aspectH),
      new THREE.Vector2(0, aspectH),
    ]);

  const scale = Math.min(
    1,
    TRACE_SIZE / Math.max(canvas.width, canvas.height, 1),
  );
  const trace =
    scale < 1
      ? drawToCanvas(canvas, canvas.width * scale, canvas.height * scale)
      : canvas;
  const ctx = trace.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [rectangle()];

  const traceW = trace.width;
  const traceH = trace.height;
  const data = ctx.getImageData(0, 0, traceW, traceH).data;
  const width = traceW + 2;
  const height = traceH + 2;
  const inside = new Uint8Array(width * height);
  let covered = 0;
  for (let y = 0; y < traceH; y++) {
    for (let x = 0; x < traceW; x++) {
      const on = data[(y * traceW + x) * 4 + 3] >= ALPHA_CUTOFF ? 1 : 0;
      inside[(y + 1) * width + x + 1] = on;
      covered += on;
    }
  }
  if (covered >= traceW * traceH * 0.995) return [rectangle()];

  const rings = traceContours(inside, width, height)
    .map((points) => simplify(points, SIMPLIFY_TOLERANCE))
    .filter((points) => points.length >= 6 && ringArea(points) >= MIN_AREA)
    .map((points) => ({ points, area: ringArea(points), depth: 0 }))
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_CONTOURS);
  if (!rings.length) return [rectangle()];

  for (const ring of rings) {
    for (const other of rings) {
      if (
        other !== ring &&
        other.area > ring.area &&
        ringContains(other.points, ring.points[0], ring.points[1])
      ) {
        ring.depth += 1;
      }
    }
  }

  const toPath = (points: number[]) => {
    const path: THREE.Vector2[] = [];
    for (let i = 0; i < points.length; i += 2) {
      path.push(
        new THREE.Vector2(
          ((points[i] - 0.5) / traceW) * aspectW,
          (1 - (points[i + 1] - 0.5) / traceH) * aspectH,
        ),
      );
    }
    return path;
  };

  const shapes = new Map<(typeof rings)[number], THREE.Shape>();
  for (const ring of rings) {
    if (ring.depth % 2 === 0)
      shapes.set(ring, new THREE.Shape(toPath(ring.points)));
  }
  for (const ring of rings) {
    if (ring.depth % 2 === 0) continue;
    let parent: (typeof rings)[number] | null = null;
    for (const other of rings) {
      if (other.depth !== ring.depth - 1) continue;
      if (!ringContains(other.points, ring.points[0], ring.points[1])) continue;
      if (!parent || other.area < parent.area) parent = other;
    }
    const shape = parent ? shapes.get(parent) : undefined;
    if (shape) shape.holes.push(new THREE.Path(toPath(ring.points)));
  }
  const result = [...shapes.values()];
  return result.length ? result : [rectangle()];
}

function createImageObject(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  lit: boolean,
  depth: number,
): THREE.Mesh {
  const longest = Math.max(canvas.width, canvas.height, 1);
  const aspectW = canvas.width / longest;
  const aspectH = canvas.height / longest;
  // The bevel is capped against the slab thickness so a nearly flat extrusion
  // keeps a proportionate edge instead of being swallowed by its own bevel.
  const bevel = Math.min(BEVEL_SIZE, depth * 0.25);
  const geometry = new THREE.ExtrudeGeometry(
    buildShapes(canvas, aspectW, aspectH),
    {
      depth,
      bevelEnabled: bevel > 1e-5,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: 0,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 1,
    },
  );
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = position.getX(i) / aspectW;
    uv[i * 2 + 1] = position.getY(i) / aspectH;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  // Photographs carry their own tonal range, which is what the ink strokes are
  // meant to reproduce. Routing them through the lit + tone-mapped pipeline
  // crushes white to ~0.67 and lifts black to ~0.10, leaving the shader barely
  // half a stop to work with. Vector art is flat by nature, so it keeps the lit
  // material and gains dimension from the extrusion instead.
  const material = lit
    ? new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.6,
        metalness: 0,
      })
    : new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  return new THREE.Mesh(geometry, material);
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture)) continue;
        value.dispose();
      }
      material.dispose();
    }
  });
}

export function createInkObject(
  elements: InkObjectElements,
  options: InkObjectOptions = {},
): InkObjectInstance | null {
  const { canvas } = elements;
  const config: Required<InkObjectOptions> = { ...DEFAULTS, ...options };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 200);
  camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance);

  const floatGroup = new THREE.Group();
  floatGroup.position.y = MODEL_LIFT;
  const fitGroup = new THREE.Group();
  floatGroup.add(fitGroup);
  scene.add(floatGroup);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  // Surface height for the ink pass comes straight from the scene depth buffer,
  // so strokes can ride the form instead of lying flat on the silhouette.
  target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  target.depthTexture.format = THREE.DepthFormat;

  const postMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    uniforms: {
      tDiffuse: { value: target.texture },
      tDepth: { value: target.depthTexture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uDir: { value: new THREE.Vector2(1, 0) },
      uPixelRatio: { value: 1 },
      uCamNear: { value: 0.1 },
      uCamFar: { value: 200 },
      uHeightCenter: { value: 4.2 },
      uHeightSpan: { value: 1.5 },
      uRelief: { value: 0.5 },
      uSpacing: { value: 8 },
      uWeight: { value: 1 },
      uDash: { value: 14 },
      uVariation: { value: 1 },
      uBleed: { value: 0.35 },
      uGrain: { value: 0.4 },
      uWobble: { value: 0.3 },
      uContrast: { value: 3.4 },
      uThreshold: { value: 0.45 },
      uSoftness: { value: 0.35 },
      uInvert: { value: 0 },
      uInk: { value: 1 },
      uPaperAlpha: { value: 0 },
      uInkColor: { value: new THREE.Color("#111111") },
      uPaperColor: { value: new THREE.Color("#ffffff") },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
  const postGeometry = new THREE.BufferGeometry();
  postGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      3,
    ),
  );
  const postMesh = new THREE.Mesh(postGeometry, postMaterial);
  postMesh.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(postMesh);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const pmrem = new THREE.PMREMGenerator(renderer);
  let roomScene: THREE.Scene | null = null;
  let ringMaterial: THREE.MeshBasicMaterial | null = null;
  let envTarget: THREE.WebGLRenderTarget | null = null;
  let envDirty = true;

  function buildRoom() {
    roomScene = new THREE.Scene();
    const room = new THREE.Group();
    room.position.set(0, -0.5, 0);
    roomScene.add(room);

    for (const [x, z] of [
      [-15, 15],
      [15, 15],
      [15, -15],
      [-15, -15],
    ]) {
      const spot = new THREE.SpotLight(0xffffff, 2, 0, 0.2, 1, 0);
      spot.position.set(x, 20, z);
      room.add(spot, spot.target);
    }
    const center = new THREE.PointLight(0xffffff, 100, 28, 2);
    center.position.set(0.5, 14, 0.5);
    room.add(center);

    const box = new THREE.BoxGeometry();
    const shell = new THREE.Mesh(
      box,
      new THREE.MeshStandardMaterial({ color: "gray", side: THREE.BackSide }),
    );
    shell.position.set(0, 13.2, 0);
    shell.scale.set(31.5, 28.5, 31.5);
    room.add(shell);

    const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (const def of ROOM_BLOCKS) {
      const mesh = new THREE.Mesh(box, white);
      mesh.position.set(...def.position);
      mesh.rotation.set(...def.rotation);
      mesh.scale.set(...def.scale);
      room.add(mesh);
    }

    for (const def of ROOM_FORMERS) {
      const geometry =
        def.kind === "ring"
          ? new THREE.RingGeometry(0.5, 1, 64)
          : new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      material.color
        .set(def.kind === "ring" ? config.highlight : "#ffffff")
        .multiplyScalar(def.intensity);
      if (def.kind === "ring") ringMaterial = material;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...def.position);
      mesh.scale.set(...def.scale);
      if (def.lookAtCenter) mesh.lookAt(0, 0, 0);
      room.add(mesh);
      if (def.withLight) {
        const light = new THREE.PointLight(0xffffff, 100, 28, 2);
        light.position.set(...def.position);
        room.add(light);
      }
    }
  }

  function refreshEnvironment() {
    if (!roomScene) buildRoom();
    if (ringMaterial) {
      ringMaterial.color.set(config.highlight).multiplyScalar(15);
    }
    envTarget?.dispose();
    envTarget = pmrem.fromScene(roomScene!, 0, 0.1, 1000);
    scene.environment = envTarget.texture;
  }

  let model: THREE.Object3D | null = null;
  let modelMaxDim = 1;
  let loadedSrc: string | null = null;
  let loadToken = 0;
  // The decoded artwork is kept so a depth change can re-extrude the slab
  // without refetching and re-rasterizing the asset.
  let imageSource: { canvas: HTMLCanvasElement; lit: boolean } | null = null;
  let builtDepth = 0;
  let disposed = false;

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(config.dracoDecoderPath);
  loader.setDRACOLoader(draco);

  function applyRoughness() {
    if (!model) return;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard || typeof standard.roughness !== "number") continue;
        if (standard.userData.baseRoughness === undefined) {
          standard.userData.baseRoughness = standard.roughness;
        }
        standard.roughness =
          config.roughness >= 0
            ? config.roughness
            : standard.userData.baseRoughness;
      }
    });
  }

  function applyFit() {
    if (!model) return;
    fitGroup.scale.setScalar(config.scale / modelMaxDim);
  }

  function clearModel() {
    if (!model) return;
    fitGroup.remove(model);
    disposeObject(model);
    model = null;
  }

  function adoptModel(object: THREE.Object3D) {
    clearModel();
    model = object;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const offset = bounds.getCenter(new THREE.Vector3());
    modelMaxDim = Math.max(size.x, size.y, size.z, 1e-4);
    model.position.sub(offset);
    applyRoughness();
    applyFit();
    fitGroup.add(model);
  }

  function buildImageModel() {
    if (!imageSource) return;
    builtDepth = Math.min(Math.max(config.depth, 0.002), 1);
    adoptModel(
      createImageObject(
        imageSource.canvas,
        renderer.capabilities.getMaxAnisotropy(),
        imageSource.lit,
        builtDepth,
      ),
    );
  }

  async function loadAsset() {
    const src = config.src;
    if (src === loadedSrc) return;
    loadedSrc = src;
    const token = ++loadToken;
    if (!src) {
      imageSource = null;
      clearModel();
      return;
    }
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (disposed || token !== loadToken) return;
      const bytes = new Uint8Array(buffer);
      const kind = sniffKind(bytes);
      if (!kind) throw new Error("Unrecognized asset format");

      if (kind === "glb" || kind === "gltf") {
        draco.setDecoderPath(config.dracoDecoderPath);
        const resourcePath = src.slice(0, src.lastIndexOf("/") + 1);
        const data = kind === "glb" ? buffer : new TextDecoder().decode(bytes);
        const gltf = await loader.parseAsync(data, resourcePath);
        if (disposed || token !== loadToken) {
          disposeObject(gltf.scene);
          return;
        }
        imageSource = null;
        adoptModel(gltf.scene);
      } else {
        const blob = new Blob([buffer], {
          type: kind === "svg" ? "image/svg+xml" : "",
        });
        const source = await decodeImage(blob, kind);
        if (disposed || token !== loadToken) return;
        imageSource = { canvas: source, lit: kind === "svg" };
        buildImageModel();
      }
      config.onLoad?.();
    } catch (error) {
      if (disposed || token !== loadToken) return;
      config.onError?.(error);
    }
  }

  const modelCenter = new THREE.Vector3();

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;
  const onMotionChange = () => {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) floatGroup.rotation.set(0, 0, 0);
    applyOptions();
  };
  motionQuery.addEventListener("change", onMotionChange);

  function applyOptions() {
    renderer.setClearColor(
      new THREE.Color(config.background || "#000000"),
      config.background ? 1 : 0,
    );
    scene.environmentIntensity = config.environmentIntensity;
    if (
      imageSource &&
      Math.min(Math.max(config.depth, 0.002), 1) !== builtDepth
    ) {
      buildImageModel();
    }
    controls.enableRotate = config.orbit;
    controls.enableZoom = config.zoom;
    controls.autoRotate = config.autoRotate && !reducedMotion;
    controls.autoRotateSpeed = config.autoRotateSpeed;
    camera.fov = config.fov;
    camera.updateProjectionMatrix();
    floatGroup.position.x = config.xOffset;
    floatGroup.position.y = MODEL_LIFT + config.yOffset;
    const pr = renderer.getPixelRatio();
    const uniforms = postMaterial.uniforms;
    const radians = (config.angle * Math.PI) / 180;
    uniforms.uPixelRatio.value = pr;
    uniforms.uDir.value.set(Math.cos(radians), Math.sin(radians));
    uniforms.uSpacing.value = Math.max(config.lineSpacing, 1) * pr;
    uniforms.uWeight.value = Math.max(config.strokeWeight, 0);
    uniforms.uDash.value = Math.max(config.dashLength, 1) * pr;
    uniforms.uVariation.value = Math.max(config.variation, 0);
    uniforms.uBleed.value = Math.max(config.bleed, 0);
    uniforms.uGrain.value = Math.max(config.grain, 0);
    uniforms.uWobble.value = Math.max(config.wobble, 0);
    uniforms.uRelief.value = Math.max(config.relief, 0);
    uniforms.uHeightSpan.value = Math.max(config.scale, 0.001) * 0.5;
    uniforms.uContrast.value = Math.max(config.contrast, 0);
    uniforms.uThreshold.value = config.threshold;
    uniforms.uSoftness.value = config.softness;
    uniforms.uInvert.value = config.invert ? 1 : 0;
    uniforms.uInk.value = config.ink ? 1 : 0;
    uniforms.uInkColor.value.set(config.inkColor || "#111111");
    uniforms.uPaperColor.value.set(config.background || "#ffffff");
    uniforms.uPaperAlpha.value = config.background ? 1 : 0;
    applyRoughness();
    applyFit();
  }

  function resize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const pr = getCanvasPixelRatio(canvas, renderer.getContext());
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    target.setSize(
      Math.max(Math.round(width * pr), 1),
      Math.max(Math.round(height * pr), 1),
    );
    postMaterial.uniforms.uResolution.value.set(
      Math.round(width * pr),
      Math.round(height * pr),
    );
    postMaterial.uniforms.uPixelRatio.value = pr;
    postMaterial.uniforms.uSpacing.value = Math.max(config.lineSpacing, 1) * pr;
    postMaterial.uniforms.uDash.value = Math.max(config.dashLength, 1) * pr;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const observer = createCanvasResizeObserver(resize);
  observer.observe(canvas);
  resize();
  applyOptions();
  loadAsset();

  let inView = true;
  let pageVisible =
    typeof document === "undefined" || document.visibilityState !== "hidden";
  let loopRunning = false;

  function tick(time: number) {
    if (!inView || !pageVisible) {
      lastTime = 0;
      stopLoop();
      return;
    }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    if (envDirty) {
      envDirty = false;
      refreshEnvironment();
    }
    controls.update();

    if (!reducedMotion) {
      elapsed += delta * config.floatSpeed;
      floatGroup.rotation.x =
        (Math.cos(elapsed / 4) / 8) * config.rotationIntensity;
      floatGroup.rotation.y =
        (Math.sin(elapsed / 4) / 8) * config.rotationIntensity;
      floatGroup.rotation.z =
        (Math.sin(elapsed / 4) / 20) * config.rotationIntensity;
      floatGroup.position.y =
        MODEL_LIFT +
        config.yOffset +
        (Math.sin(elapsed / 1.5) / 10) * config.floatIntensity;
    }

    camera.updateMatrixWorld();
    const uniforms = postMaterial.uniforms;
    uniforms.uCamNear.value = camera.near;
    uniforms.uCamFar.value = camera.far;
    uniforms.uHeightCenter.value = -modelCenter
      .copy(floatGroup.position)
      .applyMatrix4(camera.matrixWorldInverse).z;

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  }

  function startLoop() {
    if (loopRunning || !inView || !pageVisible || disposed) return;
    loopRunning = true;
    renderer.setAnimationLoop(tick);
  }

  function stopLoop() {
    if (!loopRunning) return;
    loopRunning = false;
    renderer.setAnimationLoop(null);
  }

  const viewObserver =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          inView = entries[entries.length - 1]?.isIntersecting ?? true;
          if (inView) {
            startLoop();
          } else {
            stopLoop();
          }
        })
      : null;
  viewObserver?.observe(canvas);

  const onVisibilityChange = () => {
    pageVisible = document.visibilityState !== "hidden";
    if (pageVisible) {
      lastTime = 0;
      startLoop();
    } else {
      stopLoop();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  let lastTime = 0;
  let elapsed = Math.random() * 100;

  startLoop();

  return {
    setOptions(next: InkObjectOptions) {
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === "function") continue;
        if (config[key as keyof InkObjectOptions] !== value) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        Object.assign(config, next);
        return;
      }

      const previousHighlight = config.highlight;
      const previousDistance = config.cameraDistance;
      Object.assign(config, next);
      if (config.highlight !== previousHighlight) envDirty = true;
      if (config.cameraDistance !== previousDistance) {
        camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance);
      }
      applyOptions();
      resize();
      loadAsset();
      startLoop();
    },
    resize,
    destroy() {
      disposed = true;
      loadToken += 1;
      imageSource = null;
      stopLoop();
      observer.disconnect();
      viewObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
      controls.dispose();
      clearModel();
      if (roomScene) disposeObject(roomScene);
      envTarget?.dispose();
      pmrem.dispose();
      draco.dispose();
      target.depthTexture?.dispose();
      target.dispose();
      postGeometry.dispose();
      postMaterial.dispose();
      renderer.dispose();
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/InkObjectWebGPU.ts`

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

/*
 * WebGPU/vgpu port of InkObject. The three.js PMREM studio-room environment
 * cannot be reproduced 1:1 without the old three.js GPU backend, so this
 * port keeps three.js for loading, geometry, texture and camera/control CPU
 * work, then approximates MeshStandardMaterial with analytic room lights plus
 * Lambert/GGX-ish shading before running the ink post-process in WGSL.
 */
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
} from "vgpu";
import type { Texture } from "vgpu";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface InkObjectOptions {
  /** URL of the asset to display: GLB/glTF, SVG, PNG, JPEG, WebP, or GIF. Object URLs from a file input work too. The format is sniffed from the bytes, not the extension. */
  src?: string;
  /** Enable the ink pass. Turn off to see the raw render. */
  ink?: boolean;
  /** Color of the ink strokes. */
  inkColor?: string;
  /** Distance between stroke centers in CSS pixels. */
  lineSpacing?: number;
  /** Thickness of the strokes relative to the line spacing (0 to 1.5). */
  strokeWeight?: number;
  /** Angle of the stroke lines in degrees. */
  angle?: number;
  /** Length scale of the dash breakup along each stroke, in CSS pixels. */
  dashLength?: number;
  /** How aggressively strokes break into dashes as the tone lightens (0 keeps solid lines). */
  variation?: number;
  /** Ragged ink bleed along the stroke edges (0 to 1). */
  bleed?: number;
  /** Dry-brush speckle eaten out of the ink (0 to 1). */
  grain?: number;
  /** Hand-pressed waviness of the stroke lines (0 to 1). */
  wobble?: number;
  /** How far the stroke lines ride the surface height read from the depth buffer, so they wrap a 3D form. Flat art is unaffected. */
  relief?: number;
  /** Extrusion depth of 2D assets (SVG or image) as a fraction of their longest side. */
  depth?: number;
  /** Slope of the tone-to-ink ramp. Higher crushes midtones into solid black or bare paper. */
  contrast?: number;
  /** Tone that lands at half ink coverage. Raise it to ink only the darkest areas. */
  threshold?: number;
  /** Softness of the stroke edges (0 is a hard letterpress edge). */
  softness?: number;
  /** Ink the light areas instead of the dark ones. */
  invert?: boolean;
  /** Paper color behind the ink. Empty string keeps the canvas transparent. */
  background?: string;
  /** Accent color of the ring light in the studio environment. */
  highlight?: string;
  /** Brightness of the studio environment lighting. */
  environmentIntensity?: number;
  /** Roughness override applied to every material (0 to 1). Negative keeps the asset's own values. */
  roughness?: number;
  /** Size of the longest side of the object in scene units. The camera sits about 4 units away. */
  scale?: number;
  /** Horizontal offset of the object in scene units. */
  xOffset?: number;
  /** Vertical offset of the object in scene units. */
  yOffset?: number;
  /** Strength of the floating bob animation (0 disables). */
  floatIntensity?: number;
  /** Strength of the idle rocking rotation (0 disables). */
  rotationIntensity?: number;
  /** Speed of the float and rocking animation. */
  floatSpeed?: number;
  /** Let the user orbit the camera by dragging. */
  orbit?: boolean;
  /** Let the user zoom with the scroll wheel or pinch. */
  zoom?: boolean;
  /** Spin the camera around the object turntable-style. */
  autoRotate?: boolean;
  /** Turntable speed when autoRotate is on. */
  autoRotateSpeed?: number;
  /** Camera field of view in degrees. */
  fov?: number;
  /** Camera distance from the center of the object. */
  cameraDistance?: number;
  /** Base URL of the Draco decoder, fetched only when a model needs it. */
  dracoDecoderPath?: string;
  /** Called after an asset finishes loading. */
  onLoad?: (() => void) | null;
  /** Called when an asset fails to load. */
  onError?: ((error: unknown) => void) | null;
}

export interface InkObjectElements {
  /** Canvas the scene renders to. */
  canvas: HTMLCanvasElement;
}

export interface InkObjectInstance {
  /** Update options live. Changing src loads the new asset. */
  setOptions: (options: InkObjectOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<InkObjectOptions> = {
  src: "",
  ink: true,
  inkColor: "#111111",
  lineSpacing: 8,
  strokeWeight: 1,
  angle: 0,
  dashLength: 14,
  variation: 1,
  bleed: 0.35,
  grain: 0.32,
  wobble: 0.3,
  relief: 0.5,
  depth: 0.08,
  contrast: 2.2,
  threshold: 0.2,
  softness: 0.4,
  invert: false,
  background: "",
  highlight: "#066aff",
  environmentIntensity: 0.5,
  roughness: 0.35,
  scale: 3,
  xOffset: 0,
  yOffset: 0,
  floatIntensity: 0,
  rotationIntensity: 0,
  floatSpeed: 2,
  orbit: true,
  zoom: false,
  autoRotate: false,
  autoRotateSpeed: 2,
  fov: 65,
  cameraDistance: 4.2,
  dracoDecoderPath: "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  onLoad: null,
  onError: null,
};

const FORWARD_SHADER = /* wgsl */ `
struct SceneParams {
  viewProj: mat4x4f,
  view: mat4x4f,
  cameraPos: vec4f,
  highlightColor: vec4f,
  environment: vec4f,
}

struct ModelParams {
  model: mat4x4f,
  normalMatrix: mat3x3f,
  baseColor: vec4f,
  emissiveRoughness: vec4f,
  metalOpacityMapUnlit: vec4f,
}

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) worldPos: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) viewZ: f32,
}

struct FSOut {
  @location(0) color: vec4f,
  @location(1) height: vec4f,
}

@group(0) @binding(0) var<uniform> scene: SceneParams;
@group(0) @binding(1) var<uniform> modelParams: ModelParams;
@group(0) @binding(2) var baseMap: texture_2d<f32>;
@group(0) @binding(3) var mapSampler: sampler;

fn srgbToLinear(c: vec3f) -> vec3f {
  return select(c / 12.92, pow((c + vec3f(0.055)) / 1.055, vec3f(2.4)), c > vec3f(0.04045));
}

fn aces(c: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let cc = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((c * (a * c + vec3f(b))) / (c * (cc * c + vec3f(d)) + vec3f(e)), vec3f(0.0), vec3f(1.0));
}

fn attenuate(distance: f32, range: f32, decay: f32) -> f32 {
  let falloff = 1.0 / max(pow(distance, decay), 1.0);
  let window = pow(clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0), 2.0);
  return falloff * window;
}

fn addLight(sum: ptr<function, vec3f>, pos: vec3f, color: vec3f, intensity: f32, worldPos: vec3f, normal: vec3f, viewDir: vec3f, roughness: f32, metalness: f32, baseColor: vec3f) {
  let toLight = pos - worldPos;
  let dist = length(toLight);
  let lightDir = toLight / max(dist, 0.0001);
  let ndl = max(dot(normal, lightDir), 0.0);
  let radiance = color * intensity * attenuate(dist, 28.0, 2.0);
  let halfDir = normalize(lightDir + viewDir);
  let ndh = max(dot(normal, halfDir), 0.0);
  let specPower = mix(96.0, 8.0, roughness);
  let spec = pow(ndh, specPower) * (1.0 - roughness * 0.65);
  let diffuse = baseColor * ndl * (1.0 - metalness);
  (*sum) += (diffuse + vec3f(spec)) * radiance;
}

@vertex fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
) -> VSOut {
  let world = modelParams.model * vec4f(position, 1.0);
  let view = scene.view * world;
  var clip = scene.viewProj * world;
  clip.z = clip.z * 0.5 + clip.w * 0.5;
  var out: VSOut;
  out.pos = clip;
  out.worldPos = world.xyz;
  out.normal = normalize(modelParams.normalMatrix * normal);
  out.uv = uv;
  out.viewZ = view.z;
  return out;
}

@fragment fn fs_main(in: VSOut) -> FSOut {
  let sampled = textureSampleLevel(baseMap, mapSampler, in.uv, 0.0);
  let texColor = srgbToLinear(sampled.rgb);
  let useMap = modelParams.metalOpacityMapUnlit.z;
  let unlit = modelParams.metalOpacityMapUnlit.w;
  let alpha = modelParams.baseColor.a * mix(1.0, sampled.a, useMap);
  if (alpha < 0.01) { discard; }
  var base = modelParams.baseColor.rgb * mix(vec3f(1.0), texColor, useMap);
  if (unlit > 0.5) {
    return FSOut(vec4f(base, alpha), vec4f(in.viewZ, 0.0, 0.0, 1.0));
  }
  let normal = normalize(in.normal);
  let viewDir = normalize(scene.cameraPos.xyz - in.worldPos);
  let roughness = clamp(modelParams.emissiveRoughness.w, 0.04, 1.0);
  let metalness = clamp(modelParams.metalOpacityMapUnlit.x, 0.0, 1.0);
  var lit = base * (0.04 + scene.environment.w * 0.75);
  addLight(&lit, vec3f(0.5, 14.0, 0.5), vec3f(1.0), 100.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(-14.0, 14.0, -4.0), vec3f(1.0), 100.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(14.0, 12.0, 0.0), vec3f(1.0), 100.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(0.0, 9.0, 14.0), vec3f(1.0), 100.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(7.0, 8.0, -14.0), vec3f(1.0), 100.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(-7.0, 16.0, -14.0), vec3f(1.0), 100.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(0.0, 20.0, 0.0), vec3f(1.0), 60.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(0.0, 15.0, 0.0), vec3f(1.0), 80.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  addLight(&lit, vec3f(2.0, 3.0, -2.0), scene.highlightColor.rgb, 180.0 * scene.environment.w, in.worldPos, normal, viewDir, roughness, metalness, base);
  lit += modelParams.emissiveRoughness.rgb;
  let mapped = aces(lit);
  return FSOut(vec4f(mapped, alpha), vec4f(in.viewZ, 0.0, 0.0, 1.0));
}`;

const POST_SHADER = /* wgsl */ `
struct Params {
  inkColor: vec4f,
  paperColor: vec4f,
  resolution: vec2f,
  dir: vec2f,
  pixelRatio: f32,
  camNear: f32,
  camFar: f32,
  heightCenter: f32,
  heightSpan: f32,
  relief: f32,
  spacing: f32,
  weight: f32,
  dash: f32,
  variation: f32,
  bleed: f32,
  grain: f32,
  wobble: f32,
  contrast: f32,
  threshold: f32,
  softness: f32,
  invert: f32,
  ink: f32,
  paperAlpha: f32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var tDiffuse: texture_2d<f32>;
@group(0) @binding(2) var uHeight: texture_2d<f32>;
@group(0) @binding(3) var uSampler: sampler;

const LUMA = vec3f(0.2126, 0.7152, 0.0722);

fn toSrgb(c: vec3f) -> vec3f {
  let clamped = clamp(c, vec3f(0.0), vec3f(1.0));
  return select(clamped * 12.92, 1.055 * pow(clamped, vec3f(1.0 / 2.4)) - vec3f(0.055), clamped >= vec3f(0.0031308));
}

fn hash21(pIn: vec2f) -> f32 {
  var p = fract(pIn * vec2f(123.34, 345.45));
  p += dot(p, p + vec2f(34.345));
  return fract(p.x * p.y);
}

fn vnoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (vec2f(3.0) - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbm2(p: vec2f) -> f32 {
  return vnoise(p) * 0.65 + vnoise(p * 2.07 + vec2f(7.3)) * 0.35;
}

fn toStroke(p: vec2f) -> vec2f {
  return vec2f(p.x * params.dir.x + p.y * params.dir.y, p.y * params.dir.x - p.x * params.dir.y);
}

fn toScreen(p: vec2f) -> vec2f {
  return vec2f(p.x * params.dir.x - p.y * params.dir.y, p.x * params.dir.y + p.y * params.dir.x);
}

fn sampleTone(pixel: vec2f) -> vec2f {
  let uv = pixel / params.resolution;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return vec2f(0.0); }
  let tex = textureSampleLevel(tDiffuse, uSampler, uv, 0.0);
  let alpha = clamp(tex.a, 0.0, 1.0);
  if (alpha <= 0.0) { return vec2f(0.0); }
  let luma = dot(toSrgb(tex.rgb / alpha), LUMA);
  let tone = select(1.0 - luma, luma, params.invert > 0.5);
  return vec2f(tone * alpha, alpha);
}

fn sampleHeight(pixel: vec2f) -> f32 {
  let uv = pixel / params.resolution;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 0.5; }
  let alpha = clamp(textureSampleLevel(tDiffuse, uSampler, uv, 0.0).a, 0.0, 1.0);
  let viewZ = textureSampleLevel(uHeight, uSampler, uv, 0.0).r;
  let height = clamp(0.5 + (params.heightCenter + viewZ) / (2.0 * params.heightSpan), 0.0, 1.0);
  return mix(0.5, height, smoothstep(0.0, 0.6, alpha));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let raw = textureSampleLevel(tDiffuse, uSampler, uv, 0.0);
  if (params.ink < 0.5) {
    return vec4f(toSrgb(raw.rgb) * raw.a, raw.a);
  }

  let frag = uv * params.resolution;
  let q = toStroke(frag);
  let n = q / params.spacing;
  let relief = (sampleHeight(frag) - 0.5) * params.relief * params.spacing * 2.0;
  let wobble = (fbm2(n * vec2f(0.06, 0.11)) - 0.5) * params.wobble * params.spacing;
  let shift = wobble + relief;
  let lineY = q.y + shift;
  let row = floor(lineY / params.spacing);
  let center = (row + 0.5) * params.spacing;
  let within = lineY - center;

  let band = vec2f(q.x, center - shift);
  let bandStep = toScreen(vec2f(0.0, params.spacing * 0.22));
  let tone = sampleTone(toScreen(band)) * 3.0 + sampleTone(toScreen(band) - bandStep) + sampleTone(toScreen(band) + bandStep);
  let presence = smoothstep(0.03, 0.45, clamp(tone.y * 0.2, 0.0, 1.0));
  let level = tone.x / max(tone.y, 1e-4);
  let amount = clamp(0.5 + (level - params.threshold) * params.contrast, 0.0, 1.0) * presence;
  let mark = smoothstep(0.0, 0.02, amount);

  let pitch = max(params.dash, 2.0);
  let rowPhase = hash21(vec2f(row * 0.73 + 5.1, 8.2)) * pitch;
  let qx = q.x + rowPhase;
  let cell = floor(qx / pitch);
  let rowJitter = 0.88 + 0.24 * hash21(vec2f(row, 3.3));
  let fill = mix(0.18, 0.80, amount) + 0.34 * smoothstep(0.90, 1.0, amount);
  let maxHalf = 0.5 * params.spacing * params.weight * rowJitter * fill;
  let lenScale = mix(mix(2.6, 0.3, clamp(params.variation, 0.0, 1.0)), 2.6, amount);

  var d = -params.spacing * 4.0;
  for (var i = -2; i <= 2; i++) {
    let ci = cell + f32(i);
    let r1 = hash21(vec2f(ci, row * 1.7 + 0.5));
    let r2 = hash21(vec2f(ci + 31.4, row * 2.3 + 0.5));
    let r3 = hash21(vec2f(ci + 77.7, row * 3.9 + 0.5));
    let keep = mix(1.0, clamp(amount * 3.6 + 0.1, 0.0, 1.0), clamp(params.variation, 0.0, 1.0));
    if (hash21(vec2f(ci + 13.7, row * 5.1 + 2.0)) > keep) { continue; }
    let beadX = (ci + 0.5 + (r1 - 0.5) * 0.5) * pitch;
    let beadY = (r3 - 0.5) * 0.22 * params.spacing;
    let beadHalf = pitch * 0.5 * max(lenScale, 0.04) * (0.75 + 0.5 * r2);
    let u = (qx - beadX) / beadHalf;
    let k = 1.0 - u * u;
    if (k > 0.0) {
      d = max(d, maxHalf * (0.82 + 0.36 * r2) * sqrt(k) - abs(within - beadY));
    }
  }

  d += (fbm2(n * vec2f(1.5, 3.1) + vec2f(19.0)) - 0.5) * params.bleed * params.spacing * 0.3 * mark;
  d -= max(vnoise(n * vec2f(5.3, 9.7) + vec2f(61.0)) - 0.5, 0.0) * params.grain * params.spacing * 0.5 * mark;
  d -= (1.0 - mark) * params.spacing * 4.0;

  let aa = mix(0.2, 1.6, clamp(params.softness, 0.0, 1.0)) * params.pixelRatio;
  let ink = smoothstep(-aa, aa, d);
  let inkColor = toSrgb(params.inkColor.rgb);
  let paperColor = toSrgb(params.paperColor.rgb);
  let paper = params.paperAlpha * (1.0 - ink);
  return vec4f(inkColor * ink + paperColor * paper, ink + paper);
}`;

type AssetKind = "glb" | "gltf" | "svg" | "bitmap";

function sniffKind(bytes: Uint8Array): AssetKind | null {
  if (bytes.length < 4) return null;
  const ascii = (start: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      if (bytes[start + i] !== text.charCodeAt(i)) return false;
    }
    return true;
  };
  if (ascii(0, "glTF")) return "glb";
  if (bytes[0] === 0x89 && ascii(1, "PNG")) return "bitmap";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "bitmap";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "bitmap";
  if (ascii(0, "GIF8")) return "bitmap";
  let head = "";
  try {
    head = new TextDecoder()
      .decode(bytes.subarray(0, 2048))
      .replace(/^\uFEFF/, "")
      .trimStart();
  } catch {
    return null;
  }
  if (head.startsWith("{")) return "gltf";
  if (head.startsWith("<")) return head.includes("<svg") ? "svg" : null;
  return null;
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function decodeWithImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the image"));
    };
    image.src = url;
  });
}

async function decodeWithBitmap(blob: Blob): Promise<HTMLCanvasElement | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height, 1);
    const scale = Math.min(1, RASTER_SIZE / longest);
    const canvas = drawToCanvas(
      bitmap,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    bitmap.close();
    return canvas;
  } catch {
    return null;
  }
}

async function decodeImage(
  blob: Blob,
  kind: AssetKind,
): Promise<HTMLCanvasElement> {
  const vector = kind === "svg";
  if (!vector) {
    const decoded = await decodeWithBitmap(blob);
    if (decoded) return decoded;
  }
  const image = await decodeWithImage(blob);
  const width = image.naturalWidth || RASTER_SIZE;
  const height = image.naturalHeight || RASTER_SIZE;
  const longest = Math.max(width, height, 1);
  const scale = vector
    ? RASTER_SIZE / longest
    : Math.min(1, RASTER_SIZE / longest);
  return drawToCanvas(image, width * scale, height * scale);
}

function traceContours(inside: Uint8Array, width: number, height: number) {
  const segments: number[] = [];
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const base = y * width + x;
      const code =
        inside[base] |
        (inside[base + 1] << 1) |
        (inside[base + width + 1] << 2) |
        (inside[base + width] << 3);
      if (code === 0 || code === 15) continue;
      const top = x + 0.5;
      const right = y + 0.5;
      switch (code) {
        case 1:
        case 14:
          segments.push(x, right, top, y);
          break;
        case 2:
        case 13:
          segments.push(top, y, x + 1, right);
          break;
        case 3:
        case 12:
          segments.push(x, right, x + 1, right);
          break;
        case 4:
        case 11:
          segments.push(x + 1, right, top, y + 1);
          break;
        case 6:
        case 9:
          segments.push(top, y, top, y + 1);
          break;
        case 7:
        case 8:
          segments.push(x, right, top, y + 1);
          break;
        case 5:
          segments.push(x, right, top, y, x + 1, right, top, y + 1);
          break;
        default:
          segments.push(top, y, x + 1, right, x, right, top, y + 1);
          break;
      }
    }
  }

  const count = segments.length / 4;
  const stride = width * 2 + 1;
  const ends = new Map<number, number[]>();
  const keyAt = (index: number) =>
    segments[index * 2 + 1] * 2 * stride + segments[index * 2] * 2;
  for (let i = 0; i < count; i++) {
    for (const end of [i * 2, i * 2 + 1]) {
      const key = keyAt(end);
      const bucket = ends.get(key);
      if (bucket) bucket.push(i);
      else ends.set(key, [i]);
    }
  }

  const used = new Uint8Array(count);
  const contours: number[][] = [];
  for (let start = 0; start < count; start++) {
    if (used[start]) continue;
    const points: number[] = [];
    let current = start;
    let x = segments[start * 4];
    let y = segments[start * 4 + 1];
    while (current >= 0 && !used[current]) {
      used[current] = 1;
      const head = current * 4;
      const forward = segments[head] === x && segments[head + 1] === y;
      x = forward ? segments[head + 2] : segments[head];
      y = forward ? segments[head + 3] : segments[head + 1];
      points.push(x, y);
      const bucket = ends.get(y * 2 * stride + x * 2);
      let next = -1;
      if (bucket) {
        for (const candidate of bucket) {
          if (!used[candidate]) {
            next = candidate;
            break;
          }
        }
      }
      current = next;
    }
    if (points.length >= 8) contours.push(points);
  }
  return contours;
}

function simplify(points: number[], tolerance: number) {
  const count = points.length / 2;
  if (count < 4) return points;
  const keep = new Uint8Array(count);
  keep[0] = 1;
  keep[count - 1] = 1;
  const stack = [0, count - 1];
  const toleranceSq = tolerance * tolerance;
  while (stack.length) {
    const last = stack.pop() as number;
    const first = stack.pop() as number;
    if (last - first < 2) continue;
    const ax = points[first * 2];
    const ay = points[first * 2 + 1];
    const dx = points[last * 2] - ax;
    const dy = points[last * 2 + 1] - ay;
    const lengthSq = dx * dx + dy * dy;
    let farthest = -1;
    let farthestSq = toleranceSq;
    for (let i = first + 1; i < last; i++) {
      const px = points[i * 2] - ax;
      const py = points[i * 2 + 1] - ay;
      const t = lengthSq > 0 ? (px * dx + py * dy) / lengthSq : 0;
      const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
      const ox = px - dx * clamped;
      const oy = py - dy * clamped;
      const distanceSq = ox * ox + oy * oy;
      if (distanceSq > farthestSq) {
        farthest = i;
        farthestSq = distanceSq;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push(first, farthest, farthest, last);
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    if (keep[i]) result.push(points[i * 2], points[i * 2 + 1]);
  }
  return result;
}

function ringArea(points: number[]) {
  let area = 0;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    area += (points[j] - points[i]) * (points[j + 1] + points[i + 1]);
  }
  return Math.abs(area) / 2;
}

function ringContains(points: number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const yi = points[i + 1];
    const yj = points[j + 1];
    if (yi > y === yj > y) continue;
    const t = (y - yi) / (yj - yi);
    if (x < points[i] + t * (points[j] - points[i])) inside = !inside;
  }
  return inside;
}

function buildShapes(
  canvas: HTMLCanvasElement,
  aspectW: number,
  aspectH: number,
) {
  const rectangle = () =>
    new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(aspectW, 0),
      new THREE.Vector2(aspectW, aspectH),
      new THREE.Vector2(0, aspectH),
    ]);

  const scale = Math.min(
    1,
    TRACE_SIZE / Math.max(canvas.width, canvas.height, 1),
  );
  const trace =
    scale < 1
      ? drawToCanvas(canvas, canvas.width * scale, canvas.height * scale)
      : canvas;
  const ctx = trace.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [rectangle()];

  const traceW = trace.width;
  const traceH = trace.height;
  const data = ctx.getImageData(0, 0, traceW, traceH).data;
  const width = traceW + 2;
  const height = traceH + 2;
  const inside = new Uint8Array(width * height);
  let covered = 0;
  for (let y = 0; y < traceH; y++) {
    for (let x = 0; x < traceW; x++) {
      const on = data[(y * traceW + x) * 4 + 3] >= ALPHA_CUTOFF ? 1 : 0;
      inside[(y + 1) * width + x + 1] = on;
      covered += on;
    }
  }
  if (covered >= traceW * traceH * 0.995) return [rectangle()];

  const rings = traceContours(inside, width, height)
    .map((points) => simplify(points, SIMPLIFY_TOLERANCE))
    .filter((points) => points.length >= 6 && ringArea(points) >= MIN_AREA)
    .map((points) => ({ points, area: ringArea(points), depth: 0 }))
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_CONTOURS);
  if (!rings.length) return [rectangle()];

  for (const ring of rings) {
    for (const other of rings) {
      if (
        other !== ring &&
        other.area > ring.area &&
        ringContains(other.points, ring.points[0], ring.points[1])
      ) {
        ring.depth += 1;
      }
    }
  }

  const toPath = (points: number[]) => {
    const path: THREE.Vector2[] = [];
    for (let i = 0; i < points.length; i += 2) {
      path.push(
        new THREE.Vector2(
          ((points[i] - 0.5) / traceW) * aspectW,
          (1 - (points[i + 1] - 0.5) / traceH) * aspectH,
        ),
      );
    }
    return path;
  };

  const shapes = new Map<(typeof rings)[number], THREE.Shape>();
  for (const ring of rings) {
    if (ring.depth % 2 === 0)
      shapes.set(ring, new THREE.Shape(toPath(ring.points)));
  }
  for (const ring of rings) {
    if (ring.depth % 2 === 0) continue;
    let parent: (typeof rings)[number] | null = null;
    for (const other of rings) {
      if (other.depth !== ring.depth - 1) continue;
      if (!ringContains(other.points, ring.points[0], ring.points[1])) continue;
      if (!parent || other.area < parent.area) parent = other;
    }
    const shape = parent ? shapes.get(parent) : undefined;
    if (shape) shape.holes.push(new THREE.Path(toPath(ring.points)));
  }
  const result = [...shapes.values()];
  return result.length ? result : [rectangle()];
}

function createImageObject(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  lit: boolean,
  depth: number,
): THREE.Mesh {
  const longest = Math.max(canvas.width, canvas.height, 1);
  const aspectW = canvas.width / longest;
  const aspectH = canvas.height / longest;
  // The bevel is capped against the slab thickness so a nearly flat extrusion
  // keeps a proportionate edge instead of being swallowed by its own bevel.
  const bevel = Math.min(BEVEL_SIZE, depth * 0.25);
  const geometry = new THREE.ExtrudeGeometry(
    buildShapes(canvas, aspectW, aspectH),
    {
      depth,
      bevelEnabled: bevel > 1e-5,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: 0,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 1,
    },
  );
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = position.getX(i) / aspectW;
    uv[i * 2 + 1] = position.getY(i) / aspectH;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  // Photographs carry their own tonal range, which is what the ink strokes are
  // meant to reproduce. Routing them through the lit + tone-mapped pipeline
  // crushes white to ~0.67 and lifts black to ~0.10, leaving the shader barely
  // half a stop to work with. Vector art is flat by nature, so it keeps the lit
  // material and gains dimension from the extrusion instead.
  const material = lit
    ? new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.6,
        metalness: 0,
      })
    : new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  return new THREE.Mesh(geometry, material);
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture)) continue;
        value.dispose();
      }
      material.dispose();
    }
  });
}

const CAMERA_DIR = new THREE.Vector3(0, -1, 4).normalize();
const MODEL_LIFT = 0.3;
const RASTER_SIZE = 2048;
const TRACE_SIZE = 512;
const ALPHA_CUTOFF = 127;
const SIMPLIFY_TOLERANCE = 1;
const MIN_AREA = 6;
const MAX_CONTOURS = 64;
const BEVEL_SIZE = 0.006;

type ImageLike = HTMLCanvasElement | HTMLImageElement | ImageBitmap | OffscreenCanvas;

interface MaterialInfo {
  baseColor: [number, number, number, number];
  emissive: [number, number, number];
  roughness: number;
  metalness: number;
  opacity: number;
  hasMap: number;
  unlit: number;
}

interface RenderMesh {
  mesh: THREE.Mesh;
  geometry: Geometry;
  draw: Draw;
  texture: Texture;
  ownsTexture: boolean;
  material: MaterialInfo;
}

/** True when the browser exposes WebGPU. The device itself is requested lazily. */
export function supportsWebGPU(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.gpu);
}

let sharedGpu: Promise<Gpu> | null = null;

/** One WebGPU device per page, shared by every InkObject instance. */
function acquireGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((error) => {
      sharedGpu = null;
      throw error;
    });
  }
  return sharedGpu;
}

function imageSize(image: ImageLike): [number, number] {
  if (image instanceof HTMLImageElement) return [image.naturalWidth || image.width, image.naturalHeight || image.height];
  return [image.width, image.height];
}

function createTextureFromImage(gpu: Gpu, image: ImageLike, flipY: boolean, label: string): Texture {
  const [width, height] = imageSize(image);
  const texture = gpu.device.createTexture({
    size: [Math.max(1, width), Math.max(1, height)],
    format: "rgba8unorm",
    usage: ["texture_binding", "copy_dst", "render_attachment"],
    label,
  });
  gpu.gpu.queue.copyExternalImageToTexture(
    { source: image, flipY },
    { texture: texture.gpu },
    [texture.size[0], texture.size[1]],
  );
  return texture;
}

function createSolidTexture(gpu: Gpu, rgba: [number, number, number, number], label: string): Texture {
  const texture = gpu.device.createTexture({
    size: [1, 1],
    format: "rgba8unorm",
    usage: ["texture_binding", "copy_dst", "render_attachment"],
    label,
  });
  gpu.gpu.queue.writeTexture({ texture: texture.gpu }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1]);
  return texture;
}

function attributeArray(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined, itemSize: number, fallback: number[]) {
  if (!attribute) return null;
  const out = new Float32Array(attribute.count * itemSize);
  for (let i = 0; i < attribute.count; i++) {
    for (let j = 0; j < itemSize; j++) out[i * itemSize + j] = attribute.getComponent(i, j) ?? fallback[j] ?? 0;
  }
  return out;
}

function materialInfo(material: THREE.Material | undefined, config: Required<InkObjectOptions>): MaterialInfo {
  const anyMat = material as Partial<THREE.MeshStandardMaterial> & Partial<THREE.MeshBasicMaterial>;
  const color = anyMat.color instanceof THREE.Color ? anyMat.color : new THREE.Color(1, 1, 1);
  const emissive = anyMat.emissive instanceof THREE.Color ? anyMat.emissive : new THREE.Color(0, 0, 0);
  const emissiveIntensity = typeof anyMat.emissiveIntensity === "number" ? anyMat.emissiveIntensity : 1;
  const baseRoughness = typeof anyMat.roughness === "number" ? anyMat.roughness : 0.6;
  return {
    baseColor: [color.r, color.g, color.b, typeof anyMat.opacity === "number" ? anyMat.opacity : 1],
    emissive: [emissive.r * emissiveIntensity, emissive.g * emissiveIntensity, emissive.b * emissiveIntensity],
    roughness: config.roughness >= 0 ? config.roughness : baseRoughness,
    metalness: typeof anyMat.metalness === "number" ? anyMat.metalness : 0,
    opacity: typeof anyMat.opacity === "number" ? anyMat.opacity : 1,
    hasMap: anyMat.map instanceof THREE.Texture ? 1 : 0,
    unlit: material instanceof THREE.MeshBasicMaterial ? 1 : 0,
  };
}

export function createInkObject(
  elements: InkObjectElements,
  options: InkObjectOptions = {},
): InkObjectInstance | null {
  if (!supportsWebGPU()) return null;
  const { canvas } = elements;
  const config: Required<InkObjectOptions> = { ...DEFAULTS, ...options };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 200);
  camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance);

  const floatGroup = new THREE.Group();
  floatGroup.position.y = MODEL_LIFT;
  const fitGroup = new THREE.Group();
  floatGroup.add(fitGroup);
  scene.add(floatGroup);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(config.dracoDecoderPath);
  loader.setDRACOLoader(draco);

  let gpu: Gpu | null = null;
  let screen: Surface | null = null;
  let sceneTarget: Target | null = null;
  let postFx: Effect | null = null;
  let linearSampler: GPUSampler | null = null;
  let whiteTexture: Texture | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;
  let renderMeshes: RenderMesh[] = [];

  let model: THREE.Object3D | null = null;
  let modelMaxDim = 1;
  let loadedSrc: string | null = null;
  let loadToken = 0;
  let imageSource: { canvas: HTMLCanvasElement; lit: boolean } | null = null;
  let builtDepth = 0;
  let disposed = false;
  let fullWidth = 1;
  let fullHeight = 1;
  let dpr = 1;
  let lastTime = 0;
  let elapsed = Math.random() * 100;
  let raf = 0;
  let loopRunning = false;
  let inView = true;
  let pageVisible = typeof document === "undefined" || document.visibilityState !== "hidden";

  function ensureWhiteTexture() {
    if (!whiteTexture) whiteTexture = createSolidTexture(gpu!, [255, 255, 255, 255], "ink-object.white");
    return whiteTexture;
  }

  function clearRenderMeshes() {
    const geometries = new Set<Geometry>();
    for (const item of renderMeshes) {
      geometries.add(item.geometry);
      if (item.ownsTexture) item.texture.destroy();
    }
    for (const item of geometries) item.destroy();
    renderMeshes = [];
  }

  function uploadMaterialTexture(material: THREE.Material | undefined): { texture: Texture; owns: boolean } {
    const map = (material as Partial<THREE.MeshStandardMaterial> | undefined)?.map;
    const image = map instanceof THREE.Texture ? (map.source?.data ?? map.image) as ImageLike | undefined : undefined;
    if (!image) return { texture: ensureWhiteTexture(), owns: false };
    try {
      return { texture: createTextureFromImage(gpu!, image, Boolean(map?.flipY), "ink-object.map"), owns: true };
    } catch {
      return { texture: ensureWhiteTexture(), owns: false };
    }
  }

  function buildGeometry(mesh: THREE.Mesh) {
    const source = mesh.geometry.clone();
    if (!source.getAttribute("normal")) source.computeVertexNormals();
    const position = attributeArray(source.getAttribute("position"), 3, [0, 0, 0]);
    if (!position) {
      source.dispose();
      return null;
    }
    const normal = attributeArray(source.getAttribute("normal"), 3, [0, 1, 0]) ?? new Float32Array((position.length / 3) * 3);
    const uv = attributeArray(source.getAttribute("uv"), 2, [0, 0]) ?? new Float32Array((position.length / 3) * 2);
    const vertices = new Float32Array((position.length / 3) * 8);
    for (let i = 0; i < position.length / 3; i++) {
      vertices[i * 8] = position[i * 3];
      vertices[i * 8 + 1] = position[i * 3 + 1];
      vertices[i * 8 + 2] = position[i * 3 + 2];
      vertices[i * 8 + 3] = normal[i * 3];
      vertices[i * 8 + 4] = normal[i * 3 + 1];
      vertices[i * 8 + 5] = normal[i * 3 + 2];
      vertices[i * 8 + 6] = uv[i * 2];
      vertices[i * 8 + 7] = uv[i * 2 + 1];
    }
    const index = source.index?.array;
    const indices = index instanceof Uint32Array ? index : index ? new Uint16Array(Array.from(index)) : undefined;
    const result = geometry(gpu!, {
      buffers: [{ data: vertices, stride: 32, attributes: { position: "float32x3", normal: "float32x3", uv: "float32x2" } }],
      indices,
      topology: "triangle-list",
      label: "ink-object.geometry",
    });
    source.dispose();
    return result;
  }

  function rebuildRenderMeshes() {
    if (!gpu || !linearSampler) return;
    clearRenderMeshes();
    if (!model) return;
    model.updateMatrixWorld(true);
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const gpuGeometry = buildGeometry(mesh);
      if (!gpuGeometry) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const groups = mesh.geometry.groups.length
        ? mesh.geometry.groups
        : [{ start: 0, count: gpuGeometry.indexCount ?? gpuGeometry.vertexCount ?? 0, materialIndex: 0 }];
      for (const group of groups) {
        const material = mats[group.materialIndex ?? 0] ?? mats[0];
        const tex = uploadMaterialTexture(material);
        const side = material?.side ?? THREE.FrontSide;
        const slice = gpuGeometry.slice(
          gpuGeometry.indexCount !== undefined
            ? { firstIndex: group.start, indexCount: group.count }
            : { firstVertex: group.start, vertexCount: group.count },
        );
        renderMeshes.push({
          mesh,
          geometry: gpuGeometry,
          texture: tex.texture,
          ownsTexture: tex.owns,
          material: materialInfo(material, config),
          draw: draw(gpu!, {
            shader: FORWARD_SHADER,
            geometry: slice,
            cull: side === THREE.DoubleSide ? "none" : side === THREE.BackSide ? "front" : "back",
            depth: { write: true, compare: "less-equal" },
            label: "ink-object.forward",
            set: { baseMap: tex.texture, mapSampler: linearSampler },
          }),
        });
      }
    });
  }

  function applyRoughness() {
    if (!model) return;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard || typeof standard.roughness !== "number") continue;
        if (standard.userData.baseRoughness === undefined) standard.userData.baseRoughness = standard.roughness;
        standard.roughness = config.roughness >= 0 ? config.roughness : standard.userData.baseRoughness;
      }
    });
  }

  function applyFit() {
    if (!model) return;
    fitGroup.scale.setScalar(config.scale / modelMaxDim);
  }

  function clearModel() {
    if (!model) return;
    fitGroup.remove(model);
    disposeObject(model);
    model = null;
    clearRenderMeshes();
  }

  function adoptModel(object: THREE.Object3D) {
    clearModel();
    model = object;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const offset = bounds.getCenter(new THREE.Vector3());
    modelMaxDim = Math.max(size.x, size.y, size.z, 1e-4);
    model.position.sub(offset);
    applyRoughness();
    applyFit();
    fitGroup.add(model);
    rebuildRenderMeshes();
  }

  function buildImageModel() {
    if (!imageSource) return;
    builtDepth = Math.min(Math.max(config.depth, 0.002), 1);
    adoptModel(createImageObject(imageSource.canvas, 1, imageSource.lit, builtDepth));
  }

  async function loadAsset() {
    const src = config.src;
    if (src === loadedSrc) return;
    loadedSrc = src;
    const token = ++loadToken;
    if (!src) {
      imageSource = null;
      clearModel();
      return;
    }
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (disposed || token !== loadToken) return;
      const bytes = new Uint8Array(buffer);
      const kind = sniffKind(bytes);
      if (!kind) throw new Error("Unrecognized asset format");
      if (kind === "glb" || kind === "gltf") {
        draco.setDecoderPath(config.dracoDecoderPath);
        const resourcePath = src.slice(0, src.lastIndexOf("/") + 1);
        const data = kind === "glb" ? buffer : new TextDecoder().decode(bytes);
        const gltf = await loader.parseAsync(data, resourcePath);
        if (disposed || token !== loadToken) {
          disposeObject(gltf.scene);
          return;
        }
        imageSource = null;
        adoptModel(gltf.scene);
      } else {
        const blob = new Blob([buffer], { type: kind === "svg" ? "image/svg+xml" : "" });
        const source = await decodeImage(blob, kind);
        if (disposed || token !== loadToken) return;
        imageSource = { canvas: source, lit: kind === "svg" };
        buildImageModel();
      }
      config.onLoad?.();
      startLoop();
    } catch (error) {
      if (disposed || token !== loadToken) return;
      config.onError?.(error);
    }
  }

  const modelCenter = new THREE.Vector3();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;

  function applyOptions() {
    if (imageSource && Math.min(Math.max(config.depth, 0.002), 1) !== builtDepth) buildImageModel();
    controls.enableRotate = config.orbit;
    controls.enableZoom = config.zoom;
    controls.autoRotate = config.autoRotate && !reducedMotion;
    controls.autoRotateSpeed = config.autoRotateSpeed;
    camera.fov = config.fov;
    camera.updateProjectionMatrix();
    floatGroup.position.x = config.xOffset;
    floatGroup.position.y = MODEL_LIFT + config.yOffset;
    applyRoughness();
    applyFit();
  }

  function resize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    dpr = getCanvasPixelRatio(canvas);
    fullWidth = Math.max(Math.round(width * dpr), 1);
    fullHeight = Math.max(Math.round(height * dpr), 1);
    if (screen) {
      if (screen.size[0] !== fullWidth || screen.size[1] !== fullHeight) screen.resize([fullWidth, fullHeight]);
    } else {
      canvas.width = fullWidth;
      canvas.height = fullHeight;
    }
    if (sceneTarget && (sceneTarget.size[0] !== fullWidth || sceneTarget.size[1] !== fullHeight)) {
      sceneTarget.resize([fullWidth, fullHeight]);
      if (postFx) postFx.set({ tDiffuse: sceneTarget, uHeight: sceneTarget.colors[1] });
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const viewProj = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const backgroundColor = new THREE.Color();
  const highlightColor = new THREE.Color();
  const inkColor = new THREE.Color();
  const paperColor = new THREE.Color();

  function colorTuple(color: string, fallback: string): [number, number, number, number] {
    const c = new THREE.Color(color || fallback);
    return [c.r, c.g, c.b, color ? 1 : 0];
  }

  function renderFallback() {
    if (!fallback2d) return;
    fallback2d.clearRect(0, 0, canvas.width, canvas.height);
    if (config.background) {
      fallback2d.fillStyle = config.background;
      fallback2d.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function render() {
    if (!gpu || !screen || !sceneTarget || !postFx) return;
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    scene.updateMatrixWorld(true);
    const bg = colorTuple(config.background, "#000000");
    backgroundColor.set(config.background || "#000000");
    highlightColor.set(config.highlight || "#066aff");
    const sceneParams = {
      viewProj: viewProj.elements,
      view: camera.matrixWorldInverse.elements,
      cameraPos: [camera.position.x, camera.position.y, camera.position.z, 0],
      highlightColor: [highlightColor.r, highlightColor.g, highlightColor.b, 1],
      environment: [backgroundColor.r, backgroundColor.g, backgroundColor.b, Math.max(config.environmentIntensity, 0)],
    };
    for (const item of renderMeshes) {
      normalMatrix.getNormalMatrix(item.mesh.matrixWorld);
      item.draw.set({
        scene: sceneParams,
        modelParams: {
          model: item.mesh.matrixWorld.elements,
          normalMatrix: normalMatrix.elements,
          baseColor: item.material.baseColor,
          emissiveRoughness: [...item.material.emissive, item.material.roughness],
          metalOpacityMapUnlit: [item.material.metalness, item.material.opacity, item.material.hasMap, item.material.unlit],
        },
      });
    }
    const radians = (config.angle * Math.PI) / 180;
    inkColor.set(config.inkColor || "#111111");
    paperColor.set(config.background || "#ffffff");
    postFx.set({
      params: {
        inkColor: [inkColor.r, inkColor.g, inkColor.b, 1],
        paperColor: [paperColor.r, paperColor.g, paperColor.b, 1],
        resolution: [fullWidth, fullHeight],
        dir: [Math.cos(radians), Math.sin(radians)],
        pixelRatio: dpr,
        camNear: camera.near,
        camFar: camera.far,
        heightCenter: -modelCenter.copy(floatGroup.position).applyMatrix4(camera.matrixWorldInverse).z,
        heightSpan: Math.max(config.scale, 0.001) * 0.5,
        relief: Math.max(config.relief, 0),
        spacing: Math.max(config.lineSpacing, 1) * dpr,
        weight: Math.max(config.strokeWeight, 0),
        dash: Math.max(config.dashLength, 1) * dpr,
        variation: Math.max(config.variation, 0),
        bleed: Math.max(config.bleed, 0),
        grain: Math.max(config.grain, 0),
        wobble: Math.max(config.wobble, 0),
        contrast: Math.max(config.contrast, 0),
        threshold: config.threshold,
        softness: config.softness,
        invert: config.invert ? 1 : 0,
        ink: config.ink ? 1 : 0,
        paperAlpha: config.background ? 1 : 0,
      },
    });
    gpuFrame(gpu, (f) => {
      f.pass({ target: sceneTarget!, clear: bg, clearDepth: 1 }, (pass) => {
        for (const item of renderMeshes) pass.draw(item.draw);
      });
      f.pass({ target: screen!, clear: [0, 0, 0, 0] }, postFx!);
    });
  }

  function tick(time: number) {
    if (!inView || !pageVisible || disposed) {
      lastTime = 0;
      stopLoop();
      return;
    }
    if (fallback2d) {
      renderFallback();
      raf = requestAnimationFrame(tick);
      return;
    }
    if (!gpu) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    controls.update();
    if (!reducedMotion) {
      elapsed += delta * config.floatSpeed;
      floatGroup.rotation.x = (Math.cos(elapsed / 4) / 8) * config.rotationIntensity;
      floatGroup.rotation.y = (Math.sin(elapsed / 4) / 8) * config.rotationIntensity;
      floatGroup.rotation.z = (Math.sin(elapsed / 4) / 20) * config.rotationIntensity;
      floatGroup.position.y = MODEL_LIFT + config.yOffset + (Math.sin(elapsed / 1.5) / 10) * config.floatIntensity;
    }
    render();
    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (loopRunning || !inView || !pageVisible || disposed) return;
    loopRunning = true;
    raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!loopRunning) return;
    loopRunning = false;
    cancelAnimationFrame(raf);
  }

  const onMotionChange = () => {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) floatGroup.rotation.set(0, 0, 0);
    applyOptions();
  };
  motionQuery.addEventListener("change", onMotionChange);

  const observer = createCanvasResizeObserver(() => {
    resize();
    startLoop();
  });
  observer.observe(canvas);

  const viewObserver = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1]?.isIntersecting ?? true;
        if (inView) startLoop();
        else stopLoop();
      })
    : null;
  viewObserver?.observe(canvas);

  const onVisibilityChange = () => {
    pageVisible = document.visibilityState !== "hidden";
    if (pageVisible) {
      lastTime = 0;
      startLoop();
    } else {
      stopLoop();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  resize();
  applyOptions();
  loadAsset();

  acquireGpu().then((device) => {
    if (disposed) return;
    gpu = device;
    screen = surface(gpu, canvas, { autoResize: false, alphaMode: "premultiplied", label: "ink-object" });
    linearSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    sceneTarget = target(gpu, {
      size: [1, 1],
      colors: [{ format: "rgba16float" }, { format: "rgba16float" }],
      depth: true,
      label: "ink-object.scene",
    });
    postFx = effect(gpu, POST_SHADER, {
      label: "ink-object.post",
      set: {
        uSampler: linearSampler,
        tDiffuse: sceneTarget,
        uHeight: sceneTarget.colors[1],
      },
    });
    resize();
    rebuildRenderMeshes();
    startLoop();
  }).catch((error) => {
    if (disposed) return;
    console.warn("InkObject: WebGPU unavailable, showing fallback canvas.", error);
    fallback2d = canvas.getContext("2d");
    startLoop();
  });

  return {
    setOptions(next: InkObjectOptions) {
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === "function") continue;
        if (config[key as keyof InkObjectOptions] !== value) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        Object.assign(config, next);
        return;
      }
      const previousDistance = config.cameraDistance;
      Object.assign(config, next);
      if (config.cameraDistance !== previousDistance) camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance);
      applyOptions();
      resize();
      rebuildRenderMeshes();
      loadAsset();
      startLoop();
    },
    resize() {
      resize();
      startLoop();
    },
    destroy() {
      disposed = true;
      loadToken += 1;
      imageSource = null;
      stopLoop();
      observer.disconnect();
      viewObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
      controls.dispose();
      clearModel();
      clearRenderMeshes();
      whiteTexture?.destroy();
      (sceneTarget as unknown as { destroy?: () => void } | null)?.destroy?.();
      screen?.dispose();
      draco.dispose();
    },
  };
}

```

