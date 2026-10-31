// Blocs outils : semaine, séance de sport (charges par série), suivi du jour, budget, bilan.

import { state, save, saveQuiet, rid, todayKey, dayIndex, weekKey, fmtDate, noteById, touch } from './store.js';
import { h, fill, ICON, sheet, haptic, sfx, toast, ask } from './ui.js';
import { pic } from './pictos.js';

export const SPECIAL = ['week', 'work', 'track', 'budget', 'sum'];
const ic = (name) => h('span', { html: pic(name), style: { display: 'contents' } });
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const CATS = {
  etudes: { n: 'Études', c: 'red', i: 'grad' },
  grappling: { n: 'Grappling', c: 'blue', i: 'fist' },
  jjb: { n: 'JJB', c: 'teal', i: 'belt' },
  prepa: { n: 'Prépa physique', c: 'orange', i: 'dumbbell' },
  repos: { n: 'Repos', c: 'violet', i: 'moon' },
  coaching: { n: 'Coaching', c: 'green', i: 'user' },
  perso: { n: 'Perso', c: 'yellow', i: 'sparkles' },
  autre: { n: 'Autre', c: 'muted', i: 'dot' },
};
export const KCAT = { explo: { n: 'Explosif', c: 'red' }, force: { n: 'Force', c: 'blue' }, hyper: { n: 'Hypertrophie', c: 'green' }, cardio: { n: 'Cardio', c: 'violet' } };
export const WGROUP = { circuit: { n: 'Circuit', c: 'violet' }, ss1: { n: 'Superset', c: 'orange' }, ss2: { n: 'Superset', c: 'pink' } };

export function newSpecial(t) {
  if (t === 'week') return { t, days: [[], [], [], [], [], [], []], done: {} };
  if (t === 'work') return { t, rows: [{ id: rid(), b: 'A1', n: 'Exercice', s: 3, r: '8', rpe: '8', tp: '', rest: '90 s', k: 'force', g: null, unit: 'kg' }], log: {} };
  if (t === 'track') return { t, items: [{ id: rid(), n: 'Calories', op: '<', goal: 2000, u: 'kcal', hist: {} }] };
  if (t === 'budget') return { t, title: 'Budget', kind: 'out', rows: [] };
  return { t };
}

export function renderSpecial(b, ctx) {
  if (b.t === 'week') return week(b, ctx);
  if (b.t === 'work') return work(b, ctx);
  if (b.t === 'track') return track(b, ctx);
  if (b.t === 'budget') return budget(b, ctx);
  if (b.t === 'sum') return summary(b, ctx);
  return h('div');
}
const moreBtn = (fn, label = 'Options du bloc') => h('button', { class: 'iconbtn sm', 'aria-label': label, html: ICON.more, onclick: fn });
const changed = (ctx) => { touch(ctx.note); save(); };
const open = (id) => import('./editor.js').then((m) => m.openNote(id));

// ======================= SEMAINE =======================
export function weekDone(b) {
  const wk = weekKey();
  b.done = b.done || {};
  for (const k of Object.keys(b.done)) if (k < wk) delete b.done[k];
  return (b.done[wk] = b.done[wk] || []);
}
export function toggleWeekItem(b, id) {
  const done = weekDone(b);
  const i = done.indexOf(id);
  if (i >= 0) done.splice(i, 1); else { done.push(id); sfx('pop'); }
  haptic('light');
}
export function weekItemRow(b, item, { onToggle, onEdit = null } = {}) {
  const cat = CATS[item.c] || CATS.autre;
  const isDone = weekDone(b).includes(item.id);
  return h('div', { class: 'witem' + (isDone ? ' done' : ''), 'data-item': item.id },
    h('button', { class: 'wmain', onclick: () => { toggleWeekItem(b, item.id); onToggle(); } },
      h('span', { class: 'wbox', html: ICON.check }),
      h('span', { class: `wic c-${cat.c}`, html: pic(cat.i) }),
      h('span', { class: 'wx' }, item.x)),
    item.link && noteById(item.link) ? h('button', { class: 'wlink', 'aria-label': `Ouvrir ${noteById(item.link).title}`, html: pic('arrow-up-right'), onclick: () => open(item.link) }) : null,
    onEdit ? h('button', { class: 'wedit', 'aria-label': 'Modifier', html: pic('edit'), onclick: onEdit }) : null,
  );
}

