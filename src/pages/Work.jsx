import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Roll from '../components/Roll.jsx';
import { projects } from '../data/profile.js';
import { sound } from '../lib/sound.js';

const pad = n => String(n).padStart(2, '0');
const GAP = 1.06; // khoảng cách tâm các thẻ, tính theo bề rộng thẻ

export default function Work() {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(null);
  const drag = useRef(null);
  const wheel = useRef({ acc: 0, last: 0 });

  const step = useCallback(dir => setIndex(i => gsap.utils.clamp(0, projects.length - 1, i + dir)), []);

  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) return void (firstStep.current = false);
    sound.step(index);
  }, [index]);

  useGSAP(
    () => {
      gsap.utils.toArray('.card').forEach((card, i) => {
        const o = i - index;
        const a = Math.min(Math.abs(o), 2);
        gsap.to(card, {
          xPercent: -50 + o * GAP * 100,
          scale: 1 - a * 0.04,
          filter: `blur(${a * 9}px) brightness(${1 - a * 0.35})`,
          duration: 1,
          ease: 'expo.out',
          overwrite: true
        });
      });
      gsap.fromTo('.work-label .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', overwrite: true });
    },
    { scope: ref, dependencies: [index] }
  );

  useGSAP(
    () => {
      gsap.from('.card', { yPercent: 12, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.05 });
      gsap.fromTo('.corner .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.2 });
    },
    { scope: ref }
  );

  useEffect(() => {
    if (open !== null) return undefined;
    // Cộng dồn lực cuộn: cuộn nhanh thì nhảy nhiều thẻ, không khoá chờ.
    const onWheel = e => {
      const w = wheel.current;
      const now = performance.now();
      if (now - w.last > 220) w.acc = 0;
      w.last = now;
      w.acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      while (Math.abs(w.acc) >= 90) {
        const dir = Math.sign(w.acc);
        step(dir);
        w.acc -= dir * 90;
      }
    };
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
      if (e.key === 'Enter') setOpen(index);
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [step, open, index]);

  const onDown = e => (drag.current = { x: e.clientX });
  const onUp = (e, i) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40) return step(dx < 0 ? 1 : -1);
    if (i === index) setOpen(i);
    else setIndex(i);
  };

  const p = projects[index];

  return (
    <section className="work" ref={ref}>
      <h1 className="sr-only">Work</h1>

      {/* Mép trên/dưới cong lõm, như màn hình cong */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <clipPath id="curve" clipPathUnits="objectBoundingBox">
          <path d="M0.012,0 Q0.5,0.045 0.988,0 Q1,0 1,0.018 L1,0.982 Q1,1 0.988,1 Q0.5,0.955 0.012,1 Q0,1 0,0.982 L0,0.018 Q0,0 0.012,0 Z" />
        </clipPath>
      </svg>

      <div className="stage">
        {projects.map((proj, i) => (
          <button
            key={proj.slug}
            className={`card ${i === index ? 'is-active' : ''}`}
            onPointerDown={onDown}
            onPointerUp={e => onUp(e, i)}
            aria-label={`${proj.title}${i === index ? ', open details' : ''}`}
            tabIndex={i === index ? 0 : -1}
          >
            <Cover project={proj} n={i + 1} />
          </button>
        ))}
      </div>

      <footer className="corners small">
        <p className="corner work-label">
          <span className="nav-mask">
            <span className="nav-line" key={p.slug}>
              {p.title}
            </span>
          </span>
        </p>
        <p className="corner dim">
          <span className="nav-mask">
            <span className="nav-line">Selected work 2025 — 2026</span>
          </span>
        </p>
        <p className="corner">
          <span className="nav-mask">
            <span className="nav-line">
              {pad(index + 1)} / {pad(projects.length)}
            </span>
          </span>
        </p>
      </footer>

      {open !== null && <Detail project={projects[open]} n={open + 1} onClose={() => setOpen(null)} />}
    </section>
  );
}

