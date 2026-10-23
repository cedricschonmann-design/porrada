// Petits outils d'interface : création d'éléments, feuilles, sons, écran allumé.

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
// Comme replaceChildren, mais ignore null/false (replaceChildren écrirait « null »).
export function fill(el, ...kids) { el.replaceChildren(); append(el, kids); return el; }
function append(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) append(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  game: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  friends: P('<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6"/><circle cx="17.5" cy="9" r="2.8"/><path d="M17 14.6c2.4.2 4 1.8 4.5 4.6"/>'),
  journal: P('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3.5"/>'),
  compet: P('<path d="M8 3h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H4.5v1.5A3.5 3.5 0 0 0 8 10M16 5h3.5v1.5A3.5 3.5 0 0 1 16 10"/><path d="M12 12v5M8 21h8M9.5 17h5"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  scan: P('<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>'),
  qr: P('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v.01M14 20h.01M18 18h2v2M17 20h.01"/>'),
  close: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: P('<path d="M15 5l-7 7 7 7"/>'),
  chev: P('<path d="M9 5l7 7-7 7"/>'),
  play: P('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  stop: P('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
  trash: P('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  paste: P('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>'),
  fist: P('<path d="M7 11V7.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V10m0-1a1.5 1.5 0 0 1 3 0v1.5m0-.5a1.5 1.5 0 0 1 3 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-1A5.5 5.5 0 0 1 6 15.5V13a2 2 0 0 1 2-2h2"/>'),
  whistle: P('<path d="M3 11a5 5 0 1 0 9.6 2H20V9h-9l-1-2H6.5"/><circle cx="8" cy="13" r="1.4" fill="currentColor"/>'),
  check: P('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  send: P('<path d="M4 12l16-8-6 16-2.5-6.5z"/>'),
  redo: P('<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>'),
};

export function icon(name, cls) {
  const s = h('span', { class: cls || 'icw', html: ICON[name] || '' });
  s.style.display = 'contents';
  return s;
}

// ----- Feuilles du bas -----
const layer = () => document.getElementById('layer');
const stack = [];

export function sheet(build, opts = {}) {
  const wrap = h('div');
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    const i = stack.indexOf(close);
    if (i >= 0) stack.splice(i, 1);
    opts.onClose && opts.onClose();
  };
  const back = h('div', { class: 'backdrop', onclick: () => !opts.locked && close() });
  const body = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grab' }));
  wrap.append(back, body);
  layer().append(wrap);
  stack.push(close);
  const content = build(close);
  if (content) body.append(content);
  return close;
}

export function full(build, opts = {}) {
  const el = h('div', { class: opts.cls || 'full', role: 'dialog', 'aria-modal': 'true' });
  const close = () => {
    if (!el.isConnected) return;
    el.remove();
    const i = stack.indexOf(close);
    if (i >= 0) stack.splice(i, 1);
    opts.onClose && opts.onClose();
  };
  layer().append(el);
  stack.push(close);
  const content = build(close, el);
  if (content) el.append(content);
  return close;
}

export function closeAll() {
  for (const c of [...stack].reverse()) c();
}

export function ask(title, text, ok = 'Oui', { danger = false, cancel = 'Annuler' } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    sheet((close) => h('div', { class: 'stack' },
      h('h2', null, title),
      text ? h('p', { class: 'muted' }, text) : null,
      h('div', { class: 'btns' },
        h('button', { class: 'btn block ' + (danger ? 'danger' : 'primary'), onclick: () => { answered = true; close(); resolve(true); } }, ok),
        h('button', { class: 'btn ghost block', onclick: () => close() }, cancel),
      ),
    ), { onClose: () => { if (!answered) resolve(false); } });
  });
}

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ----- Choix segmentés -----
export function seg(options, value, onChange) {
  const el = h('div', { class: 'seg', role: 'group' });
  const draw = () => {
    fill(el, ...options.map(([v, label]) => h('button', {
      type: 'button', 'aria-pressed': String(v === value),
      onclick: () => { value = v; draw(); onChange(v); },
    }, label)));
  };
  draw();
  return el;
}

// ----- Ceintures -----
export const BELTS = [
  ['blanche', 'Blanche'], ['bleue', 'Bleue'], ['violette', 'Violette'], ['marron', 'Marron'], ['noire', 'Noire'],
];
export const BELT_NAME = Object.fromEntries(BELTS);
export const AGES = [
  ['u13', 'Moins de 13 ans'], ['u16', '13 à 15 ans'], ['u18', '16 à 17 ans'], ['adulte', 'Adulte (18 à 29 ans)'], ['master', 'Master (30 ans et +)'],
];

export function belt(b = 'blanche', stripes = 0, big = false) {
  const bar = h('span', { class: 'bar' });
  for (let i = 0; i < Math.min(4, stripes || 0); i++) bar.append(h('i'));
  return h('span', { class: 'belt' + (big ? ' big' : ''), 'data-b': b, title: 'Ceinture ' + (BELT_NAME[b] || b).toLowerCase() }, bar);
}

export function initials(name = '?') {
  const p = name.trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

export function avatar(name, { me = false, lg = false, dot = null, onclick = null } = {}) {
  const tag = onclick ? 'button' : 'span';
  const el = h(tag, { class: 'avatar' + (me ? ' me' : '') + (lg ? ' lg' : ''), onclick, 'aria-label': onclick ? 'Mon profil' : null }, initials(name));
  if (dot !== null) el.append(h('span', { class: 'dot' + (dot ? ' on' : '') }));
  return el;
}

// ----- Formats -----
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
export function day(ts) {
  const d = new Date(ts);
  return (d.getFullYear() === new Date().getFullYear() ? dateFmt : dateFmtY).format(d);
}
export function hm(ts) {
  return new Date(ts).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}
export function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }

export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
}

// ----- Sons (bips du chrono) -----
let audio = null;
export function unlockAudio() {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.01);
  } catch (e) { /* pas de son */ }
}
export function beep(freq = 880, dur = 0.12, vol = 0.5, type = 'square') {
  if (window.__porradaMute) return;
  try {
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur + 0.02);
  } catch (e) { /* pas de son */ }
}
export function buzzer() {
  beep(220, 0.9, 0.6, 'sawtooth');
  setTimeout(() => beep(196, 0.7, 0.5, 'sawtooth'), 120);
}
export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* iPhone : pas de vibration */ } }

// ----- Garder l'écran allumé -----
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
