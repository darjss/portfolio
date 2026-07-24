// ShatterDrop — adapted from canvasui-docs/components/shatter.md (PUBLISHED
// source). Adaptations for the Flip direction:
// - The shard texture is the PostFx output canvas (the final ascii page), so
//   the ASCII page itself shatters into refractive 3D glass shards.
// - A uFall uniform drives the drop: per-shard delay, gravity fall, extra
//   spin, and a global fade. Shards fall away and reveal SIDE B beneath.
// - The gap between shards is transparent instead of a solid void color.
// drop() starts the fall and calls back when the page is gone. All GPU
// resources are released in destroy().

import {
  compileShader,
  createBlankTexture,
  createQuad,
  fitCanvas,
} from "./support"

export interface ShatterDropOptions {
  tileSize?: number
  lift?: number
  tilt?: number
  scatter?: number
  perspective?: number
  shadow?: number
  shading?: number
  refraction?: number
  dispersion?: number
  floatSpeed?: number
  fallDuration?: number
}

export interface ShatterDropInstance {
  drop: (onDone: () => void) => void
  resize: () => void
  destroy: () => void
}

const DEFAULTS: Required<ShatterDropOptions> = {
  tileSize: 110,
  lift: 16,
  tilt: 1.4,
  scatter: 6,
  perspective: 1400,
  shadow: 0.5,
  shading: 0.6,
  refraction: 1.6,
  dispersion: 0.4,
  floatSpeed: 0.8,
  fallDuration: 1.7,
}

const TIME_WRAP = Math.PI * 800

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
void main () {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform float uTile;
uniform float uShards;
uniform float uCorner;
uniform float uLift;
uniform float uTilt;
uniform float uScatter;
uniform float uPersp;
uniform float uShadow;
uniform float uShading;
uniform float uRefract;
uniform float uDispersion;
uniform float uTime;
uniform float uFall;
out vec4 outColor;

const float TAU = 6.28318530718;
const vec2 LIGHT = vec2(-0.514495755, 0.857492926);

vec2 hash22 (vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

float smin (float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float shardD (vec2 q, vec2 cell, float k) {
  float jit = uTile * 0.8 * clamp(uShards, 0.0, 1.0);
  vec2 s0 = (hash22(cell) - 0.5) * jit;
  float d = uTile;
  for (int i = 0; i < 9; i++) {
    if (i == 4) continue;
    vec2 g = vec2(float(i % 3 - 1), float(i / 3 - 1));
    vec2 sn = g * uTile + (hash22(cell + g) - 0.5) * jit;
    vec2 diff = sn - s0;
    float e = -dot(q - s0 - diff * 0.5, normalize(diff));
    d = smin(d, e, k);
  }
  return d;
}

vec3 pick (vec2 uv) {
  vec2 c = clamp(uv, vec2(0.0005), vec2(0.9995));
  return texture(uContent, vec2(c.x, 1.0 - c.y)).rgb;
}

void cellDyn (
  vec2 cell,
  vec2 sxy,
  float act,
  out mat3 R,
  out float lift,
  out vec2 anchor,
  out float k
) {
  vec2 center = (cell + 0.5) * uTile;
  vec4 seed = vec4(sxy, hash22(cell + 27.7));

  // the drop: per-shard delayed gravity fall with extra spin
  float fl = clamp((uFall - seed.x * 0.4) / 0.6, 0.0, 1.0) * act;

  float wob = sin(uTime + seed.z * TAU);
  float maxT = 0.2 * clamp(uTilt, 0.0, 3.0) * act;
  float rx = (seed.y - 0.5) * 2.0 * maxT * (0.75 + 0.25 * wob)
    + fl * (seed.z - 0.5) * 9.0;
  float ry = (seed.z - 0.5) * 2.0 * maxT
    * (0.75 + 0.25 * cos(uTime * 0.7 + seed.w * TAU))
    + fl * (seed.w - 0.5) * 9.0;
  float rz = (seed.w - 0.5) * 1.2 * maxT * (0.85 + 0.15 * wob)
    + fl * (seed.y - 0.5) * 3.0;
  float cx = cos(rx); float sx = sin(rx);
  float cy = cos(ry); float sy = sin(ry);
  float cz = cos(rz); float sz = sin(rz);
  R = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0)
    * mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy)
    * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);

  lift = uLift * act * (0.72 + 0.36 * seed.y)
    * (0.86 + 0.14 * sin(uTime * 0.9 + seed.w * TAU))
    + fl * uTile * (1.5 + seed.y * 3.0);
  vec2 shift = (seed.zw - 0.5) * 2.0 * uScatter * act * (0.85 + 0.15 * wob);
  anchor = center + shift;
  anchor.x += fl * (seed.w - 0.5) * uTile * 3.0;
  anchor.y -= fl * fl * uTile * (2.0 + seed.z * 4.0);
  k = max(min(uCorner * act, uTile * 0.45), 1e-2);
}

