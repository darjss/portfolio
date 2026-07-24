// Pale dawn steppe sky. A single-pass, reduced-resolution adaptation of the
// Canvas UI Clouds field shader (canvasui-docs/components/clouds.md), rendered
// as pure sky — no live-DOM capture, so it works in every WebGL2 browser.

export interface SkyOptions {
  /** Drift speed in m/s-equivalents, read per frame. */
  windSpeed?: () => number
  /** Freeze the drift (prefers-reduced-motion). */
  still?: boolean
}

export interface SkyHandle {
  destroy: () => void
}

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
uniform vec2 uRes;
uniform float uTime;
uniform float uCover;

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
  for (int i = 0; i < 6; i++) {
    total += noise(n) * amplitude;
    n = m * n;
    amplitude *= 0.4;
  }
  return total;
}

void main () {
  vec2 p = vUv;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float q = fbm(p * asp * 0.5);

  float r = 0.0;
  vec2 uv = p * asp;
  uv -= q - uTime;
  float weight = 0.8;
  for (int i = 0; i < 6; i++) {
    r += abs(weight * noise(uv));
    uv = m * uv + uTime;
    weight *= 0.7;
  }

  float f = 0.0;
  uv = p * asp;
  uv -= q - uTime;
  weight = 0.7;
  for (int i = 0; i < 6; i++) {
    f += weight * noise(uv);
    uv = m * uv + uTime;
    weight *= 0.6;
  }
  f *= r + f;

  float coverage = clamp(uCover + 2.2 * f * r, 0.0, 1.0);
  float mist = smoothstep(0.05, 0.9, coverage);

  // Pale dawn cloud: milk-rose, a little brighter near the horizon.
  vec3 cloud = mix(vec3(0.62, 0.55, 0.58), vec3(0.93, 0.78, 0.72), vUv.y);
  float alpha = mist * 0.4;
  outColor = vec4(cloud * alpha, alpha);
}`;

export function createSky(
  canvas: HTMLCanvasElement,
  options: SkyOptions = {},
): SkyHandle | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  })
  if (!gl || gl.isContextLost()) return null

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!
    gl!.shaderSource(shader, text)
    gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error("Sky shader error:", gl!.getShaderInfoLog(shader))
    }
    return shader
  }

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.useProgram(program)

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(program, "uRes")
  const uTime = gl.getUniformLocation(program, "uTime")
  const uCover = gl.getUniformLocation(program, "uCover")

  function syncSize() {
    // Clouds are soft: render at low internal resolution and upscale.
    const scale = 0.4
    const width = Math.max(16, Math.round(canvas.clientWidth * scale))
    const height = Math.max(16, Math.round(canvas.clientHeight * scale))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
  }

  syncSize()
  const observer = new ResizeObserver(syncSize)
  observer.observe(canvas)

  let time = Math.random() * 64
  let raf = 0
  let lastTime = performance.now()
  let destroyed = false

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - lastTime) / 1000, 1 / 10)
    lastTime = now
    const speed = options.windSpeed ? options.windSpeed() : 3
    if (!options.still) time += delta * (0.02 + speed * 0.006)

    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.uniform2f(uRes, canvas.width, canvas.height)
    gl!.uniform1f(uTime, time)
    gl!.uniform1f(uCover, 0.12)
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)

    if (options.still) return // one static frame is enough
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      gl!.deleteProgram(program)
      gl!.deleteShader(vs)
      gl!.deleteShader(fs)
      gl!.deleteBuffer(quad)
    },
  }
}
