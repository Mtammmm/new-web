import { useLayoutEffect, useRef, useState } from 'react';
import './demo.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { useGSAP } from '@gsap/react';
import { useLenis } from 'lenis/react';
import SmoothScroll from '../lib/SmoothScroll.jsx';

import SplitText from '../components/reactbits/SplitText.jsx';
import ScrollReveal from '../components/reactbits/ScrollReveal.jsx';
import ShinyText from '../components/reactbits/ShinyText.jsx';
import Magnet from '../components/reactbits/Magnet.jsx';
import Aurora from '../components/reactbits/Aurora.jsx';
import DotGrid from '../components/reactbits/DotGrid.jsx';
import GradientText from '../components/reactbits/GradientText.jsx';
import GlitchText from '../components/reactbits/GlitchText.jsx';
import TextType from '../components/reactbits/TextType.jsx';
import SpotlightCard from '../components/reactbits/SpotlightCard.jsx';
import Counter from '../components/reactbits/Counter.jsx';
import ClickSpark from '../components/reactbits/ClickSpark.jsx';
import StarBorder from '../components/reactbits/StarBorder.jsx';
import FadeContent from '../components/reactbits/FadeContent.jsx';

gsap.registerPlugin(ScrollTrigger, Flip, Draggable, InertiaPlugin, useGSAP);

const NAV = [
  ['#chu', 'Chữ'],
  ['#timeline', 'Timeline'],
  ['#ngang', 'Cuộn ngang'],
  ['#flip', 'Flip'],
  ['#keo', 'Kéo thả'],
  ['#so', 'Counter'],
  ['#nen', 'Nền']
];

export default function App() {
  const lenis = useLenis();
  const progressRef = useRef(null);

  // Lenis: thanh tiến độ đọc trang, cập nhật mỗi khung hình cuộn.
  useLenis(({ progress }) => {
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
  });

  // Các component con tạo ScrollTrigger trước khi section ghim (pin) được tạo,
  // nên tính lại vị trí sau khi mọi thứ đã gắn vào trang.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, []);

  const go = target => lenis?.scrollTo(target, { offset: -70 });

  return (
    <ClickSpark sparkColor="#c9c0ff" sparkCount={10} sparkRadius={26}>
      <SmoothScroll />

      <nav className="nav">
        <a className="nav-logo" href="#top" onClick={e => (e.preventDefault(), lenis?.scrollTo(0))}>
          Starter
        </a>
        <div className="nav-links">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={e => (e.preventDefault(), go(href))}>
              {label}
            </a>
          ))}
        </div>
        <div className="nav-progress" ref={progressRef} />
      </nav>

      <Hero onStart={() => go('#gioi-thieu')} />

      <section id="gioi-thieu" className="section">
        <Label>ScrollReveal · React Bits</Label>
        <ScrollReveal baseOpacity={0.1} blurStrength={6} textClassName="reveal-text">
          Trang này gom mọi thứ có sẵn trong bộ starter: GSAP cho hoạt ảnh, Lenis cho cuộn mượt, và một loạt
          component React Bits. Cuộn tiếp để thử từng thứ.
        </ScrollReveal>
      </section>

      <TextShowcase />
      <TimelineDemo />
      <HorizontalDemo />
      <FlipDemo />
      <DragDemo />
      <CounterDemo />
      <BackgroundDemo />

      <footer className="footer">
        <p className="muted">Bấm chuột ở bất kỳ đâu để thấy ClickSpark.</p>
        <Magnet padding={60} magnetStrength={3}>
          <button className="btn ghost" onClick={() => lenis?.scrollTo(0, { duration: 2 })}>
            Về đầu trang
          </button>
        </Magnet>
      </footer>
    </ClickSpark>
  );
}

function Label({ children }) {
  return <p className="label">{children}</p>;
}

/* ---------- Hero: Aurora + ShinyText + SplitText + TextType + Magnet + StarBorder ---------- */

function Hero({ onStart }) {
  return (
    <header className="hero" id="top">
      <div className="hero-bg">
        <Aurora colorStops={['#5b3cff', '#ff7ac6', '#3ad0ff']} amplitude={1.1} blend={0.55} speed={0.6} />
      </div>
      <ShinyText text="Web Starter · Demo" speed={3} className="eyebrow" />
      <SplitText
        tag="h1"
        text="Dựng web chuyển động, nhanh hơn."
        className="hero-title"
        splitType="words"
        delay={70}
        duration={1}
      />
      <TextType
        className="hero-sub"
        text={['GSAP lo hoạt ảnh.', 'Lenis lo cuộn mượt.', 'React Bits lo phần đẹp.']}
        typingSpeed={45}
        pauseDuration={1600}
        cursorCharacter="▍"
      />
      <div className="hero-actions">
        <Magnet padding={80} magnetStrength={3}>
          <button className="btn" onClick={onStart}>
            Xem demo
          </button>
        </Magnet>
        <StarBorder as="a" href="https://gsap.com/docs/v3/" target="_blank" rel="noreferrer" radius={999} sparkle>
          Tài liệu GSAP
        </StarBorder>
      </div>
    </header>
  );
}