bool invMap (
  vec2 P,
  mat3 R,
  float lift,
  vec2 anchor,
  out vec2 q
) {
  vec2 w = P - anchor;
  float m11 = uPersp * R[0][0] + w.x * R[0][2];
  float m12 = uPersp * R[1][0] + w.x * R[1][2];
  float m21 = uPersp * R[0][1] + w.y * R[0][2];
  float m22 = uPersp * R[1][1] + w.y * R[1][2];
  float det = m11 * m22 - m12 * m21;
  if (abs(det) < 1e-4) return false;
  vec2 b = w * (uPersp - lift);
  q = vec2(m22 * b.x - m12 * b.y, m11 * b.y - m21 * b.x) / det;
  return true;
}

void main () {
  vec2 P = gl_FragCoord.xy;
  vec2 uvR = P / uResolution;

  vec2 cuvR = clamp(uvR, vec2(0.0005), vec2(0.9995));
  vec4 tex = texture(uContent, vec2(cuvR.x, 1.0 - cuvR.y));
  float guard = tex.a;
  if (guard < 1e-4) {
    outColor = vec4(0.0);
    return;
  }

  vec2 baseCell = floor(P / uTile);
  float act = 1.0;
  mat3 R; float lift; vec2 anchor; float k;
  vec2 sxy; vec2 q;

  float shadowGain = clamp(uShadow, 0.0, 2.0) * 0.5;
  float shadowA = 0.0;
  float shadowZ = 0.0;
  vec2 shadowCell = vec2(1e6);

  float sumA = 0.0;
  float k1 = -1e9; float a1 = 0.0; vec3 c1 = vec3(0.0);
  vec2 cell1 = vec2(1e6);
  float k2 = -1e9; float a2 = 0.0; vec3 c2 = vec3(0.0);
  vec2 cell2 = vec2(1e6);

  // box cull: shards only fall down, so a shard at P comes from a cell
  // directly above P, at most ~6 tiles of travel away.
  for (int j = -3; j <= 9; j++) {
    for (int i = -3; i <= 3; i++) {
      vec2 cell = baseCell + vec2(float(i), float(j));
      vec2 center = (cell + 0.5) * uTile;
      vec2 cp = center - P;
      sxy = hash22(cell + 13.13);
      float flEst = clamp((uFall - sxy.x * 0.4) / 0.6, 0.0, 1.0);
      float travel = flEst * flEst * uTile * 6.0 + uTile * 1.6 + uLift;
      float side = flEst * uTile * 1.5 + uScatter + uLift * 0.5 + uTile * 1.6;
      if (abs(cp.x) > side) continue;
      if (cp.y < -uTile * 1.6) continue;
      if (cp.y > travel) continue;

      cellDyn(cell, sxy, act, R, lift, anchor, k);

      if (shadowGain > 1e-3 && lift > 0.5 && uFall < 0.05) {
        vec2 qs = P + LIGHT * lift * 0.5 - anchor;
        float blur = max(lift * 0.4, 1.0);
        float srad = uTile * 0.95 + blur;
        if (dot(qs, qs) < srad * srad) {
          float sA = 1.0 - smoothstep(-blur, blur, -shardD(qs, cell, k));
          sA *= shadowGain * act * act;
          if (sA > shadowA) {
            shadowA = sA;
            shadowZ = lift;
            shadowCell = cell;
          }
        }
      }

      if (!invMap(P, R, lift, anchor, q)) continue;
      float d = shardD(q, cell, k);
      float a = 1.0 - smoothstep(-1.5, 1.5, -d);
      if (a < 0.003) continue;
      vec2 uvS = (center + q) / uResolution;
      vec3 n = R * vec3(0.0, 0.0, 1.0);
      float rA = uRefract * act * act;
      vec3 col;
      if (rA < 1e-3) {
        col = pick(uvS);
      } else {
        vec2 refr = -n.xy * (rA * uTile * 0.25) / uResolution;
        float spread = uDispersion * 0.6;
        col = vec3(
          pick(uvS + refr * (1.0 + spread)).r,
          pick(uvS + refr).g,
          pick(uvS + refr * (1.0 - spread)).b);
      }
      col *= clamp(
        1.0 + clamp(uShading, 0.0, 2.0) * act * dot(n.xy, LIGHT) * 0.6,
        0.0, 2.0);
      sumA += a;
      if (lift > k1) {
        k2 = k1; a2 = a1; c2 = c1; cell2 = cell1;
        k1 = lift; a1 = a; c1 = col; cell1 = cell;
      } else if (lift > k2) {
        k2 = lift; a2 = a; c2 = col; cell2 = cell;
      }
    }
  }

  if (shadowA > 1e-3) {
    if (any(notEqual(cell1, shadowCell))) {
      c1 *= 1.0 - shadowA * clamp((shadowZ - k1) / (uTile * 0.2), 0.0, 1.0);
    }
    if (any(notEqual(cell2, shadowCell))) {
      c2 *= 1.0 - shadowA * clamp((shadowZ - k2) / (uTile * 0.2), 0.0, 1.0);
    }
  }

  float cover = clamp(sumA, 0.0, 1.0);
  float sep = max(uLift * 0.25, 2.0);
  float f = clamp((k1 - k2) / sep, 0.0, 1.0);
  float w1 = a1 * (0.5 + 0.5 * f);
  float w2 = a2 * (1.0 - w1);
  float layered = w1 + w2;
  vec3 shardCol = layered > 1e-6
    ? (c1 * w1 + c2 * w2) / layered
    : vec3(0.0);

  float fade = 1.0 - smoothstep(0.55, 1.15, uFall);
  if (cover < 1e-3 || fade < 1e-3) {
    outColor = vec4(0.0);
    return;
  }
  outColor = vec4(shardCol, guard * cover * fade);
}`

export function createShatterDrop(
  input: HTMLCanvasElement,
  output: HTMLCanvasElement,
  options: ShatterDropOptions = {},
): ShatterDropInstance | null {
  const config = { ...DEFAULTS, ...options }

  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: true,
    premultipliedAlpha: false,
  })
  if (!gl || gl.isContextLost()) return null

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERT, "ShatterDrop")
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAG, "ShatterDrop")
  const program = gl.createProgram()!
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  const uniforms: Record<string, WebGLUniformLocation> = {}
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < uniformCount; i++) {
    const info = gl.getActiveUniform(program, i)!
    uniforms[info.name] = gl.getUniformLocation(program, info.name)!
  }

  const quad = createQuad(gl)
  const contentTexture = createBlankTexture(gl)

  function syncCanvasSize() {
    fitCanvas(output)
  }
  syncCanvasSize()

  let time = 0
  let fall = 0
  let dropping = false
  let onDone: (() => void) | null = null

  function render() {
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, input)

    gl!.useProgram(program)
    gl!.activeTexture(gl!.TEXTURE0)
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture)
    gl!.uniform1i(uniforms.uContent, 0)
    gl!.uniform2f(uniforms.uResolution, output.width, output.height)
    const dpr = output.width / Math.max(output.clientWidth, 1)
    const tilePx = Math.max(config.tileSize, 24) * dpr
    gl!.uniform1f(uniforms.uTile, tilePx)
    gl!.uniform1f(uniforms.uCorner, 0)
    gl!.uniform1f(uniforms.uLift, Math.max(config.lift, 0) * dpr)
    gl!.uniform1f(uniforms.uTilt, config.tilt)
    gl!.uniform1f(uniforms.uScatter, Math.max(config.scatter, 0) * dpr)
    gl!.uniform1f(uniforms.uPersp, Math.max(config.perspective, 200) * dpr)
    gl!.uniform1f(uniforms.uShadow, config.shadow)
    gl!.uniform1f(uniforms.uShading, config.shading)
    gl!.uniform1f(uniforms.uShards, 1)
    gl!.uniform1f(uniforms.uRefract, Math.max(config.refraction, 0))
    gl!.uniform1f(uniforms.uDispersion, Math.min(Math.max(config.dispersion, 0), 1))
    gl!.uniform1f(uniforms.uTime, time)
    gl!.uniform1f(uniforms.uFall, fall)
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
    gl!.viewport(0, 0, output.width, output.height)
    gl!.disable(gl!.BLEND)
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
  }

  let raf = 0
  let lastTime = performance.now()
  let destroyed = false

  function frame(now: number) {
    if (destroyed) return
    const delta = Math.min((now - lastTime) / 1000, 1 / 30)
    lastTime = now
    time += delta * config.floatSpeed
    if (time >= TIME_WRAP) time -= TIME_WRAP
    if (dropping) {
      fall += (delta / config.fallDuration) * 1.3
      if (fall >= 1.3) {
        fall = 1.3
        dropping = false
        const done = onDone
        onDone = null
        done?.()
      }
    }
    render()
    raf = requestAnimationFrame(frame)
  }

  lastTime = performance.now()
  raf = requestAnimationFrame(frame)

  const observer = new ResizeObserver(() => {
    syncCanvasSize()
  })
  observer.observe(output)

  return {
    drop(done) {
      onDone = done
      dropping = true
    },
    resize() {
      syncCanvasSize()
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      gl!.deleteTexture(contentTexture)
      gl!.deleteProgram(program)
      gl!.deleteShader(vertexShader)
      gl!.deleteShader(fragmentShader)
      gl!.deleteBuffer(quad)
    },
  }
}
