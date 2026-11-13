import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { gsap } from 'gsap';

// Màn chuyển cảnh dùng chung cho lúc vào web và lúc chuyển tab:
//  - "grain": nền đen, viền khối hữu cơ lớn dần ở giữa (lòng khối để trống);
//  - "hole": khối biến thành lỗ, nở ra để lộ trang;
//  - "fill": khối đen nở ra từ giữa để che trang hiện tại (chỉ dùng khi chuyển tab).
const BlobCurtain = forwardRef(function BlobCurtain(_, ref) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const st = useRef({ phase: 'black', p: 0, k: 0 });
  const tl = useRef(null);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);


    const shape = (t, r) => {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const k =
          1 +
          0.11 * Math.sin(3 * a + t * 0.9) +
          0.07 * Math.sin(5 * a - t * 1.3) +
          0.04 * Math.sin(9 * a + t * 2.1) +
          0.02 * Math.sin(17 * a - t * 2.7);
        pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
      }
      return pts;
    };
    const path = (pts, cx, cy, dx = 0, dy = 0) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx + x + dx, cy + y + dy));
      ctx.closePath();
    };
    const rim = (pts, cx, cy) => {
      ctx.lineWidth = 1.6 * dpr;
      ctx.shadowBlur = 14 * dpr;
      for (const [col, dx, dy] of [
        ['rgba(255,120,80,0.75)', -1.6, 0],
        ['rgba(90,160,255,0.75)', 1.6, 0.8],
        ['rgba(255,255,255,0.95)', 0, 0]
      ]) {
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        path(pts, cx, cy, dx * dpr, dy * dpr);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    let raf = 0;
    const t0 = performance.now();
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const s = st.current;
      if (s.phase === 'idle') return;
      const t = (performance.now() - t0) / 1000;
      const W = cv.width;
      const H = cv.height;
      const cx = W / 2;
      const cy = H / 2;
      const full = Math.hypot(W, H) * 0.75;
      const base = Math.min(W, H) * (0.06 + 0.16 * s.p);

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);

      if (s.phase === 'fill') {
        const pts = shape(t, full * s.k);
        path(pts, cx, cy);
        ctx.fillStyle = '#000';
        ctx.fill();
        rim(pts, cx, cy);
        return;
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      if (s.phase === 'black') return; // chờ trình duyệt tải xong mới vẽ khối
      const r = s.phase === 'hole' ? base + (full - base) * s.k : base;
      const pts = shape(t, r);
      if (s.phase === 'hole') {
        ctx.globalCompositeOperation = 'destination-out';
        path(pts, cx, cy);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      rim(pts, cx, cy);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const show = () => gsap.set(wrap.current, { display: 'block' });
  const hide = () => {
    st.current.phase = 'idle';
    gsap.set(wrap.current, { display: 'none' });
  };

  // Mở ra: gắn trang mới (onReveal) khi màn hình còn đen, tạm dừng 3 khung hình
  // để trình duyệt vẽ xong trang mới, rồi mới mở lỗ. Nhờ vậy lỗ không bao giờ lộ trang cũ,
  // và hiệu ứng chữ của trang mới vẫn chạy gần như cùng lúc với lúc lộ ra.
  const reveal = (timeline, onReveal) =>
    timeline
      .add(() => {
        onReveal?.();
        timeline.pause();
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => timeline.resume())));
      })
      .add(() => {
        st.current.phase = 'hole';
        st.current.k = 0;
      })
      .to(st.current, { k: 1, duration: 0.6, ease: 'power2.in' })
      .add(hide);

  useImperativeHandle(ref, () => ({
    // Lúc vào web: khối hạt lớn dần rồi mở ra.
    intro(onReveal) {
      tl.current?.kill();
      show();
      Object.assign(st.current, { phase: 'grain', p: 0, k: 0 });
      const t = gsap.timeline();
      t.to(st.current, { p: 1, duration: 1.5, ease: 'power2.inOut' });
      reveal(t, onReveal);
      tl.current = t;
    },
    // Lúc chuyển tab: khối đen nở che trang → khối hạt ngắn → mở ra trang mới.
    transition(onReveal) {
      tl.current?.kill();
      show();
      Object.assign(st.current, { phase: 'fill', p: 0, k: 0 });
      const t = gsap.timeline();
      t.to(st.current, { k: 1, duration: 0.45, ease: 'power3.in' })
        .add(() => Object.assign(st.current, { phase: 'grain', p: 0 }))
        .to(st.current, { p: 0.7, duration: 0.45, ease: 'power2.out' });
      reveal(t, onReveal);
      tl.current = t;
    }
  }));

  return (
    <div className="preloader" ref={wrap} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
});

export default BlobCurtain;
