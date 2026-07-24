# Dithered Object

> Source status: **PUBLISHED — full vanilla TypeScript source captured below.**

- Documentation: [https://canvasui.dev/docs/components/dithered-object](https://canvasui.dev/docs/components/dithered-object)
- Vanilla registry source: [https://canvasui.dev/r/dithered-object-vanilla.json](https://canvasui.dev/r/dithered-object-vanilla.json)
- Published file: `components/canvasui/DitheredObjectVanilla.ts`
- A Solid flavor tab and registry entry exist: `npx shadcn@latest add @canvas-ui/dithered-object-solid`.

## What it does

Point it at any GLB or glTF model and it floats in a lit studio, rendered through a classic Bayer dither. Built on three.js.

## Install

```sh
npx shadcn@latest add @canvas-ui/dithered-object-vanilla
# Solid wrapper supplied by Canvas UI:
npx shadcn@latest add @canvas-ui/dithered-object-solid
```

## Dependencies

- `three`
- WebGL through `three` in a modern browser. This component does not use `layoutsubtree` or html-in-canvas.

## Options interface

```ts
export interface DitheredObjectOptions {
  /** URL of the GLB/glTF model to display. Object URLs from a file input work too. */
  src?: string;
  /** Size of the dither cells in CSS pixels. */
  gridSize?: number;
  /** Extra pixelation applied on top of the grid size (1 to 10). */
  pixelSizeRatio?: number;
  /** Collapse the scene to grayscale before dithering. */
  grayscale?: boolean;
  /** Invert the final colors. */
  invert?: boolean;
  /** Enable the dither pass. Turn off to see the raw render. */
  dither?: boolean;
  /** Background color behind the model. Empty string keeps the canvas transparent. */
  background?: string;
  /** Accent color of the ring light in the studio environment. */
  highlight?: string;
  /** Brightness of the studio environment lighting. */
  environmentIntensity?: number;
  /** Roughness override applied to every material (0 to 1). Negative keeps the model's own values. */
  roughness?: number;
  /** Size of the longest side of the model in scene units. The camera sits about 4 units away. */
  scale?: number;
  /** Horizontal offset of the model in scene units. */
  xOffset?: number;
  /** Vertical offset of the model in scene units. */
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
  /** Spin the camera around the model turntable-style. */
  autoRotate?: boolean;
  /** Turntable speed when autoRotate is on. */
  autoRotateSpeed?: number;
  /** Camera field of view in degrees. */
  fov?: number;
  /** Camera distance from the center of the model. */
  cameraDistance?: number;
  /** Base URL of the Draco decoder, fetched only when a model needs it. */
  dracoDecoderPath?: string;
  /** Called after a model finishes loading. */
  onLoad?: (() => void) | null;
  /** Called when a model fails to load. */
  onError?: ((error: unknown) => void) | null;
}
```

## Factory API

```ts
export interface DitheredObjectElements {
  /** Canvas the scene renders to. */
  canvas: HTMLCanvasElement;
}

export interface DitheredObjectInstance {
  /** Update options live. Changing src loads the new model. */
  setOptions: (options: DitheredObjectOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

export function createDitheredObject(
  elements: DitheredObjectElements,
  options: DitheredObjectOptions = {},
): DitheredObjectInstance | null;
```

`createDitheredObject(elements, options)` returns `DitheredObjectInstance | null`. A `null` result means that the required rendering context could not be created. Use the instance methods shown above for live updates, explicit resize requests, component-specific actions, and cleanup.

## Required DOM structure

The factory needs one connected canvas. Pass it as `{ canvas }` to `createDitheredObject`.

```html
<canvas class="effect-canvas" aria-label="Dithered Object"></canvas>
```

Give the canvas an explicit CSS size. The factory manages its drawing-buffer size and observes resizes.

## API reference

| Property | Type | Default |
| --- | --- | --- |
| `src`<br>URL of the GLB/glTF model to display. Object URLs from a file input work too. Draco-compressed models are supported via a decoder fetched on demand. | `string` | — |
| `gridSize`<br>Size of the dither cells in CSS pixels. | `number` | `4` |
| `pixelSizeRatio`<br>Extra pixelation applied on top of the grid size (1 to 10). | `number` | `1` |
| `grayscale`<br>Collapse the scene to grayscale before dithering. | `boolean` | `true` |
| `invert`<br>Invert the final colors. | `boolean` | `false` |
| `dither`<br>Enable the dither pass. Turn off to see the raw render. | `boolean` | `true` |
| `background`<br>Background color behind the model. Leave empty for a transparent canvas. | `string` | `"" (transparent)` |
| `highlight`<br>Accent color of the ring light in the studio environment. | `string` | `"#066aff"` |
| `environmentIntensity`<br>Brightness of the studio environment lighting. | `number` | `0.1` |
| `roughness`<br>Roughness override applied to every material (0 to 1). Negative keeps the model's own values. | `number` | `-1` |
| `scale`<br>Size of the longest side of the model in scene units. The camera sits about 4 units away. | `number` | `3` |
| `xOffset`<br>Horizontal offset of the model in scene units. | `number` | `0` |
| `yOffset`<br>Vertical offset of the model in scene units. | `number` | `0` |
| `floatIntensity`<br>Strength of the floating bob animation (0 disables). | `number` | `2` |
| `rotationIntensity`<br>Strength of the idle rocking rotation (0 disables). | `number` | `1` |
| `floatSpeed`<br>Speed of the float and rocking animation. | `number` | `2` |
| `orbit`<br>Let the user orbit the camera by dragging. | `boolean` | `true` |
| `zoom`<br>Let the user zoom with the scroll wheel or pinch. | `boolean` | `false` |
| `autoRotate`<br>Spin the camera around the model turntable-style. | `boolean` | `false` |
| `autoRotateSpeed`<br>Turntable speed when autoRotate is on. | `number` | `2` |
| `fov`<br>Camera field of view in degrees. | `number` | `65` |
| `cameraDistance`<br>Camera distance from the center of the model. | `number` | `4.2` |
| `dracoDecoderPath`<br>Base URL of the Draco decoder, fetched only when a model needs it. | `string` | `"https://www.gstatic.com/draco/versioned/decoders/1.5.7/"` |
| `onLoad`<br>Called after a model finishes loading. | `() => void` | — |
| `onError`<br>Called when a model fails to load. | `(error: unknown) => void` | — |
| `className`<br>Classes applied to the wrapper element. | `string` | — |

## Full vanilla TypeScript source

The following source is complete and is not truncated. It is the content published by the Canvas UI vanilla registry entry linked above.

```ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface DitheredObjectOptions {
  /** URL of the GLB/glTF model to display. Object URLs from a file input work too. */
  src?: string;
  /** Size of the dither cells in CSS pixels. */
  gridSize?: number;
  /** Extra pixelation applied on top of the grid size (1 to 10). */
  pixelSizeRatio?: number;
  /** Collapse the scene to grayscale before dithering. */
  grayscale?: boolean;
  /** Invert the final colors. */
  invert?: boolean;
  /** Enable the dither pass. Turn off to see the raw render. */
  dither?: boolean;
  /** Background color behind the model. Empty string keeps the canvas transparent. */
  background?: string;
  /** Accent color of the ring light in the studio environment. */
  highlight?: string;
  /** Brightness of the studio environment lighting. */
  environmentIntensity?: number;
  /** Roughness override applied to every material (0 to 1). Negative keeps the model's own values. */
  roughness?: number;
  /** Size of the longest side of the model in scene units. The camera sits about 4 units away. */
  scale?: number;
  /** Horizontal offset of the model in scene units. */
  xOffset?: number;
  /** Vertical offset of the model in scene units. */
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
  /** Spin the camera around the model turntable-style. */
  autoRotate?: boolean;
  /** Turntable speed when autoRotate is on. */
  autoRotateSpeed?: number;
  /** Camera field of view in degrees. */
  fov?: number;
  /** Camera distance from the center of the model. */
  cameraDistance?: number;
  /** Base URL of the Draco decoder, fetched only when a model needs it. */
  dracoDecoderPath?: string;
  /** Called after a model finishes loading. */
  onLoad?: (() => void) | null;
  /** Called when a model fails to load. */
  onError?: ((error: unknown) => void) | null;
}

export interface DitheredObjectElements {
  /** Canvas the scene renders to. */
  canvas: HTMLCanvasElement;
}

export interface DitheredObjectInstance {
  /** Update options live. Changing src loads the new model. */
  setOptions: (options: DitheredObjectOptions) => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<DitheredObjectOptions> = {
  src: "",
  gridSize: 4,
  pixelSizeRatio: 1,
  grayscale: true,
  invert: false,
  dither: true,
  background: "",
  highlight: "#066aff",
  environmentIntensity: 0.1,
  roughness: -1,
  scale: 3,
  xOffset: 0,
  yOffset: 0,
  floatIntensity: 2,
  rotationIntensity: 1,
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
uniform vec2 uResolution;
uniform float uGridSize;
uniform float uPixelSizeRatio;
uniform float uGrayscale;
uniform float uInvert;
uniform float uDither;

const mat4 THRESHOLDS = mat4(
  0.94118, 0.29412, 0.76471, 0.05882,
  0.47059, 0.70588, 0.23529, 0.52941,
  0.82353, 0.11765, 0.88235, 0.17647,
  0.35294, 0.58824, 0.41176, 0.64706
);

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

float thresholdAt(vec2 cellCoord) {
  ivec2 p = ivec2(mod(cellCoord, 4.0));
  return THRESHOLDS[p.x][p.y];
}

void main() {
  vec2 fragCoord = vUv * uResolution;
  if (uDither < 0.5) {
    vec4 raw = texture(tDiffuse, vUv);
    outColor = vec4(toSrgb(raw.rgb) * raw.a, raw.a);
    return;
  }
  float pixelSize = uGridSize * uPixelSizeRatio;

  vec2 pixelUv = (floor(fragCoord / pixelSize) + 0.5) * pixelSize / uResolution;
  vec4 tex = texture(tDiffuse, pixelUv);
  vec3 color = toSrgb(tex.rgb);

  float level = dot(color, vec3(1.0));
  if (uGrayscale > 0.5) color = vec3(level);
  if (level < thresholdAt(fragCoord / uGridSize)) color = vec3(0.0);
  if (uInvert > 0.5) color = 1.0 - color;

  outColor = vec4(color * tex.a, tex.a);
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
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

export function createDitheredObject(
  elements: DitheredObjectElements,
  options: DitheredObjectOptions = {},
): DitheredObjectInstance | null {
  const { canvas } = elements;
  const config: Required<DitheredObjectOptions> = { ...DEFAULTS, ...options };

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

  const postMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    uniforms: {
      tDiffuse: { value: target.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uGridSize: { value: 4 },
      uPixelSizeRatio: { value: 1 },
      uGrayscale: { value: 1 },
      uInvert: { value: 0 },
      uDither: { value: 1 },
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

  function loadModel() {
    const src = config.src;
    if (src === loadedSrc) return;
    loadedSrc = src;
    const token = ++loadToken;
    if (!src) {
      clearModel();
      return;
    }
    draco.setDecoderPath(config.dracoDecoderPath);
    loader.load(
      src,
      (gltf) => {
        if (disposed || token !== loadToken) {
          disposeObject(gltf.scene);
          return;
        }
        clearModel();
        model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const offset = bounds.getCenter(new THREE.Vector3());
        modelMaxDim = Math.max(size.x, size.y, size.z, 1e-4);
        model.position.sub(offset);
        applyRoughness();
        applyFit();
        fitGroup.add(model);
        config.onLoad?.();
      },
      undefined,
      (error) => {
        if (disposed || token !== loadToken) return;
        config.onError?.(error);
      },
    );
  }

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
    controls.enableRotate = config.orbit;
    controls.enableZoom = config.zoom;
    controls.autoRotate = config.autoRotate && !reducedMotion;
    controls.autoRotateSpeed = config.autoRotateSpeed;
    camera.fov = config.fov;
    camera.updateProjectionMatrix();
    floatGroup.position.x = config.xOffset;
    floatGroup.position.y = MODEL_LIFT + config.yOffset;
    const pr = renderer.getPixelRatio();
    postMaterial.uniforms.uGridSize.value = Math.max(config.gridSize, 1) * pr;
    postMaterial.uniforms.uPixelSizeRatio.value = Math.max(
      config.pixelSizeRatio,
      1,
    );
    postMaterial.uniforms.uGrayscale.value = config.grayscale ? 1 : 0;
    postMaterial.uniforms.uInvert.value = config.invert ? 1 : 0;
    postMaterial.uniforms.uDither.value = config.dither ? 1 : 0;
    applyRoughness();
    applyFit();
  }

  function resize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    const pixelSize = config.dither
      ? Math.max(config.gridSize, 1) * Math.max(config.pixelSizeRatio, 1) * pr
      : 1;
    const targetScale = Math.min(1, 2 / pixelSize);
    target.setSize(
      Math.max(Math.round(width * pr * targetScale), 1),
      Math.max(Math.round(height * pr * targetScale), 1),
    );
    postMaterial.uniforms.uResolution.value.set(
      Math.round(width * pr),
      Math.round(height * pr),
    );
    postMaterial.uniforms.uGridSize.value = Math.max(config.gridSize, 1) * pr;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  applyOptions();
  loadModel();

  let inView = true;
  const viewObserver =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          inView = entries[entries.length - 1]?.isIntersecting ?? true;
        })
      : null;
  viewObserver?.observe(canvas);

  let lastTime = 0;
  let elapsed = Math.random() * 100;

  renderer.setAnimationLoop((time: number) => {
    if (!inView) {
      lastTime = 0;
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

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  });

  return {
    setOptions(next: DitheredObjectOptions) {
      const previousHighlight = config.highlight;
      const previousDistance = config.cameraDistance;
      Object.assign(config, next);
      if (config.highlight !== previousHighlight) envDirty = true;
      if (config.cameraDistance !== previousDistance) {
        camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance);
      }
      applyOptions();
      resize();
      loadModel();
    },
    resize,
    destroy() {
      disposed = true;
      loadToken += 1;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      viewObserver?.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      controls.dispose();
      clearModel();
      if (roomScene) disposeObject(roomScene);
      envTarget?.dispose();
      pmrem.dispose();
      draco.dispose();
      target.dispose();
      postGeometry.dispose();
      postMaterial.dispose();
      renderer.dispose();
    },
  };
}
```