/* "Ảnh bìa" dựng bằng code: nền hạt tối + sơ đồ kiến trúc của dự án */
function Cover({ project: p, n }) {
  const tone = 18 + ((n * 37) % 22);
  return (
    <div
      className="cover"
      style={{
        background: `radial-gradient(90% 120% at ${30 + ((n * 23) % 40)}% 20%, hsl(0 0% ${tone + 16}%), transparent 60%), radial-gradient(120% 120% at 80% 100%, hsl(0 0% ${tone}%), #050505 70%)`
      }}
    >
      <div className="cover-head small">
        <span>{pad(n)}</span>
        <span>{p.year}</span>
      </div>
      <p className="cover-title large">{p.title}</p>
      <div className="cover-flow small" aria-hidden="true">
        {(p.arch || p.stack).map((s, j) => (
          <Fragment key={s}>
            {j > 0 && <i />}
            <span>{s}</span>
          </Fragment>
        ))}
      </div>
      <div className="cover-foot small">
        <span>{p.role}</span>
        {p.highlight && <span>{p.highlight}</span>}
      </div>
    </div>
  );
}

function Detail({ project: p, n, onClose }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const split = SplitText.create(ref.current.querySelector('.detail-summary'), { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap
        .timeline()
        .fromTo(ref.current, { clipPath: 'inset(50% 18% 50% 18% round 12px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.9, ease: 'expo.inOut' })
        .from(split.lines, { yPercent: 105, stagger: 0.06, duration: 1, ease: 'expo.out' }, '-=0.35')
        .fromTo(ref.current.querySelectorAll('.row > span'), { yPercent: 105 }, { yPercent: 0, stagger: 0.02, duration: 0.8, ease: 'expo.out' }, '-=0.9')
        .from(ref.current.querySelectorAll('.detail-list li'), { y: 16, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out' }, '-=0.8');
      return () => split.revert();
    },
    { scope: ref }
  );

  const close = () =>
    gsap.to(ref.current, { clipPath: 'inset(50% 18% 50% 18% round 12px)', duration: 0.7, ease: 'expo.inOut', onComplete: onClose });

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const Row = ({ children, dim }) => (
    <span className={`row ${dim ? 'dim' : ''}`}>
      <span>{children}</span>
    </span>
  );

  return (
    <div className="detail" ref={ref} role="dialog" aria-modal="true" aria-label={p.title}>
      <div className="detail-grid">
        <div className="col small detail-meta">
          <Row dim>Project</Row>
          <Row>
            {pad(n)} — {p.title}
          </Row>
          <span className="gap" />
          <Row dim>Role</Row>
          <Row>{p.role}</Row>
          <span className="gap" />
          <Row dim>Year</Row>
          <Row>{p.year}</Row>
        </div>

        <div className="detail-main">
          <p className="detail-summary large">{p.summary}</p>

          <section className="detail-block">
            <p className="small dim">What I did</p>
            <ol className="detail-list">
              {p.did.map((d, i) => (
                <li key={d}>
                  <span className="small dim">{pad(i + 1)}</span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </section>

          {(p.highlight || p.impact.length > 0) && (
            <section className="detail-block">
              <p className="small dim">Impact</p>
              <ul className="detail-list impact">
                {(p.impact.length ? p.impact : [p.highlight]).map(d => (
                  <li key={d}>
                    <span className="small dim">→</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail-block detail-tech">
            {p.arch && (
              <div className="col small">
                <Row dim>Architecture</Row>
                {p.arch.map(s => (
                  <Row key={s}>{s}</Row>
                ))}
              </div>
            )}
            <div className="col small">
              <Row dim>Tech stack</Row>
              {p.stack.map(s => (
                <Row key={s}>{s}</Row>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="corners small detail-corners">
        <p className="corner">
          {p.repo ? (
            <a href={p.repo} target="_blank" rel="noreferrer">
              <Roll>View repository</Roll>
            </a>
          ) : (
            <span className="dim">Private repository</span>
          )}
        </p>
        <p className="corner dim">
          {pad(n)} / {pad(projects.length)}
        </p>
        <p className="corner">
          <button onClick={close}>
            <Roll>Close</Roll>
          </button>
        </p>
      </footer>
    </div>
  );
}
