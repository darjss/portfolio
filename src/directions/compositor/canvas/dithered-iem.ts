// Dithered IEM — hand-implemented from the canvasui "Dithered Object" documented API.
// The published component renders a GLB model through a 1-bit Bayer dither post pass.
// Here the model is an IEM built from three.js primitives; the dither pass and studio
// lighting follow the published shader and room-former approach.

import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

export interface DitheredIemOptions {
  /** Size of the dither cells in CSS pixels. */
  gridSize?: number
  /** Lit dot color. */
  foreground?: string
  /** Unlit dot color. */
  background?: string
  /** Spin the model turntable-style. */
  autoRotate?: boolean
  /** Freeze the idle bob and rotation. */
  reducedMotion?: boolean
}

export interface DitheredIemInstance {
  resize: () => void
  destroy: () => void
}

const POST_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

const POST_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uGridSize;
uniform vec3 uFg;
uniform vec3 uBg;

const mat4 THRESHOLDS = mat4(
  0.94118, 0.29412, 0.76471, 0.05882,
  0.47059, 0.70588, 0.23529, 0.52941,
  0.82353, 0.11765, 0.88235, 0.17647,
  0.35294, 0.58824, 0.41176, 0.64706
);

float thresholdAt(vec2 cellCoord) {
  ivec2 p = ivec2(mod(cellCoord, 4.0));
  return THRESHOLDS[p.x][p.y];
}

void main() {
  vec2 fragCoord = vUv * uResolution;
  vec2 pixelUv = (floor(fragCoord / uGridSize) + 0.5) * uGridSize / uResolution;
  vec4 tex = texture2D(tDiffuse, pixelUv);
  float level = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float on = step(thresholdAt(fragCoord / uGridSize), level);
  vec3 col = mix(uBg, uFg, on);
  float cov = step(0.02, tex.a);
  gl_FragColor = vec4(col * cov, cov);
}`

function buildIem(accent: THREE.ColorRepresentation) {
  const group = new THREE.Group()

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x9a9aa4,
    roughness: 0.42,
    metalness: 0.08,
  })
  const plateMat = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.35,
    metalness: 0.25,
  })
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x55555e,
    roughness: 0.6,
    metalness: 0.05,
  })

  // Shell — the resin body that sits in the concha.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), shellMat)
  shell.scale.set(1, 0.82, 0.58)
  group.add(shell)

  // Faceplate — flat cap on the outer face.
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.54, 0.07, 48),
    plateMat,
  )
  plate.rotation.x = Math.PI / 2
  plate.position.z = 0.33
  plate.scale.set(1, 0.82, 1)
  group.add(plate)

  // Nozzle — the bore that points into the ear canal.
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.19, 0.5, 32),
    darkMat,
  )
  nozzle.position.set(0.3, 0.42, -0.12)
  nozzle.rotation.z = -0.75
  group.add(nozzle)

  // 2-pin socket on top.
  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.08, 24),
    darkMat,
  )
  socket.position.set(-0.25, 0.52, -0.05)
  group.add(socket)

  // Cable — a slack loop dropping from the socket.
  const cable = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.03, 12, 64, Math.PI * 1.15),
    darkMat,
  )
  cable.position.set(-0.25, 0.35, -0.05)
  cable.rotation.z = Math.PI * 0.9
  group.add(cable)

  return group
}

export function createDitheredIem(
  canvas: HTMLCanvasElement,
  options: DitheredIemOptions = {},
): DitheredIemInstance | null {
  const config = {
    gridSize: options.gridSize ?? 4,
    foreground: new THREE.Color(options.foreground ?? "#e5e5e5"),
    background: new THREE.Color(options.background ?? "#0a0a0a"),
    autoRotate: options.autoRotate ?? true,
    reducedMotion: options.reducedMotion ?? false,
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
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0.4, 0.5, 3.6)
  camera.lookAt(0, 0, 0)

  // Studio lighting: key, fill, and an accent rim, per the published room formers.
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 3.2)
  key.position.set(3, 4, 5)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.9)
  fill.position.set(-2, 1, 2)
  scene.add(fill)
  const back = new THREE.DirectionalLight(0xffffff, 1.4)
  back.position.set(-3, 2, -4)
  scene.add(back)
  const rim = new THREE.PointLight(0xf43f5e, 14, 30)
  rim.position.set(-4, -2, -3)
  scene.add(rim)

  const iem = buildIem(0xf43f5e)
  scene.add(iem)

  const controls = new OrbitControls(camera, canvas)
  controls.enableZoom = false
  controls.enablePan = false
  controls.enableDamping = true
  controls.autoRotate = config.autoRotate && !config.reducedMotion
  controls.autoRotateSpeed = 2

  // Dither post pass: scene -> render target -> Bayer threshold quad.
  let target = new THREE.WebGLRenderTarget(2, 2)
  const postScene = new THREE.Scene()
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const postMaterial = new THREE.ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tDiffuse: { value: target.texture },
      uResolution: { value: new THREE.Vector2(2, 2) },
      uGridSize: { value: config.gridSize },
      uFg: { value: new THREE.Vector3() },
      uBg: { value: new THREE.Vector3() },
    },
  })
  postMaterial.uniforms.uFg.value.set(
    config.foreground.r,
    config.foreground.g,
    config.foreground.b,
  )
  postMaterial.uniforms.uBg.value.set(
    config.background.r,
    config.background.g,
    config.background.b,
  )
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial)
  postQuad.frustumCulled = false
  postScene.add(postQuad)

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      target.dispose()
      target = new THREE.WebGLRenderTarget(width, height)
      postMaterial.uniforms.tDiffuse.value = target.texture
      postMaterial.uniforms.uResolution.value.set(width, height)
      postMaterial.uniforms.uGridSize.value = config.gridSize * dpr
    }
  }

  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  let raf = 0
  let destroyed = false
  let time = 0
  let last = performance.now()

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - last) / 1000, 1 / 30)
    last = now
    time += delta
    if (!config.reducedMotion) {
      iem.position.y = Math.sin(time * 1.4) * 0.08
      iem.rotation.z = Math.sin(time * 0.9) * 0.06
    }
    controls.update()
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(postScene, postCamera)
    raf = requestAnimationFrame(frame)
  }

  if (config.reducedMotion) {
    // One static frame; orbit drag still re-renders through controls change events.
    const renderOnce = () => {
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(postScene, postCamera)
    }
    renderOnce()
    controls.addEventListener("change", renderOnce)
  } else {
    raf = requestAnimationFrame(frame)
  }

  return {
    resize,
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      iem.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        for (const material of materials) material?.dispose()
      })
      postQuad.geometry.dispose()
      postMaterial.dispose()
      target.dispose()
      renderer.dispose()
    },
  }
}