function week(b, ctx) {
  let editing = false;
  const el = h('div', { class: 'sp week' });
  const draw = () => {
    const today = dayIndex();
    const mon = new Date(); mon.setDate(mon.getDate() - today);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const range = `du ${mon.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })} au ${sun.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })}`;
    const used = [...new Set(b.days.flat().map((x) => x.c))];
    fill(el,
      h('div', { class: 'sp-head' },
        h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, 'Cette semaine'), h('div', { class: 'sp-s' }, range + ' · les cases se vident chaque lundi')),
        h('button', { class: 'btn sm', id: 'week-edit', onclick: () => { editing = !editing; draw(); } }, editing ? 'OK' : 'Modifier'),
        moreBtn(() => ctx.menu())),
      h('div', { class: 'legend' }, used.map((c) => { const k = CATS[c] || CATS.autre; return h('span', { class: 'lg' }, h('span', { class: `wic c-${k.c}`, html: pic(k.i) }), k.n); })),
      b.days.map((items, d) => {
        const done = weekDone(b).filter((id) => items.some((x) => x.id === id)).length;
        return h('div', { class: 'wday' + (d === today ? ' today' : '') + (d < today ? ' past' : ''), 'data-day': d },
          h('div', { class: 'wd-h' },
            h('span', { class: 'wd-n' }, DAYS[d]),
            d === today ? h('span', { class: 'pill', 'data-c': 'violet' }, 'Aujourd’hui') : null,
            items.length ? h('span', { class: 'wd-c num' + (done === items.length ? ' full' : '') }, `${done}/${items.length}`) : null),
          h('div', { class: 'witems' }, items.map((it) => weekItemRow(b, it, { onToggle: () => { changed(ctx); draw(); }, onEdit: editing ? () => itemSheet(b, d, it, () => { changed(ctx); draw(); }) : null }))),
          editing ? h('button', { class: 'wadd', 'data-add-day': d, onclick: () => itemSheet(b, d, null, () => { changed(ctx); draw(); }) }, ic('plus'), 'Ajouter') : null,
        );
      }),
    );
  };
  draw();
  return el;
}

