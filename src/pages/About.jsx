import { useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import ChromeObject from '../components/ChromeObject.jsx';
import {
  statements,
  frameWords,
  bandLines,
  scope,
  bio,
  experience,
  awards,
  projects,
  moments,
  profile
} from '../data/profile.js';

const FRAME_ROWS = 19;

export default function About() {
  const ref = useRef(null);

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

      // Dải chân dung: ảnh phóng to dần khi cuộn qua.
      // Dải chân dung: ảnh mờ nhoè khi vừa vào, nét dần khi cuộn tới giữa, kèm phóng nhẹ.
      gsap.fromTo(
        '.band img',
        { scale: 1.18, filter: 'blur(30px) grayscale(1) brightness(0.5) contrast(1.15)' },
        {
          scale: 1,
          filter: 'blur(0px) grayscale(1) brightness(0.62) contrast(1.15)',
          ease: 'none',
          scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'center center', scrub: true }
        }
      );

      // Danh sách: từng dòng hiện khi vào khung nhìn.
      gsap.utils.toArray('.col').forEach(col =>
        gsap.fromTo(
          col.querySelectorAll('.row > span'),
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.025,
            scrollTrigger: { trigger: col, start: 'top 85%' }
          }
        )
      );

      // Ảnh hoạt động: mở ra từ dưới lên, ảnh trôi chậm hơn khung (parallax).
      gsap.utils.toArray('.moment').forEach(m => {
        gsap.fromTo(
          m.querySelector('.moment-img'),
          { clipPath: 'inset(100% 0 0 0)' },
          { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: m, start: 'top 85%' } }
        );
        gsap.fromTo(
          m.querySelector('img'),
          { yPercent: -8, scale: 1.15 },
          { yPercent: 8, scale: 1.15, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
        gsap.fromTo(
          m.querySelectorAll('.row > span'),
          { yPercent: 105 },
          { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: m, start: 'top 70%' } }
        );
      });

      // Đoạn giới thiệu 24px: tách theo dòng.
      const split = SplitText.create('.bio', { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap.from(split.lines, {
        yPercent: 105,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: '.bio', start: 'top 85%' }
      });
      return () => split.revert();
    },
    { scope: ref }
  );

  const Row = ({ children, dim }) => (
    <span className={`row ${dim ? 'dim' : ''}`}>
      <span>{children}</span>
    </span>
  );

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

      <div className="band">
        <img src="/portrait.jpg" alt={`Portrait of ${profile.name}`} />
        <p className="band-text small">
          {bandLines.map(l => (
            <span key={l}>{l}</span>
          ))}
        </p>
      </div>

      <div className="about-body">
        <div className="lists">
          <div className="col small">
            <Row dim>Technical scope</Row>
            <span className="gap" />
            {scope.map(s => (
              <Row key={s}>{s}</Row>
            ))}
          </div>
          <div className="col small">
            <Row dim>Experience</Row>
            <span className="gap" />
            {experience.map(e => (
              <Row key={e.title}>
                {e.title} — {e.org.split(' · ')[0]}
              </Row>
            ))}
          </div>
        </div>

        <p className="bio large">{bio}</p>

        <div className="moments">
          {moments.map(m => (
            <figure className="moment" key={m.src}>
              <div className="moment-img">
                <img src={m.src} alt={m.alt} loading="lazy" />
              </div>
              <figcaption className="small">
                <span className="row">
                  <span>{m.caption}</span>
                </span>
                <span className="row dim">
                  <span>{m.meta}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="lists lists-bottom">
          <div className="col small">
            <Row dim>Recognition</Row>
          </div>
          <div className="col small">
            {awards.map(a => (
              <Row key={a.title}>
                {a.title} ({a.year})
              </Row>
            ))}
          </div>

          <div className="col small">
            <Row dim>Selected projects</Row>
          </div>
          <div className="col small">
            {projects.map(p => (
              <Row key={p.slug}>{p.title}</Row>
            ))}
          </div>

          <div className="col small">
            <Row dim>Education</Row>
          </div>
          <div className="col small">
            <Row>Bachelor of Information Technology, RMIT University Vietnam</Row>
            <Row>Minor in Cloud Computing · GPA 3.0 · 2025 — 2028</Row>
            <Row>NAWA scholarship exchange, University of Wrocław, Poland · 2027</Row>
          </div>
        </div>
      </div>

      <footer className="site-foot small">
        <p>
          <span className="dim">{profile.name} © {new Date().getFullYear()}</span>
          <span>All rights reserved</span>
          <a className="dim" href="https://zenobasi.com" target="_blank" rel="noreferrer">
            Design inspired by zenobasi.com
          </a>
        </p>
        <p>
          <span className="dim">Say hello</span>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </p>
        <p>
          <span className="dim">Based in</span>
          <span>Ho Chi Minh City</span>
        </p>
      </footer>
    </section>
  );
}
