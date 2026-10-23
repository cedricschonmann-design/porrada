// Journal privé : séances, soumissions placées et subies, graphique, régularité, et le mode cours.

import { state, save, rid } from '../store.js';
import { h, fill, ICON, push, sheet, toast, seg, hhmmss, mmss, day, hm, plural, keepAwake, unlockAudio, sfx, haptic, ask, SPEED, countUp, svgEl, longDay } from '../ui.js';
import { subName, SUB_BY_ID } from '../data/submissions.js';
import { header } from '../app.js';
import { subPicker } from './combat.js';
import { avatarOf } from '../people.js';

const FEEL_LABEL = ['Épuisé', 'Dur', 'Correct', 'Bien', 'Au top'];
let courseView = null;
let period = 'weeks';

function totals() {
  const t = { given: 0, received: 0, sessions: state.journal.length, minutes: 0, giv: {}, rec: {} };
  for (const s of state.journal) {
    t.minutes += s.minutes || 0;
    for (const g of s.given || []) { t.given++; if (g.sub) t.giv[g.sub] = (t.giv[g.sub] || 0) + 1; }
    for (const r of s.received || []) { t.received++; if (r.sub) t.rec[r.sub] = (t.rec[r.sub] || 0) + 1; }
  }
  return t;
}
const top = (obj, n = 4) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

const weekStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
function thisWeekCount() {
  const w = weekStart(Date.now());
  return state.journal.filter((s) => s.start >= w).length;
}
function goalStreak() {
  const goal = state.settings.weeklyGoal || 3;
  let n = 0;
  let w = weekStart(Date.now());
  const count = (ws) => state.journal.filter((s) => s.start >= ws && s.start < ws + 7 * 86400000).length;
  if (count(w) >= goal) n++;
  w -= 7 * 86400000;
  while (count(w) >= goal) { n++; w -= 7 * 86400000; }
  return n;
}

export function render() {
  const t = totals();
  const sessions = [...state.journal].sort((a, b) => b.start - a.start);
  const goal = state.settings.weeklyGoal || 3;
  const wk = thisWeekCount();
  const statTile = (v, k, cls) => { const el = h('div', { class: 'v' }, '0'); countUp(el, v); return h('div', { class: 'stat' }, el, h('div', { class: 'k' }, cls ? h('i', { class: cls }) : null, k)); };
  return h('div', null,
    header('Journal'),
    state.course
      ? h('button', { class: 'card grad tap', style: { width: '100%', textAlign: 'left', border: '0' }, onclick: openCourse },
        h('div', { class: 'between' }, h('div', null, h('div', { class: 'small', style: { opacity: '.85', fontWeight: '700' } }, 'Cours en cours'), h('h2', { style: { marginTop: '4px' } }, 'Reprendre le cours')), h('span', { class: 'iconbtn', style: { background: 'rgba(255,255,255,.2)', color: '#fff', border: '0' }, html: ICON.play })))
      : h('div', { class: 'card hero tint' },
        h('div', { class: 'between', style: { alignItems: 'flex-start' } },
          h('div', null, h('h2', null, 'Prêt pour le tapis ?'), h('p', { class: 'muted small', style: { marginTop: '4px', maxWidth: '210px' } }, 'Lance le cours : deux gros boutons pour noter tes soumissions entre les rounds.')),
          ring(wk, goal),
        ),
        h('button', { class: 'btn primary lg block', id: 'start-course', style: { marginTop: '14px' }, onclick: startCourse }, h('span', { html: ICON.play, style: { display: 'contents' } }), 'Commencer le cours'),
      ),
    h('div', { class: 'stats', style: { marginTop: '12px' } },
      statTile(t.given, 'Placées', 'give'),
      statTile(t.received, 'Subies', 'take'),
      statTile(Math.round(t.minutes / 60), 'Heures de tapis'),
    ),
    t.given + t.received > 0 ? chartCard() : null,
    state.journal.length ? regularityCard() : null,
    (top(t.giv).length || top(t.rec).length) ? h('div', { class: 'card stack', style: { marginTop: '12px' } },
      top(t.giv).length ? subBars('Tes armes', top(t.giv), 'give') : null,
      top(t.rec).length ? subBars('Ce qui te piège', top(t.rec), 'take') : null,
    ) : null,
    h('div', { class: 'section-head section' },
      h('h3', null, 'Tes séances'),
      h('button', { class: 'btn sm', onclick: () => editSession(null) }, h('span', { html: ICON.plus, style: { display: 'contents' } }), 'Ajouter'),
    ),
    sessions.length ? sessionList(sessions) : h('div', { class: 'empty' }, h('div', { class: 'art', html: ICON.journal }), h('p', null, 'Aucune séance pour l’instant. Lance « Commencer le cours » en arrivant sur le tapis.')),
  );
}

