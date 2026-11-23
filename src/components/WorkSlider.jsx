import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Dải ảnh cong 3D cho trang Work. Người xem đứng BÊN TRONG vòng tròn: tấm càng xa giữa
// càng tiến về phía camera và to ra. Mỗi dự án là một tấm phẳng uốn trong vertex shader,
// lặp vô tận. Engine là class thuần; component React chỉ gắn nó vào DOM.

const FOV = 45;
const CAM_Z = 5;
const MAX_TEX = 1600;
// Màu lấy từ token chung trong portfolio.css (:root).
const token = (name, fallback) => (typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback;
const FONT = '"Google Sans Flex", "Be Vietnam Pro", system-ui, sans-serif';
const FLUID_STEP = 1 / 60;

const wrap = (x, n) => ((x % n) + n) % n;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* ---------- Shader tấm ---------- */

const vertexShader = /* glsl */ `
  uniform float uR;
  uniform float uExpand;
  uniform float uLift;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vZ;

  void main() {
    vUv = uv;
    vec4 p = modelMatrix * vec4(position, 1.0);
    // Uốn quanh vòng tròn tâm (0, 0, R): z' = R·(1 − cos θ) + z.
    float th = p.x / uR;
    vec3 curved = vec3(uR * sin(th), p.y, uR * (1.0 - cos(th)) + p.z);
    vec3 b = mix(curved, p.xyz, uExpand);
    b.y += uLift;
    vNormal = mix(vec3(-sin(th), 0.0, cos(th)), vec3(0.0, 0.0, 1.0), uExpand);
    vZ = b.z;
    gl_Position = projectionMatrix * viewMatrix * vec4(b, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uTexSize;
  uniform float uTexMix;
  uniform float uImgAspect;
  uniform float uAnchor;
  uniform vec2 uSize;
  uniform vec2 uOuter;
  uniform float uRadius;
  uniform float uAlpha;
  uniform vec3 uBase;
  uniform vec3 uFog;
  uniform vec3 uLight;

  uniform vec2 uRes;
  uniform float uDpr;
  uniform float uTime;
  uniform float uFx;
  uniform float uBlur;
  uniform float uCA;
  uniform float uHeat;
  uniform float uVel;
  uniform sampler2D uFluid;
  uniform float uFluidOn;
  uniform float uGrain;
  uniform float uSeed;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vZ;

  // object-fit: cover. uAnchor = 1 neo phía trên, 0.5 neo giữa. Texture không lật (flipY = false).
  vec2 coverUv(vec2 uv) {
    float pa = uSize.x / uSize.y;
    vec2 st = uv;
    if (uImgAspect > pa) st.x = (uv.x - 0.5) * pa / uImgAspect + 0.5;
    else st.y = uAnchor + (uv.y - uAnchor) * uImgAspect / pa;
    return vec2(st.x, 1.0 - st.y);
  }

  // SDF hình chữ nhật bo góc theo đơn vị world.
  float rrect(vec2 uv) {
    vec2 p = (uv - 0.5) * uSize;
    vec2 q = abs(p) - (uSize * 0.5 - uRadius);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453);
  }

  void main() {
    // uv của tấm (0..1 trong vùng ảnh); hình học được nới thêm lề để mép cũng nhoè được.
    vec2 puv = (vUv - 0.5) * (uOuter / uSize) + 0.5;
    vec2 dx = dFdx(puv);
    vec2 dy = dFdy(puv);
    vec2 st0 = coverUv(puv);
    float texPerPx = max(length(dFdx(st0) * uTexSize), length(dFdy(st0) * uTexSize));
    float aaW = max(max(length(dx * uSize), length(dy * uSize)), 1e-5);

    // Hiệu ứng tính theo toạ độ màn hình, không theo tấm.
    vec2 scr = gl_FragCoord.xy / uRes;
    float side = min(scr.x, 1.0 - scr.x);
    float edge = 1.0 - smoothstep(0.0, 0.35, side);
    edge *= edge * uFx;

    // Lệch nội dung ảnh theo px màn hình: fluid theo chuột + rung hơi nóng ở 25% sát mép.
    // Chỉ lệch ảnh, không lệch viền tấm.
    vec2 offPx = vec2(0.0);
    if (uFluidOn > 0.5) offPx -= texture2D(uFluid, scr).xy / 0.03 * 120.0 * uDpr * uFx;
    float heat = (1.0 - smoothstep(0.0, 0.25, side)) * uFx;
    offPx.x += sin(scr.y * 10.0 + uTime * 5.0) * uHeat * uRes.y * heat;
    vec2 warp = dx * offPx.x + dy * offPx.y;

    // Mờ dạng đĩa + tách màu hướng tâm, cộng vệt ngang và tách R/B theo tốc độ trượt.
    float radius = uBlur * uRes.y * edge;
    vec2 dir = scr - 0.5;
    dir /= max(length(dir), 1e-4);
    vec2 caPx = dir * uCA * uRes.y * edge;
    vec2 ca = dx * caPx.x + dy * caPx.y;
    ca.x += 0.025 * uVel;
    float streak = 0.025 * uVel;
    bool moving = abs(uVel) > 0.001;
    int n = int(clamp(max(radius / 1.5, moving ? 8.0 : 1.0), 1.0, 24.0));
    float lod = log2(max(texPerPx * max(1.0, radius / 3.0), 1.0));

    vec4 acc = vec4(0.0);
    for (int i = 0; i < 24; i++) {
      if (i >= n) break;
      float fi = float(i);
      float fn = float(n);
      float r = n > 1 ? sqrt((fi + 0.5) / fn) * radius : 0.0;
      float a = fi * 2.39996323;
      vec2 o = vec2(cos(a), sin(a)) * r;
      vec2 uv = puv + dx * o.x + dy * o.y;
      float m = clamp(0.5 - rrect(uv) / aaW, 0.0, 1.0);
      uv += warp;
      if (n > 1) uv.x -= streak * fi / (fn - 1.0);
      // Tách R / B; G lấy min của hai mẫu để viền tách màu chỉ ra đỏ / tím, không ra xanh lá.
      vec3 cA = textureLod(uTex, coverUv(uv + ca), lod).rgb;
      vec3 cB = textureLod(uTex, coverUv(uv - ca), lod).rgb;
      vec3 c = vec3(cA.r, min(cA.g, cB.g), cB.b);
      acc += vec4(c * m, m);
    }
    float alpha = acc.a / float(n);
    vec3 color = acc.a > 0.0 ? acc.rgb / acc.a : uBase;
    color = mix(uBase, color, uTexMix);

    // Đổ bóng theo pháp tuyến: tấm nghiêng tối đi tối đa 25%; mặt sau còn 40%.
    vec3 nrm = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float lit = clamp(dot(nrm, uLight) / uLight.z, 0.0, 1.0);
    color *= mix(0.75, 1.0, lit);
    if (!gl_FrontFacing) color *= 0.4;

    // Tấm quá gần camera (z > 1.5) mờ dần trong 2 đơn vị để không che màn hình.
    float near = smoothstep(1.5, 3.5, vZ);
    color = mix(color, uFog, near);
    alpha *= 1.0 - near;

    gl_FragColor = vec4(color, alpha * uAlpha);
    #include <colorspace_fragment>

    // Hạt film dạng overlay, đổi theo thời gian.
    float g = hash(floor(gl_FragCoord.xy));
    vec3 cc = gl_FragColor.rgb;
    vec3 ov = mix(2.0 * cc * g, 1.0 - 2.0 * (1.0 - cc) * (1.0 - g), step(0.5, cc));
    gl_FragColor.rgb = mix(cc, ov, uGrain);
  }
`;

/* ---------- Fluid (cùng thuật toán với Silk.jsx) ---------- */

const FLUID_FRAG = /* glsl */ `
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

  void main() {
    vec2 texel = 1.0 / uSize;
    vec2 uv = gl_FragCoord.xy * texel;

    vec2 pos = uv;
    for (int i = 0; i < 3; i++) pos = uv - texture(uPrev, pos).xy * 0.35;
    vec4 adv = texture(uPrev, pos);

    vec4 l = texture(uPrev, uv - vec2(texel.x, 0.0));
    vec4 r = texture(uPrev, uv + vec2(texel.x, 0.0));
    vec4 d = texture(uPrev, uv - vec2(0.0, texel.y));
    vec4 u = texture(uPrev, uv + vec2(0.0, texel.y));
    vec4 avg = (l + r + d + u) * 0.25;

    vec2 vel = mix(adv.xy, avg.xy, 0.06);
    float pressure = mix(adv.z, avg.z, 0.55);

    float divergence = ((r.x - l.x) * uSize.x + (u.y - d.y) * uSize.y) * 0.5 * texel.y;
    pressure -= divergence * 0.6;
    vel -= vec2(r.z - l.z, u.z - d.z) * 0.5 * 0.35;

    if (uBrushOn > 0.0) {
      vec2 ka = vec2(uAspect, 1.0);
      vec2 pa = (uv - uBrushA) * ka;
      vec2 ba = (uBrushB - uBrushA) * ka;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
      vec2 q = pa - ba * h;
      float fall = exp(-dot(q, q) / (uBrushRadius * uBrushRadius));
      vel += uBrushVel * fall * uBrushOn;
    }

    if (uStopOn > 0.0) {
      vec2 sp = (uv - uBrushB) * vec2(uAspect, 1.0);
      float nearB = exp(-dot(sp, sp) / (uBrushRadius * uBrushRadius * 4.0));
      vel *= mix(1.0, uStopDecay, nearB * uStopOn);
    }

    vel *= uDecay;
    pressure *= uTrail;
    vel = clamp(vel, vec2(-0.03), vec2(0.03));
    pressure = clamp(pressure, -0.5, 0.5);
    gl_FragColor = vec4(vel, pressure, 1.0);
  }
`;

const FLUID = { resolution: 0.5, brushSize: 25, brushStrength: 0.5, decay: 0.98, trail: 0.8, stopDecay: 0.85 };
const NO_BRUSH = { ax: 0, ay: 0, bx: 0, by: 0, vx: 0, vy: 0, on: 0, stop: 0 };

class FluidSim {
  constructor(renderer) {
    const ext = renderer.extensions;
    this.ok = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    if (!this.ok) return;
    this.renderer = renderer;
    this.targets = [0, 1].map(
      () =>
        new THREE.WebGLRenderTarget(8, 8, {
          type: THREE.HalfFloatType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: false,
          stencilBuffer: false
        })
    );
    this.read = 0;
    this.width = 0;
    this.height = 0;
    this.acc = 0;
    this.prev = null;
    this.material = new THREE.ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FLUID_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPrev: { value: null },
        uSize: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uBrushA: { value: new THREE.Vector2() },
        uBrushB: { value: new THREE.Vector2() },
        uBrushVel: { value: new THREE.Vector2() },
        uBrushRadius: { value: 0.05 },
        uBrushOn: { value: 0 },
        uStopOn: { value: 0 },
        uStopDecay: { value: FLUID.stopDecay },
        uDecay: { value: FLUID.decay },
        uTrail: { value: FLUID.trail }
      }
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  get texture() {
    return this.targets[this.read].texture;
  }

  resize(cssW, cssH) {
    if (!this.ok) return;
    const w = Math.max(8, Math.round(cssW * FLUID.resolution));
    const h = Math.max(8, Math.round(cssH * FLUID.resolution));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.aspect = cssW / cssH;
    this.targets.forEach(t => t.setSize(w, h));
    const r = this.renderer;
    const prev = r.getRenderTarget();
    for (const t of this.targets) {
      r.setRenderTarget(t);
      r.clear();
    }
    r.setRenderTarget(prev);
  }

  step(b) {
    const u = this.material.uniforms;
    u.uPrev.value = this.targets[this.read].texture;
    u.uSize.value.set(this.width, this.height);
    u.uAspect.value = this.aspect;
    u.uBrushA.value.set(b.ax, b.ay);
    u.uBrushB.value.set(b.bx, b.by);
    u.uBrushVel.value.set(b.vx, b.vy);
    // brushSize tính theo texel của lưới fluid, đổi ra đơn vị uv theo chiều cao.
    u.uBrushRadius.value = FLUID.brushSize / this.height;
    u.uBrushOn.value = b.on;
    u.uStopOn.value = b.stop;
    const write = 1 - this.read;
    this.renderer.setRenderTarget(this.targets[write]);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.read = write;
  }

  // pointer: px CSS gốc trên–trái trong khung. Chỉ bơm lực khi chuột di chuyển trong 100ms gần nhất.
  update(dt, now, pointer, cssW, cssH) {
    if (!this.ok) return;
    let brush = NO_BRUSH;
    if (pointer.inside && pointer.mouse) {
      const bx = pointer.x / cssW;
      const by = 1 - pointer.y / cssH;
      if (this.prev) {
        const ax = this.prev.x / cssW;
        const ay = 1 - this.prev.y / cssH;
        let dx = bx - ax;
        let dy = by - ay;
        const moved = Math.hypot(pointer.x - this.prev.x, pointer.y - this.prev.y);
        if (moved > 0.5 && now - pointer.lastMove < 100) {
          const len = Math.hypot(dx, dy);
          if (len > 0.03) {
            dx *= 0.03 / len;
            dy *= 0.03 / len;
          }
          brush = { ax, ay, bx, by, vx: dx * FLUID.brushStrength, vy: dy * FLUID.brushStrength, on: 1, stop: 0 };
        } else {
          brush = { ...NO_BRUSH, bx, by, stop: 1 };
        }
      }
      this.prev = { x: pointer.x, y: pointer.y };
    } else {
      this.prev = null;
    }
    this.acc = Math.min(this.acc + dt, FLUID_STEP * 4);
    let first = true;
    while (this.acc >= FLUID_STEP) {
      this.step(first ? brush : brush.stop ? { ...NO_BRUSH, bx: brush.bx, by: brush.by, stop: 1 } : NO_BRUSH);
      first = false;
      this.acc -= FLUID_STEP;
    }
  }

  dispose() {
    if (!this.ok) return;
    this.targets.forEach(t => t.dispose());
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

/* ---------- Ảnh & bìa ---------- */

async function loadImage(src) {
  const blob = await (await fetch(src)).blob();
  let bmp = await createImageBitmap(blob);
  const s = MAX_TEX / Math.max(bmp.width, bmp.height);
  if (s < 1) {
    try {
      const small = await createImageBitmap(bmp, {
        resizeWidth: Math.round(bmp.width * s),
        resizeHeight: Math.round(bmp.height * s),
        resizeQuality: 'high'
      });
      bmp.close();
      bmp = small;
    } catch {
      // Trình duyệt không hỗ trợ resize: dùng ảnh gốc.
    }
  }
  return bmp;
}

let fontsReady = null;
function waitFonts() {
  fontsReady ??= Promise.race([
    document.fonts.load(`500 24px ${FONT}`).then(() => document.fonts.ready),
    new Promise(r => setTimeout(r, 2500))
  ]).catch(() => {});
  return fontsReady;
}

// Màu trầm riêng của từng dự án, suy ra từ slug; sắc độ giới hạn trong dải hồng / mận (300–350°).
function slugColors(slug) {
  let n = 0;
  for (const ch of slug) n = (n * 31 + ch.charCodeAt(0)) % 360;
  const h = 300 + (n % 40);
  const col = hue => {
    const c = new THREE.Color().setHSL(hue / 360, 0.28, 0.55, THREE.SRGBColorSpace);
    const out = {};
    c.getRGB(out, THREE.SRGBColorSpace);
    return [out.r * 255, out.g * 255, out.b * 255];
  };
  return [col(h), col(h + 12)];
}

const rgb = (c, k = 1, a = 1) => `rgba(${c.map(v => Math.round(v * k)).join(', ')}, ${a})`;

// Bìa tối đồng bộ: nền gradient theo màu riêng của dự án, quầng sáng mềm, sơ đồ kiến trúc ở giữa.
// Không vẽ chữ nào khác lên bìa (tên dự án đã có ở footer).
function drawCover(p, w, h, colors) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const u = Math.min(w, h) / 1067;
  const [a, b] = colors;
  const mid = a.map((v, i) => (v + b[i]) / 2);

  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, rgb(a, 0.28));
  bg.addColorStop(1, rgb(b, 0.18));
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const R = Math.max(w, h) * 0.6;
  const glow = g.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, R);
  glow.addColorStop(0, rgb(mid, 0.6, 0.35));
  glow.addColorStop(1, rgb(mid, 0.6, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);

  const vig = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);

  // Sơ đồ kiến trúc: các ô chữ nối bằng đường kẻ, xuống dòng khi hết chỗ, căn giữa.
  const items = p.arch || p.stack;
  const fs = 21 * u;
  g.font = `500 ${fs}px ${FONT}`;
  g.letterSpacing = `${0.4 * u}px`;
  g.textBaseline = 'middle';
  const padX = 22 * u;
  const boxH = fs * 1.35 + 30 * u;
  const link = 44 * u;
  const rowGap = 26 * u;
  const maxW = w * 0.84;
  const boxes = items.map(s => ({ s: s.toUpperCase(), w: g.measureText(s.toUpperCase()).width + padX * 2 }));
  const rows = [[]];
  let rowW = 0;
  for (const bx of boxes) {
    const add = rows.at(-1).length ? link + bx.w : bx.w;
    if (rows.at(-1).length && rowW + add > maxW) {
      rows.push([bx]);
      rowW = bx.w;
    } else {
      rows.at(-1).push(bx);
      rowW += add;
    }
  }
  const totalH = rows.length * boxH + (rows.length - 1) * rowGap;
  let y = (h - totalH) / 2;
  g.lineWidth = Math.max(1, 1.5 * u);
  for (const row of rows) {
    const rw = row.reduce((s, bx) => s + bx.w, 0) + link * (row.length - 1);
    let x = (w - rw) / 2;
    row.forEach((bx, i) => {
      if (i > 0) {
        const grad = g.createLinearGradient(x, 0, x + link, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        grad.addColorStop(1, token('--pink', '#ea6fbe'));
        g.fillStyle = grad;
        g.fillRect(x, y + boxH / 2 - u / 2, link, Math.max(1, u * 1.5));
        x += link;
      }
      g.beginPath();
      g.roundRect(x, y, bx.w, boxH, 5 * u);
      g.fillStyle = 'rgba(0, 0, 0, 0.35)';
      g.fill();
      g.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      g.stroke();
      g.fillStyle = '#fff';
      g.fillText(bx.s, x + padX, y + boxH / 2);
      x += bx.w;
    });
    y += boxH + rowGap;
  }
  return c;
}

/* ---------- Engine ---------- */

export class WorkSliderEngine {
  constructor(container, { slides, start = 0, onIndexChange, onOpen, onExpand }) {
    this.el = container;
    this.slides = slides;
    this.N = slides.length;
    this.onIndexChange = onIndexChange;
    this.onOpen = onOpen;
    this.onExpand = onExpand;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.locked = false;
    this.busy = false; // đang mở / đã mở dự án
    this.disposed = false;

    // Trạng thái chuyển động, đơn vị = số tấm.
    this.pos = start;
    this.vel = 0;
    this.target = start;
    this.freq = 8;
    this.tween = null;
    this.smoothVel = 0;
    this.lastRound = Math.round(start);
    this.lastIndex = wrap(this.lastRound, this.N);
    this.drag = null;
    this.wheel = null;
    this.pointer = { x: 0, y: 0, inside: false, mouse: false, lastMove: 0 };
    this.cam = { x: 0, y: 0 };
    this.intro = this.reduced ? 1 : 0;
    this.expand = 0;
    this.raf = 0;
    this.last = 0;
    this.time = 0;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'slider-canvas';
    container.prepend(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    this.camera.position.z = CAM_Z;
    this.geometry = new THREE.PlaneGeometry(1, 1, 48, 1);
    this.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.fluid = this.reduced ? { ok: false } : new FluidSim(this.renderer);

    // Uniform dùng chung cho mọi tấm.
    this.shared = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: this.renderer.getPixelRatio() },
      uTime: { value: 0 },
      uFx: { value: this.reduced ? 0 : 1 },
      uBlur: { value: 0 },
      uCA: { value: 0 },
      uHeat: { value: this.reduced ? 0 : 0.0075 },
      uVel: { value: 0 },
      uFluid: { value: null },
      uFluidOn: { value: 0 },
      uGrain: { value: 0.135 },
      uSeed: { value: 0 },
      uR: { value: 1 },
      uExpand: { value: 0 },
      uLight: { value: new THREE.Vector3(-0.35, 0.45, 1).normalize() },
      uFog: { value: new THREE.Color(token('--plum', '#2a1724')) },
      uBase: { value: new THREE.Color(token('--plum', '#2a1724')).offsetHSL(0, 0, 0.04) }
    };

    this.meshes = slides.map(() => {
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          ...this.shared,
          uTex: { value: null },
          uTexSize: { value: new THREE.Vector2(1600, 1067) },
          uTexMix: { value: 0 },
          uImgAspect: { value: 1.5 },
          uAnchor: { value: 1 },
          uSize: { value: new THREE.Vector2(1, 1) },
          uOuter: { value: new THREE.Vector2(1, 1) },
          uRadius: { value: 0.02 },
          uAlpha: { value: 0 },
          uLift: { value: 0 }
        }
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.frustumCulled = false;
      mesh.userData = { texMix: 0, ready: false, tex: null, kind: 'cover', colors: null };
      this.scene.add(mesh);
      return mesh;
    });

    this.layout();
    this.loadTextures();

    this.ro = new ResizeObserver(() => {
      this.layout();
      this.wake();
    });
    this.ro.observe(container);

    this.onWheel = this.onWheel.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onLeave = () => {
      this.pointer.inside = false;
      this.updateCursor();
    };
    this.frame = this.frame.bind(this);

    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);

    this.wake();
  }

  /* ----- Kích thước ----- */

  layout() {
    const w = this.el.clientWidth || window.innerWidth;
    const h = this.el.clientHeight || window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.renderer.getDrawingBufferSize(this.shared.uRes.value);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fluid.ok && this.fluid.resize(w, h);

    const visH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const visW = visH * this.camera.aspect;
    this.visH = visH;
    this.visW = visW;
    const mobile = w <= 600;
    const ratio = mobile ? 2 / 3 : 1.5;
    let ph = visH * (mobile ? 0.55 : w <= 1000 ? 0.5 : 0.65);
    let pw = ph * ratio;
    if (pw > visW * 0.75) {
      pw = visW * 0.75;
      ph = pw / ratio;
    }
    this.pw = pw;
    this.ph = ph;
    this.stepW = pw * 1.05;
    this.R = (this.stepW * this.N) / (2 * Math.PI);
    this.Reff = this.R;
    this.worldPerPx = visH / h;

    // Hiệu ứng mép theo bề rộng màn hình.
    this.blur = this.reduced || mobile ? 0 : w <= 1000 ? 0.02 : 0.035;
    this.shared.uBlur.value = this.blur;
    this.shared.uCA.value = this.reduced || mobile ? 0 : w <= 1000 ? 0.01 : 0.035;
    // Lề hình học bằng bán kính mờ (đổi ra đơn vị world), để mép tấm cũng nhoè mềm.
    this.margin = this.blur * visH * 1.2;

    // Bìa dựng bằng code theo đúng hướng tấm (ngang trên desktop, dọc trên điện thoại).
    const portrait = ratio < 1;
    if (this.portrait !== undefined && this.portrait !== portrait) {
      this.portrait = portrait;
      this.drawCovers();
    }
    this.portrait = portrait;
  }

  get tilesPerPx() {
    return this.worldPerPx / this.stepW;
  }

  /* ----- Texture ----- */

  setTexture(mesh, tex, w, h, anchor) {
    const d = mesh.userData;
    d.tex?.dispose();
    d.tex = tex;
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.anisotropy;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    const u = mesh.material.uniforms;
    u.uTex.value = tex;
    u.uTexSize.value.set(w, h);
    u.uImgAspect.value = w / h;
    u.uAnchor.value = anchor;
    d.ready = true;
    this.wake();
  }

  loadTextures() {
    this.slides.forEach((p, i) => {
      const mesh = this.meshes[i];
      const d = mesh.userData;
      if (p.cover) {
        // Ảnh bìa riêng: phủ kín tấm, neo giữa.
        d.kind = 'photo';
        loadImage(p.cover)
          .then(bmp => {
            if (this.disposed) return bmp.close();
            d.bitmap = bmp;
            this.setTexture(mesh, new THREE.Texture(bmp), bmp.width, bmp.height, 0.5);
          })
          .catch(() => {
            d.kind = 'cover';
            this.drawCover(i);
          });
        return;
      }
      this.drawCover(i);
    });
  }

  drawCovers() {
    this.meshes.forEach((m, i) => m.userData.kind === 'cover' && this.drawCover(i));
  }

  drawCover(i) {
    const d = this.meshes[i].userData;
    d.colors ??= slugColors(this.slides[i].slug);
    waitFonts().then(() => {
      if (this.disposed) return;
      const [w, h] = this.portrait ? [1067, 1600] : [1600, 1067];
      const canvas = drawCover(this.slides[i], w, h, d.colors);
      this.setTexture(this.meshes[i], new THREE.CanvasTexture(canvas), w, h, 0.5);
    });
  }

  /* ----- Điều khiển ----- */

  get blocked() {
    return this.locked || this.busy;
  }

  setLocked(locked) {
    this.locked = locked;
    if (locked) {
      this.drag = null;
      this.updateCursor();
    } else if (this.busy) {
      this.collapse();
    }
    this.wake();
  }

  get index() {
    return wrap(Math.round(this.pos), this.N);
  }

  // Đích gần nhất trong không gian vô tận ứng với dự án i.
  nearest(i) {
    const base = Math.round(this.pos);
    let d = wrap(i - base, this.N);
    if (d > this.N / 2) d -= this.N;
    return base + d;
  }

  springTo(target, freq) {
    this.tween = null;
    this.target = target;
    this.freq = freq;
    this.wake();
  }

  goTo(i) {
    if (this.blocked || this.index === i) return;
    this.springTo(this.nearest(i), 6.5);
  }

  // Trượt mượt (ease-out) tới tấm dest, giữ liên tục vận tốc lúc bắt đầu.
  snapTo(dest) {
    const delta = dest - this.pos;
    const s = clamp(Math.abs(this.vel) / 10, 0, 1);
    const D = clamp((0.8 + (2.4 - 0.8) * s) * Math.sqrt(Math.abs(delta)), 0.2, 2.4);
    let m0 = this.vel * D;
    if (delta !== 0 && m0 / delta > 4) m0 = 4 * delta;
    this.tween = { x0: this.pos, x1: dest, m0, D, t: 0 };
    this.target = dest;
    this.wake();
  }

  currentTarget() {
    return this.tween ? this.tween.x1 : this.target;
  }

  // Mở dự án: duỗi phẳng vòng cong, tấm giữa nở ra phủ kín khung nhìn, rồi báo onOpen.
  open(i) {
    if (this.blocked) return;
    clearTimeout(this.wheel?.timer);
    this.wheel = null;
    this.drag = null;
    if (i !== undefined && i !== this.index) this.pos = this.nearest(i);
    this.pos = this.target = Math.round(this.pos);
    this.vel = 0;
    this.tween = null;
    this.busy = true;
    this.updateCursor();
    this.onExpand?.(1);
    gsap.killTweensOf(this, 'expand');
    gsap.to(this, {
      expand: 1,
      duration: this.reduced ? 0 : 1.2,
      ease: 'power4.inOut',
      onComplete: () => this.onOpen?.(this.index)
    });
    this.wake();
  }

  // Đóng Detail: chạy ngược lại rồi mở khoá điều khiển.
  collapse() {
    this.onExpand?.(-1);
    gsap.killTweensOf(this, 'expand');
    gsap.to(this, {
      expand: 0,
      duration: this.reduced ? 0 : 1.2,
      ease: 'power4.inOut',
      onComplete: () => {
        this.busy = false;
        this.updateCursor();
      }
    });
    this.wake();
  }

  onWheel(e) {
    if (this.blocked) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1;
    const raw = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
    if (!raw) return;
    const delta = clamp(raw, -160, 160);
    if (!this.wheel) {
      this.wheel = { base: Math.round(this.currentTarget()), timer: 0 };
      this.target = this.pos;
    }
    this.tween = null;
    this.freq = 8;
    this.target += delta * this.tilesPerPx * 1.8;
    clearTimeout(this.wheel.timer);
    this.wheel.timer = setTimeout(() => this.endWheel(), 150);
    this.wake();
  }

  endWheel() {
    const w = this.wheel;
    this.wheel = null;
    if (!w || this.disposed || this.blocked) return;
    const off = this.target - w.base;
    let dest;
    if (Math.abs(off) < 0.05) dest = w.base;
    else if (Math.abs(off) < 1) dest = w.base + Math.sign(off);
    else dest = Math.round(this.target);
    this.snapTo(dest);
  }

  onKey(e) {
    if (this.blocked || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (dir) {
      e.preventDefault();
      const base = Math.round(this.pos);
      const next = clamp(Math.round(this.currentTarget()) + dir, base - 4, base + 4);
      this.springTo(next, 6.5);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      // Nút/link đang được focus tự xử lý Enter/Space của nó.
      if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select')) return;
      e.preventDefault();
      this.open();
    }
  }

  ndc(x, y) {
    return { x: (x / this.width) * 2 - 1, y: -(y / this.height) * 2 + 1 };
  }

  local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Tia từ camera qua con trỏ cắt mặt trụ (tâm (0, 0, R)), trả về toạ độ trên dải (world).
  hit(ndc) {
    this.camera.updateMatrixWorld();
    const o = this.camera.position;
    const ray = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(this.camera).sub(o).normalize();
    const R = this.Reff;
    const ox = o.x;
    const oz = o.z - R;
    const a = ray.x * ray.x + ray.z * ray.z;
    const b = 2 * (ox * ray.x + oz * ray.z);
    const c = ox * ox + oz * oz - R * R;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a === 0) return null;
    // Nghiệm xa: mặt cong phía trước (tấm giữa). Nghiệm gần là các tấm sát camera, đã mờ hẳn.
    const t = (-b + Math.sqrt(disc)) / (2 * a);
    if (t <= 0) return null;
    const px = o.x + ray.x * t;
    const py = o.y + ray.y * t;
    const pz = o.z + ray.z * t;
    return { x: Math.atan2(px, R - pz) * R, y: py };
  }

  // Có đang trỏ vào tấm giữa không (tính cả độ cong).
  onCenter(ndc) {
    const p = this.hit(ndc);
    if (!p) return false;
    const cx = (Math.round(this.pos) - this.pos) * this.stepW;
    return Math.abs(p.x - cx) <= this.pw / 2 && Math.abs(p.y) <= this.ph / 2;
  }

  get settled() {
    return !this.drag && !this.wheel && Math.abs(this.vel) < 0.02 && Math.abs(this.pos - Math.round(this.pos)) < 0.01;
  }

  updateCursor() {
    const p = this.pointer;
    const on = !this.blocked && p.inside && p.mouse && this.settled && this.onCenter(this.ndc(p.x, p.y));
    this.canvas.style.cursor = this.drag?.moved ? 'grabbing' : on ? 'pointer' : '';
  }

  onDown(e) {
    if (this.blocked || e.button > 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.tween = null;
    this.target = this.pos;
    this.freq = 45;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: this.pos, moved: false };
    this.wake();
  }

  onMove(e) {
    const l = this.local(e);
    const p = this.pointer;
    p.x = l.x;
    p.y = l.y;
    p.inside = true;
    p.mouse = e.pointerType === 'mouse';
    p.lastMove = performance.now();
    const d = this.drag;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      if (!d.moved && Math.hypot(dx, e.clientY - d.y) >= 6) d.moved = true;
      this.target = d.start - dx * this.tilesPerPx * 1.3;
    }
    this.updateCursor();
    this.wake();
  }

  onUp(e) {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (!d.moved && e.type === 'pointerup') {
      const l = this.local(e);
      if (this.onCenter(this.ndc(l.x, l.y))) return this.open();
      this.snapTo(Math.round(this.pos));
    } else {
      this.snapTo(Math.round(this.pos + this.vel / 2));
    }
    this.updateCursor();
  }

  /* ----- Vòng lặp ----- */

  wake() {
    if (this.raf || this.disposed) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  integrate(dt) {
    if (this.reduced) {
      // Đổi tấm tức thời.
      const dest = this.tween ? this.tween.x1 : this.drag || this.wheel ? this.target : Math.round(this.target);
      this.tween = null;
      this.pos = this.target = dest;
      this.vel = 0;
      return;
    }
    const tw = this.tween;
    if (tw) {
      tw.t += dt;
      const u = Math.min(tw.t / tw.D, 1);
      const k = 1 - u;
      const delta = tw.x1 - tw.x0;
      const c = tw.m0 - 4 * delta;
      // x(u) = x0 + Δ·(1 − (1−u)⁴) + (m0 − 4Δ)·u(1−u)³: ease-out, x'(0) = m0, x'(1) = 0.
      this.pos = tw.x0 + delta * (1 - k ** 4) + c * u * k ** 3;
      this.vel = (4 * delta * k ** 3 + c * (k ** 3 - 3 * u * k * k)) / tw.D;
      if (u >= 1) {
        this.tween = null;
        this.pos = this.target = tw.x1;
        this.vel = 0;
      }
      return;
    }
    // Lò xo tắt dần tới hạn, nghiệm chính xác nên ổn định với mọi dt.
    const f = this.freq;
    const c1 = this.pos - this.target;
    const c2 = this.vel + f * c1;
    const ex = Math.exp(-f * dt);
    this.pos = this.target + (c1 + c2 * dt) * ex;
    this.vel = (c2 - f * (c1 + c2 * dt)) * ex;
  }

  frame(now) {
    this.raf = 0;
    if (this.disposed) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.time += dt;

    this.integrate(dt);

    const r = Math.round(this.pos);
    if (r !== this.lastRound) {
      this.lastRound = r;
      const i = wrap(r, this.N);
      if (i !== this.lastIndex) {
        this.lastIndex = i;
        this.onIndexChange?.(i);
      }
    }

    const vTarget = this.reduced ? 0 : clamp(this.vel / 10, -1, 1);
    this.smoothVel += (vTarget - this.smoothVel) * (1 - Math.exp(-5 * dt));
    if (Math.abs(this.smoothVel) < 1e-4 && vTarget === 0) this.smoothVel = 0;
    const speed = Math.abs(this.smoothVel);

    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 1.6);

    const e = this.expand;
    const calm = 1 - e;
    const fx = this.reduced ? 0 : calm;

    // Parallax: camera lệch theo con trỏ, lùi ra khi trượt nhanh; giảm về 0 khi mở dự án.
    const p = this.pointer;
    const n = p.inside && p.mouse ? this.ndc(p.x, p.y) : { x: 0, y: 0 };
    const k = 1 - Math.exp(-3 * dt);
    this.cam.x += (n.x * 0.5 * fx - this.cam.x) * k;
    this.cam.y += (n.y * 0.3 * fx - this.cam.y) * k;
    this.camera.position.set(this.cam.x, this.cam.y, CAM_Z + 0.5 * speed * calm);
    this.camera.lookAt(0, 0, 0);
    this.Reff = this.R * (1 + 0.5 * speed);

    // Fluid theo chuột.
    if (this.fluid.ok) {
      if (fx > 0) this.fluid.update(dt, now, p, this.width, this.height);
      this.shared.uFluid.value = this.fluid.texture;
      this.shared.uFluidOn.value = 1;
    }

    const s = this.shared;
    s.uTime.value = this.time;
    s.uFx.value = fx;
    s.uVel.value = this.smoothVel;
    s.uR.value = this.Reff;
    s.uExpand.value = e;
    s.uSeed.value = this.reduced ? 0 : Math.floor(this.time * 24) % 997;

    let fading = false;
    const margin = this.margin * calm;
    this.meshes.forEach((m, i) => {
      const off = wrap(i - this.pos + this.N / 2, this.N) - this.N / 2;
      const sel = Math.abs(off) < 0.5;
      // Khi mở: tấm chọn nở ra phủ kín khung nhìn, các tấm bên bị đẩy ra ngoài.
      const w = sel ? this.pw + (this.visW - this.pw) * e : this.pw;
      const h = sel ? this.ph + (this.visH - this.ph) * e : this.ph;
      m.position.x = sel ? off * this.stepW * calm : off * this.stepW + Math.sign(off) * e * this.visW * 1.2;
      m.scale.set(w + margin * 2, h + margin * 2, 1);
      // Tấm sát camera vẽ sau cùng.
      m.renderOrder = Math.round(Math.abs(off) * 100);

      const d = m.userData;
      if (d.ready && d.texMix < 1) {
        d.texMix = this.reduced ? 1 : Math.min(1, d.texMix + dt / 0.5);
        fading = true;
      }
      // Vào trang: các tấm trồi lên và hiện dần, tấm giữa trước.
      const delay = Math.min(Math.abs(off), 3) * 0.08;
      const ein = 1 - (1 - clamp((this.intro * 1.6 - delay) / 1.2, 0, 1)) ** 4;
      const u = m.material.uniforms;
      u.uSize.value.set(w, h);
      u.uOuter.value.set(w + margin * 2, h + margin * 2);
      u.uRadius.value = this.pw * 0.015 * (sel ? calm : 1);
      u.uTexMix.value = d.texMix;
      u.uAlpha.value = ein;
      u.uLift.value = -(1 - ein) * this.ph * 0.18;
    });

    this.renderer.render(this.scene, this.camera);
    if (p.inside && p.mouse) this.updateCursor();

    // Hạt film và parallax luôn chuyển động, nên vòng lặp chạy liên tục.
    // Dừng khi Detail đã phủ kín màn hình (hoặc reduced motion và mọi thứ đã đứng yên).
    const covered = this.locked && e >= 1;
    const still =
      this.reduced &&
      !this.drag &&
      !this.wheel &&
      !this.tween &&
      Math.abs(this.pos - this.target) < 1e-4 &&
      this.intro >= 1 &&
      !fading &&
      gsap.getTweensOf(this).length === 0;
    if (!covered && !still) this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.wheel?.timer);
    gsap.killTweensOf(this);
    this.ro.disconnect();
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pointermove', this.onMove);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    for (const m of this.meshes) {
      m.userData.tex?.dispose();
      m.userData.bitmap?.close();
      m.material.dispose();
    }
    this.fluid.ok && this.fluid.dispose();
    this.geometry.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}

/* ---------- React ---------- */

export default function WorkSlider({ slides, index, onIndexChange, onOpen, onExpand, locked = false }) {
  const mount = useRef(null);
  const engine = useRef(null);
  const cb = useRef({});
  cb.current = { onIndexChange, onOpen, onExpand };

  useEffect(() => {
    const e = new WorkSliderEngine(mount.current, {
      slides,
      start: index,
      onIndexChange: i => cb.current.onIndexChange?.(i),
      onOpen: i => cb.current.onOpen?.(i),
      onExpand: dir => cb.current.onExpand?.(dir)
    });
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
  }, [slides]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => engine.current?.setLocked(locked), [locked]);

  // index chỉ dùng làm vị trí bắt đầu; sau đó engine là nguồn sự thật và báo lại qua
  // onIndexChange. Đồng bộ ngược theo prop dễ kéo dải về index cũ khi đang trượt nhanh.

  return (
    <div className="slider" ref={mount}>
      <ul className="sr-only">
        {slides.map((s, i) => (
          <li key={s.slug}>
            <button type="button" onFocus={() => engine.current?.goTo(i)} onClick={() => engine.current?.open(i)}>
              {s.title}, open details
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