function itemSheet(b, day, item, after) {
  const it = item ? { ...item } : { id: rid(), c: 'etudes', x: '', link: null };
  let catsEl = null; let linkEl = null;
  sheet((close) => {
    const input = h('input', { class: 'input', id: 'witem-text', value: it.x, placeholder: 'Ex. Révisions Chimie', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done' });
    const drawCats = () => fill(catsEl, Object.entries(CATS).map(([k, c]) => h('button', { class: 'chip', 'data-cat': k, 'aria-pressed': String(it.c === k), onclick: () => { it.c = k; if (!input.value.trim() || Object.values(CATS).some((x) => x.n === input.value)) input.value = c.n; drawCats(); } }, h('span', { class: `wic c-${c.c}`, html: pic(c.i) }), c.n)));
    const drawLink = () => fill(linkEl,
      h('button', { class: 'chip', 'aria-pressed': String(!it.link), onclick: () => { it.link = null; drawLink(); } }, 'Aucune'),
      state.notes.map((nn) => h('button', { class: 'chip', 'aria-pressed': String(it.link === nn.id), onclick: () => { it.link = nn.id; drawLink(); } }, nn.title || 'Note')));
    catsEl = h('div', { class: 'chips' }); linkEl = h('div', { class: 'chips' });
    drawCats(); drawLink();
    const ok = () => {
      it.x = input.value.trim() || (CATS[it.c] || CATS.autre).n;
      const list = b.days[day];
      const i = list.findIndex((x) => x.id === it.id);
      if (i >= 0) list[i] = it; else list.push(it);
      close(); after();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    return h('div', { class: 'stack' },
      h('h2', null, `${DAYS[day]} : ${item ? 'modifier' : 'ajouter'}`),
      input,
      h('div', { class: 'list-head' }, 'Catégorie'), catsEl,
      h('div', { class: 'list-head' }, 'Ouvrir une note en touchant la flèche'), linkEl,
      h('button', { class: 'btn primary lg block', id: 'witem-ok', onclick: ok }, item ? 'Enregistrer' : 'Ajouter'),
      item ? h('div', { class: 'btns two' },
        h('button', { class: 'btn', onclick: () => { const l = b.days[day]; const i = l.findIndex((x) => x.id === it.id); if (i > 0) { l.splice(i, 1); l.splice(i - 1, 0, item); } close(); after(); } }, ic('arrow-up'), 'Monter'),
        h('button', { class: 'btn danger', onclick: () => { b.days[day] = b.days[day].filter((x) => x.id !== it.id); close(); after(); sfx('del'); } }, ic('trash'), 'Retirer'),
      ) : null,
    );
  });
}

// ======================= SÉANCE DE SPORT =======================
const prevLoad = (b, rowId, k, before) => {
  const dates = Object.keys(b.log || {}).filter((d) => d < before).sort().reverse();
  for (const d of dates) { const v = b.log[d][rowId] && b.log[d][rowId][k]; if (v) return { v, d }; }
  return null;
};
function work(b, ctx) {
  let editing = false;
  const el = h('div', { class: 'sp work' });
  const draw = () => {
    const today = todayKey();
    b.log = b.log || {};
    const dates = Object.keys(b.log).filter((d) => Object.values(b.log[d]).some((arr) => arr.some(Boolean))).sort();
    const last = dates.filter((d) => d < today).pop();
    const groups = [];
    let curG = null;
    for (const r of b.rows) {
      if (r.g && curG && curG.g === r.g) curG.rows.push(r);
      else { curG = { g: r.g, rows: [r] }; groups.push(curG); }
    }
    fill(el,
      h('div', { class: 'sp-head' },
        h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, `Séance du ${new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}`),
          h('div', { class: 'sp-s' }, last ? `Dernière séance : ${fmtDate(last, { weekday: 'short', day: 'numeric', month: 'short' })} · ses charges sont en gris` : 'Note tes charges : elles serviront de repère la prochaine fois')),
        moreBtn(() => ctx.menu([
          [editing ? 'Terminer la modification' : 'Modifier les exercices', () => { editing = !editing; draw(); }, 'work-edit'],
          ['Historique des séances', () => history(b, ctx, draw), 'work-history'],
        ]))),
      h('div', { class: 'legend' }, Object.values(KCAT).map((k) => h('span', { class: 'lg' }, h('i', { class: `sw c-${k.c}` }), k.n))),
      groups.map((gp) => {
        const G = gp.g && WGROUP[gp.g];
        const rows = gp.rows.map((r) => exRow(b, r, today, editing, ctx, draw));
        if (!G) return rows;
        const label = gp.g === 'circuit' ? `${G.n} ${gp.rows[0].b} → ${gp.rows[gp.rows.length - 1].b}` : `${G.n} ${gp.rows.map((x) => x.b).join(' + ')}`;
        return h('div', { class: `wgroup g-${G.c}` }, h('div', { class: 'wg-h' }, ic(gp.g === 'circuit' ? 'repeat' : 'arrows-lr'), label), rows);
      }),
      editing ? h('button', { class: 'wadd', id: 'ex-add', onclick: () => exSheet(b, null, ctx, draw) }, ic('plus'), 'Ajouter un exercice') : null,
    );
  };
  draw();
  return el;
}
function exRow(b, r, today, editing, ctx, draw) {
  const k = KCAT[r.k] || KCAT.force;
  const cur = (b.log[today] && b.log[today][r.id]) || [];
  const sets = [];
  for (let i = 0; i < Math.max(1, Number(r.s) || 1); i++) {
    const prev = prevLoad(b, r.id, i, today);
    const isNote = r.unit === 'note';
    const input = h('input', { class: 'load num', 'data-row': r.id, 'data-set': i, inputmode: isNote ? 'text' : 'decimal', autocomplete: 'off', enterkeyhint: 'next', value: cur[i] || '', placeholder: prev ? prev.v : isNote ? '…' : '–', 'aria-label': `${r.n}, ${isNote ? 'round' : 'série'} ${i + 1}` });
    input.addEventListener('input', () => {
      b.log[today] = b.log[today] || {};
      const arr = b.log[today][r.id] = b.log[today][r.id] || [];
      arr[i] = input.value.trim();
      touch(ctx.note); saveQuiet();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const all = Array.from(document.querySelectorAll('.page:last-child .load'));
      const nx = all[all.indexOf(input) + 1];
      if (nx) nx.focus(); else input.blur();
    });
    sets.push(h('label', { class: 'set' }, h('span', { class: 'sl' }, `${isNote ? 'R' : 'S'}${i + 1}`), input, isNote ? null : h('span', { class: 'su' }, 'kg')));
  }
  const meta = [`${r.s} × ${r.r}`, r.rpe ? `RPE ${r.rpe}` : null, r.tp && r.tp !== '—' ? r.tp : null, r.rest ? `repos ${r.rest}` : null].filter(Boolean);
  return h('div', { class: `ex k-${k.c}`, 'data-ex': r.b },
    h('div', { class: 'ex-h' },
      h('span', { class: 'exb' }, r.b),
      h('span', { class: 'exn' }, r.n),
      editing ? h('button', { class: 'iconbtn sm', 'aria-label': `Modifier ${r.n}`, html: pic('edit'), onclick: () => exSheet(b, r, ctx, draw) }) : h('span', { class: `kpill c-${k.c}` }, k.n)),
    h('div', { class: 'ex-m' }, meta.map((m) => h('span', null, m))),
    h('div', { class: 'sets' }, sets),
  );
}
function exSheet(b, row, ctx, draw) {
  const r = row ? { ...row } : { id: rid(), b: '', n: '', s: 3, r: '8', rpe: '8', tp: '', rest: '90 s', k: 'force', g: null, unit: 'kg' };
  sheet((close) => {
    const f = (label, key, ph, mode = 'text') => h('label', { class: 'field' }, h('span', null, label), h('input', { class: 'input', value: r[key] ?? '', placeholder: ph, inputmode: mode, autocomplete: 'off', oninput: (e) => { r[key] = e.target.value; } }));
    const chips = (opts, key) => { const box = h('div', { class: 'chips' }); const d = () => fill(box, opts.map(([k, label, c]) => h('button', { class: 'chip', 'aria-pressed': String((r[key] ?? null) === k), onclick: () => { r[key] = k; d(); } }, c ? h('i', { class: `sw c-${c}` }) : null, label))); d(); return box; };
    return h('div', { class: 'stack' },
      h('h2', null, row ? 'Modifier l’exercice' : 'Nouvel exercice'),
      h('div', { class: 'btns two' }, f('Bloc', 'b', 'A1'), f('Séries', 's', '3', 'numeric')),
      f('Exercice', 'n', 'Ex. Squat'),
      h('div', { class: 'btns two' }, f('Répétitions', 'r', '8'), f('RPE', 'rpe', '8')),
      h('div', { class: 'btns two' }, f('Tempo', 'tp', '3-0-1-0'), f('Repos', 'rest', '90 s')),
      h('div', { class: 'list-head' }, 'Type'), chips(Object.entries(KCAT).map(([k, v]) => [k, v.n, v.c]), 'k'),
      h('div', { class: 'list-head' }, 'Enchaînement'), chips([[null, 'Seul', null], ['circuit', 'Circuit', 'violet'], ['ss1', 'Superset 1', 'orange'], ['ss2', 'Superset 2', 'pink']], 'g'),
      h('div', { class: 'list-head' }, 'À noter à chaque série'),
      h('div', { class: 'chips' }, [['kg', 'Charge en kg'], ['note', 'Une note (cardio)']].map(([u, l]) => h('button', { class: 'chip', 'aria-pressed': String((r.unit || 'kg') === u), onclick: (e) => { r.unit = u; e.target.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === e.target))); } }, l))),
      h('button', { class: 'btn primary lg block', onclick: () => {
        r.s = Math.max(1, Math.min(10, Number(r.s) || 1));
        if (!r.n.trim()) { toast('Donne un nom à l’exercice.'); return; }
        const i = b.rows.findIndex((x) => x.id === r.id);
        if (i >= 0) b.rows[i] = r; else b.rows.push(r);
        changed(ctx); close(); draw();
      } }, 'Enregistrer'),
      row ? h('div', { class: 'btns two' },
        h('button', { class: 'btn', onclick: () => { const i = b.rows.findIndex((x) => x.id === r.id); if (i > 0) { const [x] = b.rows.splice(i, 1); b.rows.splice(i - 1, 0, x); changed(ctx); close(); draw(); } } }, h('span', { html: pic('arrow-up'), style: { display: 'contents' } }), 'Monter'),
        h('button', { class: 'btn danger', onclick: () => { b.rows = b.rows.filter((x) => x.id !== r.id); changed(ctx); close(); draw(); sfx('del'); } }, h('span', { html: ICON.trash, style: { display: 'contents' } }), 'Retirer'),
      ) : null,
    );
  });
}
function history(b, ctx, draw) {
  const dates = Object.keys(b.log || {}).filter((d) => Object.values(b.log[d]).some((a) => a.some(Boolean))).sort().reverse();
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Historique'),
    dates.length ? dates.map((d) => h('div', { class: 'card stack hist' },
      h('div', { class: 'between' }, h('b', null, fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })),
        h('button', { class: 'link muted', onclick: async () => { close({ instant: true }); if (await ask('Effacer cette séance ?', null, 'Effacer', { danger: true })) { delete b.log[d]; changed(ctx); draw(); } } }, 'Effacer')),
      b.rows.filter((r) => b.log[d][r.id] && b.log[d][r.id].some(Boolean)).map((r) => h('div', { class: 'kv' }, h('span', null, `${r.b} ${r.n}`), h('span', { class: 'num' }, b.log[d][r.id].filter(Boolean).join(' / ') + (r.unit === 'note' ? '' : ' kg')))),
    )) : h('p', { class: 'muted' }, 'Pas encore de séance notée. Remplis les cases de charge pendant ta séance : elles sont gardées par date.'),
  ));
}

