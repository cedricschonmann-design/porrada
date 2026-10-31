// Timer de fractionné : une grande touche par durée (1:00 à 5:00), tours, repos,
// décompte de 5 secondes au choix. Sons doux, vibrations, écran qui reste allumé.

import { state, save } from './store.js';
import { h, fill, ICON, sheet, sfx, haptic, keepAwake, toggle, ask, SPEED } from './ui.js';
import { header, installBanner } from './app.js';

const WORK = [60, 90, 120, 150, 180, 210, 240, 270, 300];
const REST = [0, 15, 30, 45, 60, 90, 120, 180];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
const ic = (name) => h('span', { html: ICON[name], style: { display: 'contents' } });

let run = null;
export const isRunning = () => !!run;

export function render() {
  const t = state.timer;
  const set = (patch) => { Object.assign(t, patch); save(); };
  const rounds = h('div', { class: 'stepper' },
    h('button', { class: 'iconbtn', id: 'rounds-minus', 'aria-label': 'Un tour de moins', html: ICON.minus, disabled: t.rounds <= 1 ? true : null, onclick: () => set({ rounds: Math.max(1, t.rounds - 1) }) }),
    h('span', { class: 'sval num', id: 'rounds-val' }, t.rounds),
    h('button', { class: 'iconbtn', id: 'rounds-plus', 'aria-label': 'Un tour de plus', html: ICON.plus, disabled: t.rounds >= 50 ? true : null, onclick: () => set({ rounds: Math.min(50, t.rounds + 1) }) }),
  );
  const many = t.rounds > 1;
  return h('div', null,
    header('Timer'),
    installBanner(),
    h('div', { class: 'card timer-opts' },
      h('div', { class: 'opt-row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'Tours'), h('div', { class: 's' }, many ? `${t.rounds} fois la durée choisie` : 'Une seule fois')), rounds),
      h('div', { class: 'opt-row col' + (many ? '' : ' off') },
        h('div', { class: 'between' }, h('div', { class: 't' }, 'Repos entre les tours'), many ? null : h('span', { class: 'tiny muted' }, 'Ajoute des tours')),
        h('div', { class: 'chips scroll' }, REST.map((s) => h('button', { class: 'chip', id: `rest-${s}`, 'aria-pressed': String(t.rest === s), disabled: many ? null : true, onclick: () => set({ rest: s }) }, s ? fmt(s) : 'Aucun'))),
      ),
      h('div', { class: 'opt-row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'Décompte de 5 secondes'), h('div', { class: 's' }, 'Avant que le timer démarre')), h('span', { id: 'cd-toggle', style: { display: 'contents' } }, toggle(t.countdown, (v) => set({ countdown: v }), 'Décompte de 5 secondes'))),
    ),
    h('div', { class: 'section-head section' }, h('h3', null, 'Touche pour lancer'), many ? h('span', { class: 'small muted' }, `${t.rounds} tours · repos ${t.rest ? fmt(t.rest) : 'aucun'}`) : null),
    h('div', { class: 'tiles' }, WORK.map((s) => h('button', { class: 'tile' + (t.last === s ? ' last' : ''), 'data-work': s, 'aria-label': `Lancer ${fmt(s)}`, onclick: () => start(s) },
      h('span', { class: 'tv num' }, fmt(s)),
      h('span', { class: 'tk' }, many ? `total ${fmt(total(s, t))}` : 'min'),
    ))),
    h('button', { class: 'btn block', id: 'custom', style: { marginTop: '12px' }, onclick: customSheet }, ic('clock'), 'Autre durée'),
  );
}

const total = (work, t) => work * t.rounds + (t.rounds > 1 ? t.rest * (t.rounds - 1) : 0) + (t.countdown ? 5 : 0);

function customSheet() {
  const t = state.timer;
  let sec = WORK.includes(t.work) ? 45 : t.work || 45;
  sheet((close) => {
    const val = h('div', { class: 'custom-val num' }, fmt(sec));
    const step = (d) => { sec = Math.min(3600, Math.max(5, sec + d)); val.textContent = fmt(sec); haptic('light'); };
    const btn = (label, d) => h('button', { class: 'chip', 'data-silent': '', onclick: () => step(d) }, label);
    return h('div', { class: 'stack' },
      h('h2', null, 'Autre durée'),
      val,
      h('div', { class: 'chips', style: { justifyContent: 'center' } }, btn('− 1 min', -60), btn('− 5 s', -5), btn('+ 5 s', 5), btn('+ 1 min', 60)),
      h('button', { class: 'btn primary lg block', id: 'custom-go', onclick: () => { close({ instant: true }); start(sec); } }, ic('play'), 'Lancer'),
    );
  });
}

// ---------- En marche ----------
function start(work) {
  const t = state.timer;
  t.work = work;
  t.last = work;
  save();
  const phases = [];
  if (t.countdown) phases.push({ k: 'count', ms: 5000 });
  for (let r = 1; r <= t.rounds; r++) {
    phases.push({ k: 'work', ms: work * 1000, r });
    if (r < t.rounds && t.rest > 0) phases.push({ k: 'rest', ms: t.rest * 1000, r });
  }
  board(phases, { work, rounds: t.rounds, rest: t.rest });
}

function board(phases, cfg) {
  // Sur iPhone, le son passe même en mode silencieux
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* tant pis */ }
  const el = h('div', { class: 'board tboard', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Timer' }, h('div', { class: 'glow' }, h('i'), h('i')));
  const bar = h('i');
  const roundEl = h('div', { class: 'tb-round' });
  const top = h('div', { class: 'tb-top' },
    h('div', { class: 'tb-progress' }, bar),
    h('div', { class: 'between' }, roundEl, h('button', { class: 'iconbtn', id: 'tb-close', 'aria-label': 'Arrêter', html: ICON.close, onclick: () => stop(true) })),
  );
  const center = h('div', { class: 'center' });
  const bottom = h('div', { class: 'tb-bottom' });
  el.append(top, center, bottom);
  document.getElementById('layer').append(el);
  keepAwake(true);

  const R = 46;
  const C = 2 * Math.PI * R;
  const ring = h('div', { class: 'tring', html: `<svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="${R}"/><circle class="fgc" cx="50" cy="50" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="0"/></svg>` });
  const fg = ring.querySelector('.fgc');
  const phaseEl = h('div', { class: 'tb-phase' });
  const timeEl = h('div', { class: 'giant clock num', id: 'tb-time' });
  const nextEl = h('div', { class: 'tb-next' });
  ring.append(h('div', { class: 'tb-inner' }, phaseEl, timeEl, nextEl));

  const pauseBtn = h('button', { class: 'btn white lg', id: 'tb-pause', onclick: () => setPause(!paused) });
  const skipBtn = h('button', { class: 'btn lg', id: 'tb-skip', onclick: skip }, ic('next'), 'Passer');
  fill(bottom, h('div', { class: 'btns two' }, pauseBtn, skipBtn));

  const totalMs = phases.reduce((s, p) => s + p.ms, 0);
  let elapsed = 0;
  let last = Date.now();
  let paused = false;
  let idx = -1;
  let lastSec = null;
  let finished = false;
  let timerId = null;

  const where = () => {
    let acc = 0;
    let i = 0;
    while (i < phases.length && elapsed >= acc + phases[i].ms) { acc += phases[i].ms; i++; }
    return { i, acc };
  };
  const nextLabel = (i) => {
    const n = phases[i + 1];
    if (!n) return 'Dernier effort';
    if (n.k === 'rest') return `Ensuite : repos ${fmt(n.ms / 1000)}`;
    return `Ensuite : tour ${n.r}`;
  };
  const enter = (i) => {
    const p = phases[i];
    el.classList.toggle('rest', p.k === 'rest');
    el.classList.toggle('count', p.k === 'count');
    el.classList.remove('hot');
    if (p.k === 'count') {
      fill(center, h('div', { class: 'tb-ready' }, 'Prêt ?'), h('div', { class: 'giant count num', id: 'tb-count' }, '5'));
    } else {
      fill(center, ring);
      phaseEl.textContent = p.k === 'work' ? 'Effort' : 'Repos';
      nextEl.textContent = nextLabel(i);
      if (p.k === 'work') { sfx('go'); haptic('heavy'); } else { sfx('warn'); haptic('medium'); }
    }
    fill(roundEl, cfg.rounds > 1 && p.r ? `Tour ${p.r} / ${cfg.rounds}` : cfg.rounds > 1 ? `${cfg.rounds} tours` : fmt(cfg.work));
  };
  const onSecond = (p, sec) => {
    if (p.k === 'count') {
      const c = center.querySelector('#tb-count');
      if (c) { c.textContent = sec; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
      sfx(sec === 1 ? 'count3' : 'count');
      haptic('light');
      return;
    }
    if (sec <= 3 && sec >= 1) { sfx('count'); haptic('light'); }
    el.classList.toggle('hot', p.k === 'work' && sec <= 3);
  };
  const tick = () => {
    const now = Date.now();
    if (!paused && !finished) elapsed += (now - last) * SPEED;
    last = now;
    if (finished) return;
    const { i, acc } = where();
    if (i >= phases.length) { finish(); return; }
    if (i !== idx) { idx = i; lastSec = null; enter(i); }
    const p = phases[i];
    const left = acc + p.ms - elapsed;
    const sec = Math.max(1, Math.ceil(left / 1000));
    if (sec !== lastSec) { lastSec = sec; onSecond(p, sec); }
    if (p.k !== 'count') {
      timeEl.textContent = fmt(sec);
      fg.setAttribute('stroke-dashoffset', (C * (1 - left / p.ms)).toFixed(2));
    }
    bar.style.width = `${Math.min(100, (elapsed / totalMs) * 100)}%`;
  };
  const setPause = (v) => {
    paused = v;
    last = Date.now();
    fill(pauseBtn, ic(paused ? 'play' : 'pause'), paused ? 'Reprendre' : 'Pause');
    el.classList.toggle('paused', paused);
    haptic('light');
  };
  function skip() {
    if (finished) return;
    const { i, acc } = where();
    if (i < phases.length) elapsed = acc + phases[i].ms;
    last = Date.now();
    tick();
  }
  function finish() {
    finished = true;
    clearInterval(timerId);
    el.classList.remove('rest', 'count', 'hot', 'paused');
    el.classList.add('win');
    bar.style.width = '100%';
    sfx('buzzer');
    haptic('heavy');
    const workMs = phases.filter((p) => p.k === 'work').reduce((s, p) => s + p.ms, 0);
    fill(roundEl, 'Terminé');
    fill(center,
      h('div', { class: 'giant tb-done' }, 'Terminé'),
      h('div', { class: 'tb-next', style: { marginTop: '12px' } }, cfg.rounds > 1 ? `${cfg.rounds} tours · ${fmt(workMs / 1000)} d’effort` : `${fmt(workMs / 1000)} d’effort`),
    );
    fill(bottom, h('div', { class: 'btns two' },
      h('button', { class: 'btn white lg', id: 'tb-again', onclick: () => { close(); start(cfg.work); } }, ic('redo'), 'Recommencer'),
      h('button', { class: 'btn lg', id: 'tb-end', onclick: close }, 'Fermer'),
    ));
  }
  function close() {
    clearInterval(timerId);
    document.removeEventListener('visibilitychange', tick);
    keepAwake(false);
    run = null;
    el.classList.add('closing');
    setTimeout(() => el.remove(), 300);
  }
  async function stop(confirm) {
    if (finished) { close(); return; }
    if (confirm && elapsed > 3000) {
      const was = paused;
      setPause(true);
      if (!(await ask('Arrêter le timer ?', null, 'Arrêter', { danger: true, cancel: 'Continuer' }))) { setPause(was); return; }
    }
    close();
  }

  run = { stop };
  setPause(false);
  document.addEventListener('visibilitychange', tick);
  timerId = setInterval(tick, 100);
  tick();
}
