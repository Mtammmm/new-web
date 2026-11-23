import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

// Cột đèn chrome + tấm bảng + hộp đèn tín hiệu, dựng bằng Three.js cho trang Index.
// Mặt bảng là CanvasTexture: PORTFOLIO, tên và các trang; mỗi dòng trang bấm được,
// dò bằng raycast theo toạ độ uv trên mặt bảng.

// Hằng màu riêng của trang Index (giữ nguyên, không theo bảng màu chung).
const PINK = '#ea6fbe';
const FACE_W = 1024;
const FACE_H = 1436;
const BOARD = { w: 3.0, h: 4.2, d: 0.14, r: 0.24, x: -1.95, y: 0.35 };
const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
const CODE = ['0100010', '1000001', '1000001', '1000001', '0100010'];
const ARROW = ['0001000', '0001100', '1111110', '1111111', '1111110', '0001100', '0001000'];

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Khối bo góc có độ dày và vát mép, tâm ở gốc toạ độ.
function roundedBox(w, h, d, r, bevel = 0.035) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w - bevel * 2, h - bevel * 2, Math.max(0.01, r - bevel)), {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments: 14
  });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  return g;
}

// Mặt phẳng bo góc với uv 0..1 theo bề rộng / cao (ShapeGeometry mặc định dùng toạ độ hình).
function roundedPlane(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 14);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