// ======================= SUIVI DU JOUR =======================
export function trackStatus(it, v) {
  if (v === '' || v == null || isNaN(Number(String(v).replace(',', '.')))) return null;
  const x = Number(String(v).replace(',', '.'));
  const ok = it.op === '<' ? x <= it.goal : it.op === '>' ? x >= it.goal : x === it.goal;
  return ok;
}
export function trackInput(it, ctx, after) {
  const today = todayKey();
  it.hist = it.hist || {};
  const input = h('input', { class: 'tval num', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', value: it.hist[today] || '', placeholder: '–', 'aria-label': `${it.n} aujourd’hui`, 'data-track': it.id });
  input.addEventListener('input', () => {
    if (input.value.trim()) it.hist[today] = input.value.trim(); else delete it.hist[today];
    const keys = Object.keys(it.hist).sort();
    while (keys.length > 60) delete it.hist[keys.shift()];
    if (ctx) touch(ctx.note);
    saveQuiet();
    if (after) after(input.value);
  });
  return input;
}
function track(b, ctx) {
  const el = h('div', { class: 'sp track' });
  const draw = () => {
    const today = todayKey();
    fill(el,
      h('div', { class: 'sp-head' }, h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, 'Aujourd’hui'), h('div', { class: 'sp-s' }, new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' }))),
        moreBtn(() => ctx.menu([['Ajouter un suivi', () => trackSheet(b, null, ctx, draw), 'track-add'], ...b.items.map((it) => [`Modifier « ${it.n} »`, () => trackSheet(b, it, ctx, draw)])]))),
      b.items.map((it) => {
        const status = h('span', { class: 'tstat' });
        const paint = (v) => { const s = trackStatus(it, v); status.className = 'tstat ' + (s === null ? '' : s ? 'ok' : 'no'); fill(status, s === null ? 'à remplir' : s ? h('span', { html: ICON.check, style: { display: 'contents' } }) : h('span', { html: pic('alert'), style: { display: 'contents' } }), s === null ? null : s ? 'Objectif tenu' : 'Hors objectif'); };
        const input = trackInput(it, ctx, paint);
        paint(input.value);
        const prev = Object.keys(it.hist || {}).filter((d) => d < today).sort().reverse();
        const last7 = prev.slice(0, 7).map((d) => Number(String(it.hist[d]).replace(',', '.'))).filter((x) => !isNaN(x));
        const avg = last7.length ? Math.round(last7.reduce((s, x) => s + x, 0) / last7.length) : null;
        return h('div', { class: 'trow', 'data-tracker': it.n },
          h('div', { class: 'grow' }, h('div', { class: 't' }, it.n), h('div', { class: 's' }, `Objectif ${it.op === '<' ? 'moins de' : it.op === '>' ? 'plus de' : ''} ${it.goal.toLocaleString('fr-CH')} ${it.u}`), status,
            prev.length ? h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `Hier : ${it.hist[prev[0]] || '–'}${avg !== null ? ` · moyenne 7 jours : ${avg.toLocaleString('fr-CH')}` : ''}`) : null),
          h('div', { class: 'tin' }, input, h('span', { class: 'tu' }, it.u)));
      }),
    );
  };
  draw();
  return el;
}
function trackSheet(b, item, ctx, draw) {
  const it = item ? { ...item } : { id: rid(), n: '', op: '>', goal: 0, u: '', hist: {} };
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, item ? 'Modifier le suivi' : 'Nouveau suivi'),
    h('input', { class: 'input', value: it.n, placeholder: 'Ex. Sommeil, Eau, Pas', oninput: (e) => { it.n = e.target.value; } }),
    h('div', { class: 'chips' }, [['<', 'Moins de'], ['>', 'Plus de']].map(([o, l]) => h('button', { class: 'chip', 'aria-pressed': String(it.op === o), onclick: (e) => { it.op = o; e.target.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === e.target))); } }, l))),
    h('div', { class: 'btns two' },
      h('input', { class: 'input', inputmode: 'decimal', value: it.goal || '', placeholder: 'Objectif', oninput: (e) => { it.goal = Number(e.target.value.replace(',', '.')) || 0; } }),
      h('input', { class: 'input', value: it.u, placeholder: 'Unité (kcal, g, h…)', oninput: (e) => { it.u = e.target.value; } })),
    h('button', { class: 'btn primary lg block', onclick: () => { if (!it.n.trim()) return; const i = b.items.findIndex((x) => x.id === it.id); if (i >= 0) b.items[i] = it; else b.items.push(it); changed(ctx); close(); draw(); } }, 'Enregistrer'),
    item ? h('button', { class: 'btn danger block', onclick: () => { b.items = b.items.filter((x) => x.id !== it.id); changed(ctx); close(); draw(); } }, 'Retirer ce suivi') : null,
  ));
}

