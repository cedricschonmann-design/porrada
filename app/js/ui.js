// Outils d'interface : éléments, icônes, sons, vibrations, navigation (pages, feuilles), formats.

export const SPEED = Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1);

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, kids);
  return el;
}
// Comme replaceChildren, mais ignore null/false.
export function fill(el, ...kids) { el.replaceChildren(); append(el, kids); return el; }
function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export function svgEl(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

// ---------- Icônes (trait 2, grille 24) ----------
const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  game: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  friends: P('<circle cx="9" cy="8" r="3.5"/><path d="M2.8 19.5c.8-3.3 3.2-5.2 6.2-5.2s5.4 1.9 6.2 5.2"/><circle cx="17.2" cy="9" r="2.6"/><path d="M17 14.4c2.2.2 3.7 1.7 4.2 4.3"/>'),
  journal: P('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h3.5"/>'),
  compet: P('<path d="M8 3.5h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.8v1.2A3.3 3.3 0 0 0 8 10M16 5.5h3.2v1.2A3.3 3.3 0 0 1 16 10"/><path d="M12 12.5v4.5M8.5 20.5h7M9.8 17h4.4"/>'),
  gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.8"/>'),
  chat: P('<path d="M4 12.2c0-4.2 3.6-7.4 8-7.4s8 3.2 8 7.4-3.6 7.3-8 7.3c-1 0-2-.2-2.9-.5L4.6 20.4l1.2-3.7C4.7 15.5 4 13.9 4 12.2z"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  minus: P('<path d="M5 12h14"/>'),
  userplus: P('<circle cx="10" cy="8" r="3.6"/><path d="M3.5 19.5c.8-3.4 3.3-5.3 6.5-5.3 1.4 0 2.6.3 3.6.9"/><path d="M18 13v6M15 16h6"/>'),
  scan: P('<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>'),
  qr: P('<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><path d="M14 14h2v2M20 14v.01M14 20h.01M18 18h2v2M17 20h.01"/>'),
  close: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: P('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
  chev: P('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
  down: P('<path d="M6 9.5l6 6 6-6"/>'),
  play: P('<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z" fill="currentColor" stroke="none"/>'),
  pause: P('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>'),
  stop: P('<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>'),
  trash: P('<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7M9.5 7V4.8c0-.5.4-.8.8-.8h3.4c.4 0 .8.3.8.8V7"/>'),
  copy: P('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'),
  paste: P('<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3.5h6v1M9 11h6M9 15h4"/>'),
  fist: P('<path d="M7 11V7.8a1.4 1.4 0 0 1 2.8 0V10m0-1.6a1.4 1.4 0 0 1 2.8 0V10m0-1.2a1.4 1.4 0 0 1 2.8 0v1.4m0-.6a1.4 1.4 0 0 1 2.8 0v4.6a6.3 6.3 0 0 1-6.3 6.3h-.9A5.4 5.4 0 0 1 5.6 15v-2.2A1.9 1.9 0 0 1 7.5 11h2.3"/>'),
  whistle: P('<path d="M3.5 11.5a4.8 4.8 0 1 0 9.3 1.7H20V9.4h-8.6l-1-1.9H6.6"/><circle cx="8.3" cy="12.7" r="1.3" fill="currentColor"/>'),
  check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  checks: P('<path d="M2.5 12.5l4 4L15 8M10.5 16.5l1 1L21 8"/>'),
  send: P('<path d="M5 12h12M12.5 6.5L18 12l-5.5 5.5"/>'),
  redo: P('<path d="M20 11.5A8 8 0 1 0 17.6 17"/><path d="M20 5v6.5h-6.5"/>'),
  camera: P('<path d="M4 8.5A2 2 0 0 1 6 6.5h1.8l1.4-2h5.6l1.4 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>'),
  image: P('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5l-4.6-4.6a1 1 0 0 0-1.4 0L6 19.5"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-3.8 3.9-5.8 7.5-5.8s6.5 2 7.5 5.8"/>'),
  mail: P('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>'),
  at: P('<circle cx="12" cy="12" r="3.8"/><path d="M15.8 8.5v4.8a2.4 2.4 0 0 0 4.7.5A8.5 8.5 0 1 0 17 19"/>'),
  lock: P('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  shield: P('<path d="M12 3.5l7 2.6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6.1z"/>'),
  info: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>'),
  download: P('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  upload: P('<path d="M12 15.5v-11M7 9l5-5 5 5M5 20h14"/>'),
  logout: P('<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16.5L5.5 12 10 7.5M5.5 12H15"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  moon: P('<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>'),
  sound: P('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  vibrate: P('<rect x="7.5" y="4" width="9" height="16" rx="2.2"/><path d="M4 9v6M20 9v6"/>'),
  motion: P('<path d="M4 12h4l2-5 4 10 2-5h4"/>'),
  chart: P('<path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="6" width="3" height="11" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/>'),
  flame: P('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-8 .5 1.8 1.6 3 2.8 3.6.2-2.7 1.4-5.1 3.6-6.9-.3 3.4 3 5.6 3 9.6 0 4.2-2.6 7.9-6.5 7.9z"/>'),
  calendar: P('<rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  timer: P('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.8h5"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  star: P('<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 15.9l-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z"/>'),
  sparkles: P('<path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z"/><path d="M18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2-2.2-.8 2.2-.8z"/>'),
  edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  more: P('<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>'),
  share: P('<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M6 12.5v5.5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5.5"/>'),
  belt: P('<rect x="2.5" y="9.5" width="19" height="5" rx="1.5"/><path d="M15 9.5v5M17.5 9.5v5"/>'),
  scale: P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9.5a5.5 5.5 0 0 1 8 0l-2.4 2.3a2.2 2.2 0 0 0-3.2 0z"/>'),
  cake: P('<path d="M4 20.5h16M5 20.5v-6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6.5M5 15.5c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 1.5-.5 2-.5M12 12V9M12 6.5V6"/>'),
  home: P('<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-5h-5v5h-4A1.5 1.5 0 0 1 4 19z"/>'),
  heart: P('<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>'),
  bolt: P('<path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12z"/>'),
  clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  flag: P('<path d="M5.5 21V4.5M5.5 5c4-2 7 2 11 0v8c-4 2-7-2-11 0"/>'),
  note: P('<path d="M5 4.5h10.5L19 8v11.5H5z"/><path d="M15 4.5V8.5h4M8.5 12.5h7M8.5 16h5"/>'),
  dice: P('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  help: P('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.1-2.4 3.6M12 16.8v.1"/>'),
  swords: P('<path d="M4 4l9 9M4 4v3.5M4 4h3.5M20 4l-9 9M20 4v3.5M20 4h-3.5"/><path d="M8.5 15.5l-3 3M5 16l3 3M15.5 15.5l3 3M19 16l-3 3"/>'),
  medal: P('<path d="M8 3.5l2.5 5M16 3.5l-2.5 5"/><circle cx="12" cy="14.5" r="5.5"/><path d="M12 12.2l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>'),
  wifi: P('<path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>'),
  globe: P('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z"/>'),
};

export function icon(name) {
  const s = h('span', { html: ICON[name] || '' });
  s.style.display = 'contents';
  return s;
}

// ---------- Réglages lus partout ----------
let prefs = { sound: true, haptics: true, timerSound: true };
export function setPrefs(p) { prefs = { ...prefs, ...p }; }

// ---------- Sons (synthétisés, aucun fichier) ----------
let audio = null;
let master = null;
let noiseBuf = null;
export function unlockAudio() {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      master = audio.createGain();
      master.gain.value = 1;
      master.connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(master);
    o.start(); o.stop(audio.currentTime + 0.01);
  } catch (e) { /* pas de son */ }
}
// Notes douces : sinus, attaque lente, filtre qui arrondit, volume bas.
function tone(freq, dur, { type = 'sine', vol = 0.035, to = null, at = 0, attack = 0.015, cutoff = 2600 } = {}) {
  if (!audio) return;
  const t0 = audio.currentTime + at;
  const o = audio.createOscillator();
  const f = audio.createBiquadFilter();
  const g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur * 0.8);
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  f.Q.value = 0.4;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
const chord = (notes, dur, opts = {}) => notes.forEach((n, i) => tone(n, dur, { ...opts, at: (opts.at || 0) + i * (opts.spread || 0) }));

// Sons de l'appli : seulement aux moments qui comptent, jamais à chaque bouton.
const SFX = {
  success: () => { tone(659, 0.35, { vol: 0.03 }); tone(988, 0.5, { vol: 0.028, at: 0.09 }); },
  error: () => tone(220, 0.3, { vol: 0.035, to: 185, cutoff: 900 }),
  send: () => tone(587, 0.28, { vol: 0.025, to: 880 }),
  receive: () => { tone(784, 0.3, { vol: 0.028 }); tone(1047, 0.42, { vol: 0.024, at: 0.1 }); },
  notify: () => { tone(880, 0.32, { vol: 0.03 }); tone(1175, 0.5, { vol: 0.026, at: 0.12 }); },
  give: () => { tone(659, 0.25, { vol: 0.035 }); tone(988, 0.35, { vol: 0.03, at: 0.07 }); },
  take: () => tone(392, 0.3, { vol: 0.035, to: 330, cutoff: 1500 }),
  del: () => tone(330, 0.25, { vol: 0.025, to: 247, cutoff: 1200 }),
  pop: () => tone(740, 0.18, { vol: 0.022 }),
  win: () => { chord([523, 659, 784, 1047], 0.9, { vol: 0.03, spread: 0.11 }); },
  lose: () => { chord([440, 349, 294], 0.7, { vol: 0.03, spread: 0.16, cutoff: 1400 }); },
  levelup: () => { chord([523, 659, 784, 1047, 1319], 0.8, { vol: 0.025, spread: 0.08 }); },
};
// Chrono : plus présent (on doit l'entendre sur le tapis) mais rond, sans grésillement.
const TIMER_SFX = {
  count: () => tone(660, 0.22, { vol: 0.07, attack: 0.008 }),
  count3: () => tone(880, 0.32, { vol: 0.1, attack: 0.008 }),
  go: () => { chord([880, 1320], 0.9, { vol: 0.1, attack: 0.01 }); },
  warn: () => { tone(988, 0.25, { vol: 0.08, attack: 0.01 }); tone(988, 0.25, { vol: 0.08, at: 0.3, attack: 0.01 }); },
  buzzer: () => { chord([392, 494, 587], 1.6, { vol: 0.11, attack: 0.02, cutoff: 1800 }); },
  bell: () => { tone(1047, 1.8, { vol: 0.1, attack: 0.005 }); tone(2093, 1.2, { vol: 0.03, attack: 0.005 }); tone(1047, 1.6, { vol: 0.08, at: 0.45, attack: 0.005 }); },
};
export function sfx(name) {
  try {
    if (TIMER_SFX[name]) { if (prefs.timerSound === false) return; unlockAudio(); TIMER_SFX[name](); return; }
    if (prefs.sound === false || !SFX[name]) return;
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume();
    SFX[name]();
  } catch (e) { /* pas de son */ }
}

// ---------- Vibrations (iPhone : astuce de l'interrupteur iOS 18) ----------
let hapLabel = null;
export function haptic(kind = 'light') {
  if (prefs.haptics === false) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(kind === 'heavy' ? [18, 40, 18] : kind === 'medium' ? 14 : 8); return; }
    if (!hapLabel) {
      const id = '__hap';
      const input = h('input', { type: 'checkbox', switch: true, id, tabindex: '-1', 'aria-hidden': 'true' });
      hapLabel = h('label', { for: id, 'aria-hidden': 'true' });
      document.body.append(h('div', { style: { position: 'fixed', left: '-200px', top: '0', width: '1px', height: '1px', overflow: 'hidden', opacity: '0', pointerEvents: 'none' } }, input, hapLabel));
    }
    hapLabel.click();
    if (kind === 'heavy') setTimeout(() => hapLabel && hapLabel.click(), 90);
  } catch (e) { /* pas de vibration */ }
}

// Retour sonore et tactile sur chaque bouton
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest && e.target.closest('.btn, .iconbtn, .chip, .rowc, .item, .opt, .tile, .swatch, .choice, .refcard, .hit, .who-btn, .backbtn');
  if (b) b.classList.add('is-pressed');
}, { passive: true });
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => document.addEventListener(t, () => {
  document.querySelectorAll('.is-pressed').forEach((x) => x.classList.remove('is-pressed'));
}, { passive: true }));
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === '__hap') return;
  const b = e.target.closest && e.target.closest('button');
  if (!b || b.disabled || b.dataset.silent !== undefined) return;
  unlockAudio();
  if (b.matches('.hit, .seg button, .switch, .tabbar button')) return;
  haptic('light');
}, true);

