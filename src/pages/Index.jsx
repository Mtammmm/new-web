import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import ChromeObject from '../components/ChromeObject.jsx';

export default function Index() {
  const ref = useRef(null);

  useGSAP(
    () => {
            gsap.fromTo('.corner .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
    },
    { scope: ref }
  );

  return (
    <section className="index" ref={ref}>
      <h1 className="sr-only">Đặng Minh Tâm, Backend & Cloud Developer</h1>

      <div className="mark">
        <ChromeObject />
      </div>

      <footer className="corners">
        <p className="corner">
          <span className="nav-mask">
            <span className="nav-line">Backend / Cloud Engineering</span>
          </span>
        </p>
        <p className="corner dim">
          <span className="nav-mask">
            <span className="nav-line">RMIT Vietnam — IT</span>
          </span>
        </p>
        <p className="corner">
          <span className="nav-mask">
            <span className="nav-line">Open to internships 2026</span>
          </span>
        </p>
      </footer>
    </section>
  );
}
