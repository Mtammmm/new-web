import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useLenis } from 'lenis/react';
import ChromeObject from '../components/ChromeObject.jsx';
import Roll from '../components/Roll.jsx';
import {
  statements,
  frameWords,
  major,
  scope,
  bio,
  experience,
  awards,
  education,
  aboutPhotos,
  linkLabels,
  profile
} from '../data/profile.js';

gsap.registerPlugin(Flip);

const FRAME_ROWS = 19;
const DESKTOP = '(min-width: 1000px)';
const N = aboutPhotos.length;

// Một dòng chữ có mặt nạ riêng để trồi lên. Khai báo ngoài component để không bị dựng lại mỗi lần đổi ảnh.
const Row = ({ children, dim, className = '' }) => (
  <span className={`row ${dim ? 'dim' : ''} ${className}`}>
    <span>{children}</span>
  </span>
);

export default function About({ onGo }) {
  const ref = useRef(null);
  const lenis = useLenis();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const prevActive = useRef(null);
  const flipState = useRef(null);
  const trigger = useRef(null);
  const reduce = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Ảnh người đã tách nền: chỉ hiện chữ đỏ khi ảnh này tải được, để chữ không đè lên mặt.
  const [cutout, setCutout] = useState('loading');
  const cutoutImg = useRef(null);
  useEffect(() => {
    const img = cutoutImg.current;
    if (img?.complete) setCutout(img.naturalWidth > 0 ? 'ok' : 'error');
  }, []);

  // Đổi ảnh đang hiện; ghi lại vị trí các ảnh thu nhỏ trước khi React dời chúng sang nhóm khác.
  const show = useCallback(i => {
    if (i === activeRef.current) return;
    if (!reduce.current && ref.current) flipState.current = Flip.getState(ref.current.querySelectorAll('.thumb'));
    activeRef.current = i;
    setActive(i);
  }, []);

  useGSAP(
    () => {
      // Màn đầu: từng dòng trồi lên từ mặt nạ, lan từ giữa ra hai đầu.
      gsap.fromTo(
        '.diamond .row > span',
        { yPercent: 105 },
        { yPercent: 0, duration: 1, ease: 'expo.out', stagger: { each: 0.025, from: 'center' }, delay: 0.15 }
      );
      // Cuộn qua: khối chữ mờ và thu nhỏ nhẹ.
      gsap.to('.diamond', {
        opacity: 0,
        scale: 0.94,
        ease: 'none',
        scrollTrigger: { trigger: '.about-intro', start: 'top top', end: 'bottom top', scrub: true }
      });

      // Dải chân dung: cả khung ba lớp (ảnh, chữ đỏ, người tách nền) mờ nhoè khi vừa vào,
      // nét dần khi cuộn tới giữa, kèm phóng nhẹ; áp lên khung để ba lớp luôn cùng nhịp.
      gsap.fromTo(
        '.band-stack',
        { scale: 1.18, filter: 'blur(30px)' },
        {
          scale: 1,
          filter: 'blur(0px)',
          ease: 'none',
          scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'center center', scrub: true }
        }
      );

      // Chữ đỏ: từng dòng trồi lên khi dải ảnh tới 60% khung nhìn; parallax nhẹ, chậm hơn ảnh.
      if (!reduce.current) {
        gsap.fromTo(
          '.band-line > span',
          { yPercent: 105 },
          { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.band', start: 'top 60%' } }
        );
        gsap.fromTo(
          '.band-major',
          { yPercent: -10 },
          { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      }

      // Cột nội dung: từng mục trồi lên từ mặt nạ khi vào khung nhìn.
      gsap.utils.toArray('.about-section, .about-end').forEach(sec =>
        gsap.fromTo(
          sec.querySelectorAll('.row > span'),
          { yPercent: 105 },
          { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.025, scrollTrigger: { trigger: sec, start: 'top 85%' } }
        )
      );

      const split = SplitText.create('.about-bio', { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.from(split.lines, {
        yPercent: 105,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: '.about-bio', start: 'top 85%' }
      });

      // Tên cỡ lớn trồi lên khi cuộn tới.
      gsap.fromTo(
        '.bigname svg',
        { yPercent: 105 },
        { yPercent: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.bigname', start: 'top 95%' } }
      );

      // Từ 1000px: ảnh ở cột giữa đổi theo tiến độ cuộn, chia đều N đoạn.
      const mm = gsap.matchMedia();
      mm.add(DESKTOP, () => {
        trigger.current = ScrollTrigger.create({
          trigger: '.about-body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: self => show(Math.min(N - 1, Math.floor(self.progress * N)))
        });
        return () => (trigger.current = null);
      });

      return () => {
        split.revert();
        mm.revert();
      };
    },
    { scope: ref }
  );

  // Chuyển ảnh: ảnh mới mở ra từ dưới lên, ảnh cũ mờ đi; caption trồi lên; ảnh thu nhỏ trượt nhóm.
  useGSAP(
    () => {
      const photos = gsap.utils.toArray('.about-photo');
      const prev = prevActive.current;
      prevActive.current = active;

      // Lần đầu (kể cả khi StrictMode chạy effect hai lần) hoặc reduced motion: đặt trạng thái ngay.
      if (prev === null || prev === active || reduce.current) {
        photos.forEach((el, i) =>
          gsap.set(el, { opacity: i === active ? 1 : 0, zIndex: i === active ? 2 : 1, clipPath: 'inset(0% 0% 0% 0%)' })
        );
      } else {
        gsap.set(photos, { zIndex: 1 });
        gsap.set(photos[active], { zIndex: 2, opacity: 1 });
        gsap.fromTo(
          photos[active],
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut', overwrite: true }
        );
        gsap.to(photos[prev], { opacity: 0, duration: 0.9, ease: 'expo.inOut', overwrite: true });
        gsap.fromTo('.photo-caption .row > span', { yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
      }

      if (flipState.current) {
        Flip.from(flipState.current, { targets: gsap.utils.toArray('.thumb'), duration: 0.6, ease: 'expo.out' });
        flipState.current = null;
      }
    },
    { scope: ref, dependencies: [active] }
  );

  // Bấm ảnh thu nhỏ: trên desktop cuộn tới đoạn tương ứng, dưới 1000px đổi ảnh ngay.
  const pick = i => {
    const st = trigger.current;
    if (st && window.matchMedia(DESKTOP).matches) {
      const y = st.start + ((i + 0.5) / N) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { immediate: reduce.current });
      else window.scrollTo(0, y);
    } else show(i);
  };

  const thumb = (p, i) => (
    <button
      key={p.src}
      type="button"
      className={`thumb ${i === active ? 'is-active' : ''}`}
      data-flip-id={p.src}
      onClick={() => pick(i)}
      aria-label={`Show photo ${i + 1} of ${N}: ${p.caption}`}
      aria-current={i === active || undefined}
    >
      <img src={p.src} alt="" draggable="false" />
    </button>
  );

  const photo = aboutPhotos[active];
  const external = { target: '_blank', rel: 'noreferrer' };

  return (
    <section className="about" ref={ref}>
      <h1 className="sr-only">About {profile.name}</h1>

      <div className="about-intro">
        <div className="about-mark">
          <ChromeObject />
        </div>

        <div className="diamond small">
          {statements.map(s => (
            <Row key={`a-${s}`}>{s}</Row>
          ))}
          {Array.from({ length: FRAME_ROWS }, (_, i) => (
            <div className="frame-row" key={i}>
              <Row>{frameWords[0]}</Row>
              <Row>{frameWords[1]}</Row>
            </div>
          ))}
          {[...statements].reverse().map(s => (
            <Row key={`b-${s}`}>{s}</Row>
          ))}
        </div>
      </div>

      <div className={`band ${cutout === 'ok' ? 'has-cutout' : ''}`}>
        <div className="band-stack">
          <img className="band-photo" src="/portrait.jpg" alt={`Portrait of ${profile.name}`} />
          <h2 className="band-major" aria-label={major.join(' ')}>
            {major.map(w => (
              <span className="band-line" key={w} aria-hidden="true">
                <span>{w}</span>
              </span>
            ))}
          </h2>
          <img
            ref={cutoutImg}
            className="band-photo band-cutout"
            src="/portrait-cutout.png"
            alt=""
            aria-hidden="true"
            onLoad={() => setCutout('ok')}
            onError={() => setCutout('error')}
          />
        </div>
      </div>

      <div className="about-body">
        {/* Cột trái: hàng ảnh thu nhỏ làm thanh tiến độ (đã xem bên trái, chưa xem bên phải). */}
        <div className="about-left">
          <div className="about-stick">
            <div className="thumbs" role="group" aria-label="Photos">
              <div className="thumbs-group">{aboutPhotos.map((p, i) => i <= active && thumb(p, i))}</div>
              <div className="thumbs-group">{aboutPhotos.map((p, i) => i > active && thumb(p, i))}</div>
            </div>
          </div>
        </div>

        {/* Cột giữa: ảnh ghim, đổi theo cuộn. */}
        <div className="about-center">
          <div className="about-stick">
            <figure className="about-figure">
              <div className="photo-stack">
                {aboutPhotos.map((p, i) => (
                  <img
                    key={p.src}
                    className="about-photo"
                    src={p.src}
                    alt={p.alt}
                    aria-hidden={i !== active || undefined}
                    draggable="false"
                  />
                ))}
              </div>
              <figcaption className="photo-caption small" key={active} aria-live="polite">
                <Row>{photo.caption}</Row>
                <Row dim>{photo.meta}</Row>
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Cột phải: nội dung, cuộn bình thường. */}
        <div className="about-right small">
          <section className="about-section">
            <Row dim className="about-label">About</Row>
            <p className="about-bio">{bio}</p>
          </section>

          <section className="about-section">
            <Row dim className="about-label">Technical scope</Row>
            {scope.map(s => (
              <Row key={s}>{s}</Row>
            ))}
          </section>

          <section className="about-section">
            <Row dim className="about-label">Experience</Row>
            {experience.map(e => (
              <div className="about-item" key={e.title}>
                <Row className="split">
                  <span>{e.title}</span>
                  <span>{e.date}</span>
                </Row>
                <Row dim>{e.org}</Row>
              </div>
            ))}
          </section>

          <section className="about-section">
            <Row dim className="about-label">Recognition</Row>
            {awards.map(a => (
              <Row className="split" key={a.title}>
                <span>{a.title}</span>
                <span>{a.year}</span>
              </Row>
            ))}
            <span className="about-gap" />
            <Row>
              <a
                href="#/work"
                onClick={e => {
                  e.preventDefault();
                  onGo?.('work');
                }}
              >
                <Roll>View work →</Roll>
              </a>
            </Row>
          </section>

          <section className="about-section">
            <Row dim className="about-label">Education</Row>
            {education.map(ed => (
              <div className="about-item" key={ed.title}>
                <Row className="split">
                  <span>{ed.title}</span>
                  <span>{ed.year}</span>
                </Row>
                {ed.detail && <Row dim>{ed.detail}</Row>}
              </div>
            ))}
          </section>

          <section className="about-section">
            <Row dim className="about-label">Contact</Row>
            <Row>
              <a href={`mailto:${profile.email}`}>
                <Roll>{profile.email}</Roll>
              </a>
            </Row>
            {Object.entries(profile.links).map(([key, href]) => (
              <Row key={key}>
                <a href={href} {...external}>
                  <Roll>{linkLabels[key] ?? key}</Roll>
                </a>
              </Row>
            ))}
          </section>
        </div>
      </div>

      <div className="about-end">
        <p className="about-status small">
          <Row>{profile.availability}</Row>
        </p>
        <BigName text={profile.name.toUpperCase()} />
        <footer className="about-foot small">
          <Row dim>© {new Date().getFullYear()}</Row>
          <Row dim>{profile.location}</Row>
        </footer>
      </div>
    </section>
  );
}

// Tên cỡ cực lớn: SVG text, viewBox đo theo khung chữ thật nên luôn vừa khít bề ngang.
function BigName({ text }) {
  const txt = useRef(null);
  const [box, setBox] = useState('0 0 1000 120');

  useLayoutEffect(() => {
    let alive = true;
    const fit = () => {
      if (!alive || !txt.current) return;
      const b = txt.current.getBBox();
      if (b.width) setBox(`${b.x} ${b.y} ${b.width} ${b.height}`);
    };
    fit();
    document.fonts.ready.then(fit);
    document.fonts.addEventListener('loadingdone', fit);
    return () => {
      alive = false;
      document.fonts.removeEventListener('loadingdone', fit);
    };
  }, [text]);

  return (
    <div className="bigname">
      <svg viewBox={box} role="img" aria-label={text} preserveAspectRatio="xMidYMid meet">
        <text ref={txt} x="0" y="0">
          {text}
        </text>
      </svg>
    </div>
  );
}