// ---------- Navigation : pages poussées, feuilles ----------
const layer = () => document.getElementById('layer');
const stack = [];
let tabTitle = 'Retour';
export function setTabTitle(t) { tabTitle = t; }
function syncBody() {
  document.body.classList.toggle('no-tabbar', stack.some((x) => x.kind === 'page'));
}
export function openCount() { return stack.length; }

// Page plein écran avec barre de navigation et retour (bouton ou glissement depuis le bord gauche).
export function push(build, { title = '', back = null, modal = false, cls = '', onClose = null, right = null, bareNav = false } = {}) {
  const prevPage = [...stack].reverse().find((x) => x.kind === 'page');
  const backLabel = back || (prevPage ? prevPage.title : tabTitle) || 'Retour';
  const el = h('div', { class: 'page' + (modal ? ' modal' : '') + (cls ? ' ' + cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title || backLabel },
    h('div', { class: 'page-bg' }, h('i'), h('i')));
  const body = h('div', { class: 'body' });
  const titleEl = h('div', { class: 'nb-title' }, title);
  const rightEl = h('div', { class: 'nb-right' });
  const nav = h('div', { class: 'navbar' + (bareNav ? ' always' : '') },
    h('button', { class: 'backbtn', 'aria-label': modal ? 'Fermer' : 'Retour', onclick: () => close() },
      h('span', { html: modal ? ICON.close : ICON.back, style: { display: 'contents' } }), h('span', null, modal ? 'Fermer' : backLabel)),
    titleEl, rightEl);
  body.append(nav);
  el.append(body);
  let closed = false;
  const closers = [];
  const entry = { kind: 'page', title, el, close: null };
  const close = (opts = {}) => {
    if (closed) return;
    closed = true;
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    syncBody();
    if (!opts.silent) sfx('close');
    closers.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    let removed = false;
    const done = () => { if (removed) return; removed = true; el.remove(); onClose && onClose(); };
    if (opts.instant) { done(); return; }
    el.classList.add('closing');
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 450);
  };
  entry.close = close;
  stack.push(entry);
  layer().append(el);
  syncBody();
  sfx('push');
  el.addEventListener('scroll', () => nav.classList.toggle('scrolled', el.scrollTop > 30), { passive: true });
  const api = { close, el, body, nav, onClosed: (fn) => closers.push(fn), isOpen: () => !closed, setTitle: (t) => { titleEl.textContent = t; entry.title = t; }, setRight: (...k) => fill(rightEl, ...k) };
  if (right) api.setRight(right);
  const content = build(api);
  if (content) append(body, [content]);
  if (!modal) edgeSwipe(el, close);
  return api;
}