function ring(n, goal) {
  const R = 26; const C = 2 * Math.PI * R;
  const k = Math.min(1, n / goal);
  const el = h('div', { class: 'ringstat', 'aria-label': `${n} séance${n > 1 ? 's' : ''} sur ${goal} cette semaine` });
  el.innerHTML = `<svg viewBox="0 0 64 64"><circle class="bgc" cx="32" cy="32" r="${R}"/><circle class="fgc" cx="32" cy="32" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/></svg>`;
  el.append(h('div', { style: { textAlign: 'center', position: 'absolute', width: '64px', fontWeight: '850', fontSize: '15px' } }, `${n}/${goal}`));
  el.style.position = 'relative';
  requestAnimationFrame(() => requestAnimationFrame(() => { const c = el.querySelector('.fgc'); if (c) c.style.strokeDashoffset = (C * (1 - k)).toFixed(1); }));
  return h('div', { style: { display: 'grid', justifyItems: 'center', gap: '4px' } }, el, h('div', { class: 'tiny muted' }, 'cette semaine'));
}

// ---------- Graphique : soumissions placées (au-dessus) et subies (en dessous) ----------
function buckets(kind) {
  const out = [];
  const now = new Date();
  if (kind === 'weeks') {
    let w = weekStart(Date.now()) - 7 * 7 * 86400000;
    for (let i = 0; i < 8; i++, w += 7 * 86400000) {
      const d = new Date(w);
      out.push({ from: w, to: w + 7 * 86400000, label: `${d.getDate()}.${d.getMonth() + 1}`, long: `Semaine du ${day(w)}`, g: 0, r: 0 });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const a = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const b = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const lbl = a.toLocaleDateString('fr-CH', { month: 'short' }).replace('.', '');
      out.push({ from: a.getTime(), to: b.getTime(), label: lbl.slice(0, 3), long: a.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' }), g: 0, r: 0 });
    }
  }
  for (const s of state.journal) {
    const bk = out.find((x) => s.start >= x.from && s.start < x.to);
    if (bk) { bk.g += (s.given || []).length; bk.r += (s.received || []).length; }
  }
  return out;
}

function chartCard() {
  const wrap = h('div', { class: 'card', style: { marginTop: '12px' } });
  const draw = () => {
    const data = buckets(period);
    const W = 340; const H = 176; const L = 22; const mid = 82; const amp = 62;
    const max = Math.max(1, ...data.map((d) => Math.max(d.g, d.r)));
    const nice = max <= 4 ? max : Math.ceil(max / 2) * 2;
    const step = (W - L) / data.length;
    const bw = Math.min(16, step * 0.56);
    const empty = data.every((d) => !d.g && !d.r);
    const tip = h('div', { class: 'chart-tip', 'aria-live': 'polite' }, empty ? (period === 'weeks' ? 'Rien de noté ces 8 dernières semaines.' : 'Rien de noté ces 12 derniers mois.') : 'Touche une barre pour le détail.');
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Soumissions placées et subies, ${period === 'weeks' ? '8 dernières semaines' : '12 derniers mois'}">`;
    svg += `<line class="grid" x1="${L}" x2="${W}" y1="${mid - amp}" y2="${mid - amp}"/><line class="grid" x1="${L}" x2="${W}" y1="${mid + amp}" y2="${mid + amp}"/>`;
    svg += `<text x="${L - 6}" y="${mid - amp + 4}" text-anchor="end">${nice}</text><text x="${L - 6}" y="${mid + amp + 4}" text-anchor="end">${nice}</text><text x="${L - 6}" y="${mid + 4}" text-anchor="end">0</text>`;
    data.forEach((d, i) => {
      const x = L + i * step + (step - bw) / 2;
      const gh = (d.g / nice) * amp; const rh = (d.r / nice) * amp; const rr = Math.min(4, bw / 2);
      svg += `<rect class="hl" data-i="${i}" x="${L + i * step + 1}" y="${mid - amp - 4}" width="${step - 2}" height="${amp * 2 + 8}" rx="8" opacity="0"/>`;
      if (gh > 0) {
        const r = Math.min(rr, gh);
        svg += `<path class="bar up give" style="animation-delay:${i * 40}ms" d="M${x} ${mid - 1} V${(mid - gh + r).toFixed(1)} Q${x} ${(mid - gh).toFixed(1)} ${x + r} ${(mid - gh).toFixed(1)} H${x + bw - r} Q${x + bw} ${(mid - gh).toFixed(1)} ${x + bw} ${(mid - gh + r).toFixed(1)} V${mid - 1} Z"/>`;
      }
      if (rh > 0) {
        const r = Math.min(rr, rh);
        svg += `<path class="bar down take" style="animation-delay:${i * 40}ms" d="M${x} ${mid + 1} V${(mid + rh - r).toFixed(1)} Q${x} ${(mid + rh).toFixed(1)} ${x + r} ${(mid + rh).toFixed(1)} H${x + bw - r} Q${x + bw} ${(mid + rh).toFixed(1)} ${x + bw} ${(mid + rh - r).toFixed(1)} V${mid + 1} Z"/>`;
      }
      svg += `<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${d.label}</text>`;
      svg += `<rect class="hit" data-i="${i}" x="${L + i * step}" y="0" width="${step}" height="${H}"/>`;
    });
    svg += `<line class="zero" x1="${L}" x2="${W}" y1="${mid}" y2="${mid}"/></svg>`;
    const chart = svgEl(svg);
    chart.addEventListener('click', (e) => {
      const i = e.target.getAttribute && e.target.getAttribute('data-i');
      if (i == null) return;
      const d = data[Number(i)];
      chart.querySelectorAll('.hl').forEach((r) => r.setAttribute('opacity', r.getAttribute('data-i') === i ? '1' : '0'));
      fill(tip, h('b', null, d.long), ` : ${plural(d.g, 'placée', 'placées')}, ${plural(d.r, 'subie', 'subies')}`);
      haptic('light');
    });
    const tbl = h('table', { class: 'sr' }, h('tbody', null, data.map((d) => h('tr', null, h('td', null, d.long), h('td', null, `${d.g} placées`), h('td', null, `${d.r} subies`)))));
    fill(wrap,
      h('div', { class: 'between', style: { marginBottom: '10px' } }, h('h3', null, 'Soumissions'), seg([['weeks', '8 sem.'], ['months', '12 mois']], period, (v) => { period = v; draw(); }, { cls: 'sm' })),
      h('div', { class: 'legend', style: { marginBottom: '6px' } }, h('span', null, h('i', { style: { background: 'var(--c-give)' } }), 'Placées'), h('span', null, h('i', { style: { background: 'var(--c-take)' } }), 'Subies')),
      chart, tip, tbl,
    );
  };
  draw();
  return wrap;
}

function regularityCard() {
  const goal = state.settings.weeklyGoal || 3;
  const streak = goalStreak();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = weekStart(today.getTime()) - 11 * 7 * 86400000;
  const perDay = {};
  for (const s of state.journal) { const d = new Date(s.start); d.setHours(0, 0, 0, 0); perDay[d.getTime()] = (perDay[d.getTime()] || 0) + (s.minutes || 60); }
  const cells = [];
  for (let i = 0; i < 84; i++) {
    const t = start + i * 86400000;
    const m = perDay[t] || 0;
    const lvl = m === 0 ? '' : m < 60 ? 'l1' : m < 105 ? 'l2' : 'l3';
    cells.push(h('i', { class: lvl + (t === today.getTime() ? ' now' : ''), title: m ? `${day(t)} : ${m} min` : day(t) }));
  }
  return h('div', { class: 'card', style: { marginTop: '12px' } },
    h('div', { class: 'between', style: { marginBottom: '10px' } },
      h('h3', null, 'Régularité'),
      h('span', { class: 'chip static', style: { height: '30px' } }, h('span', { html: ICON.flame, style: { display: 'contents' } }), streak ? `${plural(streak, 'semaine', 'semaines')} à l’objectif` : `Objectif : ${goal} par semaine`),
    ),
    h('div', { class: 'streak', 'aria-label': '12 dernières semaines d’entraînement' }, cells),
    h('div', { class: 'between tiny muted', style: { marginTop: '6px' } }, h('span', null, 'Il y a 12 semaines'), h('span', null, 'Aujourd’hui')),
  );
}

function subBars(title, rows, cls) {
  const max = Math.max(...rows.map((r) => r[1]));
  return h('div', null,
    h('div', { class: 'between', style: { marginBottom: '8px' } }, h('b', null, title)),
    h('div', { class: 'stack', style: { gap: '9px' } }, rows.map(([id, n], i) => h('div', { class: 'hbar' },
      h('span', null, subName(id)), h('b', null, n),
      h('div', { class: 'track' }, h('i', { style: { width: `${(n / max) * 100}%`, background: `var(--c-${cls})`, animationDelay: `${i * 70}ms` } })),
    ))),
  );
}

function sessionList(sessions) {
  const groups = [];
  for (const s of sessions) {
    const key = new Date(s.start).toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, items: [] }; groups.push(g); }
    g.items.push(s);
  }
  return h('div', null, groups.map((g) => h('div', null,
    h('div', { class: 'list-head' }, g.key.charAt(0).toUpperCase() + g.key.slice(1)),
    h('div', { class: 'rows' }, g.items.map((s) => h('button', { class: 'rowc', onclick: () => editSession(s.id) },
      h('div', { style: { width: '44px', textAlign: 'center', flex: 'none' } }, h('div', { style: { fontSize: '20px', fontWeight: '850', lineHeight: '1' } }, new Date(s.start).getDate()), h('div', { class: 'tiny muted' }, new Date(s.start).toLocaleDateString('fr-CH', { weekday: 'short' }))),
      h('div', { class: 'grow' },
        h('div', { class: 't' }, `${s.mode === 'nogi' ? 'No-Gi' : 'Gi'} · ${s.minutes >= 60 ? Math.floor(s.minutes / 60) + ' h ' + String(s.minutes % 60).padStart(2, '0') : s.minutes + ' min'}`),
        h('div', { class: 's' }, `${plural((s.given || []).length, 'placée', 'placées')} · ${plural((s.received || []).length, 'subie', 'subies')}${s.note ? ' · ' + s.note.slice(0, 30) : ''}`),
      ),
      s.feel != null ? h('span', { class: 'tag' + (s.feel >= 3 ? ' ok' : '') }, FEEL_LABEL[s.feel]) : null,
      h('span', { class: 'chev', html: ICON.chev }),
    ))),
  )));
}

