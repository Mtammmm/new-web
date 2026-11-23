import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Roll from '../components/Roll.jsx';
import WorkSlider from '../components/WorkSlider.jsx';
import { projects } from '../data/profile.js';
import { sound } from '../lib/sound.js';

const pad = n => String(n).padStart(2, '0');

export default function Work() {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(null);

  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) return void (firstStep.current = false);
    sound.step(index);
  }, [index]);

  useGSAP(
    () => {
      gsap.fromTo('.work-label .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', overwrite: true });
    },
    { scope: ref, dependencies: [index] }
  );

  useGSAP(
    () => {
      gsap.fromTo('.corner:not(.work-label) .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.2 });
    },
    { scope: ref }
  );

  // Mở/đóng dự án: chữ footer cuộn lên cùng nhịp với dải ảnh nở ra, và ngược lại.
  const onExpand = dir =>
    gsap.to(ref.current.querySelectorAll('.work-corners .nav-line'), {
      yPercent: dir > 0 ? -105 : 0,
      duration: 1.2,
      ease: 'power4.inOut',
      overwrite: true
    });

  const p = projects[index];

  return (
    <section className="work" ref={ref}>
      <h1 className="sr-only">Work</h1>

      <WorkSlider slides={projects} index={index} onIndexChange={setIndex} onOpen={setOpen} onExpand={onExpand} locked={open !== null} />

      <footer className="corners small work-corners">
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
              [ <span className="work-now">{pad(index + 1)}</span> / {pad(projects.length)} ]
            </span>
          </span>
        </p>
      </footer>

      {open !== null && <Detail project={projects[open]} n={open + 1} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Detail({ project: p, n, onClose }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const split = SplitText.create(ref.current.querySelector('.detail-summary'), { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap
        .timeline()
        .fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' })
        .from(split.lines, { yPercent: 105, stagger: 0.06, duration: 1, ease: 'expo.out' }, '-=0.35')
        .fromTo(ref.current.querySelectorAll('.row > span'), { yPercent: 105 }, { yPercent: 0, stagger: 0.02, duration: 0.8, ease: 'expo.out' }, '-=0.9')
        .from(ref.current.querySelectorAll('.detail-list li'), { y: 16, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out' }, '-=0.8');
      return () => split.revert();
    },
    { scope: ref }
  );

  const close = () =>
    gsap.to(ref.current, { opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: onClose });

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
    // data-lenis-prevent: trang Work đang stop() Lenis, và Lenis khi dừng sẽ chặn mọi cú cuộn;
    // thuộc tính này cho khung chi tiết tự cuộn bằng thanh cuộn của nó.
    <div className="detail" ref={ref} role="dialog" aria-modal="true" aria-label={p.title} data-lenis-prevent>
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