function edgeSwipe(el, close) {
  let x0 = null; let y0 = 0; let dx = 0; let t0 = 0; let active = false;
  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t.clientX > 26) return;
    x0 = t.clientX; y0 = t.clientY; dx = 0; t0 = Date.now(); active = false;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (x0 === null) return;
    const t = e.touches[0];
    dx = Math.max(0, t.clientX - x0);
    if (!active && Math.abs(t.clientY - y0) > 14 && dx < 10) { x0 = null; return; }
    if (dx > 8) active = true;
    if (active) { el.style.animation = 'none'; el.style.transform = `translateX(${dx}px)`; el.style.transition = 'none'; }
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 === null) return;
    const fast = dx > 60 && Date.now() - t0 < 260;
    if (active && (dx > window.innerWidth * 0.33 || fast)) {
      el.style.transition = 'transform .24s cubic-bezier(.22,.8,.24,1)';
      el.style.transform = 'translateX(100%)';
      haptic('light');
      setTimeout(() => close({ instant: true }), 230);
    } else if (active) {
      el.style.transition = 'transform .3s cubic-bezier(.3,1.35,.4,1)';
      el.style.transform = 'translateX(0)';
    }
    x0 = null;
  });
}

// Feuille du bas (on la ferme en touchant à côté ou en la tirant vers le bas).
export function sheet(build, { onClose = null, locked = false } = {}) {
  const wrap = h('div');
  const back = h('div', { class: 'backdrop', onclick: () => !locked && close() });
  const body = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grab' }));
  wrap.append(back, body);
  let closed = false;
  const entry = { kind: 'sheet', close: null };
  const close = (opts = {}) => {
    if (closed) return;
    closed = true;
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    syncBody();
    let removed = false;
    const done = () => { if (removed) return; removed = true; wrap.remove(); onClose && onClose(); };
    if (opts.instant) { done(); return; }
    body.classList.add('closing');
    back.classList.add('closing');
    setTimeout(done, 260);
  };
  entry.close = close;
  stack.push(entry);
  layer().append(wrap);
  sfx('open');
  const content = build(close, body);
  if (content) body.append(content);
  if (!locked) dragDown(body, close);
  return close;
}

