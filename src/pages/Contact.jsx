import { useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import Roll from '../components/Roll.jsx';
import { profile } from '../data/profile.js';

const LINKS = [
  ['Email', `mailto:${profile.email}`],
  ['GitHub', profile.links.github],
  ['LinkedIn', profile.links.linkedin],
  ['Facebook', profile.links.facebook],
  ['Instagram', profile.links.instagram],
  ['Resume', profile.resume]
];

export default function Contact() {
  const ref = useRef(null);

  useGSAP(
    () => {
      const split = SplitText.create('.contact-note', { type: 'lines', mask: 'lines', linesClass: 'ln' });
      gsap
        .timeline({ delay: 0.15 })
        .from(split.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.07 })
        .fromTo('.contact .nav-line', { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 }, 0.3);
      return () => split.revert();
    },
    { scope: ref }
  );

  const external = href => (href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noreferrer' });

  return (
    <section className="contact" ref={ref}>
      <h1 className="sr-only">Contact</h1>

      <div className="contact-center">
        <p className="contact-note large">
          Send a short note about the team, the role and what you are building. Backend, cloud or applied AI internships,
          FinTech especially. Happy to talk clubs, hackathons and side projects too.
        </p>
        <p className="small dim">
          <span className="nav-mask">
            <span className="nav-line">Open to internships, 2026 — 2027</span>
          </span>
        </p>
        <ul className="contact-links small">
          {LINKS.map(([label, href]) => (
            <li key={label}>
              <a href={href} {...external(href)}>
                <span className="nav-mask">
                  <span className="nav-line">
                    <Roll>{label}</Roll>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className="site-foot small fixed">
        <p>
          <span className="nav-mask">
            <span className="nav-line dim">
              {profile.name} © {new Date().getFullYear()}
            </span>
          </span>
          <span className="nav-mask">
            <span className="nav-line">All rights reserved</span>
          </span>
        </p>
        <p>
          <span className="nav-mask">
            <span className="nav-line dim">Say hello</span>
          </span>
          <a href={`mailto:${profile.email}`}>
            <span className="nav-mask">
              <span className="nav-line">
                <Roll>{profile.email}</Roll>
              </span>
            </span>
          </a>
        </p>
        <p>
          <span className="nav-mask">
            <span className="nav-line dim">Based in</span>
          </span>
          <span className="nav-mask">
            <span className="nav-line">Ho Chi Minh City</span>
          </span>
        </p>
      </footer>
    </section>
  );
}
