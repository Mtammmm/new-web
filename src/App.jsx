import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { MENU } from './data/pages.js';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const PAGES = { index: Index, work: Work, about: About, contact: Contact };

// Màu nền lụa theo trang, khớp token --pink-hot / --plum trong portfolio.css.
const SILK = {
  index: { color: '#b4338f', sheen: '#ffd2f0' },
  dark: { color: '#2a1724', sheen: '#f3a6d2' }
};


const fromHash = () => {
  const key = window.location.hash.replace('#/', '');
  return PAGES[key] ? key : 'index';
};

export default function App() {
  const lenis = useLenis();
  const [page, setPage] = useState(fromHash);
  const [shown, setShown] = useState(page);
  // Trang quyết định màu nền lụa; đổi lúc màn chuyển trang che kín để không lộ cú đổi màu.
  const [bgPage, setBgPage] = useState(page);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const curtain = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Điều hướng: rèm che xuống, đổi trang, rèm kéo lên.
  const go = key => {
    if (key === shown) return;
    window.location.hash = `/${key}`;
  };

  useEffect(() => {
    const onHash = () => {
      setMenuOpen(false);
      setPage(fromHash());
    };
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
    curtain.current.transition(
      () => {
        sound.reveal();
        lenis?.scrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
        setShown(page);
      },
      () => setBgPage(page),
      shown
    );
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Khoá cuộn: index/work luôn khoá; about/contact cuộn được, trừ khi menu đang mở.
  useEffect(() => {
    const scrolls = shown === 'about' || shown === 'contact';
    const lock = !scrolls || menuOpen;
    document.documentElement.classList.toggle('lock', lock);
    document.documentElement.dataset.page = shown;
    if (lock) lenis?.stop();
    else lenis?.start();
  }, [shown, page, lenis, menuOpen]);

  const Page = PAGES[shown];

  return (
    <>
      <SmoothScroll />
      <div className="bg" aria-hidden="true">
        {/* Index: hồng rực (--pink-hot); các trang khác: mận tối (--plum). Màu nội suy 0.9s khi đổi. */}
        <Silk
          color={bgPage === 'index' ? SILK.index.color : SILK.dark.color}
          sheenColor={bgPage === 'index' ? SILK.index.sheen : SILK.dark.sheen}
          colorDuration={0.9}
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

      <Nav onGo={go} current={page} ready={loaded} menuOpen={menuOpen} onToggle={() => setMenuOpen(o => !o)} />
      <Menu open={menuOpen} current={page} onClose={closeMenu} onGo={go} />

      <main className={`page page-${shown}`} key={shown}>
        {loaded && <Page onGo={go} />}
      </main>

      <BlobCurtain ref={curtain} />
    </>
  );
}

/* ---------- Nav: nút [ MENU ] + nhãn trang hiện tại bên trái, tên ở giữa, CV bên phải ---------- */
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pageNo = key => String(MENU.findIndex(([k]) => k === key) + 1).padStart(2, '0');
const pageName = key => MENU.find(([k]) => k === key)?.[1] ?? '';

function Nav({ onGo, current, ready, menuOpen, onToggle }) {
  const ref = useRef(null);
  const first = useRef(true);

  useGSAP(
    () => {
      if (!ready) return;
      gsap.fromTo('.nav .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' });
    },
    { scope: ref, dependencies: [ready] }
  );

  // Mở: MENU trượt lên khỏi mặt nạ, CLOSE trượt vào; nhãn trang hiện tại mờ đi. Đóng: ngược lại.
  useGSAP(
    () => {
      const d = first.current || reduceMotion() ? 0 : 0.5;
      first.current = false;
      gsap.to('.mt-open', { yPercent: menuOpen ? -105 : 0, duration: d, ease: 'expo.out', overwrite: true });
      gsap.to('.mt-close', { yPercent: menuOpen ? 0 : 105, duration: d, ease: 'expo.out', overwrite: true });
      gsap.to('.menu-current', { opacity: menuOpen ? 0 : 1, duration: d ? 0.3 : 0, ease: 'power2.out', overwrite: true });
    },
    { scope: ref, dependencies: [menuOpen] }
  );

  const link = (key, e) => {
    e.preventDefault();
    onGo(key);
  };

  return (
    <nav className="nav" ref={ref} aria-label="Main">
      <div className="nav-item nav-left">
        <button
          type="button"
          id="menu-toggle"
          className={`menu-toggle ${menuOpen ? 'is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="menu-panel"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          data-silent
          onClick={onToggle}
        >
          <span className="nav-mask">
            <span className="nav-line mt-inner" aria-hidden="true">
              <span className="mt-bracket mt-l">[</span>
              <span className="mt-stack">
                <span className="mt-open">
                  <Roll>Menu</Roll>
                </span>
                <span className="mt-close">
                  <Roll>Close</Roll>
                </span>
              </span>
              <span className="mt-bracket mt-r">]</span>
            </span>
          </span>
        </button>
        <CurrentLabel current={current} />
      </div>

      <a className="nav-item nav-center" href="#/index" onClick={e => link('index', e)}>
        <span className="nav-mask">
          <span className="nav-line">
            <Roll>{profile.name}</Roll>
          </span>
        </span>
      </a>

      <div className="nav-item nav-right">
        <a href={profile.resume} target="_blank" rel="noreferrer">
          <span className="nav-mask">
            <span className="nav-line">
              <Roll>Resume ↗</Roll>
            </span>
          </span>
        </a>
      </div>
    </nav>
  );
}

// Nhãn "03 ABOUT" cạnh nút menu. Đổi trang: nhãn cũ trượt lên, nhãn mới trồi lên từ mặt nạ.
function CurrentLabel({ current }) {
  const ref = useRef(null);
  const [pair, setPair] = useState({ now: current, old: null });

  useLayoutEffect(() => {
    setPair(p => (p.now === current ? p : { now: current, old: p.now }));
  }, [current]);

  useGSAP(
    () => {
      if (!pair.old) return;
      const d = reduceMotion() ? 0 : 0.7;
      gsap.fromTo('.cur-old', { yPercent: 0 }, { yPercent: -105, duration: d, ease: 'expo.out' });
      gsap.fromTo('.cur-now', { yPercent: 105 }, { yPercent: 0, duration: d, ease: 'expo.out', delay: d ? 0.08 : 0 });
    },
    { scope: ref, dependencies: [pair] }
  );

  const text = key => `${pageNo(key)} ${pageName(key)}`;

  return (
    <span className="menu-current dim" ref={ref} aria-live="polite">
      <span className="nav-mask">
        <span className="nav-line cur-stack">
          {pair.old && (
            <span className="cur-old" key={`o-${pair.old}`} aria-hidden="true">
              {text(pair.old)}
            </span>
          )}
          <span className="cur-now" key={`n-${pair.now}`}>
            {text(pair.now)}
          </span>
        </span>
      </span>
    </span>
  );
}

/* ---------- Ô menu: 4 trang, Resume và email ---------- */
function Menu({ open, current, onClose, onGo }) {
  const ref = useRef(null);
  const tl = useRef(null);
  const [hot, setHot] = useState(null); // mục đang được rê chuột / focus
  const quietFocus = useRef(false); // focus tự động lúc mở: không phát tiếng tích
  const currentIdx = MENU.findIndex(([k]) => k === current);

  // Một timeline duy nhất: mở = play, đóng = reverse nhanh hơn 1.5 lần.
  useGSAP(
    () => {
      const panel = ref.current.querySelector('.menu-panel');
      const scrim = ref.current.querySelector('.menu-scrim');
      const hide = () => gsap.set([panel, scrim], { display: 'none' });
      const t = gsap.timeline({ paused: true, onReverseComplete: hide });
      if (reduceMotion()) {
        t.fromTo([panel, scrim], { opacity: 0 }, { opacity: 1, duration: 0.15, ease: 'none' });
      } else {
        t.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
          .fromTo(
            panel,
            { clipPath: 'inset(0% 100% 100% 0% round 6px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 6px)', duration: 0.75, ease: 'expo.inOut' },
            0
          )
          .fromTo('.menu-line > a', { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05 }, 0.45)
          .fromTo('.menu-foot', { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, '-=0.3');
      }
      tl.current = t;
    },
    { scope: ref }
  );

  const opened = useRef(false);
  // useLayoutEffect: ô phải hiện (display: block) trước khi đo vị trí con trỏ "▍" ở effect bên dưới.
  useLayoutEffect(() => {
    const t = tl.current;
    const panel = ref.current.querySelector('.menu-panel');
    const scrim = ref.current.querySelector('.menu-scrim');
    if (open) {
      opened.current = true;
      gsap.set([panel, scrim], { display: 'block' });
      t.timeScale(1).play();
      sound.click();
      // Focus mục đầu tiên; chỉ tính là "đang trỏ" khi focus hiện rõ (dùng bàn phím).
      quietFocus.current = true;
      ref.current.querySelector('.menu-item')?.focus({ preventScroll: true });
      quietFocus.current = false;
    } else if (opened.current) {
      t.timeScale(1.5).reverse();
      setHot(null);
      // Trả focus về nút nếu focus đang nằm trong ô menu (hoặc đã rơi về body).
      const a = document.activeElement;
      if (!a || a === document.body || ref.current.contains(a)) document.getElementById('menu-toggle')?.focus({ preventScroll: true });
    }
  }, [open]);

  // Khi menu mở: Esc đóng, mũi tên chuyển mục (vòng tròn), Tab chỉ đi trong ô + nút menu.
  // Chặn phím và cuộn chuột ở pha capture để băng chuyền trang Work và Detail không nhận được.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      e.stopPropagation();
      const panel = ref.current.querySelector('.menu-panel');
      const items = [...panel.querySelectorAll('.menu-item')];
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = items.indexOf(document.activeElement);
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const next = i < 0 ? (dir > 0 ? 0 : items.length - 1) : (i + dir + items.length) % items.length;
        items[next].focus();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const f = [document.getElementById('menu-toggle'), ...panel.querySelectorAll('a[href], button')];
        const i = f.indexOf(document.activeElement);
        const next = i < 0 ? 0 : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
        f[next].focus();
      }
    };
    const onWheel = e => e.stopPropagation();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('wheel', onWheel, { capture: true });
    };
  }, [open, onClose]);

  // Con trỏ "▍" trượt theo trục dọc tới mục đang trỏ, hoặc về trang hiện tại.
  const caretTo = useCallback((i, animate) => {
    const list = ref.current?.querySelector('.menu-list');
    const row = list?.querySelectorAll('.menu-line')[i];
    if (!row) return;
    const caret = list.querySelector('.menu-caret');
    const y = row.offsetTop + (row.offsetHeight - caret.offsetHeight) / 2;
    if (animate && !reduceMotion()) gsap.to(caret, { y, duration: 0.35, ease: 'expo.out', overwrite: true });
    else {
      gsap.killTweensOf(caret);
      gsap.set(caret, { y });
    }
  }, []);

  // Vừa mở: đặt con trỏ ngay tại trang hiện tại. Sau đó: luôn trượt (kể cả khi rời danh sách).
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    caretTo(hot ?? currentIdx, wasOpen.current);
    wasOpen.current = true;
  }, [open, hot, currentIdx, caretTo]);

  const point = i => {
    if (i === hot) return;
    if (!quietFocus.current) sound.tick();
    setHot(i);
  };

  const pick = (key, e) => {
    e.preventDefault();
    onClose();
    if (key !== current) onGo(key);
  };

  return (
    <div className="menu" ref={ref}>
      <div className="menu-scrim" onClick={onClose} aria-hidden="true" />
      <div id="menu-panel" className="menu-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div
          className={`menu-list ${hot !== null ? 'has-hot' : ''}`}
          onMouseLeave={() => setHot(null)}
          onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setHot(null)}
        >
          <span className="menu-caret" aria-hidden="true">
            ▍
          </span>
          <ul className="menu-items">
            {MENU.map(([key, label], i) => (
              <li className="menu-line" key={key}>
                <a
                  href={`#/${key}`}
                  className={`menu-item ${hot === i ? 'is-hot' : ''}`}
                  aria-current={current === key ? 'page' : undefined}
                  data-silent
                  data-quiet
                  onClick={e => pick(key, e)}
                  onMouseEnter={() => point(i)}
                  onFocus={e => e.currentTarget.matches(':focus-visible') && point(i)}
                >
                  <span className="menu-num">{pageNo(key)}</span>
                  <span className="menu-name">
                    <Roll>{label}</Roll>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <hr className="menu-rule" />
        <div className="menu-foot">
          <a href={profile.resume} target="_blank" rel="noreferrer">
            <Roll>Resume ↗</Roll>
          </a>
          <a href={`mailto:${profile.email}`}>
            <Roll>{profile.email}</Roll>
          </a>
        </div>
      </div>
    </div>
  );
}
