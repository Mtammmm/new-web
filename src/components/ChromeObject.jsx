import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { createBloom } from '../lib/bloom.js';

// Khối chrome có gai: hình cầu bị đẩy phồng theo một tập hướng ngẫu nhiên (cố định),
// tạo các gai nhọn dài ngắn khác nhau. Vật liệu kim loại phản chiếu môi trường.

const SEED_DIRS = 26;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 72);
  const rand = rng(20250301);
  const dirs = Array.from({ length: SEED_DIRS }, () => {
    const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, (rand() * 2 - 1) * 0.55).normalize();
    return { v, len: 0.35 + rand() * 1.15, sharp: 60 + rand() * 260 };
  });

  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    let d = 0;
    for (const { v, len, sharp } of dirs) {
      const k = Math.max(0, p.dot(v));
      d += Math.pow(k, sharp) * len;
    }
    // Gờ nhỏ trên bề mặt để ánh phản chiếu "gãy" như kim loại rèn.
    const ridge = Math.abs(Math.sin(p.x * 9.0 + p.y * 5.0) * Math.cos(p.z * 7.0 - p.y * 3.0)) * 0.035;
    const r = 0.62 + d + ridge;
    pos.setXYZ(i, p.x * r, p.y * r, p.z * r * 0.72);
  }
  geo.computeVertexNormals();
  return geo;
}

// ----- Engine dùng chung: chỉ dựng một lần, các trang (Index, About) mượn lại -----
// Dựng hình khối gai + môi trường phản chiếu + biên dịch shader mất ~250ms;
// làm một lần lúc web vừa tải (còn đang che bởi màn chuyển cảnh) để không bị khựng khi chuyển tab.
let engine = null;

function getEngine() {
  if (engine) return engine;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 12);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xdedede,
    metalness: 1,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.25
  });
  const mesh = new THREE.Mesh(buildGeometry(), material);
  const pivot = new THREE.Group();
  pivot.add(mesh);
  scene.add(pivot);

  const rim = new THREE.DirectionalLight(0xffffff, 2.2);
  rim.position.set(-3, 4, -2);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 2, 5);
  scene.add(key);

  // Biên dịch shader ngay và vẽ thử một khung để GPU nạp sẵn mọi thứ.
  renderer.setSize(64, 64, false);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

  // Bloom: chỉ các chỗ chói trên gai chrome (vượt 1.0) mới phát sáng.
  const post = createBloom(renderer, scene, camera, { intensity: 0.6, threshold: 1.1, smoothing: 0.3, radius: 0.55 });
  // Vẽ thử qua hậu kỳ luôn để shader bloom cũng được biên dịch sẵn.
  post.setSize(64, 64);
  post.render(0);

  engine = { renderer, scene, camera, mesh, pivot, post, owner: null };
  return engine;
}

// Gọi sớm (lúc web vừa tải) để dựng sẵn.
export function warmChrome() {
  try {
    getEngine();
  } catch {
    /* WebGL không khả dụng: bỏ qua, trang vẫn chạy */
  }
}

export default function ChromeObject({ className = '' }) {
  const mount = useRef(null);

  useEffect(() => {
    const el = mount.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { renderer, scene, camera, mesh, pivot, post } = getEngine();
    const token = {};
    engine.owner = token;
    el.appendChild(renderer.domElement);

    const resize = () => {
      if (engine.owner !== token) return;
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      post.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.position.z = 12 * (w / h < 1 ? 1.35 : 1);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Intro: phóng to từ nhỏ + xoay nửa vòng.
    const intro = { spin: reduce ? 0 : -Math.PI * 0.6 };
    gsap.killTweensOf(pivot.scale);
    pivot.scale.setScalar(reduce ? 1 : 0.001);
    if (!reduce) {
      gsap.to(pivot.scale, { x: 1, y: 1, z: 1, duration: 2.2, ease: 'expo.out', delay: 0.1 });
      gsap.to(intro, { spin: 0, duration: 2.6, ease: 'expo.out', delay: 0.1 });
    }

    // Tương tác chuột: chỉ nghiêng nhẹ về phía con trỏ.
    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    const MAX_TILT_X = 0.12;
    const MAX_TILT_Y = 0.2;
    // Hằng thời gian của độ nghiêng (giây). 0.47s ≈ hệ số 0.035/khung cũ ở 60Hz,
    // nhưng giờ không phụ thuộc tần số quét (60/120/144Hz đều như nhau).
    const SMOOTHING = 0.47;
    const onMove = e => {
      if (e.pointerType === 'touch') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    // Con trỏ rời cửa sổ: đưa mục tiêu về giữa.
    const onOut = e => {
      if (!e.relatedTarget) {
        pointer.x = 0;
        pointer.y = 0;
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerout', onOut);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);

    const t0 = performance.now();
    let lastT = t0;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      if (!visible || document.hidden || engine.owner !== token) return;
      const t = (now - t0) / 1000;
      const idle = reduce ? 0 : 1;
      const k = 1 - Math.exp(-dt / SMOOTHING);
      tilt.x += (-pointer.y * MAX_TILT_X - tilt.x) * k;
      tilt.y += (pointer.x * MAX_TILT_Y - tilt.y) * k;
      pivot.rotation.x = tilt.x;
      pivot.rotation.y = tilt.y;
      mesh.rotation.y = Math.sin(t * 0.18) * 0.25 * idle + intro.spin;
      mesh.rotation.z = Math.sin(t * 0.13) * 0.04 * idle;
      post.render(dt);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gsap.killTweensOf(intro);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onOut);
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      if (engine.owner === token) engine.owner = null;
    };
  }, []);

  return <div className={`chrome ${className}`} ref={mount} role="img" aria-label="Chrome sculpture" />;
}