function fitFont(g, text, weight, family, maxW, start) {
  let size = start;
  g.font = `${weight} ${size}px ${family}`;
  while (g.measureText(text).width > maxW && size > 10) {
    size -= 2;
    g.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const ROW_Y = 560;
const BAND_H = 40;
// Các dòng trang chia đều phần còn lại tới đáy bảng.
const ROW_H = (FACE_H - BAND_H - ROW_Y) / 3;
const PAD = 64;

// Vẽ mặt bảng: PORTFOLIO, tên, và các trang. fx giữ tiến độ hiệu ứng (reveal / hover / press).
// Trả về vùng bấm của từng trang (toạ độ canvas).
function drawFace(canvas, { profile, pages }, fx) {
  const g = canvas.getContext('2d');
  const W = FACE_W;
  const H = FACE_H;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#f6f4f5';
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';

  // Tiêu đề: trượt lên từ dưới mặt nạ.
  const head = fx.head;
  g.save();
  g.beginPath();
  g.rect(0, 90, W, 300);
  g.clip();
  g.textAlign = 'center';
  g.fillStyle = '#2f2f34';
  g.letterSpacing = '-8px';
  fitFont(g, 'PORTFOLIO', 700, FONT, W - PAD * 2, 230);
  g.fillText('PORTFOLIO', W / 2, 330 + (1 - head) * 260);
  g.restore();

  g.save();
  g.globalAlpha = head;
  g.letterSpacing = '-2px';
  g.textAlign = 'center';
  g.fillStyle = '#3b3b40';
  fitFont(g, profile.name.toUpperCase(), 600, FONT, W - PAD * 2, 64);
  g.fillText(profile.name.toUpperCase(), W / 2, 440 - (1 - head) * 30);
  g.restore();

  // Các trang: mỗi dòng là một nút lớn.
  const hits = [];
  g.letterSpacing = '-6px';
  const size = Math.min(...pages.map(([, l]) => fitFont(g, l.toUpperCase(), 700, FONT, W - PAD * 2 - 300, 150)));
  pages.forEach(([key, label], i) => {
    const y0 = ROW_Y + i * ROW_H;
    const r = fx.rows[i] ?? 0;
    const h = fx.hover[i] ?? 0;
    const text = label.toUpperCase();
    hits.push({ key, x0: 0, x1: W, y0, y1: y0 + ROW_H });

    // Đường kẻ phân cách vẽ dần từ trái sang.
    g.fillStyle = '#2f2f34';
    g.fillRect(PAD, y0, (W - PAD * 2) * r, 4);

    g.save();
    g.beginPath();
    g.rect(0, y0 + 4, W, ROW_H - 4);
    g.clip();
    const lift = (1 - r) * ROW_H;
    const draw = (color, numColor) => {
      g.textAlign = 'left';
      g.letterSpacing = '0px';
      g.font = `500 34px ${MONO}`;
      g.fillStyle = numColor;
      g.fillText(String(i + 1).padStart(2, '0'), PAD + 6, y0 + ROW_H / 2 - size * 0.32 + lift);
      g.letterSpacing = '-6px';
      g.font = `700 ${size}px ${FONT}`;
      g.fillStyle = color;
      g.fillText(text, PAD + 96 + h * 26, y0 + ROW_H / 2 + size * 0.36 + lift);
      // Mũi tên trượt vào khi rê chuột.
      g.letterSpacing = '0px';
      g.textAlign = 'right';
      g.font = `600 110px ${FONT}`;
      g.globalAlpha = h;
      g.fillText('→', W - PAD - 10 - (1 - h) * 60, y0 + ROW_H / 2 + 36 + lift);
      g.globalAlpha = 1;
    };
    draw('#2f2f34', PINK);
    // Vệt hồng quét từ trái sang, chữ bên trong vệt đổi trắng.
    if (h > 0.001) {
      const sw = (W - PAD * 2 + 40) * h;
      g.save();
      g.beginPath();
      g.roundRect(PAD - 20, y0 + 24, sw, ROW_H - 44, 28);
      g.fillStyle = fx.press === i ? '#d94fab' : PINK;
      g.fill();
      g.clip();
      draw('#ffffff', '#ffffff');
      g.restore();
    }
    g.restore();
  });
  g.letterSpacing = '0px';
  return hits;
}

function drawLamp(canvas, map, color) {
  const g = canvas.getContext('2d');
  const S = canvas.width;
  g.fillStyle = '#050506';
  g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.7);
  grad.addColorStop(0, 'rgba(40, 40, 44, 1)');
  grad.addColorStop(1, 'rgba(5, 5, 6, 1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const cols = map[0].length;
  const rows = map.length;
  const cell = (S * 0.6) / Math.max(cols, rows);
  const ox = (S - cols * cell) / 2;
  const oy = (S - rows * cell) / 2;
  g.shadowColor = color;
  g.shadowBlur = 24;
  g.fillStyle = color;
  map.forEach((row, y) => [...row].forEach((c, x) => c === '1' && g.fillRect(ox + x * cell, oy + y * cell, cell + 0.5, cell + 0.5)));
}

class SignEngine {
  constructor(el, { onPick }) {
    this.el = el;
    this.onPick = onPick;
    this.hits = [];
    this.hoverRow = -1;
    this.focusRow = -1;
    this.fx = null;
    this.dirty = false;
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setClearColor(0x000000, 0);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.canvas = r.domElement;
    this.canvas.className = 'sign-canvas';
    el.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-4, 6, 8);
    this.scene.add(key, new THREE.AmbientLight(0xffe6f4, 0.35));
    // Ánh hồng hắt từ nền.
    const rim = new THREE.DirectionalLight(0xff7fd0, 1.2);
    rim.position.set(6, -2, -4);
    this.scene.add(rim);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    this.disposables = [];
    this.build();

    this.ray = new THREE.Raycaster();
    this.onMove = this.onMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onLeave = () => {
      this.mouse.tx = this.mouse.ty = 0;
      this.ptr = null;
      this.hover = false;
      this.hoverRow = -1;
    };
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', this.onLeave);
    this.canvas.addEventListener('click', this.onClick);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();

    this.frame = this.frame.bind(this);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);

    if (!this.reduce) {
      gsap.from(this.rig.position, { y: -2.2, duration: 1.6, ease: 'expo.out', delay: 0.15 });
      gsap.from(this.rig.rotation, { y: -0.9, z: 0.12, duration: 1.8, ease: 'expo.out', delay: 0.15 });
    }
  }

  mat(m) {
    this.disposables.push(m);
    return m;
  }

  geo(g) {
    this.disposables.push(g);
    return g;
  }

  mesh(geo, mat, parent = this.rig) {
    const m = new THREE.Mesh(this.geo(geo), mat);
    parent.add(m);
    return m;
  }

  build() {
    const rig = (this.rig = new THREE.Group());
    this.scene.add(rig);

    const chrome = this.mat(new THREE.MeshPhysicalMaterial({ color: 0xd9d9de, metalness: 1, roughness: 0.14, clearcoat: 0.4, clearcoatRoughness: 0.2 }));
    const steel = this.mat(new THREE.MeshPhysicalMaterial({ color: 0xa9a9b0, metalness: 1, roughness: 0.28 }));
    const dark = this.mat(new THREE.MeshPhysicalMaterial({ color: 0x232327, metalness: 0.8, roughness: 0.36, clearcoat: 0.3 }));
    const pink = this.mat(new THREE.MeshStandardMaterial({ color: PINK, roughness: 0.5, metalness: 0.05, toneMapped: false }));

    // Cột chrome cao vượt khung hình, hai vòng hồng.
    const poleR = 0.34;
    this.mesh(new THREE.CylinderGeometry(poleR, poleR, 40, 64), chrome);
    [2.55, -3.15].forEach(y => {
      const band = this.mesh(new THREE.CylinderGeometry(poleR + 0.006, poleR + 0.006, 0.42, 64, 1, true), pink);
      band.position.y = y;
    });

    // Khâu kẹp quanh cột, mỗi khâu có 4 bu lông.
    const bolt = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12);
    this.geo(bolt);
    const collar = (y, h = 0.26) => {
      const c = this.mesh(new THREE.CylinderGeometry(poleR + 0.06, poleR + 0.06, h, 48), steel);
      c.position.y = y;
      [-0.7, 0.7, 2.4, -2.4].forEach(a => {
        const b = new THREE.Mesh(bolt, dark);
        b.position.set(Math.sin(a) * (poleR + 0.075), y, Math.cos(a) * (poleR + 0.075));
        b.rotation.set(Math.PI / 2, 0, -a);
        b.rotation.order = 'YXZ';
        b.lookAt(b.position.x * 3, y, b.position.z * 3);
        b.rotateX(Math.PI / 2);
        rig.add(b);
      });
      const lip = this.mesh(new THREE.TorusGeometry(poleR + 0.06, 0.018, 8, 48), steel);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = y + h / 2;
      const lip2 = lip.clone();
      lip2.position.y = y - h / 2;
      rig.add(lip2);
    };
    [3.05, 1.75, -1.35, -2.25].forEach(y => collar(y));

    // Tấm bảng: khung kim loại bo góc + mặt in.
    const board = (this.board = new THREE.Group());
    board.position.set(BOARD.x, BOARD.y, 0.32);
    rig.add(board);
    this.mesh(roundedBox(BOARD.w, BOARD.h, BOARD.d, BOARD.r), steel, board);
    const rim = this.mesh(roundedBox(BOARD.w - 0.08, BOARD.h - 0.08, BOARD.d + 0.02, BOARD.r - 0.04, 0.02), dark, board);
    rim.scale.z = 1;
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = FACE_W;
    this.faceCanvas.height = FACE_H;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    this.faceTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.disposables.push(this.faceTex);
    const faceW = BOARD.w - 0.2;
    const faceH = BOARD.h - 0.2;
    this.face = this.mesh(
      roundedPlane(faceW, faceH, BOARD.r - 0.1),
      // Không qua tone mapping để giữ đúng màu trắng / hồng của bản in.
      this.mat(new THREE.MeshBasicMaterial({ map: this.faceTex, toneMapped: false })),
      board
    );
    this.face.position.z = BOARD.d / 2 + 0.012;
    // Mặt sau bảng tối.
    const back = this.mesh(roundedPlane(faceW, faceH, BOARD.r - 0.1), dark, board);
    back.position.z = -BOARD.d / 2 - 0.012;
    back.rotation.y = Math.PI;

    // Vệt sáng chéo lướt qua mặt bảng theo chu kỳ.
    const sc = document.createElement('canvas');
    sc.width = 512;
    sc.height = 4;
    const sg = sc.getContext('2d');
    const grad = sg.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.44, '#000');
    grad.addColorStop(0.5, '#fff');
    grad.addColorStop(0.56, '#000');
    grad.addColorStop(1, '#000');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 512, 4);
    const st = (this.shineTex = new THREE.CanvasTexture(sc));
    st.center.set(0.5, 0.5);
    st.rotation = 0.5;
    this.disposables.push(st);
    this.shine = this.mesh(
      roundedPlane(faceW, faceH, BOARD.r - 0.1),
      this.mat(new THREE.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })),
      board
    );
    this.shine.position.z = BOARD.d / 2 + 0.016;

    // Giá đỡ bảng vào cột.
    [1.75, -1.35].forEach(y => {
      // Nằm hẳn sau lưng bảng để không xuyên qua mặt khi bảng nghiêng.
      const arm = this.mesh(new THREE.BoxGeometry(0.62, 0.16, 0.16), dark);
      arm.position.set(-0.55, y, 0);
      const plate = this.mesh(new THREE.BoxGeometry(0.1, 0.36, 0.14), steel);
      plate.position.set(-0.84, y, 0.02);
    });

    // Hộp đèn tín hiệu: giá đỡ, hai hộp có mái che, màn hình pixel phát sáng, ống dây.
    const sig = new THREE.Group();
    sig.position.set(1.18, 0.15, 0.15);
    rig.add(sig);
    const mount = this.mesh(new THREE.BoxGeometry(0.22, 3.0, 0.18), dark, sig);
    mount.position.set(-0.62, 0, -0.05);
    [1.25, -1.25].forEach(y => {
      const arm = this.mesh(new THREE.BoxGeometry(0.5, 0.14, 0.14), dark, sig);
      arm.position.set(-0.86, y, -0.05);
    });

    this.lampMats = [];
    const lamp = (y, map, color) => {
      const housing = this.mesh(roundedBox(1.32, 1.32, 0.72, 0.16), dark, sig);
      housing.position.y = y;
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      drawLamp(c, map, color);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.disposables.push(tex);
      (this.lamps ||= []).push({ canvas: c, tex });
      const m = this.mat(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xffffff }));
      const screen = this.mesh(roundedPlane(1.02, 1.02, 0.08), m, sig);
      screen.position.set(0, y, 0.372);
      // Mái che nửa ống phía trên màn hình.
      const visor = this.mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 40, 1, true, Math.PI / 2, Math.PI), dark, sig);
      visor.material = this.mat(dark.clone());
      visor.material.side = THREE.DoubleSide;
      visor.rotation.x = Math.PI / 2;
      visor.position.set(0, y, 0.62);
      // Viền bu lông bốn góc.
      [
        [-0.56, 0.56],
        [0.56, 0.56],
        [-0.56, -0.56],
        [0.56, -0.56]
      ].forEach(([bx, by]) => {
        const b = new THREE.Mesh(bolt, steel);
        b.rotation.x = Math.PI / 2;
        b.position.set(bx, y + by, 0.37);
        sig.add(b);
      });
      this.lampMats.push(m);
    };
    lamp(0.78, CODE, '#9fffd6');
    lamp(-0.72, HEART, '#f06ac0');

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, -1.38, 0),
      new THREE.Vector3(0.1, -1.85, 0),
      new THREE.Vector3(-0.35, -2.2, -0.05),
      new THREE.Vector3(-0.85, -2.25, -0.12)
    ]);
    this.mesh(new THREE.TubeGeometry(curve, 48, 0.055, 12, false), dark, sig);

    // Bảng gần như chính diện để dễ đọc các mục điều hướng.
    rig.rotation.set(0.02, -0.14, 0.02);
    this.baseRot = { x: 0.02, y: -0.14 };
  }

  async draw(data) {
    this.data = data;
    const n = data.pages.length;
    if (!this.fx) {
      const start = this.reduce ? 1 : 0;
      this.fx = { head: start, rows: Array(n).fill(start), hover: Array(n).fill(0), press: -1 };
    }
    try {
      await Promise.all([document.fonts.load(`700 100px ${FONT}`), document.fonts.load(`600 100px ${FONT}`), document.fonts.load(`500 30px ${MONO}`)]);
    } catch {
      // Vẽ bằng font dự phòng.
    }
    if (!this.faceCanvas) return;
    this.redraw();
    if (!this.reduce && !this.introStarted) {
      // Chữ hiện dần: tiêu đề trượt lên, rồi từng dòng trang kẻ vạch và nổi lên.
      this.introStarted = true;
      const up = () => (this.dirty = true);
      gsap.to(this.fx, { head: 1, duration: 1.2, ease: 'expo.out', delay: 0.55, onUpdate: up });
      for (let i = 0; i < n; i++) gsap.to(this.fx.rows, { [i]: 1, duration: 1.1, ease: 'expo.out', delay: 0.8 + i * 0.13, onUpdate: up });
    }
  }

  redraw() {
    this.hits = drawFace(this.faceCanvas, this.data, this.fx);
    this.faceTex.needsUpdate = true;
    this.dirty = false;
  }

  setFocus(i) {
    this.focusRow = i;
  }

  setLamp(active) {
    if (this.lampActive === active || !this.lamps?.[0]) return;
    this.lampActive = active;
    drawLamp(this.lamps[0].canvas, active ? ARROW : CODE, active ? '#ff8fd6' : '#9fffd6');
    this.lamps[0].tex.needsUpdate = true;
  }

  resize() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Khoảng cách camera đủ để cả cụm (rộng ~6 đơn vị, cao ~6) nằm gọn trong khung.
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(6.0 / (2 * t), 5.6 / (2 * t * aspect));
    this.dist = dist;
    this.camera.updateProjectionMatrix();
  }

  hitFace(e) {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    return this.ray.intersectObject(this.face, false)[0] || this.ray.intersectObject(this.board, true)[0] || null;
  }

  rowAt(hit) {
    if (!hit?.uv || hit.object !== this.face) return -1;
    const x = hit.uv.x * FACE_W;
    const y = (1 - hit.uv.y) * FACE_H;
    return this.hits.findIndex(h => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1);
  }

  onMove(e) {
    if (e.pointerType !== 'touch') {
      this.mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }
    this.ptr = { clientX: e.clientX, clientY: e.clientY };
    this.pick(this.ptr);
  }

  // Dò dòng dưới con trỏ. Gọi lại mỗi khung hình vì bảng phóng / nghiêng làm điểm dưới con trỏ thay đổi.
  pick(p) {
    const hit = this.hitFace(p);
    this.hover = !!hit;
    this.hoverRow = this.rowAt(hit);
    this.canvas.style.cursor = this.hoverRow >= 0 ? 'pointer' : '';
  }

  onClick(e) {
    const row = this.rowAt(this.hitFace(e));
    if (row < 0 || this.busy) return;
    const key = this.hits[row].key;
    this.busy = true;
    this.fx.press = row;
    this.fx.hover[row] = 1;
    this.dirty = true;
    // Bảng lún vào rồi bật lại, sau đó chuyển trang.
    gsap.fromTo(this.board.position, { z: 0.32 }, { z: 0.12, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 });
    this.pickTimer = setTimeout(() => {
      this.onPick?.(key);
      this.busy = false;
      this.fx.press = -1;
      this.dirty = true;
    }, 340);
  }

  frame(now) {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const k = 1 - Math.exp(-3 * dt);
    const m = this.mouse;
    m.x += ((this.reduce ? 0 : m.tx) - m.x) * k;
    m.y += ((this.reduce ? 0 : m.ty) - m.y) * k;
    // Camera nhìn từ dưới lên, lệch nhẹ theo chuột.
    this.camera.position.set(0.7 + m.x * 0.6, -1.3 - m.y * 0.4, this.dist);
    this.camera.lookAt(-0.75, 0.3, 0);
    // Rê chuột lên bảng: bảng phóng nhẹ và nghiêng theo con trỏ.
    const ke = 1 - Math.exp(-10 * dt);
    const s = 1 + (this.hover ? 0.03 : 0);
    this.board.scale.setScalar(this.board.scale.x + (s - this.board.scale.x) * ke);
    const tilt = this.hover && !this.reduce;
    this.board.rotation.y += ((tilt ? m.x * 0.1 : 0) - this.board.rotation.y) * ke;
    this.board.rotation.x += ((tilt ? m.y * 0.08 : 0) - this.board.rotation.x) * ke;

    this.camera.updateMatrixWorld();
    if (this.ptr && !this.busy) this.pick(this.ptr);

    // Vệt hồng của từng dòng chạy tới dòng đang rê / đang focus.
    if (this.fx && this.data) {
      const active = this.busy ? this.fx.press : this.hoverRow >= 0 ? this.hoverRow : this.focusRow;
      const kh = this.reduce ? 1 : 1 - Math.exp(-11 * dt);
      this.fx.hover.forEach((v, i) => {
        const t = i === active ? 1 : 0;
        const nv = Math.abs(t - v) < 0.002 ? t : v + (t - v) * kh;
        if (nv !== v) {
          this.fx.hover[i] = nv;
          this.dirty = true;
        }
      });
      this.setLamp(active >= 0);
      if (this.dirty) this.redraw();
    }

    // Ánh sáng lướt qua mặt bảng mỗi ~5 giây.
    if (this.shineTex) {
      const c = ((now / 1000) % 5) / 5;
      this.shineTex.offset.x = this.reduce ? 2 : 0.9 - Math.min(c / 0.35, 1) * 1.8;
    }
    if (this.lampMats?.[1] && !this.reduce) {
      const p = 0.75 + 0.25 * Math.sin(now / 260);
      this.lampMats[1].color.setScalar(p);
    }
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.pickTimer);
    gsap.killTweensOf(this.fx);
    gsap.killTweensOf(this.fx?.rows);
    gsap.killTweensOf(this.board?.position);
    gsap.killTweensOf(this.rig?.position);
    gsap.killTweensOf(this.rig?.rotation);
    this.ro.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    document.documentElement.removeEventListener('mouseleave', this.onLeave);
    this.canvas.removeEventListener('click', this.onClick);
    this.disposables.forEach(d => d.dispose?.());
    this.envTex.dispose();
    this.renderer.dispose();
    this.canvas.remove();
    this.faceCanvas = null;
  }
}

export default function StreetSign({ profile, pages, focus = -1, onPick }) {
  const mount = useRef(null);
  const engine = useRef(null);
  const cb = useRef({});
  cb.current = { onPick };

  useEffect(() => {
    const e = new SignEngine(mount.current, { onPick: k => cb.current.onPick?.(k) });
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.draw({ profile, pages });
  }, [profile, pages]);

  useEffect(() => {
    engine.current?.setFocus(focus);
  }, [focus]);

  return <div className="sign-3d" ref={mount} aria-hidden="true" />;
}
