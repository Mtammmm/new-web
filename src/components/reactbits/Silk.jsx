'use client';

import { useEffect, useRef } from 'react';

import './Silk.css';

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SILK = `
uniform vec2 uView;
uniform float uScale;
uniform float uRotation;
uniform float uTime;
uniform float uWave;
uniform float uRipple;
uniform float uFold;
uniform vec2 uShift;
uniform vec4 uPointer;
uniform vec2 uDrag;
uniform float uBulge;
uniform vec4 uWaves[4];
uniform sampler2D uFluid;
uniform vec2 uFluidSize;
uniform float uFluidOn;
uniform float uDistortion;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

// Lấy mẫu bicubic (B-spline, 4 lần đọc bilinear) để trường fluid độ phân giải thấp vẫn mượt.
vec4 cubicWeights(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}

vec4 textureBicubic(sampler2D tex, vec2 uv, vec2 size) {
  vec2 inv = 1.0 / size;
  vec2 coord = uv * size - 0.5;
  vec2 fxy = fract(coord);
  coord -= fxy;
  vec4 xc = cubicWeights(fxy.x);
  vec4 yc = cubicWeights(fxy.y);
  vec4 c = coord.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / s) * inv.xxyy;
  vec4 s0 = texture(tex, off.xz);
  vec4 s1 = texture(tex, off.yz);
  vec4 s2 = texture(tex, off.xw);
  vec4 s3 = texture(tex, off.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

vec2 fluidAt(vec2 uv) {
  return textureBicubic(uFluid, uv, uFluidSize).xy;
}

vec2 bend(vec2 uv) {
  vec2 aspect = vec2(uView.x / uView.y, 1.0);
  if (uFluidOn > 0.5) {
    // Chế độ fluid: nếp lụa bị kéo theo trường vận tốc chất lỏng thay cho phồng/xoắn.
    uv -= fluidAt(uv) * uDistortion;
  } else {
    vec2 offset = (uv - uPointer.xy) * aspect;
    float touch = uPointer.z * exp(-dot(offset, offset) / (uPointer.w * uPointer.w));
    uv -= uDrag * touch;
    // Phồng + xoắn nhẹ quanh con trỏ: vải như bị đẩy lên từ phía dưới.
    float lens = touch * uBulge;
    uv -= (offset / aspect) * lens * 0.45;
    float ang = lens * 0.3;
    vec2 o = (uv - uPointer.xy) * aspect;
    o = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * o;
    uv = uPointer.xy + o / aspect;
  }
  for (int i = 0; i < 4; i++) {
    vec4 wave = uWaves[i];
    if (wave.w <= 0.0) continue;
    vec2 q = (uv - wave.xy) * aspect;
    float dist = length(q);
    float front = dist - wave.z;
    float ring = exp(-front * front * 60.0) * wave.w;
    uv += q / max(dist, 0.0001) / aspect * ring * 0.034 * sin(front * 34.0);
  }
  return uv;
}

float silk(vec2 vUv) {
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale + uShift;
  float tOffset = uTime;
  tex.y += 0.03 * uWave * sin(8.0 * tex.x - tOffset);
  return 0.6 + 0.4 * uFold * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) + uRipple * sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));
}
`;

