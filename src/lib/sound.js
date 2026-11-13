// Âm thanh giao diện, tổng hợp bằng Web Audio API (không dùng file âm thanh).
// Trình duyệt chỉ cho phát sau thao tác đầu tiên của người dùng (bấm / gõ phím),
// nên AudioContext được tạo ở lần tương tác đầu.

const KEY = 'mt-sound';
let ctx = null;
let master = null;
let ambient = null;
let enabled = localStorage.getItem(KEY) !== 'off';
const listeners = new Set();

const ready = () => ctx && ctx.state === 'running' && enabled;

function init() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = enabled ? 0.9 : 0;
  // Nén nhẹ để các âm chồng nhau không bị vỡ tiếng.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  if (enabled) startAmbient();
}

// Nhiễu trắng dùng chung cho các tiếng "vút"/"tích".
let noiseBuf = null;
function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

function env(gain, t, peak, attack, release) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function blip(freq, { peak = 0.05, attack = 0.002, release = 0.06, type = 'sine', to } = {}) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + release);
  env(g, t, peak, attack, release);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + release + 0.02);
}

function tickNoise(freq, peak, release) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const src = noise();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 6;
  const g = ctx.createGain();
  env(g, t, peak, 0.001, release);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + release + 0.02);
}

// Lớp nền: hai sóng trầm lệch nhịp + nhiễu lọc thấp, rất nhỏ.
function startAmbient() {
  if (!ctx || ambient) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.035, t + 3);
  out.connect(master);
  const nodes = [55, 82.4].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.detune.value = i ? 6 : -4;
    const g = ctx.createGain();
    g.gain.value = i ? 0.5 : 0.8;
    o.connect(g).connect(out);
    o.start();
    return o;
  });
  const n = noise();
  n.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  const ng = ctx.createGain();
  ng.gain.value = 0.25;
  // Nhiễu "thở" chậm theo LFO.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(lp.frequency);
  n.connect(lp).connect(ng).connect(out);
  n.start();
  lfo.start();
  ambient = { out, stop: () => [...nodes, n, lfo].forEach(x => x.stop()) };
}

function stopAmbient() {
  if (!ambient) return;
  const a = ambient;
  ambient = null;
  const t = ctx.currentTime;
  a.out.gain.cancelScheduledValues(t);
  a.out.gain.setValueAtTime(a.out.gain.value, t);
  a.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  setTimeout(a.stop, 700);
}

export const sound = {
  get enabled() {
    return enabled;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  toggle() {
    enabled = !enabled;
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
    init();
    if (ctx) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(enabled ? 0.9 : 0, t, 0.08);
      enabled ? startAmbient() : stopAmbient();
    }
    if (enabled) setTimeout(() => blip(880, { peak: 0.05, release: 0.12, to: 1320 }), 30);
    listeners.forEach(fn => fn(enabled));
  },

  hover: () => tickNoise(5200, 0.05, 0.03),
  click: () => {
    blip(420, { peak: 0.09, release: 0.09, type: 'triangle', to: 260 });
    tickNoise(2600, 0.05, 0.04);
  },
  menu: open => blip(open ? 520 : 700, { peak: 0.06, release: 0.18, to: open ? 780 : 470 }),
  step: i => blip(620 + i * 55, { peak: 0.045, release: 0.07, type: 'triangle' }),

  // Chuyển tab: tiếng "vút" khi khối che màn hình...
  whoosh() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const src = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(250, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.38);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.65);
  },
  // ...và nhịp trầm khi trang mới mở ra.
  reveal() {
    blip(110, { peak: 0.22, attack: 0.005, release: 0.55, to: 48 });
    blip(1760, { peak: 0.02, attack: 0.01, release: 0.4, to: 1320 });
  }
};

// Mở khoá âm thanh ở thao tác đầu tiên; gắn tiếng hover/click cho mọi link, nút.
export function installSound() {
  const unlock = () => init();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  let lastHover = null;
  const over = e => {
    const el = e.target.closest?.('a, button');
    if (el === lastHover) return;
    lastHover = el;
    if (el) sound.hover();
  };
  const click = e => {
    const el = e.target.closest?.('a, button');
    if (el && !el.dataset.silent) sound.click();
  };
  window.addEventListener('pointerover', over);
  window.addEventListener('click', click, { capture: true });
  return () => {
    window.removeEventListener('pointerdown', unlock, { capture: true });
    window.removeEventListener('keydown', unlock, { capture: true });
    window.removeEventListener('pointerover', over);
    window.removeEventListener('click', click, { capture: true });
  };
}
