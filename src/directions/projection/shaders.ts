const common = `#version 300 es
precision highp float;
precision highp int;
float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
float fbm3(vec3 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise3(p); p *= 2.07; a *= 0.5; } return s; }
`

export const quadVert = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

export const filmFrag = `${common}
uniform sampler2D uSrc;
uniform sampler2D uPrev;
uniform vec2 uView;
uniform float uDpr;
uniform vec4 uAp;
uniform float uTime;
uniform float uFrame;
uniform vec2 uWeave;
uniform float uSlip;
uniform int uKind;
uniform float uT;
uniform float uCue;
uniform float uSmear;
uniform vec2 uStreak;
uniform float uEdge;
uniform float uGrain;
uniform float uLamp;
uniform vec3 uTint;
out vec4 o;

vec3 src(vec2 css) { return texture(uSrc, css / uView).rgb; }
vec3 srcLod(vec2 css, float l) { return textureLod(uSrc, css / uView, l).rgb; }

float burnField(vec2 q, float b, vec2 c, float seed) {
  vec2 d = (q - c) * vec2(uAp.z / uAp.w, 1.0);
  float n = fbm(q * 5.0 + seed + uTime * 0.35) * 0.32 + fbm(q * 19.0 - uTime * 0.8 + seed) * 0.07;
  return length(d) - b * b * 2.1 + n * (0.4 + b);
}

void main() {
  vec2 px = gl_FragCoord.xy / uDpr;
  px.y = uView.y - px.y;
  vec2 q = (px - uAp.xy) / uAp.zw;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }

  float edgeW = uEdge * 0.085;
  float frameY = q.y + uSlip;
  float local = fract(frameY);
  float frameLine = smoothstep(0.0, 0.004, local) * smoothstep(0.042, 0.038, local);
  vec2 qi = vec2((q.x - edgeW) / (1.0 - edgeW), local);

  vec3 col;
  if (q.x < edgeW) {
    float ex = q.x / edgeW;
    vec3 base = vec3(0.09, 0.055, 0.03);
    float hy = fract(frameY * 4.0);
    vec2 hd = abs(vec2(ex - 0.26, hy - 0.5)) - vec2(0.15, 0.17);
    float hole = 1.0 - smoothstep(-0.02, 0.02, length(max(hd, 0.0)) + min(max(hd.x, hd.y), 0.0) - 0.04);
    float amp = 0.25 + 0.6 * fbm(vec2(frameY * 30.0, uTime * 0.2));
    float track = step(abs(ex - 0.74), 0.16 * amp) * step(0.56, ex) * step(ex, 0.92);
    col = base + vec3(1.0, 0.97, 0.9) * hole * 1.15 + vec3(0.85, 0.82, 0.7) * track * 0.75;
  } else {
    vec2 css = uAp.xy + qi * uAp.zw + uWeave;
    if (uKind == 1 && uT < 0.0) {
      float b = smoothstep(-0.92, -0.02, uT);
      vec2 dir = normalize(q - vec2(0.62, 0.42) + 1e-4);
      float melt = smoothstep(0.25, 0.0, burnField(q, b, vec2(0.62, 0.42), 0.0));
      css -= dir * melt * 26.0 * b;
    }
    if (length(uStreak) > 0.5) {
      vec3 acc = vec3(0.0);
      float wsum = 0.0;
      for (int i = 0; i < 12; i++) {
        float f = float(i) / 11.0;
        float w = 1.0 - f * 0.6;
        acc += src(css - uStreak * f) * w;
        wsum += w;
      }
      col = acc / wsum;
    } else {
      col = src(css);
    }
    vec3 bloom = srcLod(css, 3.0) * 0.5 + srcLod(css, 5.0) * 0.5;
    col += max(bloom - 0.42, 0.0) * vec3(1.0, 0.32, 0.12) * 0.9;
    col *= mix(1.0, frameLine, step(0.0005, abs(uSlip)));
  }

  col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
  col *= uTint;
  vec2 hc = (q - 0.5) * vec2(1.0, uAp.w / uAp.z) * 1.7;
  col *= 1.07 - 0.32 * dot(hc, hc);

  if (uKind == 0) {
    float s = 1.0 - smoothstep(0.0, 0.14, abs(uT));
    float tape = step(abs(q.y - 0.5 + (q.x - 0.5) * 0.18 + uT * 2.0), 0.16);
    col = mix(col, col * 0.6 + vec3(1.0, 0.94, 0.72) * 0.55, tape * s);
    col += s * 0.35;
  }
  if (uKind == 1) {
    if (uT < 0.0) {
      float b = smoothstep(-0.92, -0.02, uT);
      float e = min(burnField(q, b, vec2(0.62, 0.42), 0.0), burnField(q, b * 0.8, vec2(0.28, 0.66), 7.3) + 0.05);
      float hole = smoothstep(0.004, -0.01, e);
      float rim = smoothstep(0.07, 0.0, e) * (1.0 - hole);
      float scorch = smoothstep(0.2, 0.02, e);
      col *= 1.0 - scorch * 0.8;
      col = mix(col, vec3(1.6, 0.62, 0.16), rim * 0.95);
      col = mix(col, vec3(1.15, 1.08, 0.95), hole);
      col += vec3(0.4, 0.12, 0.02) * b * b;
    } else {
      float w = 1.0 - smoothstep(0.0, 0.7, uT);
      float flick = 0.75 + 0.25 * hash1(uFrame);
      col = mix(col, vec3(1.1, 1.04, 0.95) * flick, w);
    }
  }
  if (uKind == 2) {
    float bare = 1.0 - smoothstep(0.0, 0.1, abs(uT + 0.42));
    float flap = 0.8 + 0.2 * step(0.5, hash1(uFrame * 1.7));
    col = mix(col, vec3(1.08, 1.03, 0.94) * flap, bare);
  }

  if (uCue > 0.0) {
    vec2 cd = (q - vec2(0.91, 0.11)) * vec2(uAp.z / uAp.w, 1.0);
    float r = length(cd);
    float n = fbm(cd * 90.0) * 0.006;
    float blot = smoothstep(0.024 + n, 0.02 + n, r);
    float ring = smoothstep(0.004, 0.0, abs(r - 0.024 - n));
    col = mix(col, vec3(0.02), blot * uCue * 0.92);
    col += ring * uCue * 0.6;
  }

  float fr = uFrame;
  vec2 cell = floor(px / 54.0);
  float h = hash2(cell + fr * 17.31);
  if (h > 0.9965) {
    vec2 c = (cell + vec2(hash2(cell + fr), hash2(cell - fr))) * 54.0;
    float rad = 1.0 + 3.5 * hash2(cell * 3.1 + fr);
    float d = length(px - c) + fbm(px * 0.6) * 2.5;
    float speck = smoothstep(rad, rad * 0.4, d);
    col = mix(col, h > 0.9985 ? vec3(1.0) : vec3(0.0), speck * 0.85);
  }
  float sc = hash1(floor(fr / 9.0));
  if (sc > 0.62) {
    float x = hash1(floor(fr / 9.0) + 3.0) * uAp.z + uAp.x + sin(fr * 0.7) * 1.5;
    float line = smoothstep(1.1, 0.0, abs(px.x - x)) * (0.6 + 0.4 * vnoise(vec2(px.y * 0.05, fr)));
    col += line * 0.22;
  }
  col *= 1.0 + (hash1(fr * 0.913) - 0.5) * 0.045;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float g = hash2(px * 1.003 + fract(fr * 0.6180339) * 97.0) + hash2(px * 0.5 + fract(fr * 0.31) * 31.0) - 1.0;
  col += g * uGrain * (0.35 + 2.4 * lum * (1.0 - lum));
  col *= uLamp;

  vec3 prev = texture(uPrev, gl_FragCoord.xy / (uView * uDpr)).rgb;
  o = vec4(mix(col, prev, uSmear), 1.0);
}`

