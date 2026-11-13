import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useLenis } from 'lenis/react';
import SmoothScroll from './lib/SmoothScroll.jsx';
import Silk from './components/reactbits/Silk.jsx';
import Roll from './components/Roll.jsx';
import BlobCurtain from './components/BlobCurtain.jsx';
import { warmChrome } from './components/ChromeObject.jsx';
import { installSound, sound } from './lib/sound.js';
import Index from './pages/Index.jsx';
import Work from './pages/Work.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import { profile } from './data/profile.js';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const PAGES = { index: Index, work: Work, about: About, contact: Contact };
const MENU = [
  ['index', 'Index'],
  ['work', 'Work'],
  ['about', 'About'],
  ['contact', 'Contact']
];

const fromHash = () => {
  const key = window.location.hash.replace('#/', '');
  return PAGES[key] ? key : 'index';
};

export default function App() {
  const lenis = useLenis();
  const [page, setPage] = useState(fromHash);
  const [shown, setShown] = useState(page);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const curtain = useRef(null);

  // Điều hướng: rèm che xuống, đổi trang, rèm kéo lên.
  const go = key => {
    setMenuOpen(false);
    if (key === shown) return;
    window.location.hash = `/${key}`;
  };

  useEffect(() => {
    const onHash = () => setPage(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Vào web: khối hạt + số đếm, rồi mở ra.
  useEffect(() => {
    warmChrome(); // dựng sẵn vật thể 3D trong lúc màn hình còn đen
    // Chỉ bắt đầu hiệu ứng khi trình duyệt đã chạy ổn định (3 khung hình liền < 25ms),
    // để khối không bị khựng ngay nhịp đầu. Tối đa chờ 1.5s.
    let raf = 0;
    let good = 0;
    let last = performance.now();
    const t0 = last;
    const wait = now => {
      good = now - last < 25 ? good + 1 : 0;
      last = now;
      if (good >= 3 || now - t0 > 1500) curtain.current.intro(() => setLoaded(true));
      else raf = requestAnimationFrame(wait);
    };
    raf = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => installSound(), []);

  // Chuyển tab: cùng hiệu ứng khối, che trang cũ → đổi trang → mở ra.
  useEffect(() => {
    if (page === shown) return;
    sound.whoosh();
    curtain.current.transition(() => {
      sound.reveal();
      lenis?.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
      setShown(page);
    });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const scrolls = shown === 'about' || shown === 'contact';
    document.documentElement.classList.toggle('lock', !scrolls || menuOpen);
    if (menuOpen || !scrolls) lenis?.stop();
    else lenis?.start();
  }, [shown, page, menuOpen, lenis]);

  const Page = PAGES[shown];

  return (
    <>
      <SmoothScroll />
      <div className="bg" aria-hidden="true">
        <Silk
          color="#2a2a2a"
          sheenColor="#bdbdbd"
          speed={3}
          scale={0.7}
          wave={0.6}
          ripple={0.35}
          noiseIntensity={0}
          sheen={0.55}
          depth={0.7}
          glow={0.15}
          rotation={0.2}
          interactionStrength={3.2}
          followSpeed={2.2}
          reach={0.55}
          dragAmount={0.1}
          bulge={1.3}
          springDamping={0.42}
          settle={0.35}
          afterflow={2.5}
          dragDecay={1.2}
          clickRipple={false}
          interaction="fluid"
          fluidResolution={0.25}
          brushSize={1}
          brushStrength={1}
          distortion={1}
          fluidDecay={0.97}
          fluidTrail={0.99}
          stopDecay={0.9}
          grainAmount={0.22}
          grainFps={24}
        />
      </div>


      <Nav open={menuOpen} onToggle={() => setMenuOpen(v => !v)} onGo={go} current={shown} ready={loaded} />

      <main className={`page page-${shown}`} key={shown}>
        {loaded && <Page onGo={go} />}
      </main>

      <BlobCurtain ref={curtain} />
    </>
  );
}

/* ---------- Nav + menu (ô trắng nhỏ góc trên trái) ---------- */
function Nav({ open, onToggle, onGo, current, ready }) {
  const ref = useRef(null);
  const tl = useRef(null);

  useGSAP(
    () => {
      if (!ready) return;
      gsap.fromTo('.nav .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' });

      tl.current = gsap
        .timeline({ paused: true })
        .set('.menu-panel', { display: 'flex' })
        .fromTo(
          '.menu-panel',
          { clipPath: 'inset(0% 100% 100% 0% round 6px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: 0.75, ease: 'expo.inOut' }
        )
        .fromTo('.menu-line', { yPercent: 100 }, { yPercent: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out' }, '-=0.3');
    },
    { scope: ref, dependencies: [ready] }
  );

  useEffect(() => {
    if (!tl.current) return;
    open ? tl.current.timeScale(1).play() : tl.current.timeScale(1.5).reverse();
  }, [open]);

  // Âm mở/đóng menu (bỏ qua lần render đầu).
  const firstMenu = useRef(true);
  useEffect(() => {
    if (firstMenu.current) return void (firstMenu.current = false);
    sound.menu(open);
  }, [open]);

  const [soundOn, setSoundOn] = useState(sound.enabled);
  useEffect(() => sound.subscribe(setSoundOn), []);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && open && onToggle();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  const link = (key, e) => {
    e.preventDefault();
    onGo(key);
  };

  return (
    <nav className="nav" ref={ref} aria-label="Main">
      <button
        className="nav-item menu-toggle"
        aria-expanded={open}
        aria-controls="menu-panel"
        onClick={onToggle}
        data-silent
      >
        <span className="nav-mask">
          <span className="nav-line">
            <span className={`toggle-words ${open ? 'is-open' : ''}`}>
              <span>Menu</span>
              <span aria-hidden="true">Close</span>
            </span>
          </span>
        </span>
      </button>

      <a className="nav-item nav-center" href="#/index" onClick={e => link('index', e)}>
        <span className="nav-mask">
          <span className="nav-line">
            <Roll>{profile.name}</Roll>
          </span>
        </span>
      </a>

      <div className="nav-item nav-right">
        <button className="sound-toggle" onClick={() => sound.toggle()} aria-pressed={soundOn} data-silent>
          <span className="nav-mask">
            <span className="nav-line">
              <span className={`eq ${soundOn ? 'on' : ''}`} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <Roll>{soundOn ? 'Sound on' : 'Sound off'}</Roll>
            </span>
          </span>
        </button>
        <a href="#/contact" onClick={e => link('contact', e)}>
          <span className="nav-mask">
            <span className="nav-line">
              <Roll>Contact</Roll>
            </span>
          </span>
        </a>
      </div>

      <div className="menu-panel" id="menu-panel" inert={!open}>
        <ul className="menu-links">
          {MENU.map(([key, label]) => (
            <li key={key}>
              <a
                className="menu-link"
                href={`#/${key}`}
                aria-current={current === key ? 'page' : undefined}
                onClick={e => link(key, e)}
              >
                <span className="menu-line-mask">
                  <span className="menu-line">
                    <Roll>{label}</Roll>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
