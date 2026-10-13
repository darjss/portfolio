# Blaze (Vanilla)

- Docs: https://canvasui.dev/docs/components/blaze
- Registry: https://canvasui.dev/r/blaze-vanilla.json (WebGL), https://canvasui.dev/r/blaze-vanilla-webgpu.json (WebGPU)
- Install: `npx shadcn@latest add @canvas-ui/blaze-vanilla`

## What it does

Fire sparks, smoke, and heat distortion rising from the bottom of your page. The HTML stays interactive. No dependencies.

## Dependencies

None.

## Source (vanilla): `components/canvasui/BlazeVanilla.ts`

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

export interface BlazeOptions {
  /** Height of the blaze zone as a fraction of the screen (0 to 1). */
  height?: number;
  /** Strength of the heat distortion bending the content. */
  distortion?: number;
  /** Scale of the heat distortion noise. Higher means finer ripples. */
  distortionScale?: number;
  /** Animation speed multiplier for the whole effect. */
  speed?: number;
  /** Brightness of the rising sparks. 0 disables them. */
  sparks?: number;
  /** How tightly packed the sparks are. Higher also makes them smaller. */
  sparkDensity?: number;
  /** Size of the individual sparks. */
  sparkSize?: number;
  /** Number of spark layers stacked for depth (1 to 10). */
  layers?: number;
  /** Intensity of the smoke. 0 disables it. */
  smoke?: number;
  /** Warm ambient glow near the bottom edge. */
  glow?: number;
  /** Spark color as [r, g, b] in 0-1 range. */
  sparkColor?: [number, number, number];
  /** Smoke and glow color as [r, g, b] in 0-1 range. */
  smokeColor?: [number, number, number];
}

export interface BlazeElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
}