/* ---------- Hiệu ứng chữ ---------- */

function TextShowcase() {
  return (
    <section id="chu" className="section">
      <Label>Hiệu ứng chữ · React Bits</Label>
      <h2 className="section-title">Sáu cách làm chữ sống động</h2>
      <FadeContent className="text-grid" effect="slide" stagger={0.1} duration={0.8} blur>
        <SpotlightCard className="tile" spotlightColor="rgba(139,123,255,0.35)">
          <span className="tile-tag">GradientText</span>
          <GradientText className="tile-demo" colors={['#8b7bff', '#ff7ac6', '#3ad0ff']} animationSpeed={6}>
            Chuyển màu
          </GradientText>
        </SpotlightCard>
        <SpotlightCard className="tile" spotlightColor="rgba(255,122,198,0.3)">
          <span className="tile-tag">GlitchText · rê chuột</span>
          <GlitchText className="tile-demo" enableOnHover fontSize="2.2rem" fontWeight={800}>
            GLITCH
          </GlitchText>
        </SpotlightCard>
        <SpotlightCard className="tile" spotlightColor="rgba(58,208,255,0.3)">
          <span className="tile-tag">ShinyText</span>
          <ShinyText className="tile-demo" text="Ánh kim lướt qua" speed={2.5} />
        </SpotlightCard>
        <SpotlightCard className="tile">
          <span className="tile-tag">SplitText · chars</span>
          <SplitText tag="p" className="tile-demo" text="Từng ký tự" splitType="chars" delay={40} textAlign="left" />
        </SpotlightCard>
        <SpotlightCard className="tile">
          <span className="tile-tag">TextType</span>
          <TextType
            className="tile-demo"
            text={['Gõ chữ…', 'xoá…', 'gõ lại.']}
            typingSpeed={70}
            startOnVisible
          />
        </SpotlightCard>
        <SpotlightCard className="tile">
          <span className="tile-tag">SpotlightCard</span>
          <p className="tile-demo small">Rê chuột lên bất kỳ ô nào để thấy vệt sáng đi theo con trỏ.</p>
        </SpotlightCard>
      </FadeContent>
    </section>
  );
}

/* ---------- GSAP Timeline có nút điều khiển ---------- */

function TimelineDemo() {
  const scope = useRef(null);
  const tl = useRef(null);
  const slider = useRef(null);

  useGSAP(
    () => {
      tl.current = gsap
        .timeline({
          paused: true,
          defaults: { duration: 0.7, ease: 'power3.inOut' },
          onUpdate: () => {
            if (slider.current) slider.current.value = tl.current.progress();
          }
        })
        .to('.tl-a', { x: '32vw', rotate: 360, borderRadius: '50%' })
        .to('.tl-b', { x: '32vw', scale: 1.4, backgroundColor: '#ff7ac6' }, '-=0.35')
        .to('.tl-c', { x: '32vw', y: -30, skewX: -20, backgroundColor: '#3ad0ff' }, '<0.15')
        .to('.tl-box', { y: 0, skewX: 0, scale: 1, stagger: 0.08, ease: 'elastic.out(1, 0.5)', duration: 1.1 });
    },
    { scope }
  );

  const ctl = action => () => tl.current?.[action]();

  return (
    <section id="timeline" className="section" ref={scope}>
      <Label>gsap.timeline()</Label>
      <h2 className="section-title">Timeline: xếp chuỗi, tua, đảo chiều</h2>
      <div className="stage">
        <div className="tl-box tl-a">A</div>
        <div className="tl-box tl-b">B</div>
        <div className="tl-box tl-c">C</div>
      </div>
      <div className="controls">
        <button className="btn small" onClick={ctl('play')}>Play</button>
        <button className="btn small ghost" onClick={ctl('pause')}>Pause</button>
        <button className="btn small ghost" onClick={ctl('reverse')}>Reverse</button>
        <button className="btn small ghost" onClick={ctl('restart')}>Restart</button>
        <input
          ref={slider}
          className="range"
          type="range"
          min="0"
          max="1"
          step="0.001"
          defaultValue="0"
          aria-label="Tua timeline"
          onInput={e => tl.current?.pause().progress(+e.target.value)}
        />
      </div>
    </section>
  );
}

/* ---------- ScrollTrigger: ghim section và cuộn ngang ---------- */

const PANELS = [
  ['01', 'pin: true', 'Section được ghim lại trong khi bạn cuộn.'],
  ['02', 'scrub: 1', 'Hoạt ảnh bám theo thanh cuộn, có độ trễ mượt 1 giây.'],
  ['03', 'containerAnimation', 'Từng thẻ có trigger riêng bên trong chuyển động ngang.'],
  ['04', 'Lenis + ticker', 'Cuộn mượt và ScrollTrigger dùng chung một vòng lặp.']
];