function dragDown(body, close) {
  let y0 = null; let dy = 0; let t0 = 0;
  body.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const r = body.getBoundingClientRect();
    if (body.scrollTop > 0 && t.clientY - r.top > 56) return;
    if (e.target.closest('input, textarea, select, .list-scroll')) return;
    y0 = t.clientY; dy = 0; t0 = Date.now();
  }, { passive: true });
  body.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy < 0) { dy = 0; return; }
    if (dy > 6) { body.classList.add('dragging'); body.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  body.addEventListener('touchend', () => {
    if (y0 === null) return;
    body.classList.remove('dragging');
    if (dy > 110 || (dy > 50 && Date.now() - t0 < 250)) {
      body.style.transition = 'transform .22s ease';
      body.style.transform = 'translateY(105%)';
      setTimeout(() => close({ instant: true }), 200);
    } else {
      body.style.transition = 'transform .3s cubic-bezier(.3,1.35,.4,1)';
      body.style.transform = '';
      setTimeout(() => { body.style.transition = ''; }, 320);
    }
    y0 = null;
  });
}

export function closeAll() {
  for (const e of [...stack].reverse()) e.close({ instant: true, silent: true });
}
export function topIsPage() { return stack.length && stack[stack.length - 1].kind === 'page'; }

export function ask(title, text, ok = 'Oui', { danger = false, cancel = 'Annuler' } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    sheet((close) => h('div', { class: 'stack' },
      h('h2', null, title),
      text ? h('p', { class: 'muted' }, text) : null,
      h('div', { class: 'btns', style: { marginTop: '6px' } },
        h('button', { class: 'btn lg block ' + (danger ? 'danger' : 'primary'), onclick: () => { answered = true; close(); resolve(true); } }, ok),
        h('button', { class: 'btn ghost block', onclick: () => close() }, cancel),
      ),
    ), { onClose: () => { if (!answered) resolve(false); } });
  });
}