const FIELD = `#version 300 es
precision highp float;
${SILK}
out vec4 outColor;

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  float pattern = silk(bend(vUv));
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);
  outColor = vec4(pow(n, 6.0), 0.0, 0.0, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
${SILK}
uniform sampler2D uBloom;
uniform vec3 uColor;
uniform vec3 uSheenColor;
uniform float uNoiseIntensity;
uniform float uDepth;
uniform float uSheen;
uniform float uGlow;
uniform float uLightMode;
uniform vec3 uLight;
uniform vec2 uStep;
uniform float uPresence;
uniform float uFade;
uniform float uRoughness;
uniform float uGrainAmount;
uniform float uGrainSize;
uniform float uGrainSeed;
out vec4 outColor;

// Hash ổn định cho film grain (không dùng noise() cũ để không đụng noiseIntensity).
float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 softClip(vec3 c) {
  vec3 over = max(c - 0.75, 0.0);
  return min(c, 0.75) + 0.25 * (1.0 - exp(-over * 4.0));
}

void main() {
  vec2 vUv = gl_FragCoord.xy / uView;
  vec2 coord = bend(vUv);
  float pattern = silk(coord);
  float rnd = noise(gl_FragCoord.xy);
  float n = clamp((pattern - 0.2) / 0.8, 0.0, 1.0);

  float gx = silk(coord + vec2(uStep.x, 0.0)) - pattern;
  float gy = silk(coord + vec2(0.0, uStep.y)) - pattern;
  vec3 normal = normalize(vec3(-gx * 26.0, -gy * 26.0, 1.0));
  vec3 toLight = normalize(vec3(uLight.xy, 0.85));
  float relief = 1.0 + (dot(normal, toLight) - toLight.z) * 1.8 * uDepth;
  vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
  // roughness > 0: highlight rộng và dịu hơn (vải mờ). roughness = 0 giữ nguyên như cũ.
  float glossExp = mix(48.0, 6.0, uRoughness);
  float gloss = pow(max(dot(normal, halfway), 0.0), glossExp) * smoothstep(0.25, 0.85, n) * mix(1.0, 0.55, uRoughness);
  float crest = pow(n, 5.0) * mix(1.0, 0.35, uRoughness);
  float shine = (gloss * 0.85 + crest * 0.4) * uSheen * (1.0 + uLight.z * 0.6);

  float bloom = 0.0;
  if (uGlow > 0.0) {
    bloom += textureLod(uBloom, vUv, 1.0).r * 0.35;
    bloom += textureLod(uBloom, vUv, 2.0).r * 0.3;
    bloom += textureLod(uBloom, vUv, 3.0).r * 0.2;
    bloom += textureLod(uBloom, vUv, 4.0).r * 0.15;
  }

  vec3 result;
  if (uLightMode > 0.5) {
    float fold = smoothstep(0.28, 0.9, pattern);
    float specular = smoothstep(0.72, 0.98, pattern);
    vec3 shadowColor = uColor * (0.72 - 0.12 * uDepth);
    vec3 bodyColor = min(uColor * 1.18, vec3(1.0));
    vec3 lightBase = mix(shadowColor, bodyColor, fold) * mix(1.0, relief, 0.6);
    lightBase = mix(lightBase, vec3(1.0), clamp(specular * 0.92 + shine * 0.22 + bloom * uGlow * 0.2, 0.0, 1.0));
    float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
    float grainSignal = (rnd + fineNoise - 1.0);
    float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
    result = clamp(lightBase + grainSignal * grainStrength, 0.0, 1.0);
  } else {
    float grain = rnd / 15.0 * uNoiseIntensity;
    float floorValue = mix(0.2, 0.03, uDepth);
    float curve = uDepth > 0.0 ? pow(n, 1.0 + 1.4 * uDepth) : n;
    float shade = uDepth > 0.0 ? floorValue + (1.0 - floorValue) * curve : pattern;
    vec3 tone = mix(uColor, pow(uColor, vec3(1.45)), (1.0 - n) * uDepth);
    vec3 lit = tone * shade * relief - vec3(grain);
    vec3 tint = mix(uColor, uSheenColor, 0.8);
    vec3 extra = tint * (shine + bloom * uGlow * 0.55);
    float blend = clamp((uSheen + uGlow) * 4.0, 0.0, 1.0);
    result = mix(clamp(lit, 0.0, 1.0), clamp(softClip(lit + extra), 0.0, 1.0), blend);
  }

  // Film grain động: đơn sắc, đổi hạt theo floor(time × fps), mạnh ở vùng tối, yếu ở vùng sáng.
  if (uGrainAmount > 0.0) {
    vec2 cell = floor(gl_FragCoord.xy / max(uGrainSize, 1.0));
    float g = grainHash(cell + vec2(uGrainSeed * 17.0, uGrainSeed * 31.0)) - 0.5;
    float lum = dot(result, vec3(0.299, 0.587, 0.114));
    float weight = mix(1.0, 0.3, smoothstep(0.0, 0.65, lum));
    result = clamp(result + g * uGrainAmount * weight, 0.0, 1.0);
  }

  float edge = uFade * 0.5;
  float mask = 1.0;
  if (edge > 0.0) {
    mask = smootherstep01(vUv.x / edge) * smootherstep01((1.0 - vUv.x) / edge);
    mask *= smootherstep01(vUv.y / edge) * smootherstep01((1.0 - vUv.y) / edge);
  }
  float alpha = uPresence * mask;
  outColor = vec4(result * alpha, alpha);
}`;