// ======================= BUDGET =======================
export const chf = (n) => `CHF ${Number(n || 0).toLocaleString('fr-CH', { maximumFractionDigits: 2 })}.–`;
export const total = (b) => (b.rows || []).reduce((s, r) => s + (Number(r.a) || 0), 0);
const KIND = { in: { i: 'trend-up', c: 'green', n: 'Entrées' }, out: { i: 'trend-down', c: 'red', n: 'Sorties' }, stock: { i: 'coins', c: 'yellow', n: 'Avoir' } };
function budget(b, ctx) {
  const el = h('div', { class: 'sp budget' });
  const draw = () => {
    const K = KIND[b.kind] || KIND.out;
    fill(el,
      h('div', { class: 'sp-head' },
        h('span', { class: `ntile sm c-${K.c}`, html: pic(K.i) }),
        h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, b.title || K.n), b.title ? null : h('div', { class: 'sp-s' }, K.n)),
        h('div', { class: 'btot num' }, chf(total(b))),
        moreBtn(() => ctx.menu([['Renommer et type', () => budgetSheet(b, ctx, draw), 'budget-edit']]))),
      h('div', { class: 'brows' },
        (b.rows || []).map((r) => h('div', { class: 'brow' + (r.done ? ' done' : '') },
          h('button', { class: 'box sm' + (r.done ? ' on' : ''), 'aria-label': r.done ? 'Décocher' : 'Cocher', 'data-silent': '', html: ICON.check, onclick: () => { r.done = !r.done; changed(ctx); draw(); haptic('light'); } }),
          h('button', { class: 'bmain', onclick: () => rowSheet(b, r, ctx, draw) },
            h('span', { class: 'grow' }, h('span', { class: 'bn' }, r.n), r.note ? h('span', { class: 'bnote' }, r.note) : null),
            h('span', { class: 'ba num' }, chf(r.a)))))),
      h('button', { class: 'wadd', onclick: () => rowSheet(b, null, ctx, draw) }, ic('plus'), 'Ajouter une ligne'),
    );
  };
  draw();
  return el;
}
function rowSheet(b, row, ctx, draw) {
  const r = row ? { ...row } : { id: rid(), n: '', a: '', note: '', done: false };
  sheet((close) => {
    const name = h('input', { class: 'input', value: r.n, placeholder: 'Ex. Abonnement', autocomplete: 'off', oninput: (e) => { r.n = e.target.value; } });
    return h('div', { class: 'stack' },
      h('h2', null, row ? 'Modifier la ligne' : 'Nouvelle ligne'),
      name,
      h('input', { class: 'input', inputmode: 'decimal', value: r.a, placeholder: 'Montant en CHF', oninput: (e) => { r.a = Number(e.target.value.replace(',', '.')) || 0; } }),
      h('input', { class: 'input', value: r.note || '', placeholder: 'Précision (facultatif)', oninput: (e) => { r.note = e.target.value; } }),
      h('button', { class: 'btn primary lg block', onclick: () => { if (!String(r.n).trim()) { name.focus(); return; } b.rows = b.rows || []; const i = b.rows.findIndex((x) => x.id === r.id); if (i >= 0) b.rows[i] = r; else b.rows.push(r); changed(ctx); close(); draw(); } }, 'Enregistrer'),
      row ? h('button', { class: 'btn danger block', onclick: () => { b.rows = b.rows.filter((x) => x.id !== r.id); changed(ctx); close(); draw(); sfx('del'); } }, 'Supprimer la ligne') : null,
    );
  });
}
function budgetSheet(b, ctx, draw) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Budget'),
    h('input', { class: 'input', value: b.title || '', placeholder: 'Titre', oninput: (e) => { b.title = e.target.value; } }),
    h('div', { class: 'chips' }, Object.entries(KIND).map(([k, v]) => h('button', { class: 'chip', 'aria-pressed': String(b.kind === k), onclick: (e) => { b.kind = k; e.target.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === e.target))); } }, v.n))),
    h('button', { class: 'btn primary lg block', onclick: () => { changed(ctx); close(); draw(); } }, 'Enregistrer'),
  ));
}
function summary(b, ctx) {
  const blocks = ctx.note.blocks.filter((x) => x.t === 'budget');
  const ins = blocks.filter((x) => x.kind === 'in').reduce((s, x) => s + total(x), 0);
  const outs = blocks.filter((x) => x.kind === 'out').reduce((s, x) => s + total(x), 0);
  const left = ins - outs;
  return h('div', { class: 'sp sum' },
    h('div', { class: 'sp-head' }, h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, 'Chaque mois'), h('div', { class: 'sp-s' }, 'Calculé avec tes entrées et tes sorties')), moreBtn(() => ctx.menu())),
    h('div', { class: 'sumrow' },
      h('div', { class: 'scell c-green' }, h('span', null, 'Entrées'), h('b', { class: 'num' }, chf(ins))),
      h('div', { class: 'sop' }, '−'),
      h('div', { class: 'scell c-red' }, h('span', null, 'Sorties'), h('b', { class: 'num' }, chf(outs))),
      h('div', { class: 'sop eq' }, '='),
      h('div', { class: 'scell big ' + (left >= 0 ? 'c-green' : 'c-red') }, h('span', null, 'Il te reste'), h('b', { class: 'num' }, chf(left)))),
  );
}