// ---------- Toast ----------
let toastTimer;
export function toast(msg, { ms = 2800, action = null, ok = false, sound = null } = {}) {
  const t = document.getElementById('toast');
  fill(t,
    ok ? h('span', { class: 'ok', html: ICON.check }) : null,
    h('span', null, msg),
    action ? h('button', { class: 'act', onclick: () => { t.classList.remove('show'); action.fn(); } }, action.label) : null,
  );
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  if (sound) sfx(sound);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? Math.max(ms, 4500) : ms);
}

// ---------- Contrôles ----------
export function seg(options, value, onChange, { cls = '' } = {}) {
  const el = h('div', { class: 'seg ' + cls, role: 'group' });
  el.style.setProperty('--n', options.length);
  const draw = () => {
    const i = Math.max(0, options.findIndex(([v]) => v === value));
    el.style.setProperty('--i', i);
    fill(el, ...options.map(([v, label]) => h('button', {
      type: 'button', 'aria-pressed': String(v === value),
      onclick: () => { if (v === value) return; value = v; draw(); sfx('toggle'); haptic('light'); onChange(v); },
    }, label)));
  };
  draw();
  return el;
}

export function toggle(on, onChange, label) {
  const b = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label || null });
  b.addEventListener('click', () => {
    on = !on;
    b.setAttribute('aria-checked', String(on));
    sfx(on ? 'toggle' : 'untoggle');
    haptic('light');
    onChange(on);
  });
  return b;
}