export const roomFrag = `${common}
uniform sampler2D uFilm;
uniform vec2 uView;
uniform float uDpr;
uniform vec4 uAp;
uniform vec4 uEnv;
uniform float uTime;
uniform float uLamp;
uniform float uBeam;
uniform sampler2D uWind;
out vec4 o;

vec2 fuv(vec2 css) { return vec2(css.x / uView.x, 1.0 - css.y / uView.y); }
vec3 film(vec2 css, float lod) { return textureLod(uFilm, fuv(css), lod).rgb; }

float inAp(vec2 p, float soft) {
  vec2 a = smoothstep(uAp.xy - soft, uAp.xy + soft, p) * (1.0 - smoothstep(uAp.xy + uAp.zw - soft, uAp.xy + uAp.zw + soft, p));
  return a.x * a.y;
}

vec3 screenAverage() {
  float ratio = (uView.x * uView.y) / max(uAp.z * uAp.w, 1.0);
  return textureLod(uFilm, vec2(0.5), 12.0).rgb * ratio;
}

vec3 seatLayer(vec2 p, vec3 avg, inout float covered) {
  vec3 col = vec3(0.0);
  for (int r = 0; r < 3; r++) {
    float fr = float(r);
    float w = uView.x * (0.072 + fr * 0.034);
    float top = uView.y * (0.885 + fr * 0.05);
    float x = p.x + w * 0.5 * fr + w * 0.21;
    float u = fract(x / w);
    float id = floor(x / w);
    float shape = sqrt(max(1.0 - pow(abs(u * 2.0 - 1.0) / 0.88, 2.4), 0.0));
    float edge = top + (1.0 - shape) * w * 0.55;
    float inside = step(edge, p.y) * step(abs(u * 2.0 - 1.0), 0.88);
    float head = 0.0;
    float hid = hash1(id * 3.7 + fr * 11.0);
    if (hid > 0.78 && r < 2) {
      vec2 hc = vec2((id + 0.5) * w - w * 0.5 * fr - w * 0.21, top - w * 0.2);
      vec2 hd = (p - hc) / vec2(w * 0.17, w * 0.22);
      float hr = length(hd);
      head = smoothstep(1.0, 0.96, hr);
      col = mix(col, avg * 0.55 * smoothstep(1.0, 0.85, hr) * smoothstep(0.2, -0.9, hd.y) * (1.0 - head), step(covered, 0.5) * (1.0 - head) * smoothstep(1.06, 1.0, hr));
      inside = max(inside, head);
    }
    float rim = exp(-max(p.y - edge, 0.0) / (2.0 + fr * 1.5)) * inside;
    vec3 fabric = vec3(0.016, 0.012, 0.014) * (0.7 + 0.3 * vnoise(p * 0.3));
    vec3 seat = fabric + avg * (rim * 0.5 + 0.015);
    col = mix(col, seat, inside);
    covered = max(covered, inside);
  }
  return col;
}

void main() {
  vec2 p = gl_FragCoord.xy / uDpr;
  p.y = uView.y - p.y;
  float f = uView.y * 1.15;
  vec3 C = vec3(uView * 0.5, f);
  vec3 d = vec3(p - C.xy, -f);
  vec3 avg = screenAverage() * uLamp;
  float floorY = uEnv.y + uEnv.w + uView.y * 0.07;

  float sHit = 1.0;
  int kind = 0;
  if (p.y > floorY) { sHit = (floorY - C.y) / (p.y - C.y); kind = 1; }
  vec3 X = C + d * sHit;

  vec3 col = vec3(0.0);
  if (kind == 0) {
    float onAp = inAp(p, 0.6);
    vec3 screen = film(p, 0.0);
    vec2 envD = max(max(uEnv.xy - p, p - (uEnv.xy + uEnv.zw)), 0.0);
    float inEnv = step(length(envD), 0.0);
    vec2 near = clamp(p, uAp.xy, uAp.xy + uAp.zw);
    float dist = length(p - near);
    vec3 nearCol = film(near, 6.5) * uLamp;
    float spill = 1.0 / (1.0 + pow(dist / 170.0, 2.0));
    vec3 masking = (nearCol * 0.5 + avg * 0.5) * spill * 0.05;
    float fold = 0.5 + 0.5 * sin(p.x * 0.085 + 2.2 * sin(p.x * 0.011) + fbm(vec2(p.x * 0.01, p.y * 0.002)) * 2.5);
    float side = sign(p.x - uView.x * 0.5);
    float facing = 0.5 + 0.5 * cos(p.x * 0.085 + 2.2 * sin(p.x * 0.011) + side * 1.2);
    vec3 velvet = vec3(0.36, 0.035, 0.05) * (0.25 + 0.75 * fold);
    float curtainSpill = 1.0 / (1.0 + pow(dist / 260.0, 1.6));
    vec3 curtain = velvet * (nearCol * 0.7 + avg * 0.3) * curtainSpill * (0.35 + 0.9 * facing) * 0.9;
    float valance = smoothstep(uEnv.y - 6.0, uEnv.y - 40.0, p.y);
    curtain = mix(curtain, velvet * avg * 0.12 * (0.6 + 0.4 * sin(p.x * 0.05)), valance);
    float lip = smoothstep(2.0, 0.0, abs(p.y - floorY + 1.0));
    vec3 wall = mix(curtain, masking, inEnv);
    col = mix(wall, screen, onAp);
    col += avg * lip * 0.25;
  } else {
    vec3 E = vec3(0.0);
    for (int j = 0; j < 3; j++) for (int i = 0; i < 4; i++) {
      vec2 sp = uAp.xy + uAp.zw * vec2((float(i) + 0.5) / 4.0, (float(j) + 0.5) / 3.0);
      vec3 L = vec3(sp, 0.0);
      vec3 toL = L - X;
      float r2 = dot(toL, toL);
      vec3 dir = toL * inversesqrt(r2);
      float cf = max(-dir.y, 0.0);
      float cl = max(-dir.z, 0.0);
      E += film(sp, 6.0) * cf * cl / r2;
    }
    E *= uAp.z * uAp.w / 12.0 * uLamp;
    float carpet = 0.07 * (0.75 + 0.25 * vnoise(X.xz * 0.05));
    col = E * carpet * 2.4;
  }

  float covered = 0.0;
  vec3 seats = seatLayer(p, avg, covered);

  vec3 P = vec3(uView.x * 0.5, -uView.y * 0.55, f * 1.8);
  float sEnd = sHit;
  vec3 beam = vec3(0.0);
  vec2 wuv = fuv(p);
  vec2 we = 6.0 / uView;
  float wind = texture(uWind, wuv).r;
  vec2 wpush = vec2(texture(uWind, wuv + vec2(we.x, 0.0)).r - texture(uWind, wuv - vec2(we.x, 0.0)).r, texture(uWind, wuv - vec2(0.0, we.y)).r - texture(uWind, wuv + vec2(0.0, we.y)).r) * 420.0;
  const int N = 44;
  float jitter = hash2(p + fract(uTime) * 61.0);
  for (int i = 0; i < N; i++) {
    float s = (float(i) + jitter) / float(N) * sEnd;
    vec3 Y = C + d * s;
    float k = P.z / (P.z - Y.z);
    vec2 Q = P.xy + (Y.xy - P.xy) * k;
    float w = inAp(Q, 10.0);
    if (w <= 0.0) continue;
    vec3 L = film(Q, 2.6);
    float smoke = fbm3((Y + vec3(wpush, 0.0)) * 0.0032 + vec3(uTime * 0.02, -uTime * 0.035, uTime * 0.015));
    smoke = (smoothstep(0.25, 0.85, smoke) * 0.85 + 0.15) * (1.0 - 0.9 * wind) + smoothstep(8.0, 60.0, length(wpush)) * 0.5;
    float fall = min(k * k, 9.0);
    beam += L * w * smoke * fall;
  }
  beam *= sEnd / float(N) * uBeam * uLamp;
  float overScreen = inAp(p, 2.0) * (1.0 - float(kind));
  beam *= mix(1.0, 0.22, overScreen);
  col += beam;

  vec3 glow = film(p, 5.0) * 0.18 + film(p, 7.0) * 0.4 + film(p, 8.5) * 0.35;
  col += glow * (1.0 - overScreen * 0.85) * uLamp;

  col = mix(col, seats + beam * 0.15, covered);

  vec2 v = (p / uView - 0.5) * vec2(uView.x / uView.y, 1.0);
  col *= 1.0 - 0.35 * smoothstep(0.55, 1.15, length(v));
  col += (hash2(p + fract(uTime * 7.0) * 113.0) - 0.5) * 0.012;
  col = col / (1.0 + max(col - 0.85, 0.0) * 1.6);
  o = vec4(pow(max(col, 0.0), vec3(1.0)), 1.0);
}`