export interface BlazeInstance {
  /** Update effect options live. */
  setOptions: (options: BlazeOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<BlazeOptions> = {
  height: 0.97,
  distortion: 0.6,
  distortionScale: 0.5,
  speed: 1,
  sparks: 0.5,
  sparkDensity: 1.5,
  sparkSize: 1,
  layers: 4,
  smoke: 0.5,
  glow: 1.5,
  sparkColor: [1, 0.4, 0.05],
  smokeColor: [1, 0.43, 0.1],
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

const NOISE = `
float hash1_2 (vec2 x) {
  return fract(sin(dot(x, vec2(52.127, 61.2871))) * 521.582);
}

vec2 hash2_2 (vec2 x) {
  return fract(sin(x * mat2(20.52, 24.1994, 70.291, 80.171)) * 492.194);
}

vec2 noise2_2 (vec2 uv) {
  vec2 f = smoothstep(0.0, 1.0, fract(uv));
  vec2 uv00 = floor(uv);
  vec2 v00 = hash2_2(uv00);
  vec2 v01 = hash2_2(uv00 + vec2(0.0, 1.0));
  vec2 v10 = hash2_2(uv00 + vec2(1.0, 0.0));
  vec2 v11 = hash2_2(uv00 + 1.0);
  return mix(mix(v00, v01, f.y), mix(v10, v11, f.y), f.x);
}

vec3 permute (vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise (vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}`;

const FIRE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHeight;
uniform float uSparks;
uniform float uSparkDensity;
uniform float uSparkSize;
uniform int uLayers;
uniform float uSmoke;
uniform float uGlow;
uniform vec3 uSparkColor;
uniform vec3 uSmokeColor;

#define MOVE_DIR vec2(0.0, -1.0)
#define MOVE_SPEED 0.5
${NOISE}

float fbm (vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 11.7;
    a *= 0.5;
  }
  return v * 0.5 + 0.5;
}

float smokeField (vec2 p, float t) {
  vec2 rise = vec2(-t * 0.03, -t * 0.22);
  vec2 q = vec2(
    fbm(p + rise),
    fbm(p + rise * 0.85 + vec2(5.2, 1.3)));
  return fbm(p + 0.55 * q + rise);
}

vec2 rotate2 (vec2 point, float deg) {
  float s = sin(deg);
  float c = cos(deg);
  return mat2(s, c, -c, s) * point;
}

vec2 voronoiPoint (vec2 root, float deg) {
  vec2 point = hash2_2(root) - 0.5;
  float s = sin(deg);
  float c = cos(deg);
  point = mat2(s, c, -c, s) * point * 0.66;
  point += root + 0.5;
  return point;
}

vec2 randomAround (vec2 point, vec2 range, vec2 uv) {
  return point + (hash2_2(uv) - 0.5) * range;
}

vec3 fireParticles (vec2 uv, vec2 originalUV) {
  vec3 particles = vec3(0.0);
  vec2 rootUV = floor(uv);
  float deg = uTime * 0.6 * (hash1_2(rootUV) - 0.5) * 2.0;
  vec2 pointUV = voronoiPoint(rootUV, deg);
  float size = 0.002 * uSparkSize;

  vec2 tempUV = uv + vec2(
    snoise(uv * 1.8 + uTime * 0.55),
    snoise(uv * 1.8 - uTime * 0.4 + 7.3)) * 0.06;

  float dist = length(rotate2(tempUV - pointUV, 0.7)
    * randomAround(vec2(0.5, 1.6), vec2(0.25, 0.2), rootUV));
  float distBloom = length(rotate2(tempUV - pointUV, 0.7)
    * randomAround(vec2(0.5, 0.8), vec2(0.3, 0.1), rootUV));

  particles += (1.0 - smoothstep(size * 0.6, size * 3.0, dist)) * uSparkColor * 1.5;
  particles += pow(1.0 - smoothstep(0.0, size * 6.0, distBloom), 3.0) * uSparkColor * 0.8;

  float border = (hash1_2(rootUV) - 0.5) * 2.0;
  float disappear = 1.0 - smoothstep(border, border + 0.5, originalUV.y);
  border = (hash1_2(rootUV + 0.214) - 1.8) * 0.7;
  float appear = smoothstep(border, border + 0.4, originalUV.y);

  return particles * disappear * appear;
}

vec3 layeredParticles (vec2 uv, float sizeMod, float alphaMod, int layers, float smoke) {
  vec3 particles = vec3(0.0);
  float size = 1.0;
  float alpha = 1.0;
  vec2 offset = vec2(0.0);
  for (int i = 0; i < layers; i++) {
    vec2 noiseOffset = (noise2_2(uv * size * 2.0 + 0.5) - 0.5) * 0.15;
    vec2 bokehUV = (uv * size * uSparkDensity + uTime * MOVE_DIR * MOVE_SPEED)
      + offset + noiseOffset;
    particles += fireParticles(bokehUV, uv) * alpha
      * (1.0 - smoothstep(0.0, 1.0, smoke) * (float(i) / float(layers)));
    offset += hash2_2(vec2(alpha, alpha)) * 10.0;
    alpha *= alphaMod;
    size *= sizeMod;
  }
  return particles;
}

void main () {
  vec2 uv = vUv;

  float zone = clamp(uHeight, 0.02, 1.0);
  float fy = uv.y / zone;

  if (fy > 1.0) {
    outColor = vec4(0.0);
    return;
  }

  float aspect = uResolution.x / uResolution.y;
  vec2 fireUv = vec2((uv.x - 0.5) * aspect * 3.2, mix(-0.7, 1.6, fy));

  float smokeIntensity = 0.0;
  if (uSmoke > 0.001) {
    smokeIntensity = smokeField(fireUv * vec2(0.4, 0.55), uTime);
    smokeIntensity = smoothstep(0.42, 1.15, smokeIntensity);
    smokeIntensity *= pow(1.0 - smoothstep(-1.0, 1.6, fireUv.y), 1.5);
  }
  vec3 smoke = smokeIntensity * uSmokeColor * 0.8 * uSmoke;

  vec3 particles = vec3(0.0);
  if (uSparks > 0.001) {
    particles = layeredParticles(fireUv, 1.01, 0.9, uLayers, smokeIntensity) * uSparks;
  }

  float fade = 1.0 - smoothstep(0.55, 1.0, fy);
  vec3 glow = uSmokeColor * 0.05 * uGlow * pow(1.0 - fy, 2.0);
  vec3 fire = (particles + smoke) * fade + glow;

  outColor = vec4(fire, max(fire.r, max(fire.g, fire.b)));
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uFire;
uniform float uTime;
uniform float uHeight;
uniform float uDistortion;
uniform float uDistortionScale;
uniform float uMaxX;
uniform float uHasContent;
${NOISE}

float snoiseOctaves (vec2 uv, int octaves, float alpha, float beta, vec2 gamma, float delta) {
  vec2 pos = uv;
  float t = 1.0;
  float s = 1.0;
  vec2 q = gamma;
  float r = 0.0;
  for (int i = 0; i < octaves; i++) {
    r += s * snoise(pos + q);
    pos += t * uv;
    t *= beta;
    s *= alpha;
    q *= delta;
  }
  return r;
}

void main () {
  vec2 uv = vUv;

  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  float zone = clamp(uHeight, 0.02, 1.0);
  float fy = uv.y / zone;

  if (uHasContent < 0.5) {
    if (fy > 1.0) {
      outColor = vec4(0.0);
      return;
    }
    vec4 fire = texture(uFire, uv);
    outColor = vec4(fire.rgb, clamp(fire.a * 0.85, 0.0, 1.0));
    return;
  }

  if (fy > 1.0) {
    vec4 c = texture(uContent, vec2(uv.x, 1.0 - uv.y));
    outColor = vec4(c.rgb * c.a, c.a);
    return;
  }

  float heat = uDistortion * pow(1.0 - smoothstep(0.0, 1.0, fy), 1.5);
  vec2 uv1 = uv;
  if (heat > 0.0005) {
    vec2 nUv = uv * 2.0 * uDistortionScale;
    float dx = 0.005 * snoiseOctaves(nUv + uTime * vec2(0.00323, 0.00345),
      4, 0.85, -3.0, uTime * vec2(-0.0323, -0.345), 1.203);
    float dy = 0.0035 * snoiseOctaves(nUv + 3.0 + uTime * vec2(-0.00323, 0.00345),
      4, 0.85, -3.0, uTime * vec2(-0.0323, -0.345), 1.203);
    uv1 = clamp(uv + vec2(dx, dy) * heat, vec2(0.001), vec2(uMaxX - 0.004, 0.999));
  }
  vec4 content = texture(uContent, vec2(uv1.x, 1.0 - uv1.y));

  vec4 fire = texture(uFire, uv);

  float luma = dot(content.rgb, vec3(0.299, 0.587, 0.114)) * content.a;
  vec3 col = content.rgb * content.a * (1.0 - fire.a * luma) + fire.rgb;
  float alpha = clamp(content.a + fire.a, 0.0, 1.0);
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

export function createBlaze(
  elements: BlazeElements,
  options: BlazeOptions = {},
): BlazeInstance | null {
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
      console.error("Blaze shader error:", gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  function link(fragText: string) {
    const vertexShader = compile(gl!.VERTEX_SHADER, VERT);
    const fragmentShader = compile(gl!.FRAGMENT_SHADER, fragText);
    const program = gl!.createProgram()!;
    gl!.attachShader(program, vertexShader);
    gl!.attachShader(program, fragmentShader);
    gl!.linkProgram(program);
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const count = gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl!.getActiveUniform(program, i)!;
      uniforms[info.name] = gl!.getUniformLocation(program, info.name)!;
    }
    return { program, uniforms, vertexShader, fragmentShader };
  }

  const mainPass = link(FRAG);
  const firePass = link(FIRE_FRAG);

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

  let fireTexture: WebGLTexture | null = null;
  let fireFbo: WebGLFramebuffer | null = null;
  let fireWidth = 0;
  let fireHeight = 0;

  function ensureFireTarget() {
    const width = Math.max(1, Math.floor(output.width / 2));
    const height = Math.max(1, Math.floor(output.height / 2));
    if (fireTexture && width === fireWidth && height === fireHeight) return;
    fireWidth = width;
    fireHeight = height;
    if (fireTexture) gl!.deleteTexture(fireTexture);
    if (fireFbo) gl!.deleteFramebuffer(fireFbo);
    fireTexture = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, fireTexture);
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
    fireFbo = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fireFbo);
    gl!.framebufferTexture2D(
      gl!.FRAMEBUFFER,
      gl!.COLOR_ATTACHMENT0,
      gl!.TEXTURE_2D,
      fireTexture,
      0,
    );
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
  }

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
  }

  let time = 0;

  function render() {
    uploadContent();
    ensureFireTarget();

    gl!.useProgram(firePass.program);
    gl!.uniform2f(firePass.uniforms.uResolution, output.width, output.height);
    gl!.uniform1f(firePass.uniforms.uTime, time);
    gl!.uniform1f(firePass.uniforms.uHeight, config.height);
    gl!.uniform1f(firePass.uniforms.uSparks, config.sparks);
    gl!.uniform1f(
      firePass.uniforms.uSparkDensity,
      Math.max(config.sparkDensity, 0.05),
    );
    gl!.uniform1f(
      firePass.uniforms.uSparkSize,
      Math.max(config.sparkSize, 0.05),
    );
    gl!.uniform1i(
      firePass.uniforms.uLayers,
      Math.min(Math.max(Math.round(config.layers), 1), 10),
    );
    gl!.uniform1f(firePass.uniforms.uSmoke, config.smoke);
    gl!.uniform1f(firePass.uniforms.uGlow, config.glow);
    gl!.uniform3f(
      firePass.uniforms.uSparkColor,
      config.sparkColor[0],
      config.sparkColor[1],
      config.sparkColor[2],
    );
    gl!.uniform3f(
      firePass.uniforms.uSmokeColor,
      config.smokeColor[0],
      config.smokeColor[1],
      config.smokeColor[2],
    );
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fireFbo);
    gl!.viewport(0, 0, fireWidth, fireHeight);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

    gl!.useProgram(mainPass.program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(mainPass.uniforms.uContent, 0);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, fireTexture);
    gl!.uniform1i(mainPass.uniforms.uFire, 1);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.uniform1f(mainPass.uniforms.uTime, time);
    gl!.uniform1f(mainPass.uniforms.uHeight, config.height);
    gl!.uniform1f(mainPass.uniforms.uDistortion, config.distortion);
    gl!.uniform1f(
      mainPass.uniforms.uDistortionScale,
      Math.max(config.distortionScale, 0.05),
    );
    gl!.uniform1f(mainPass.uniforms.uMaxX, contentMaxX);
    gl!.uniform1f(mainPass.uniforms.uHasContent, htmlInCanvas ? 1 : 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
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
    if (!reducedMotion) time += delta * config.speed;
    render();
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

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof BlazeOptions] !== value,
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
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      gl!.deleteTexture(contentTexture);
      if (fireTexture) gl!.deleteTexture(fireTexture);
      if (fireFbo) gl!.deleteFramebuffer(fireFbo);
      for (const pass of [mainPass, firePass]) {
        gl!.deleteProgram(pass.program);
        gl!.deleteShader(pass.vertexShader);
        gl!.deleteShader(pass.fragmentShader);
      }
      gl!.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

## Source (vanilla-webgpu): `components/canvasui/BlazeWebGPU.ts`

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

export interface BlazeOptions {
  /** Height of the blaze zone as a fraction of the screen (0 to 1). */
  height?: number;
  /** Strength of the heat distortion bending the content. */
  distortion?: number;
  /** Scale of the heat distortion noise. Higher means finer ripples. */
  distortionScale?: number;
  /** Animation speed multiplier for the whole effect. */
  speed?: number;
  /** Brightness of the rising sparks. 0 disables them. */
  sparks?: number;
  /** How tightly packed the sparks are. Higher also makes them smaller. */
  sparkDensity?: number;
  /** Size of the individual sparks. */
  sparkSize?: number;
  /** Number of spark layers stacked for depth (1 to 10). */
  layers?: number;
  /** Intensity of the smoke. 0 disables it. */
  smoke?: number;
  /** Warm ambient glow near the bottom edge. */
  glow?: number;
  /** Spark color as [r, g, b] in 0-1 range. */
  sparkColor?: [number, number, number];
  /** Smoke and glow color as [r, g, b] in 0-1 range. */
  smokeColor?: [number, number, number];
}

export interface BlazeElements {
  /** Canvas with layoutsubtree that hosts the HTML content. */
  source: HTMLCanvasElement;
  /** The element inside the source canvas that gets captured. */
  content: HTMLElement;
  /** Canvas the WebGPU effect renders to. */
  output: HTMLCanvasElement;
}

export interface BlazeInstance {
  /** Update effect options live. */
  setOptions: (options: BlazeOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<BlazeOptions> = {
  height: 0.97,
  distortion: 0.6,
  distortionScale: 0.5,
  speed: 1,
  sparks: 0.5,
  sparkDensity: 1.5,
  sparkSize: 1,
  layers: 4,
  smoke: 0.5,
  glow: 1.5,
  sparkColor: [1, 0.4, 0.05],
  smokeColor: [1, 0.43, 0.1],
};

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const FIRE_SHADER = /* wgsl */ `
struct FireParams {
  resolution: vec2f,
  sparkColor: vec3f,
  smokeColor: vec3f,
  time: f32,
  height: f32,
  sparks: f32,
  sparkDensity: f32,
  sparkSize: f32,
  layers: u32,
  smoke: f32,
  glow: f32,
}

@group(0) @binding(0) var<uniform> params: FireParams;

fn mod1(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn mod3(x: vec3f, y: f32) -> vec3f { return x - vec3f(y) * floor(x / vec3f(y)); }

fn hash1_2(x: vec2f) -> f32 {
  return fract(sin(dot(x, vec2f(52.127, 61.2871))) * 521.582);
}

fn hash2_2(x: vec2f) -> vec2f {
  return fract(sin(vec2f(
    dot(x, vec2f(20.52, 24.1994)),
    dot(x, vec2f(70.291, 80.171)),
  )) * 492.194);
}

fn noise2_2(uv: vec2f) -> vec2f {
  let f = smoothstep(vec2f(0.0), vec2f(1.0), fract(uv));
  let uv00 = floor(uv);
  let v00 = hash2_2(uv00);
  let v01 = hash2_2(uv00 + vec2f(0.0, 1.0));
  let v10 = hash2_2(uv00 + vec2f(1.0, 0.0));
  let v11 = hash2_2(uv00 + vec2f(1.0));
  return mix(mix(v00, v01, f.y), mix(v10, v11, f.y), f.x);
}

fn permute(x: vec3f) -> vec3f { return mod3(((x * 34.0) + 1.0) * x, 289.0); }

fn snoise(v: vec2f) -> f32 {
  let C = vec4f(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);
  let i1 = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
  var x12 = x0.xyxy + C.xxzz;
  x12 = vec4f(x12.xy - i1, x12.zw);
  i = i - vec2f(289.0) * floor(i / vec2f(289.0));
  let p = permute(permute(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));
  var m = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
  m = m * m;
  m = m * m;
  let x = 2.0 * fract(p * C.www) - 1.0;
  let h = abs(x) - 0.5;
  let ox = floor(x + 0.5);
  let a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  let g = vec3f(
    a0.x * x0.x + h.x * x0.y,
    a0.y * x12.x + h.y * x12.y,
    a0.z * x12.z + h.z * x12.w,
  );
  return 130.0 * dot(m, g);
}

fn fbm(pIn: vec2f) -> f32 {
  var p = pIn;
  var v = 0.0;
  var a = 0.5;
  for (var i = 0; i < 3; i++) {
    v += a * snoise(p);
    p = mat2x2f(1.6, 1.2, -1.2, 1.6) * p + vec2f(11.7);
    a *= 0.5;
  }
  return v * 0.5 + 0.5;
}

fn smokeField(p: vec2f, t: f32) -> f32 {
  let rise = vec2f(-t * 0.03, -t * 0.22);
  let q = vec2f(
    fbm(p + rise),
    fbm(p + rise * 0.85 + vec2f(5.2, 1.3)));
  return fbm(p + 0.55 * q + rise);
}

fn rotate2(point: vec2f, deg: f32) -> vec2f {
  let s = sin(deg);
  let c = cos(deg);
  return mat2x2f(s, c, -c, s) * point;
}

fn voronoiPoint(root: vec2f, deg: f32) -> vec2f {
  var point = hash2_2(root) - vec2f(0.5);
  let s = sin(deg);
  let c = cos(deg);
  point = mat2x2f(s, c, -c, s) * point * 0.66;
  point += root + vec2f(0.5);
  return point;
}

fn randomAround(point: vec2f, range: vec2f, uv: vec2f) -> vec2f {
  return point + (hash2_2(uv) - vec2f(0.5)) * range;
}

fn fireParticles(uv: vec2f, originalUV: vec2f) -> vec3f {
  var particles = vec3f(0.0);
  let rootUV = floor(uv);
  let deg = params.time * 0.6 * (hash1_2(rootUV) - 0.5) * 2.0;
  let pointUV = voronoiPoint(rootUV, deg);
  let size = 0.002 * params.sparkSize;

  let tempUV = uv + vec2f(
    snoise(uv * 1.8 + params.time * 0.55),
    snoise(uv * 1.8 - params.time * 0.4 + vec2f(7.3))) * 0.06;

  let dist = length(rotate2(tempUV - pointUV, 0.7)
    * randomAround(vec2f(0.5, 1.6), vec2f(0.25, 0.2), rootUV));
  let distBloom = length(rotate2(tempUV - pointUV, 0.7)
    * randomAround(vec2f(0.5, 0.8), vec2f(0.3, 0.1), rootUV));

  particles += (1.0 - smoothstep(size * 0.6, size * 3.0, dist)) * params.sparkColor * 1.5;
  particles += pow(1.0 - smoothstep(0.0, size * 6.0, distBloom), 3.0) * params.sparkColor * 0.8;

  var border = (hash1_2(rootUV) - 0.5) * 2.0;
  let disappear = 1.0 - smoothstep(border, border + 0.5, originalUV.y);
  border = (hash1_2(rootUV + vec2f(0.214)) - 1.8) * 0.7;
  let appear = smoothstep(border, border + 0.4, originalUV.y);

  return particles * disappear * appear;
}

fn layeredParticles(uv: vec2f, sizeMod: f32, alphaMod: f32, layers: u32, smoke: f32) -> vec3f {
  var particles = vec3f(0.0);
  var size = 1.0;
  var alpha = 1.0;
  var offset = vec2f(0.0);
  for (var i = 0u; i < 10u; i++) {
    if (i >= layers) { break; }
    let noiseOffset = (noise2_2(uv * size * 2.0 + vec2f(0.5)) - vec2f(0.5)) * 0.15;
    let bokehUV = (uv * size * params.sparkDensity + params.time * vec2f(0.0, -1.0) * 0.5)
      + offset + noiseOffset;
    particles += fireParticles(bokehUV, uv) * alpha
      * (1.0 - smoothstep(0.0, 1.0, smoke) * (f32(i) / f32(max(layers, 1u))));
    offset += hash2_2(vec2f(alpha)) * 10.0;
    alpha *= alphaMod;
    size *= sizeMod;
  }
  return particles;
}

@fragment fn fs_main(@location(0) inUv: vec2f) -> @location(0) vec4f {
  let uv = vec2f(inUv.x, 1.0 - inUv.y);

  let zone = clamp(params.height, 0.02, 1.0);
  let fy = uv.y / zone;

  if (fy > 1.0) {
    return vec4f(0.0);
  }

  let aspect = params.resolution.x / params.resolution.y;
  let fireUv = vec2f((uv.x - 0.5) * aspect * 3.2, mix(-0.7, 1.6, fy));

  var smokeIntensity = 0.0;
  if (params.smoke > 0.001) {
    smokeIntensity = smokeField(fireUv * vec2f(0.4, 0.55), params.time);
    smokeIntensity = smoothstep(0.42, 1.15, smokeIntensity);
    smokeIntensity *= pow(1.0 - smoothstep(-1.0, 1.6, fireUv.y), 1.5);
  }
  let smoke = smokeIntensity * params.smokeColor * 0.8 * params.smoke;

  var particles = vec3f(0.0);
  if (params.sparks > 0.001) {
    particles = layeredParticles(fireUv, 1.01, 0.9, params.layers, smokeIntensity) * params.sparks;
  }

  let fade = 1.0 - smoothstep(0.55, 1.0, fy);
  let glow = params.smokeColor * 0.05 * params.glow * pow(1.0 - fy, 2.0);
  let fire = (particles + smoke) * fade + glow;

  return vec4f(fire, max(fire.r, max(fire.g, fire.b)));
}`;

const MAIN_SHADER = /* wgsl */ `
struct MainParams {
  height: f32,
  distortion: f32,
  distortionScale: f32,
  maxX: f32,
  hasContent: f32,
  time: f32,
}

@group(0) @binding(0) var<uniform> params: MainParams;
@group(0) @binding(1) var uContent: texture_2d<f32>;
@group(0) @binding(2) var uFire: texture_2d<f32>;
@group(0) @binding(3) var uSampler: sampler;

fn mod1(x: f32, y: f32) -> f32 { return x - y * floor(x / y); }
fn mod3(x: vec3f, y: f32) -> vec3f { return x - vec3f(y) * floor(x / vec3f(y)); }

fn hash2_2(x: vec2f) -> vec2f {
  return fract(sin(vec2f(
    dot(x, vec2f(20.52, 24.1994)),
    dot(x, vec2f(70.291, 80.171)),
  )) * 492.194);
}

fn permute(x: vec3f) -> vec3f { return mod3(((x * 34.0) + 1.0) * x, 289.0); }

fn snoise(v: vec2f) -> f32 {
  let C = vec4f(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);
  let i1 = select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), x0.x > x0.y);
  var x12 = x0.xyxy + C.xxzz;
  x12 = vec4f(x12.xy - i1, x12.zw);
  i = i - vec2f(289.0) * floor(i / vec2f(289.0));
  let p = permute(permute(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));
  var m = max(0.5 - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
  m = m * m;
  m = m * m;
  let x = 2.0 * fract(p * C.www) - 1.0;
  let h = abs(x) - 0.5;
  let ox = floor(x + 0.5);
  let a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  let g = vec3f(
    a0.x * x0.x + h.x * x0.y,
    a0.y * x12.x + h.y * x12.y,
    a0.z * x12.z + h.z * x12.w,
  );
  return 130.0 * dot(m, g);
}

fn snoiseOctaves(uv: vec2f, octaves: u32, alpha: f32, beta: f32, gamma: vec2f, delta: f32) -> f32 {
  var pos = uv;
  var t = 1.0;
  var s = 1.0;
  var q = gamma;
  var r = 0.0;
  for (var i = 0u; i < 8u; i++) {
    if (i >= octaves) { break; }
    r += s * snoise(pos + q);
    pos += t * uv;
    t *= beta;
    s *= alpha;
    q *= delta;
  }
  return r;
}

@fragment fn fs_main(@location(0) inUv: vec2f) -> @location(0) vec4f {
  let uv = vec2f(inUv.x, 1.0 - inUv.y);

  if (uv.x > params.maxX) {
    return vec4f(0.0);
  }

  let zone = clamp(params.height, 0.02, 1.0);
  let fy = uv.y / zone;

  if (params.hasContent < 0.5) {
    if (fy > 1.0) {
      return vec4f(0.0);
    }
    let fire = textureSampleLevel(uFire, uSampler, inUv, 0.0);
    return vec4f(fire.rgb, clamp(fire.a * 0.85, 0.0, 1.0));
  }

  if (fy > 1.0) {
    let c = textureSampleLevel(uContent, uSampler, inUv, 0.0);
    return vec4f(c.rgb * c.a, c.a);
  }

  let heat = params.distortion * pow(1.0 - smoothstep(0.0, 1.0, fy), 1.5);
  var uv1 = uv;
  if (heat > 0.0005) {
    let nUv = uv * 2.0 * params.distortionScale;
    let dx = 0.005 * snoiseOctaves(nUv + params.time * vec2f(0.00323, 0.00345),
      4u, 0.85, -3.0, params.time * vec2f(-0.0323, -0.345), 1.203);
    let dy = 0.0035 * snoiseOctaves(nUv + vec2f(3.0) + params.time * vec2f(-0.00323, 0.00345),
      4u, 0.85, -3.0, params.time * vec2f(-0.0323, -0.345), 1.203);
    uv1 = clamp(uv + vec2f(dx, dy) * heat, vec2f(0.001), vec2f(params.maxX - 0.004, 0.999));
  }
  let content = textureSampleLevel(uContent, uSampler, vec2f(uv1.x, 1.0 - uv1.y), 0.0);

  let fire = textureSampleLevel(uFire, uSampler, inUv, 0.0);

  let luma = dot(content.rgb, vec3f(0.299, 0.587, 0.114)) * content.a;
  let col = content.rgb * content.a * (1.0 - fire.a * luma) + fire.rgb;
  let alpha = clamp(content.a + fire.a, 0.0, 1.0);
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

/** One WebGPU device per page, shared by every Blaze instance. */
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

export function createBlaze(
  elements: BlazeElements,
  options: BlazeOptions = {},
): BlazeInstance | null {
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
  let fireFx: Effect | null = null;
  let mainFx: Effect | null = null;
  let contentTexture: Texture | null = null;
  let fireTarget: Target | null = null;
  let fallback2d: CanvasRenderingContext2D | null = null;

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

  function ensureContentTexture(): Texture {
    const width = Math.max(1, source.width);
    const height = Math.max(1, source.height);
    if (
      !contentTexture ||
      contentTexture.size[0] !== width ||
      contentTexture.size[1] !== height
    ) {
      // A new wrapper invalidates vgpu's cached bindings to the old texture.
      contentTexture?.destroy();
      contentTexture = gpu!.device.createTexture({
        size: [width, height],
        format: "rgba8unorm",
        usage: ["texture_binding", "copy_dst", "render_attachment"],
        label: "blaze.content",
      });
    }
    return contentTexture;
  }

  function ensureFireTarget(): Target {
    const width = Math.max(1, Math.floor(output.width / 2));
    const height = Math.max(1, Math.floor(output.height / 2));
    if (!fireTarget) {
      fireTarget = target(gpu!, {
        size: [width, height],
        format: "rgba8unorm",
        label: "blaze.fire",
      });
    } else if (fireTarget.size[0] !== width || fireTarget.size[1] !== height) {
      fireTarget.resize([width, height]);
    }
    return fireTarget;
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
    mainFx!.set({ uContent: texture });
  }

  let time = 0;

  function render() {
    if (!gpu || !fireFx || !mainFx || !screen) return;
    uploadContent();
    const fire = ensureFireTarget();
    fireFx.set({
      params: {
        resolution: [output.width, output.height],
        time,
        height: config.height,
        sparks: config.sparks,
        sparkDensity: Math.max(config.sparkDensity, 0.05),
        sparkSize: Math.max(config.sparkSize, 0.05),
        layers: Math.min(Math.max(Math.round(config.layers), 1), 10),
        smoke: config.smoke,
        glow: config.glow,
        sparkColor: config.sparkColor,
        smokeColor: config.smokeColor,
      },
    });
    mainFx.set({
      uFire: fire,
      params: {
        time,
        height: config.height,
        distortion: config.distortion,
        distortionScale: Math.max(config.distortionScale, 0.05),
        maxX: contentMaxX,
        hasContent: htmlInCanvas ? 1 : 0,
      },
    });
    gpuFrame(gpu, (f) => {
      f.pass(fire, fireFx!);
      f.pass(screen!, mainFx!);
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
    if (!reducedMotion) time += delta * config.speed;
    render();
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
        label: "blaze",
      });
      const linear = sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      fireFx = effect(gpu, FIRE_SHADER, { label: "blaze.fire" });
      mainFx = effect(gpu, MAIN_SHADER, {
        label: "blaze",
        set: { uSampler: linear, uContent: ensureContentTexture() },
      });
      syncCanvasSize();
      start();
    })
    .catch((error) => {
      if (destroyed) return;
      console.warn("Blaze: WebGPU unavailable, showing content without the effect.", error);
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

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof BlazeOptions] !== value,
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
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      contentTexture?.destroy();
      destroyTarget(fireTarget);
      screen?.dispose();
      if (htmlInCanvas) paintable.onpaint = null;
    },
  };
}

```