// Bước mô phỏng chất lỏng 2D (ping-pong). xy = vận tốc (đơn vị uv màn hình), z = áp suất.
// Gốc toạ độ dưới–trái, cùng hệ với gl_FragCoord / uView trong bend().
const FLUID = `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uSize;
uniform float uAspect;
uniform vec2 uBrushA;
uniform vec2 uBrushB;
uniform vec2 uBrushVel;
uniform float uBrushRadius;
uniform float uBrushOn;
uniform float uStopOn;
uniform float uStopDecay;
uniform float uDecay;
uniform float uTrail;
out vec4 outColor;

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;

  // Tự đối lưu: lần ngược vị trí theo vận tốc, 3 vòng.
  vec2 pos = uv;
  for (int i = 0; i < 3; i++) {
    pos = uv - texture(uPrev, pos).xy * 0.35;
  }
  vec4 adv = texture(uPrev, pos);

  vec4 l = texture(uPrev, uv - vec2(texel.x, 0.0));
  vec4 r = texture(uPrev, uv + vec2(texel.x, 0.0));
  vec4 d = texture(uPrev, uv - vec2(0.0, texel.y));
  vec4 u = texture(uPrev, uv + vec2(0.0, texel.y));
  vec4 avg = (l + r + d + u) * 0.25;

  // Khuếch tán: ít cho vận tốc, nhiều cho áp suất.
  vec2 vel = mix(adv.xy, avg.xy, 0.06);
  float pressure = mix(adv.z, avg.z, 0.55);

  // Phân kỳ đẩy áp suất; gradient áp suất đẩy ngược vận tốc (gần đúng không nén).
  float divergence = ((r.x - l.x) * uSize.x + (u.y - d.y) * uSize.y) * 0.5 * texel.y;
  pressure -= divergence * 0.6;
  vel -= vec2(r.z - l.z, u.z - d.z) * 0.5 * 0.35;

  // Cọ chuột: lực theo đoạn thẳng nối vị trí trước và hiện tại của con trỏ.
  if (uBrushOn > 0.0) {
    vec2 ka = vec2(uAspect, 1.0);
    vec2 pa = (uv - uBrushA) * ka;
    vec2 ba = (uBrushB - uBrushA) * ka;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
    vec2 q = pa - ba * h;
    float fall = exp(-dot(q, q) / (uBrushRadius * uBrushRadius));
    vel += uBrushVel * fall * uBrushOn;
  }

  // Chuột gần như đứng yên: hãm vận tốc quanh con trỏ để không xoáy mãi.
  if (uStopOn > 0.0) {
    vec2 sp = (uv - uBrushB) * vec2(uAspect, 1.0);
    float near = exp(-dot(sp, sp) / (uBrushRadius * uBrushRadius * 4.0));
    vel *= mix(1.0, uStopDecay, near * uStopOn);
  }

  vel *= uDecay;
  pressure *= uTrail;
  vel = clamp(vel, vec2(-0.03), vec2(0.03));
  pressure = clamp(pressure, -0.5, 0.5);
  outColor = vec4(vel, pressure, 1.0);
}`;