// ---------- Mode cours ----------
function startCourse() {
  let mode = state.settings.lastMode || 'gi';
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Commencer le cours'),
    h('div', { class: 'field' }, h('span', null, 'Aujourd’hui c’est'), seg([['gi', 'Gi (kimono)'], ['nogi', 'No-Gi']], mode, (v) => { mode = v; })),
    h('button', {
      class: 'btn primary lg block', id: 'go-course', onclick: () => {
        unlockAudio();
        state.settings.lastMode = mode;
        state.course = { id: rid(8), start: Date.now(), mode, given: [], received: [], timer: null };
        save();
        close();
        sfx('success');
        openCourse();
      },
    }, 'C’est parti'),
  ));
}

export function resume() { if (state.course) openCourse(); }

// ---------- Ressenti (5 niveaux, en mots) ----------
function feelPicker(value, onPick) {
  const el = h('div', { class: 'feel' });
  const draw = () => fill(el, ...FEEL_LABEL.map((l, i) => h('button', { 'aria-pressed': String(value === i), 'data-silent': '', onclick: () => { value = value === i ? null : i; draw(); haptic('light'); onPick(value); } }, l)));
  draw();
  return el;
}

// ---------- Compteurs de soumissions (+ / −), sans devoir chercher à chaque fois ----------
// entries : tableau de { sub, at } (sub null = « sans préciser »). Un + sur une soumission
// transforme d'abord une soumission « sans préciser » en celle-ci, sinon en ajoute une.
function favoriteSubs(k, mode) {
  const count = {};
  for (const s of state.journal) for (const x of s[k] || []) if (x.sub) count[x.sub] = (count[x.sub] || 0) + 1;
  const base = mode === 'nogi' ? ['rnc', 'guillotine', 'triangle', 'armbar', 'kimura', 'darce', 'heel-in', 'ankle'] : ['rnc', 'triangle', 'armbar', 'cross-collar', 'kimura', 'bow-arrow', 'guillotine', 'omoplata'];
  return [...new Set([...Object.entries(count).sort((a, b) => b[1] - a[1]).map(([id]) => id), ...base])]
    .filter((id) => SUB_BY_ID[id] && !(mode === 'nogi' && SUB_BY_ID[id].kind === 'kimono') && !(mode === 'gi' && SUB_BY_ID[id].kind === 'grappling'));
}

