// DitheredIem — adapted from canvasui-docs/components/dithered-object.md
// (PUBLISHED source). The original renders a GLB model through a 1-bit Bayer
// dither post pass. There is no GLB to load for this portfolio, so the model
// is an IEM built from three.js primitives (shell, faceplate, nozzle, cable)
// and run through the same dither post pass. The WebGL context and RAF loop
// are fully released in destroy().

import * as THREE from "three"

export interface DitheredIemOptions {
  gridSize?: number
  pixelSizeRatio?: number
  highlight?: string
  floatSpeed?: number
}

export interface DitheredIemInstance {
  resize: () => void
  destroy: () => void
}

const POST_VERT = `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

const POST_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uGridSize;
uniform float uPixelSizeRatio;

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
  float pixelSize = uGridSize * uPixelSizeRatio;

  vec2 pixelUv = (floor(fragCoord / pixelSize) + 0.5) * pixelSize / uResolution;
  vec4 tex = texture(tDiffuse, pixelUv);
  vec3 color = toSrgb(tex.rgb);

  float level = dot(color, vec3(1.0));
  color = vec3(level);
  if (level < thresholdAt(fragCoord / uGridSize)) color = vec3(0.0);

  outColor = vec4(color * tex.a, tex.a);
}`

export function createDitheredIem(
  canvas: HTMLCanvasElement,
  options: DitheredIemOptions = {},
): DitheredIemInstance | null {
  const config = {
    gridSize: 4,
    pixelSizeRatio: 1,
    highlight: "#f43f5e",
    floatSpeed: 1.6,
    ...options,
  }

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    })
  } catch {
    return null
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
  camera.position.set(0, 0.4, 4.4)
  camera.lookAt(0, 0, 0)

  // IEM built from primitives
  const floatGroup = new THREE.Group()
  scene.add(floatGroup)

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xb8b8b8,
    roughness: 0.3,
    metalness: 0.35,
  })
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.55,
    metalness: 0.2,
  })
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.highlight),
    roughness: 0.35,
    metalness: 0.4,
    emissive: new THREE.Color(config.highlight),
    emissiveIntensity: 0.35,
  })

  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 32), shellMat)
  shell.scale.set(1, 0.82, 0.62)
  floatGroup.add(shell)

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 48), darkMat)
  plate.rotation.x = Math.PI / 2
  plate.position.z = 0.58
  floatGroup.add(plate)

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 12, 64), accentMat)
  ring.position.z = 0.58
  floatGroup.add(ring)

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.6, 24), darkMat)
  nozzle.rotation.z = Math.PI / 2.4
  nozzle.position.set(-1.05, 0.15, 0)
  floatGroup.add(nozzle)

  const cable = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.05, 8, 64, Math.PI * 0.9),
    darkMat,
  )
  cable.position.set(0.4, -0.4, -0.3)
  cable.rotation.set(0.6, 0.3, -0.7)
  floatGroup.add(cable)

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 4, 5)
  scene.add(key)
  const rim = new THREE.PointLight(new THREE.Color(config.highlight), 12, 20)
  rim.position.set(-3, -1, 2.5)
  scene.add(rim)

  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4 })
  target.texture.colorSpace = THREE.SRGBColorSpace

  const postMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    uniforms: {
      tDiffuse: { value: target.texture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uGridSize: { value: config.gridSize },
      uPixelSizeRatio: { value: config.pixelSizeRatio },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  })
  const postGeometry = new THREE.BufferGeometry()
  postGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      3,
    ),
  )
  const postMesh = new THREE.Mesh(postGeometry, postMaterial)
  postMesh.frustumCulled = false
  const postScene = new THREE.Scene()
  postScene.add(postMesh)
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  function syncSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    renderer.setSize(width, height, false)
    target.setSize(width, height)
    postMaterial.uniforms.uResolution.value.set(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  syncSize()

  const observer = new ResizeObserver(syncSize)
  observer.observe(canvas)

  let raf = 0
  let destroyed = false
  let lastTime = performance.now()
  let time = 0

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - lastTime) / 1000, 1 / 30)
    lastTime = now
    time += delta * config.floatSpeed
    floatGroup.position.y = Math.sin(time * 1.3) * 0.12
    floatGroup.rotation.y = Math.sin(time * 0.6) * 0.55 + time * 0.12
    floatGroup.rotation.z = Math.sin(time * 0.8) * 0.08

    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(postScene, postCamera)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return {
    resize() {
      syncSize()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      scene.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
      })
      shellMat.dispose()
      darkMat.dispose()
      accentMat.dispose()
      postGeometry.dispose()
      postMaterial.dispose()
      target.dispose()
      renderer.dispose()
    },
  }
}
