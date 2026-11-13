import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

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

export default function ChromeObject({ className = '' }) {
  const mount = useRef(null);

  useEffect(() => {
    const el = mount.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environment = env;

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

    const geometry = buildGeometry();
    const mesh = new THREE.Mesh(geometry, material);
    const pivot = new THREE.Group();
    pivot.add(mesh);
    scene.add(pivot);

    // Đèn viền để tách khối khỏi nền đen.
    const rim = new THREE.DirectionalLight(0xffffff, 2.2);
    rim.position.set(-3, 4, -2);
    scene.add(rim);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 2, 5);
    scene.add(key);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const fit = w / h < 1 ? 1.35 : 1;
      camera.position.z = 12 * fit;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Intro: phóng to từ 0 + xoay nửa vòng.
    pivot.scale.setScalar(reduce ? 1 : 0.001);
    if (!reduce) {
      gsap.to(pivot.scale, { x: 1, y: 1, z: 1, duration: 2.2, ease: 'expo.out', delay: 0.2 });
      gsap.from(mesh.rotation, { y: -Math.PI * 0.6, duration: 2.6, ease: 'expo.out', delay: 0.2 });
    }

    // ----- Tương tác chuột: chỉ nghiêng nhẹ về phía con trỏ, vật thể đứng yên ở giữa -----
    const pointer = { x: 0, y: 0 }; // -1..1 theo khung nhìn
    const tilt = { x: 0, y: 0 };
    const MAX_TILT_X = 0.12; // ~7°
    const MAX_TILT_Y = 0.2; // ~11°

    const onMove = e => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);

    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const t = (performance.now() - t0) / 1000;
      const idle = reduce ? 0 : 1;

      // Lerp chậm để chuyển động êm, không giật.
      tilt.x += (-pointer.y * MAX_TILT_X - tilt.x) * 0.035;
      tilt.y += (pointer.x * MAX_TILT_Y - tilt.y) * 0.035;
      pivot.rotation.x = tilt.x;
      pivot.rotation.y = tilt.y;

      // Chuyển động nền rất chậm khi đứng yên.
      mesh.rotation.y = Math.sin(t * 0.18) * 0.25 * idle;
      mesh.rotation.z = Math.sin(t * 0.13) * 0.04 * idle;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      geometry.dispose();
      material.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div className={`chrome ${className}`} ref={mount} role="img" aria-label="Chrome sculpture" />;
}
