import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import StreetSign from '../components/StreetSign.jsx';
import { profile } from '../data/profile.js';
import { MENU } from '../data/pages.js';

const PAGES = MENU.filter(([key]) => key !== 'index');

export default function Index({ onGo }) {
  const ref = useRef(null);
  // Link ẩn cho bàn phím: focus vào link nào thì dòng tương ứng trên bảng sáng lên.
  const [focus, setFocus] = useState(-1);

  useGSAP(
    () => {
      gsap.fromTo('.corner .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
    },
    { scope: ref }
  );

  const goTo = key => onGo?.(key);

  return (
    <section className="index" ref={ref}>
      <h1 className="sr-only">Đặng Minh Tâm, Backend & Cloud Developer</h1>

      <StreetSign profile={profile} pages={PAGES} focus={focus} onPick={goTo} />

      {/* Điều hướng cho bàn phím / trình đọc màn hình, tương ứng với tấm bảng 3D. */}
      <nav className="sign-a11y sr-only" aria-label="Pages">
        <ul>
          {PAGES.map(([key, label], i) => (
            <li key={key}>
              <a
                href={`#/${key}`}
                onFocus={() => setFocus(i)}
                onBlur={() => setFocus(-1)}
                onClick={e => {
                  e.preventDefault();
                  goTo(key);
                }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

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