function HorizontalDemo() {
  const scope = useRef(null);

  useGSAP(
    () => {
      const track = scope.current.querySelector('.h-track');
      const distance = () => track.scrollWidth - window.innerWidth;

      const move = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true
        }
      });

      gsap.utils.toArray('.h-panel').forEach(panel => {
        gsap.from(panel.querySelector('.h-num'), {
          yPercent: 100,
          opacity: 0,
          scrollTrigger: { trigger: panel, containerAnimation: move, start: 'left 85%', end: 'left 45%', scrub: true }
        });
      });
    },
    { scope }
  );

  return (
    <section id="ngang" className="h-section" ref={scope}>
      <div className="h-track">
        <div className="h-intro">
          <Label>ScrollTrigger</Label>
          <h2 className="section-title">Cuộn dọc,<br />chạy ngang →</h2>
        </div>
        {PANELS.map(([n, title, body]) => (
          <article className="h-panel" key={n}>
            <span className="h-num">{n}</span>
            <h3>{title}</h3>
            <p className="muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Flip: đổi bố cục có hoạt ảnh ---------- */

const COLORS = ['#8b7bff', '#ff7ac6', '#3ad0ff', '#ffd166', '#7cff9e', '#ff8a5b', '#b497cf', '#5eead4'];

function FlipDemo() {
  const scope = useRef(null);
  const flipState = useRef(null);
  const [items, setItems] = useState(COLORS.map((c, i) => ({ id: i + 1, color: c })));
  const [layout, setLayout] = useState('grid');

  const change = fn => {
    flipState.current = Flip.getState(scope.current.querySelectorAll('.flip-item'));
    fn();
  };

  useLayoutEffect(() => {
    if (!flipState.current) return;
    Flip.from(flipState.current, {
      duration: 0.8,
      ease: 'power3.inOut',
      stagger: 0.03,
      absolute: true
    });
    flipState.current = null;
  }, [items, layout]);

  return (
    <section id="flip" className="section" ref={scope}>
      <Label>Flip plugin</Label>
      <h2 className="section-title">Flip: đổi bố cục, GSAP tự nối chuyển động</h2>
      <div className="controls">
        <button className="btn small" onClick={() => change(() => setItems(gsap.utils.shuffle([...items])))}>
          Xáo trộn
        </button>
        <button
          className="btn small ghost"
          onClick={() => change(() => setLayout(l => (l === 'grid' ? 'row' : l === 'row' ? 'stack' : 'grid')))}
        >
          Bố cục: {layout}
        </button>
      </div>
      <div className={`flip-wrap ${layout}`}>
        {items.map(item => (
          <div className="flip-item" key={item.id} style={{ background: item.color }}>
            {item.id}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Draggable + Inertia ---------- */

function DragDemo() {
  const scope = useRef(null);

  useGSAP(
    () => {
      Draggable.create('.drag-item', {
        bounds: scope.current.querySelector('.drag-area'),
        inertia: true,
        edgeResistance: 0.75,
        onPress() {
          gsap.to(this.target, { scale: 1.08, duration: 0.2 });
        },
        onRelease() {
          gsap.to(this.target, { scale: 1, duration: 0.3 });
        }
      });
      Draggable.create('.drag-knob', { type: 'rotation', inertia: true });
    },
    { scope }
  );

  return (
    <section id="keo" className="section" ref={scope}>
      <Label>Draggable + InertiaPlugin</Label>
      <h2 className="section-title">Kéo, ném, xoay</h2>
      <div className="drag-area">
        <div className="drag-item" style={{ left: '8%', top: '20%' }}>Kéo tôi</div>
        <div className="drag-item alt" style={{ left: '40%', top: '50%' }}>Ném tôi</div>
        <div className="drag-knob" aria-label="Núm xoay">
          <span />
        </div>
      </div>
    </section>
  );
}

/* ---------- Counter ---------- */

function CounterDemo() {
  const [value, setValue] = useState(1250);
  return (
    <section id="so" className="section counter-section">
      <Label>Counter · React Bits</Label>
      <h2 className="section-title">Số lăn như đồng hồ cơ</h2>
      <Counter value={value} fontSize={96} fontWeight={800} suffix=" ₫" className="counter-demo" />
      <div className="controls center">
        <button className="btn small ghost" onClick={() => setValue(v => Math.max(0, v - 137))}>− 137</button>
        <button className="btn small" onClick={() => setValue(Math.round(Math.random() * 99999))}>Ngẫu nhiên</button>
        <button className="btn small ghost" onClick={() => setValue(v => v + 250)}>+ 250</button>
      </div>
    </section>
  );
}

/* ---------- Nền tương tác ---------- */

function BackgroundDemo() {
  const scope = useRef(null);

  useGSAP(
    () => {
      gsap.to('.bar-fill', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.bar', start: 'top 85%', end: 'top 35%', scrub: true }
      });
    },
    { scope }
  );

  return (
    <section id="nen" className="section" ref={scope}>
      <Label>DotGrid · React Bits</Label>
      <h2 className="section-title">Nền phản ứng theo chuột (bấm để tạo sóng)</h2>
      <div className="dot-area">
        <DotGrid dotSize={4} gap={22} baseColor="#2a2d3a" activeColor="#8b7bff" proximity={130} />
      </div>
      <h3 className="bar-title">ScrollTrigger scrub: thanh chạy theo tay cuộn</h3>
      <div className="bar">
        <div className="bar-fill" />
      </div>
    </section>
  );
}