function subCounter(entries, mode, k, onChange) {
  const el = h('div', { class: 'counter' });
  const extra = new Set();
  const draw = () => {
    const nulls = entries.filter((x) => !x.sub).length;
    const counts = {};
    for (const x of entries) if (x.sub) counts[x.sub] = (counts[x.sub] || 0) + 1;
    const shown = [...new Set([...Object.keys(counts), ...extra, ...favoriteSubs(k, mode).slice(0, 5)])];
    const inc = (id) => {
      const i = entries.findIndex((x) => !x.sub);
      if (id && i >= 0) entries[i].sub = id; else entries.push({ sub: id, at: Date.now() });
      sfx('pop'); haptic('light'); draw(); onChange();
    };
    const dec = (id) => {
      for (let i = entries.length - 1; i >= 0; i--) if ((entries[i].sub || null) === id) { entries.splice(i, 1); break; }
      haptic('light'); draw(); onChange();
    };
    const row = (id, label, n, cls = '') => h('div', { class: 'crow' + (n ? ' on' : '') + cls, 'data-sub': id || 'none' },
      h('span', { class: 'cname' }, label),
      h('button', { class: 'iconbtn cbtn', 'aria-label': `Moins ${label}`, html: ICON.minus, disabled: !n, onclick: () => dec(id) }),
      h('span', { class: 'cval num' }, n),
      h('button', { class: 'iconbtn cbtn', 'aria-label': `Plus ${label}`, html: ICON.plus, onclick: () => inc(id) }));
    fill(el,
      row(null, 'Sans préciser', nulls, ' muted-row'),
      shown.map((id) => row(id, subName(id), counts[id] || 0)),
      h('button', {
        class: 'btn sm block', style: { marginTop: '4px' }, onclick: () => sheet((closeS) => h('div', { class: 'stack' },
          h('h2', null, 'Autre soumission'),
          subPicker(mode, (id) => { extra.add(id); closeS(); inc(id); }, null, { title: null }),
        )),
      }, h('span', { html: ICON.search, style: { display: 'contents' } }), 'Autre soumission'),
    );
  };
  draw();
  return el;
}

