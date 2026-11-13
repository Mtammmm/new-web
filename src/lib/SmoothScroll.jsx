import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ReactLenis, useLenis } from 'lenis/react';

gsap.registerPlugin(ScrollTrigger);

// Cuộn mượt bằng Lenis, chạy chung một vòng lặp với GSAP để ScrollTrigger luôn khớp.
// Đặt <SmoothScroll /> một lần ở gốc ứng dụng. Chỉnh cảm giác cuộn qua prop `options`
// (ví dụ: { lerp: 0.08 } hoặc { duration: 1.4 }).
export default function SmoothScroll({ options }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    const update = time => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);

  useLenis(() => ScrollTrigger.update());

  return <ReactLenis root ref={lenisRef} options={{ autoRaf: false, ...options }} />;
}