export const windFrag = `${common}
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uDecay;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
uniform float uStrength;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float prev = texture(uPrev, uv).r * uDecay;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 pa = (uv - uA) * asp;
  vec2 ba = (uB - uA) * asp;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h) / uRadius;
  o = vec4(clamp(prev + exp(-d * d * 3.0) * uStrength, 0.0, 1.0), 0.0, 0.0, 1.0);
}`

export const moteVert = `${common}
uniform sampler2D uFilm;
uniform vec2 uView;
uniform float uDpr;
uniform vec4 uAp;
uniform float uTime;
uniform float uLamp;
uniform sampler2D uWind;
out vec3 vCol;
void main() {
  float id = float(gl_VertexID);
  float f = uView.y * 1.15;
  vec3 C = vec3(uView * 0.5, f);
  vec3 P = vec3(uView.x * 0.5, -uView.y * 0.55, f * 1.8);
  vec3 r = vec3(hash1(id * 1.13), hash1(id * 2.71 + 4.0), hash1(id * 0.37 + 9.0));
  vec3 X = vec3(r.x * uView.x * 1.3 - uView.x * 0.15, r.y * uView.y * 1.6 - uView.y * 0.75, 40.0 + r.z * (f * 0.92));
  float t = uTime * (0.4 + hash1(id * 5.3));
  X += vec3(sin(t * 0.7 + id) * 40.0, sin(t * 0.31 + id * 2.0) * 60.0 - mod(uTime * (6.0 + 10.0 * r.y), uView.y * 1.6) + uView.y * 0.8, cos(t * 0.5 + id) * 30.0);
  float depth = f - X.z;
  vec2 p = C.xy + (X.xy - C.xy) * f / depth;
  vec2 wuv = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  vec2 we = 8.0 / uView;
  vec2 wgrad = vec2(texture(uWind, wuv + vec2(we.x, 0.0)).r - texture(uWind, wuv - vec2(we.x, 0.0)).r, texture(uWind, wuv - vec2(0.0, we.y)).r - texture(uWind, wuv + vec2(0.0, we.y)).r);
  float stir = texture(uWind, wuv).r;
  p -= wgrad * 900.0 * f / depth;
  float k = P.z / (P.z - X.z);
  vec2 Q = P.xy + (X.xy - P.xy) * k;
  vec2 a = step(uAp.xy, Q) * step(Q, uAp.xy + uAp.zw);
  float inBeam = a.x * a.y;
  vec3 L = textureLod(uFilm, vec2(Q.x / uView.x, 1.0 - Q.y / uView.y), 3.0).rgb;
  float tw = 0.4 + 0.6 * pow(hash1(id + floor(uTime * (2.0 + r.z * 6.0))), 2.0);
  vCol = L * inBeam * tw * min(k * k, 6.0) * 0.55 * uLamp * (1.0 + stir * 3.0);
  vec2 ndc = vec2(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = clamp((0.8 + 1.8 * hash1(id * 7.7)) * f / depth, 1.0, 9.0) * uDpr;
}`

export const moteFrag = `#version 300 es
precision highp float;
in vec3 vCol;
out vec4 o;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  o = vec4(vCol * a, 1.0);
}`