// ---------- Note rapide sur l'écran verrouillé ----------
// Une appli web ne peut pas avoir de widget : on utilise les commandes « musique » de l'écran
// verrouillé (précédent / suivant) pendant le cours, grâce à un son silencieux qui tourne en boucle.
const lockNotes = {
  audio: null, url: null, active: false, onHit: null,
  supported() { return 'mediaSession' in navigator && typeof Audio !== 'undefined'; },
  silent() {
    if (this.url) return this.url;
    const rate = 8000; const n = rate * 8;
    const buf = new ArrayBuffer(44 + n); const v = new DataView(buf);
    const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
    new Uint8Array(buf, 44).fill(128);
    this.url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    return this.url;
  },
  async start(onHit) {
    if (!this.supported()) return false;
    this.onHit = onHit;
    try {
      if (!this.audio) { this.audio = new Audio(this.silent()); this.audio.loop = true; this.audio.setAttribute('playsinline', ''); }
      await this.audio.play();
      const ms = navigator.mediaSession;
      ms.setActionHandler('nexttrack', () => this.onHit && this.onHit('given'));
      ms.setActionHandler('previoustrack', () => this.onHit && this.onHit('received'));
      try { ms.setActionHandler('seekforward', null); ms.setActionHandler('seekbackward', null); } catch (e) { /* pas grave */ }
      ms.setActionHandler('play', () => this.audio && this.audio.play());
      ms.setActionHandler('pause', () => { if (this.audio) this.audio.play(); });
      this.active = true;
      this.update();
      return true;
    } catch (e) {
      this.active = false;
      return false;
    }
  },
  update() {
    if (!this.active || !state.course) return;
    const c = state.course;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${c.given.length} placée${c.given.length > 1 ? 's' : ''} · ${c.received.length} subie${c.received.length > 1 ? 's' : ''}`,
        artist: 'Suivant : j’ai soumis · Précédent : j’ai été soumis',
        album: `PORRADA · cours ${c.mode === 'nogi' ? 'No-Gi' : 'Gi'}`,
        artwork: [{ src: 'icons/star-512.png', sizes: '512x512', type: 'image/png' }],
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) { /* pas grave */ }
  },
  stop() {
    this.active = false;
    try { if (this.audio) this.audio.pause(); } catch (e) { /* rien */ }
    try {
      const ms = navigator.mediaSession;
      ['nexttrack', 'previoustrack', 'play', 'pause'].forEach((a) => ms.setActionHandler(a, null));
      ms.metadata = null;
    } catch (e) { /* rien */ }
  },
};

function addHit(k, { silent = false } = {}) {
  const c = state.course;
  if (!c) return;
  c[k].push({ sub: null, at: Date.now() });
  save();
  lockNotes.update();
  if (!silent) { sfx(k === 'given' ? 'give' : 'take'); haptic('medium'); }
}

function openCourse() {
  if (courseView) return;
  keepAwake(true);
  let timer = null;
  courseView = push((page) => {
    const c = () => state.course;
    const wrap = h('div', { id: 'course' });
    const elapsed = h('span', { class: 'num' }, '0:00');
    const timerBox = h('div');
    const lockBox = h('div');
    let lastPhase = null;
    const draw = () => {
      if (!c()) return;
      fill(wrap,
        h('div', { class: 'between', style: { margin: '2px 2px 14px' } },
          h('div', null, h('h1', null, `Cours ${c().mode === 'nogi' ? 'No-Gi' : 'Gi'}`), h('div', { class: 'muted', style: { marginTop: '4px' } }, 'Sur le tapis depuis ', elapsed)),
        ),
        h('div', { class: 'hits' },
          h('button', { class: 'hit give', id: 'hit-give', 'aria-label': `J’ai soumis, ${c().given.length}`, onclick: () => hit('given') }, h('span', { html: ICON.fist, style: { display: 'contents' } }), h('span', { class: 'n' }, c().given.length), 'J’ai soumis'),
          h('button', { class: 'hit take', id: 'hit-take', 'aria-label': `J’ai été soumis, ${c().received.length}`, onclick: () => hit('received') }, h('span', { html: ICON.flag, style: { display: 'contents' } }), h('span', { class: 'n' }, c().received.length), 'J’ai été soumis'),
        ),
        h('p', { class: 'small muted center', style: { margin: '10px 4px 0' } }, 'Un appui = une soumission. Tu préciseras lesquelles à la fin du cours.'),
        h('div', { style: { marginTop: '12px' } }, lockBox),
        h('div', { style: { marginTop: '12px' } }, timerBox),
        h('div', { style: { marginTop: '12px' } }, lastLine()),
        h('button', { class: 'btn lg block', id: 'end-course', style: { marginTop: '16px' }, onclick: endCourse }, h('span', { html: ICON.stop, style: { display: 'contents' } }), 'Terminer le cours'),
      );
      drawTimer();
      drawLock();
    };
    const lastLine = () => {
      const all = [...c().given.map((x) => ({ ...x, k: 'given' })), ...c().received.map((x) => ({ ...x, k: 'received' }))].sort((a, b) => b.at - a.at);
      if (!all.length) return null;
      const l = all[0];
      return h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px' } },
        h('div', null, h('div', { class: 'small muted' }, `Dernière, à ${hm(l.at)}`), h('b', null, l.k === 'given' ? 'Soumission placée' : 'Soumission subie')),
        h('button', {
          class: 'btn sm', onclick: () => {
            const arr = c()[l.k];
            const i = arr.findIndex((x) => x.at === l.at);
            if (i >= 0) arr.splice(i, 1);
            save(); lockNotes.update(); draw(); sfx('del');
          },
        }, 'Annuler'),
      );
    };
    const hit = (k) => {
      addHit(k);
      draw();
      const n = document.querySelector(k === 'given' ? '#hit-give .n' : '#hit-take .n');
      if (n) n.classList.add('bump');
    };
    const drawLock = () => {
      if (!lockNotes.supported()) { fill(lockBox); return; }
      fill(lockBox, h('div', { class: 'card', id: 'lock-card', style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' } },
        h('span', { class: 'iconbtn', style: { background: lockNotes.active ? 'var(--green)' : 'var(--glass-3)', color: lockNotes.active ? '#000' : 'inherit', border: '0' }, html: ICON.lock }),
        h('div', { style: { flex: '1 1 0', minWidth: '0', textAlign: 'left' } },
          h('b', null, lockNotes.active ? 'Note rapide activée' : 'Note rapide écran verrouillé'),
          h('div', { class: 'small muted', style: { marginTop: '2px' } }, lockNotes.active ? 'Bouton suivant : j’ai soumis. Précédent : j’ai été soumis.' : 'Note sans déverrouiller, avec les boutons musique.'),
        ),
        lockNotes.active
          ? h('button', { class: 'btn sm', onclick: () => { lockNotes.stop(); drawLock(); } }, 'Couper')
          : h('button', { class: 'btn sm', id: 'lock-on', onclick: async () => { const ok = await lockNotes.start((k) => { addHit(k, { silent: true }); draw(); }); if (!ok) toast('Impossible ici : utilise les gros boutons.'); drawLock(); } }, 'Activer'),
      ));
    };
    // Minuteur de rounds avec repos, en boucle
    const drawTimer = () => {
      const tm = c().timer;
      const s = state.settings;
      if (!tm) {
        fill(timerBox, h('div', { class: 'card stack' },
          h('div', { class: 'between' }, h('b', null, 'Minuteur de rounds'), h('span', { class: 'tiny muted' }, 'Sonnerie à chaque fin')),
          h('div', { class: 'field' }, h('span', null, 'Round'), h('div', { class: 'chips' }, [3, 4, 5, 6, 7, 8, 10].map((m) => h('button', { class: 'chip', 'data-round': m, 'aria-pressed': String((s.roundWork || 5) === m), onclick: () => { s.roundWork = m; save(); drawTimer(); } }, `${m} min`)))),
          h('div', { class: 'field' }, h('span', null, 'Repos'), seg([[0.5, '30 s'], [1, '1 min'], [2, '2 min']], s.roundRest || 1, (v) => { s.roundRest = v; save(); }, { cls: 'sm' })),
          h('button', { class: 'btn primary block', id: 'start-rounds', onclick: () => { unlockAudio(); c().timer = { start: Date.now(), work: s.roundWork || 5, rest: s.roundRest || 1 }; save(); sfx('bell'); haptic('heavy'); drawTimer(); } }, h('span', { html: ICON.timer, style: { display: 'contents' } }), 'Lancer les rounds'),
        ));
      } else {
        fill(timerBox, h('div', { class: 'card timer-card', id: 'timer-card' },
          h('div', { class: 'grow' }, h('div', { class: 'small muted', id: 'timer-label' }, ''), h('div', { class: 'tval', id: 'timer-left' }, '')),
          h('button', { class: 'btn sm', onclick: () => { c().timer = null; save(); drawTimer(); } }, 'Arrêter'),
        ));
        lastPhase = null;
        tickFn();
      }
    };
    const tickFn = () => {
      if (!c()) return;
      elapsed.textContent = hhmmss(Date.now() - c().start);
      const tm = c().timer;
      if (!tm) return;
      const work = (tm.work * 60000) / SPEED; const rest = (tm.rest * 60000) / SPEED; const cycle = work + rest;
      const t = Date.now() - tm.start;
      const n = Math.floor(t / cycle) + 1;
      const inCycle = t % cycle;
      const isRest = inCycle >= work;
      const left = (isRest ? cycle - inCycle : work - inCycle) * SPEED;
      const phase = `${n}-${isRest ? 'r' : 'w'}`;
      const card = document.getElementById('timer-card');
      const lab = document.getElementById('timer-label');
      const val = document.getElementById('timer-left');
      if (!card) return;
      if (phase !== lastPhase) {
        if (lastPhase) {
          if (isRest) { sfx('buzzer'); haptic('heavy'); } else { sfx('bell'); haptic('heavy'); }
        }
        lastPhase = phase;
      }
      card.classList.toggle('rest', isRest);
      card.classList.toggle('hot', !isRest && left <= 10000);
      lab.textContent = isRest ? `Repos · prochain round ${n + 1}` : `Round ${n} · ${tm.work} min`;
      val.textContent = mmss(left);
    };
    const endCourse = () => openEnd(page);
    draw();
    tickFn();
    timer = setInterval(tickFn, 250);
    return wrap;
  }, {
    title: 'Cours', back: 'Réduire',
    onClose: () => { clearInterval(timer); courseView = null; keepAwake(false); },
  });
}

// Fin du cours : on précise les soumissions avec des + / −, le ressenti, les partenaires.
function openEnd(coursePage) {
  const cc = state.course;
  if (!cc) return;
  let feel = null;
  let note = '';
  const partners = new Set();
  push((page) => {
    const head = h('p', { class: 'page-sub' });
    const refreshHead = () => { head.textContent = `${hhmmss(Date.now() - cc.start)} sur le tapis · ${plural(cc.given.length, 'placée', 'placées')} · ${plural(cc.received.length, 'subie', 'subies')}`; };
    refreshHead();
    const friends = Object.values(state.friends);
    const pEl = h('div', { class: 'chips' });
    const drawP = () => fill(pEl, ...friends.map((f) => h('button', { class: 'chip', 'aria-pressed': String(partners.has(f.id)), onclick: () => { partners.has(f.id) ? partners.delete(f.id) : partners.add(f.id); drawP(); } }, avatarOf(f, { size: 22 }), f.name)));
    drawP();
    return h('div', { class: 'stack' },
      h('h1', { class: 'page-title', style: { marginBottom: '0' } }, 'Fin du cours'),
      head,
      h('div', { class: 'card stack', id: 'end-given' }, h('h3', null, 'Tes soumissions placées'), subCounter(cc.given, cc.mode, 'given', () => { save(); refreshHead(); })),
      h('div', { class: 'card stack', id: 'end-received' }, h('h3', null, 'Les soumissions subies'), subCounter(cc.received, cc.mode, 'received', () => { save(); refreshHead(); })),
      h('div', { class: 'field' }, h('span', null, 'Ton ressenti'), feelPicker(feel, (v) => { feel = v; })),
      friends.length ? h('div', { class: 'field' }, h('span', null, 'Avec qui tu as roulé'), pEl) : null,
      h('label', { class: 'field' }, h('span', null, 'Ce que tu retiens'), h('textarea', { class: 'input', placeholder: 'Une technique, un détail, ce qui a marché…', oninput: (e) => { note = e.target.value; } })),
      h('button', {
        class: 'btn primary lg block', id: 'save-course', onclick: () => {
          const minutes = Math.max(1, Math.round((Date.now() - cc.start) / 60000));
          state.journal.push({ id: cc.id, start: cc.start, minutes, mode: cc.mode, given: cc.given, received: cc.received, note: note.trim(), feel, partners: [...partners] });
          state.course = null;
          lockNotes.stop();
          save();
          page.close({ silent: true });
          coursePage.close({ silent: true });
          sfx('success'); haptic('medium');
          const goal = state.settings.weeklyGoal || 3;
          const wk = thisWeekCount();
          toast(wk === goal ? `Objectif de la semaine atteint : ${wk}/${goal}` : 'Séance enregistrée dans ton journal.', { ok: true, ms: 3200 });
        },
      }, 'Enregistrer la séance'),
      h('button', {
        class: 'btn ghost block', onclick: async () => {
          if (!(await ask('Abandonner ce cours ?', 'Il ne sera pas enregistré dans ton journal.', 'Abandonner', { danger: true }))) return;
          state.course = null; lockNotes.stop(); save(); page.close({ silent: true }); coursePage.close();
        },
      }, 'Ne pas enregistrer'),
    );
  }, { title: 'Fin du cours', back: 'Cours' });
}

// ---------- Ajouter / modifier une séance ----------
function editSession(id) {
  const existing = id ? state.journal.find((s) => s.id === id) : null;
  const s = existing ? JSON.parse(JSON.stringify(existing)) : { id: rid(8), start: Date.now(), minutes: 90, mode: state.settings.lastMode || 'gi', given: [], received: [], note: '', feel: null, partners: [] };
  if (!s.partners) s.partners = [];
  push((page) => {
    const wrap = h('div', { class: 'stack' });
    const draw = () => {
      const d = new Date(s.start);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const minVal = h('div', { class: 'v num' }, fmtMin(s.minutes));
      const setM = (m) => { s.minutes = Math.max(5, Math.min(600, m)); minVal.textContent = fmtMin(s.minutes); };
      fill(wrap,
        h('h1', { class: 'page-title', style: { marginBottom: '2px' } }, existing ? longDay(s.start) : 'Nouvelle séance'),
        h('label', { class: 'field' }, h('span', null, 'Date et heure'), h('input', { class: 'input', type: 'datetime-local', value: local, onchange: (e) => { const v = new Date(e.target.value).getTime(); if (v) s.start = v; } })),
        h('div', { class: 'field' }, h('span', null, 'Durée'),
          h('div', { class: 'card', style: { padding: '10px 12px' } }, h('div', { class: 'stepper', style: { justifyContent: 'space-between' } },
            h('button', { class: 'iconbtn', 'aria-label': 'Moins 15 minutes', html: ICON.minus, onclick: () => setM(s.minutes - 15) }), minVal,
            h('button', { class: 'iconbtn', 'aria-label': 'Plus 15 minutes', html: ICON.plus, onclick: () => setM(s.minutes + 15) }))),
        ),
        h('div', { class: 'field' }, h('span', null, 'Tenue'), seg([['gi', 'Gi'], ['nogi', 'No-Gi']], s.mode, (v) => { s.mode = v; })),
        subsBlock('Soumissions placées', 'given'),
        subsBlock('Soumissions subies', 'received'),
        h('div', { class: 'field' }, h('span', null, 'Ressenti'), feelPicker(s.feel, (v) => { s.feel = v; })),
        Object.keys(state.friends).length ? h('div', { class: 'field' }, h('span', null, 'Avec qui tu as roulé'), h('div', { class: 'chips' }, Object.values(state.friends).map((f) => h('button', { class: 'chip', 'aria-pressed': String(s.partners.includes(f.id)), onclick: () => { s.partners = s.partners.includes(f.id) ? s.partners.filter((x) => x !== f.id) : [...s.partners, f.id]; draw(); } }, avatarOf(f, { size: 22 }), f.name)))) : null,
        h('label', { class: 'field' }, h('span', null, 'Ce que tu retiens'), h('textarea', { class: 'input', placeholder: 'Une technique, un détail, ce qui a marché…', oninput: (e) => { s.note = e.target.value; } }, s.note || '')),
        h('button', {
          class: 'btn primary lg block', id: 'save-session', onclick: () => {
            if (existing) Object.assign(existing, s); else state.journal.push(s);
            save(); page.close({ silent: true }); toast('Séance enregistrée.', { ok: true, sound: 'success' });
          },
        }, 'Enregistrer'),
        existing ? h('button', {
          class: 'btn danger block', onclick: async () => {
            if (!(await ask('Supprimer cette séance ?', null, 'Supprimer', { danger: true }))) return;
            const backup = existing;
            state.journal = state.journal.filter((x) => x.id !== id);
            save(); page.close({ silent: true }); sfx('del');
            toast('Séance supprimée.', { action: { label: 'Annuler', fn: () => { state.journal.push(backup); save(); toast('Séance remise.', { ok: true }); } } });
          },
        }, 'Supprimer la séance') : null,
      );
    };
    const subsBlock = (label, k) => h('div', { class: 'card stack' }, h('h3', null, label), subCounter(s[k], s.mode, k, () => {}));
    draw();
    return wrap;
  }, { title: existing ? 'Séance' : 'Nouvelle séance' });
}

function fmtMin(m) { return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; }