// ---------- Ceintures ----------
export const BELTS = [
  ['blanche', 'Blanche'], ['bleue', 'Bleue'], ['violette', 'Violette'], ['marron', 'Marron'], ['noire', 'Noire'],
];
export const BELT_NAME = Object.fromEntries(BELTS);
export const AGES = [
  ['u13', 'Moins de 13 ans'], ['u16', '13 à 15 ans'], ['u18', '16 à 17 ans'], ['adulte', 'Adulte (18 à 29 ans)'], ['master', 'Master (30 ans et +)'],
];
export const AGE_NAME = Object.fromEntries(AGES);

export function belt(b = 'blanche', stripes = 0, big = false) {
  const bar = h('span', { class: 'bar' });
  for (let i = 0; i < Math.min(4, stripes || 0); i++) bar.append(h('i'));
  return h('span', { class: 'belt' + (big ? ' big' : ''), 'data-b': b, role: 'img', 'aria-label': `Ceinture ${(BELT_NAME[b] || b).toLowerCase()}${stripes ? `, ${stripes} barrette${stripes > 1 ? 's' : ''}` : ''}` }, bar);
}

export function initials(name = '?') {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

// ---------- Formats ----------
export function mmss(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}
export function hhmmss(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  return (hh ? hh + ':' : '') + String(mm).padStart(hh ? 2 : 1, '0') + ':' + String(t % 60).padStart(2, '0');
}
const dateFmt = new Intl.DateTimeFormat('fr-CH', { day: 'numeric', month: 'short' });
const dateFmtY = new Intl.DateTimeFormat('fr-CH', { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
export function day(ts) {
  const d = new Date(ts);
  return (d.getFullYear() === new Date().getFullYear() ? dateFmt : dateFmtY).format(d);
}
export function longDay(ts) {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(ts); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today - that) / 86400000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  const s = weekdayFmt.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function hm(ts) {
  return new Date(ts).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}
export function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return hm(ts);
  if (s < 7 * 86400) return longDay(ts).split(' ')[0].toLowerCase();
  return day(ts);
}
export function since(ts) {
  const months = Math.floor((Date.now() - ts) / (30.44 * 86400000));
  if (months < 1) return 'moins d’un mois';
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} an${y > 1 ? 's' : ''}${m ? ` et ${m} mois` : ''}`;
}
export function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
}

// Nombre qui défile jusqu'à sa valeur
export function countUp(el, to, dur = 700) {
  const from = 0;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  if (to === 0 || document.documentElement.classList.contains('reduce-motion')) { el.textContent = to; return el; }
  requestAnimationFrame(step);
  return el;
}

// Confettis (victoire, promotion)
export function confetti(n = 120) {
  if (document.documentElement.classList.contains('reduce-motion')) return;
  const c = h('canvas', { id: 'confetti' });
  document.body.append(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#8a5cff', '#d24dff', '#ff4fa3', '#ff9a5a', '#34e29b', '#ffffff'];
  const parts = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.38,
    vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 15 - 5,
    r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const frame = (t) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

// ---------- Garder l'écran allumé ----------
let lock = null;
let wantLock = false;
export async function keepAwake(on) {
  wantLock = on;
  try {
    if (on && 'wakeLock' in navigator && !lock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch (e) { lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantLock) keepAwake(true);
});

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
    return ok;
  }
}

// Petit dégradé SVG partagé (anneaux de progression)
export function gradDefs() {
  return svgEl(`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5cff"/><stop offset=".55" stop-color="#ff4fa3"/><stop offset="1" stop-color="#ff9a5a"/></linearGradient>
    <linearGradient id="gradBoard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5cff"/><stop offset=".55" stop-color="#ff4fa3"/><stop offset="1" stop-color="#ff9a5a"/></linearGradient>
  </defs></svg>`);
}