const FLUID_STEP = 1 / 60;

const INTRO_SECONDS = 2.2;
const INTRO_RUSH = 1.6;
const WAVE_LIFE = 1.6;
const DEFAULT_LIGHT = [-0.55, 0.7];
const LIGHT_TILT = Math.hypot(DEFAULT_LIGHT[0], DEFAULT_LIGHT[1]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

const variationShift = variation => {
  const n = Number(variation) || 0;
  if (!n) return [0, 0];
  const wave = k => {
    const v = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v) - 0.5;
  };
  return [wave(1) * 6, wave(2) * 6];
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl, fragmentSource) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const Silk = ({
  speed = 5,
  scale = 1,
  color = '#7B7481',
  sheenColor = '#ffffff',
  noiseIntensity = 1.5,
  rotation = 0,
  sheen = 0.5,
  depth = 0.5,
  glow = 0.3,
  ripple = 1,
  wave = 1,
  variation = 0,
  mouseInteraction = true,
  interactionStrength = 1,
  followSpeed = 10,
  reach = 0.32,
  dragAmount = 0.03,
  bulge = 0,
  springDamping = 1,
  settle = 1,
  afterflow = 0,
  dragDecay = 4,
  interaction = 'bulge',
  fluidResolution = 0.25,
  brushSize = 1,
  brushStrength = 1,
  distortion = 1,
  fluidDecay = 0.97,
  fluidTrail = 0.99,
  stopDecay = 0.9,
  grainAmount = 0,
  grainSize = 1.5,
  grainFps = 24,
  roughness = 0,
  clickRipple = true,
  intro = true,
  fade = 0,
  lightMode = false,
  paused = false,
  dpr,
  className = '',
  style
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const wakeRef = useRef(null);
  const settingsRef = useRef(null);
  settingsRef.current = {
    speed,
    scale,
    color: String(color),
    sheenColor: String(sheenColor),
    noiseIntensity: Math.max(0, noiseIntensity),
    rotation,
    sheen: Math.max(0, sheen),
    depth: clamp(depth, 0, 1),
    glow: Math.max(0, glow),
    ripple: Math.max(0, ripple),
    wave: Math.max(0, wave),
    variation,
    mouseInteraction,
    interactionStrength: Math.max(0, interactionStrength),
    followSpeed,
    reach,
    dragAmount,
    bulge,
    springDamping,
    settle,
    afterflow,
    dragDecay,
    interaction,
    fluidResolution: clamp(fluidResolution, 0.05, 1),
    brushSize: Math.max(0.05, brushSize),
    brushStrength: Math.max(0, brushStrength),
    distortion: Math.max(0, distortion),
    fluidDecay: clamp(fluidDecay, 0, 0.999),
    fluidTrail: clamp(fluidTrail, 0, 0.999),
    stopDecay: clamp(stopDecay, 0, 1),
    grainAmount: Math.max(0, grainAmount),
    grainSize: Math.max(0.5, grainSize),
    grainFps: Math.max(1, grainFps),
    roughness: clamp(roughness, 0, 1),
    clickRipple,
    intro,
    fade: clamp(fade, 0, 1),
    lightMode,
    paused,
    dpr
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!container || !canvas || !gl) return undefined;

    const fieldProgram = link(gl, FIELD);
    const compositeProgram = link(gl, COMPOSITE);
    if (!fieldProgram || !compositeProgram) return undefined;

    // ----- Fluid: cần render được vào texture float 16-bit; không có thì quay về 'bulge' -----
    const floatExt = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    const fluidProgram = floatExt ? link(gl, FLUID) : null;
    const fluid = {
      ok: Boolean(fluidProgram),
      width: 0,
      height: 0,
      read: 0,
      tex: [null, null],
      fbo: [null, null],
      acc: 0,
      activeUntil: 0,
      prev: null // vị trí con trỏ (px CSS) đã dùng cho cọ ở bước trước
    };
    if (settingsRef.current.interaction === 'fluid' && !fluid.ok) {
      console.warn(
        floatExt
          ? 'Silk: fluid shader failed to compile, falling back to bulge interaction.'
          : 'Silk: float render targets unsupported, falling back to bulge interaction.'
      );
    }
    const fluidEmpty = gl.createTexture(); // texture 1x1 rỗng khi không dùng fluid
    gl.bindTexture(gl.TEXTURE_2D, fluidEmpty);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    const sizeFluid = () => {
      if (!fluid.ok) return;
      const s = settingsRef.current;
      const w = Math.max(8, Math.round(view.width * s.fluidResolution));
      const h = Math.max(8, Math.round(view.height * s.fluidResolution));
      if (w === fluid.width && h === fluid.height) return;
      fluid.width = w;
      fluid.height = h;
      for (let i = 0; i < 2; i++) {
        if (!fluid.tex[i]) {
          fluid.tex[i] = gl.createTexture();
          fluid.fbo[i] = gl.createFramebuffer();
        }
        gl.bindTexture(gl.TEXTURE_2D, fluid.tex[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fluid.fbo[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fluid.tex[i], 0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) fluid.ok = false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      fluid.read = 0;
    };
    const fluidOn = () => fluid.ok && settingsRef.current.interaction === 'fluid';

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    const target = { width: 0, height: 0 };
    const sizeTarget = (width, height) => {
      if (target.width === width && target.height === height) return;
      target.width = width;
      target.height = height;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    };

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const colorCache = new Map();
    const toRgb = value => {
      if (colorCache.has(value)) return colorCache.get(value);
      let rgb = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#ffffff';
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r / 255, g / 255, b / 255];
      }
      colorCache.set(value, rgb);
      return rgb;
    };

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const view = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, inside: false, touch: false };
    const waves = [];
    const waveData = new Float32Array(16);
    const state = {
      flow: 0,
      intro: settingsRef.current.intro && !reduce ? 0 : 1,
      touch: 0,
      x: 0,
      y: 0,
      dragX: 0,
      dragY: 0,
      vx: 0, // vận tốc lò xo của vùng phồng
      vy: 0,
      energy: 0, // "năng lượng" từ chuột, làm lụa chảy nhanh rồi lắng dần
      lightX: DEFAULT_LIGHT[0],
      lightY: DEFAULT_LIGHT[1]
    };
    let raf = 0;
    let last = 0;
    let visible = true;

    const setShared = (uniforms, width, height, s, unfold) => {
      const [shiftX, shiftY] = variationShift(s.variation);
      gl.uniform2f(uniforms.uView, width, height);
      gl.uniform1f(uniforms.uScale, s.scale);
      gl.uniform1f(uniforms.uRotation, s.rotation);
      gl.uniform1f(uniforms.uTime, state.flow - INTRO_RUSH * (1 - unfold));
      gl.uniform1f(uniforms.uWave, s.wave);
      gl.uniform1f(uniforms.uRipple, s.ripple);
      gl.uniform1f(uniforms.uFold, 0.25 + 0.75 * unfold);
      gl.uniform2f(uniforms.uShift, shiftX, shiftY);
      gl.uniform4f(
        uniforms.uPointer,
        state.x / view.width,
        1 - state.y / view.height,
        state.touch * s.interactionStrength,
        s.reach
      );
      gl.uniform2f(uniforms.uDrag, state.dragX, state.dragY);
      gl.uniform1f(uniforms.uBulge, s.bulge);
      gl.uniform4fv(uniforms.uWaves, waveData);
      // Trường fluid ở texture unit 1 (unit 0 dành cho bloom), dùng cho cả FIELD và COMPOSITE.
      const on = fluidOn();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, on ? fluid.tex[fluid.read] : fluidEmpty);
      gl.uniform1i(uniforms.uFluid, 1);
      gl.uniform2f(uniforms.uFluidSize, on ? fluid.width : 1, on ? fluid.height : 1);
      gl.uniform1f(uniforms.uFluidOn, on ? 1 : 0);
      gl.uniform1f(uniforms.uDistortion, s.distortion * 6.0);
      gl.activeTexture(gl.TEXTURE0);
    };

    // Một bước mô phỏng: đọc fluid.tex[read], ghi vào tex còn lại, rồi đổi vai.
    const stepFluid = brush => {
      const s = settingsRef.current;
      const f = fluidProgram.uniforms;
      const write = 1 - fluid.read;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fluid.fbo[write]);
      gl.viewport(0, 0, fluid.width, fluid.height);
      gl.useProgram(fluidProgram.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fluid.tex[fluid.read]);
      gl.uniform1i(f.uPrev, 0);
      gl.uniform2f(f.uSize, fluid.width, fluid.height);
      gl.uniform1f(f.uAspect, view.width / view.height);
      gl.uniform2f(f.uBrushA, brush.ax, brush.ay);
      gl.uniform2f(f.uBrushB, brush.bx, brush.by);
      gl.uniform2f(f.uBrushVel, brush.vx, brush.vy);
      gl.uniform1f(f.uBrushRadius, 0.11 * s.brushSize);
      gl.uniform1f(f.uBrushOn, brush.on);
      gl.uniform1f(f.uStopOn, brush.stop);
      gl.uniform1f(f.uStopDecay, s.stopDecay);
      gl.uniform1f(f.uDecay, s.fluidDecay);
      gl.uniform1f(f.uTrail, s.fluidTrail);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      fluid.read = write;
    };

    // Cập nhật fluid theo thời gian thực, bước cố định 60Hz (không phụ thuộc tần số quét).
    const NO_BRUSH = { ax: 0, ay: 0, bx: 0, by: 0, vx: 0, vy: 0, on: 0, stop: 0 };
    const updateFluid = (dt, now) => {
      if (!fluidOn()) {
        fluid.prev = null;
        return;
      }
      sizeFluid();
      if (!fluid.ok) return;
      const s = settingsRef.current;
      let brush = NO_BRUSH;
      const canPaint = s.mouseInteraction && pointer.inside && !pointer.touch && !reduce;
      if (canPaint) {
        // Pointer là px CSS gốc trên–trái → uv gốc dưới–trái.
        const bx = pointer.x / view.width;
        const by = 1 - pointer.y / view.height;
        if (fluid.prev) {
          const ax = fluid.prev.x / view.width;
          const ay = 1 - fluid.prev.y / view.height;
          let dx = bx - ax;
          let dy = by - ay;
          const moved = Math.hypot(pointer.x - fluid.prev.x, pointer.y - fluid.prev.y);
          if (moved > 0.5) {
            // Trần theo tốc độ chuột để cú vẩy mạnh không làm xé hình.
            const len = Math.hypot(dx, dy);
            const cap = 0.03;
            if (len > cap) {
              dx *= cap / len;
              dy *= cap / len;
            }
            brush = { ax, ay, bx, by, vx: dx * s.brushStrength, vy: dy * s.brushStrength, on: 1, stop: 0 };
            fluid.activeUntil = now + 2500;
          } else {
            brush = { ...NO_BRUSH, bx, by, stop: 1 };
          }
        }
        fluid.prev = { x: pointer.x, y: pointer.y };
      } else {
        fluid.prev = null; // ra khỏi vùng / rời cửa sổ: ngừng bơm lực, trường tự tắt dần
      }

      fluid.acc = Math.min(fluid.acc + dt, FLUID_STEP * 4);
      let first = true;
      while (fluid.acc >= FLUID_STEP) {
        stepFluid(first ? brush : brush.stop ? { ...NO_BRUSH, bx: brush.bx, by: brush.by, stop: 1 } : NO_BRUSH);
        first = false;
        fluid.acc -= FLUID_STEP;
      }
    };

    const render = () => {
      const s = settingsRef.current;
      const unfold = ease(state.intro);
      const presence = 1 - Math.pow(1 - state.intro, 3);
      gl.bindVertexArray(vao);

      waveData.fill(0);
      waves.slice(-4).forEach((item, index) => {
        waveData.set([item.x, item.y, item.age * 0.6, Math.exp(-item.age / (WAVE_LIFE * 0.45))], index * 4);
      });

      if (s.glow > 0) {
        sizeTarget(Math.max(1, Math.round(canvas.width / 4)), Math.max(1, Math.round(canvas.height / 4)));
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, target.width, target.height);
        gl.useProgram(fieldProgram.program);
        setShared(fieldProgram.uniforms, target.width, target.height, s, unfold);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.generateMipmap(gl.TEXTURE_2D);
      }

      const c = compositeProgram.uniforms;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compositeProgram.program);
      setShared(c, canvas.width, canvas.height, s, unfold);
      gl.uniform3fv(c.uColor, toRgb(s.color));
      gl.uniform3fv(c.uSheenColor, toRgb(s.sheenColor));
      gl.uniform1f(c.uNoiseIntensity, s.noiseIntensity);
      gl.uniform1f(c.uDepth, s.depth);
      gl.uniform1f(c.uSheen, s.sheen);
      gl.uniform1f(c.uGlow, s.glow);
      gl.uniform1f(c.uLightMode, s.lightMode ? 1 : 0);
      gl.uniform3f(c.uLight, state.lightX, state.lightY, state.touch * s.interactionStrength);
      gl.uniform2f(c.uStep, view.ratio / canvas.width, view.ratio / canvas.height);
      gl.uniform1f(c.uPresence, presence);
      gl.uniform1f(c.uFade, s.fade);
      gl.uniform1f(c.uRoughness, s.roughness);
      gl.uniform1f(c.uGrainAmount, reduce ? s.grainAmount * 0.5 : s.grainAmount);
      gl.uniform1f(c.uGrainSize, s.grainSize * view.ratio);
      // Hạt đổi theo floor(time × fps); giảm chuyển động thì đứng yên.
      gl.uniform1f(c.uGrainSeed, reduce ? 0 : Math.floor((performance.now() / 1000) * s.grainFps) % 997);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(c.uBloom, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = now => {
      raf = 0;
      if (!visible || document.hidden) return;
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const flowing = !s.paused && !reduce && s.speed !== 0;
      // Năng lượng tắt dần chậm (~3s) nên sau khi dừng chuột lụa vẫn chảy tiếp rồi mới lắng.
      state.energy *= Math.exp(-dt * s.settle);
      if (flowing) state.flow += dt * 0.1 * s.speed * (1 + state.energy * s.afterflow);
      if (!s.intro || reduce) state.intro = 1;
      else if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS);

      const engaged = s.mouseInteraction && pointer.inside && !reduce;
      if (engaged && state.touch < 0.01) {
        state.x = pointer.x;
        state.y = pointer.y;
      }
      // Lò xo tắt dần: vùng phồng đuổi theo chuột, trượt quá đà rồi dập dềnh về vị trí.
      const prevX = state.x;
      const prevY = state.y;
      const k = s.followSpeed * s.followSpeed;
      const damp = 2 * s.followSpeed * s.springDamping;
      const h = Math.min(dt, 1 / 30);
      state.vx += ((pointer.x - state.x) * k - state.vx * damp) * h;
      state.vy += ((pointer.y - state.y) * k - state.vy * damp) * h;
      state.x += state.vx * h;
      state.y += state.vy * h;
      const velX = (state.x - prevX) / Math.max(dt, 0.001) / view.height;
      const velY = (state.y - prevY) / Math.max(dt, 0.001) / view.height;
      const dragBlend = 1 - Math.exp(-dt * s.dragDecay);
      if (engaged) state.energy = Math.min(1.5, state.energy + Math.hypot(velX, velY) * dt * 0.9);
      state.dragX += (clamp(velX * s.dragAmount, -s.dragAmount * 2, s.dragAmount * 2) - state.dragX) * dragBlend;
      state.dragY += (clamp(-velY * s.dragAmount, -s.dragAmount * 2, s.dragAmount * 2) - state.dragY) * dragBlend;
      state.touch += ((engaged ? 1 : 0) - state.touch) * (1 - Math.exp(-dt * (engaged ? 3.5 : 1.4)));

      let lightGoalX = DEFAULT_LIGHT[0];
      let lightGoalY = DEFAULT_LIGHT[1];
      if (engaged) {
        const aimX = (pointer.x / view.width - 0.5) * (view.width / view.height);
        const aimY = 0.5 - pointer.y / view.height;
        const reach = Math.hypot(aimX, aimY);
        if (reach > 0.04) {
          lightGoalX = (aimX / reach) * LIGHT_TILT;
          lightGoalY = (aimY / reach) * LIGHT_TILT;
        } else {
          lightGoalX = state.lightX;
          lightGoalY = state.lightY;
        }
      }
      const lightFollow = 1 - Math.exp(-dt * 3);
      state.lightX += (lightGoalX - state.lightX) * lightFollow;
      state.lightY += (lightGoalY - state.lightY) * lightFollow;

      for (let i = waves.length - 1; i >= 0; i--) {
        waves[i].age += dt;
        if (waves[i].age > WAVE_LIFE * 2.5) waves.splice(i, 1);
      }

      updateFluid(dt, now);
      render();

      const settling =
        state.intro < 1 ||
        waves.length > 0 ||
        Math.abs((engaged ? 1 : 0) - state.touch) > 0.002 ||
        Math.abs(state.dragX) + Math.abs(state.dragY) > 0.0002 ||
        Math.abs(pointer.x - state.x) + Math.abs(pointer.y - state.y) > 0.3 ||
        Math.abs(state.vx) + Math.abs(state.vy) > 0.5 ||
        Math.abs(lightGoalX - state.lightX) + Math.abs(lightGoalY - state.lightY) > 0.001 ||
        (fluidOn() && now < fluid.activeUntil) ||
        (s.grainAmount > 0 && !reduce);
      if (flowing || settling) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      view.width = width;
      view.height = height;
      view.ratio = ratio;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      if (fluidOn()) sizeFluid();
      render();
      wake();
    };

    const locate = event => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
    };

    const onPointerMove = event => {
      const point = locate(event);
      pointer.x = point.x;
      pointer.y = point.y;
      pointer.inside = point.inside;
      pointer.touch = event.pointerType === 'touch'; // cọ fluid bỏ qua cảm ứng
      wake();
    };

    const onPointerDown = event => {
      const s = settingsRef.current;
      if (!s.clickRipple || reduce) return;
      const point = locate(event);
      if (!point.inside) return;
      waves.push({ x: point.x / view.width, y: 1 - point.y / view.height, age: 0 });
      if (waves.length > 4) waves.shift();
      wake();
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      wake();
    };

    const onVisibility = () => {
      last = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    let lastDpr = settingsRef.current.dpr;
    wakeRef.current = () => {
      const s = settingsRef.current;
      if (s.dpr !== lastDpr) {
        lastDpr = s.dpr;
        resize();
        return;
      }
      if (!raf) render();
      wake();
    };

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
      fluid.tex.forEach(t => t && gl.deleteTexture(t));
      fluid.fbo.forEach(f => f && gl.deleteFramebuffer(f));
      gl.deleteTexture(fluidEmpty);
      if (fluidProgram) gl.deleteProgram(fluidProgram.program);
      gl.deleteProgram(fieldProgram.program);
      gl.deleteProgram(compositeProgram.program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      // Không gọi loseContext(): React StrictMode (dev) gắn lại effect trên cùng canvas.
    };
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  });

  return (
    <div ref={containerRef} className={`silk-container${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="silk-canvas" aria-hidden="true" />
    </div>
  );
};

export default Silk;
