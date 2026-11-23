import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { gsap } from 'gsap';

// Màn chuyển cảnh dùng chung cho lúc vào web và lúc chuyển tab:
//  - "grain": nền lụa hồng (gradient --curtain-* + hạt film), viền khối hữu cơ lớn dần ở giữa (lòng khối để trống);
//  - "hole": khối biến thành lỗ, nở ra để lộ trang;
//  - "fill": khối hồng nở ra từ giữa để che trang hiện tại (chỉ dùng khi chuyển tab).
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
    // Màu đọc từ token trong portfolio.css (:root).
    const css = getComputedStyle(document.documentElement);
    const tok = (name, fb) => css.getPropertyValue(name).trim() || fb;
    const C = {
      hi: tok('--curtain-hi', '#ffb3dd'),
      mid: tok('--curtain-mid', '#ff4fae'),
      low: tok('--curtain-low', '#c42a8f'),
      deep: tok('--curtain-deep', '#5c1248'),
      lead: tok('--curtain-lead', '#ffc2e3'),
      plum: tok('--plum', '#2a1724')
    };
    const silk = (x, y, r) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, C.hi);
      g.addColorStop(0.32, C.mid);
      g.addColorStop(0.62, C.low);
      g.addColorStop(1, C.deep);
      return g;
    };

    // Hạt film: nhiễu xám 256×256 lặp lại, phủ overlay, dịch ngẫu nhiên 24 lần / giây.
    const noise = document.createElement('canvas');
    noise.width = noise.height = 256;
    const nctx = noise.getContext('2d');
    const img = nctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 256) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
    const grainPat = ctx.createPattern(noise, 'repeat');
    const GRAIN_ALPHA = 0.16;
    let grainScale = dpr; // tăng lên 2× (hạt độ phân giải nửa) nếu khung hình chậm
    let grainFrame = -1;
    const grainM = new DOMMatrix();
    const grain = (t, clipPath) => {
      const f = Math.floor(t * 24);
      if (f !== grainFrame) {
        grainFrame = f;
        grainM.a = grainM.d = grainScale;
        grainM.e = Math.random() * 256 * grainScale;
        grainM.f = Math.random() * 256 * grainScale;
        grainPat.setTransform(grainM);
      }
      ctx.save();
      if (clipPath) {
        clipPath();
        ctx.clip();
      }
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = GRAIN_ALPHA;
      ctx.fillStyle = grainPat;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.restore();
    };

    const rim = (pts, cx, cy, thick = 1) => {
      ctx.lineWidth = 1.6 * dpr * thick;
      ctx.shadowBlur = 14 * dpr;
      for (const [col, dx, dy] of [
        ['rgba(255,209,234,0.55)', -1.6, 0],
        ['rgba(255,209,234,0.55)', 1.6, 0.8],
        ['#ffd1ea', 0, 0]
      ]) {
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        path(pts, cx, cy, dx * dpr, dy * dpr);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    // Gradient phủ toàn màn hình (pha grain / nền quanh lỗ): tâm giữa, cố định -> chỉ tạo lại khi đổi kích thước.
    let screenGrad = null;
    let screenKey = '';
    const screenSilk = (W, H) => {
      const key = `${W}x${H}`;
      if (key !== screenKey) {
        screenKey = key;
        screenGrad = silk(W / 2, H / 2, Math.hypot(W, H) * 0.6);
      }
      return screenGrad;
    };

    let raf = 0;
    const t0 = performance.now();
    let lastNow = 0;
    let slow = 0;
    const draw = now => {
      raf = requestAnimationFrame(draw);
      const s = st.current;
      if (s.phase === 'idle') {
        lastNow = 0;
        return;
      }
      // Đo thời gian khung hình; chậm kéo dài (>16ms) thì chuyển hạt sang độ phân giải nửa.
      if (lastNow && now) {
        slow = slow * 0.9 + (now - lastNow > 16.7 * 1.25 ? 0.1 : 0);
        if (slow > 0.5 && grainScale === dpr) grainScale = dpr * 2;
      }
      lastNow = now || 0;
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
        const fromIndex = s.from === 'index';
        const r = full * s.k;
        if (r < 1) return;
        // Lớp chạy trước: lệch thời gian, lớn hơn 6%, tô phẳng (mận khi rời Index để tách khỏi nền hồng).
        const lead = shape(t + 0.6, r * 1.06);
        ctx.fillStyle = fromIndex ? C.plum : C.lead;
        path(lead, cx, cy);
        ctx.fill();
        grain(t, () => path(lead, cx, cy));
        // Khối chính: gradient như lụa, điểm sáng lệch lên trên-trái và trôi chậm.
        const pts = shape(t, r);
        const gx = cx - r * 0.25 * Math.SQRT1_2 + Math.cos(t * 0.4) * 0.12 * r;
        const gy = cy - r * 0.25 * Math.SQRT1_2 + Math.sin(t * 0.3) * 0.1 * r;
        ctx.fillStyle = silk(gx, gy, r * 1.15);
        path(pts, cx, cy);
        ctx.fill();
        grain(t, () => path(pts, cx, cy));
        rim(pts, cx, cy, fromIndex ? 2 : 1);
        return;
      }

      ctx.fillStyle = screenSilk(W, H);
      ctx.fillRect(0, 0, W, H);
      grain(t);
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
    // onCovered chạy ngay khi khối đã che kín màn hình (để đổi màu nền lụa phía sau).
    // from: trang đang rời (index -> lớp chạy trước màu mận, viền dày gấp đôi).
    transition(onReveal, onCovered, from) {
      tl.current?.kill();
      show();
      Object.assign(st.current, { phase: 'fill', p: 0, k: 0, from });
      const t = gsap.timeline();
      t.to(st.current, { k: 1, duration: 0.45, ease: 'power3.in' })
        .add(() => {
          Object.assign(st.current, { phase: 'grain', p: 0 });
          onCovered?.();
        })
        .to(st.current, { p: 0.7, duration: 0.75, ease: 'power2.out' });
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
