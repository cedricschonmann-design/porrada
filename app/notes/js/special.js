// Blocs outils : tableau, macros, semaine, séance de sport (charges par série), suivi du jour, budget, bilan.
// En lecture, on s'en sert (cocher, noter une charge, un chiffre). En mode « Modifier », on change leur contenu.

import { state, save, saveQuiet, rid, todayKey, dayIndex, weekKey, fmtDate, noteById, touch } from './store.js';
import { h, fill, ICON, sheet, haptic, sfx, toast, ask } from './ui.js';
import { pic } from './pictos.js';
import { clean, fillRich, plain } from './rich.js';

export const SPECIAL = ['table', 'macros', 'week', 'work', 'track', 'budget', 'sum'];
export const SPECIAL_NAME = { table: 'Tableau', macros: 'Macros', week: 'Semaine', work: 'Séance', track: 'Suivi du jour', budget: 'Budget', sum: 'Bilan' };
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
  if (t === 'table') return { t, cols: ['', ''], rows: [['', ''], ['', '']], foot: false };
  if (t === 'macros') return { t, items: [{ id: rid(), n: 'Ma journée', p: 150, g: 250, l: 60 }] };
  if (t === 'week') return { t, days: [[], [], [], [], [], [], []], done: {} };
  if (t === 'work') return { t, rows: [{ id: rid(), b: 'A1', n: 'Exercice', s: 3, r: '8', rpe: '8', tp: '', rest: '90 s', k: 'force', g: null, unit: 'kg' }], log: {} };
  if (t === 'track') return { t, items: [{ id: rid(), n: 'Calories', op: '<', goal: 2000, u: 'kcal', hist: {} }] };
  if (t === 'budget') return { t, title: 'Budget', kind: 'out', rows: [] };
  return { t };
}

// ctx : { note, editing, flat }
export function renderSpecial(b, ctx) {
  if (b.t === 'table') return table(b, ctx);
  if (b.t === 'macros') return macros(b, ctx);
  if (b.t === 'week') return week(b, ctx);
  if (b.t === 'work') return work(b, ctx);
  if (b.t === 'track') return track(b, ctx);
  if (b.t === 'budget') return budget(b, ctx);
  if (b.t === 'sum') return summary(b, ctx);
  return h('div');
}
const changed = (ctx) => { touch(ctx.note); save(); };
const open = (id) => import('./editor.js').then((m) => m.openNote(id));
const head = (title, sub, ...right) => h('div', { class: 'sp-head' }, h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, title), sub ? h('div', { class: 'sp-s' }, sub) : null), ...right);
const addBtn = (label, onclick, id = null) => h('button', { class: 'wadd', id, onclick }, ic('plus'), label);
const fmtN = (x) => Math.round(x).toLocaleString('fr-CH');

// ======================= TABLEAU =======================
// Des chiffres et des unités seulement (« 2 500 kcal », « 580 · 30 g », « 1 ½ tortilla »)
const NUMCELL = /^[≈~<>+\-−]?\s*\d[\d\s\u202f\u00a0,.'’½]*\s*(kcal|kg|g|ml|l|min|s|%|chf|gluc\.?|prot\.?|tortillas?)?(\s*·\s*\d[\d\s,.]*\s*(kcal|kg|g|%)?)?$/i;
// Colonne de chiffres courts (kcal, grammes, prix) : alignée à droite. Les phrases restent à gauche.
function numCol(rows, j) {
  let n = 0; let k = 0;
  for (const r of rows) {
    const v = plain(r[j] || '').trim();
    if (!v || v === '—') continue;
    k += 1;
    if (v.split('\n').every((line) => NUMCELL.test(line.trim()))) n += 1;
  }
  return k > 0 && n / k >= 0.6;
}
function table(b, ctx) {
  const wrap = h('div', { class: 'sp tblock' });
  const draw = (focus = null) => {
    b.cols = b.cols && b.cols.length ? b.cols : ['', ''];
    b.rows = b.rows || [];
    const nc = b.cols.length;
    b.rows.forEach((r) => { while (r.length < nc) r.push(''); });
    const nums = b.cols.map((_, j) => numCol(b.rows, j));
    const cells = [];
    const cell = (tag, html, set, j) => {
      const td = h(tag, { class: nums[j] ? 'r' : null });
      if (ctx.editing) {
        const ed = h('div', { class: 'cell', contenteditable: 'true', spellcheck: 'true', 'data-ph': tag === 'th' ? 'Titre' : '' });
        fillRich(ed, html || '');
        ed.addEventListener('input', () => { set(clean(ed.innerHTML)); touch(ctx.note); saveQuiet(); });
        ed.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const nx = cells[cells.indexOf(ed) + 1];
          if (nx) nx.focus(); else ed.blur();
        });
        cells.push(ed);
        td.append(ed);
      } else fillRich(td, html || '');
      return td;
    };
    const ctl = (label, fn) => h('td', { class: 'tctl' }, h('button', { class: 'tmore', 'aria-label': label, html: ICON.more, onclick: fn }));
    const showHead = ctx.editing || b.cols.some((c) => plain(c).trim());
    const thead = showHead ? h('thead', null, h('tr', null, b.cols.map((c, j) => cell('th', c, (v) => { b.cols[j] = v; }, j)),
      ctx.editing ? h('th', { class: 'tctl' }, h('button', { class: 'tmore', 'aria-label': 'Colonnes', html: ICON.more, onclick: () => colSheet(b, ctx, draw) })) : null)) : null;
    const tbody = h('tbody', null, b.rows.map((r, i) => h('tr', { class: b.foot && i === b.rows.length - 1 ? 'foot' : null },
      b.cols.map((_, j) => cell('td', r[j], (v) => { r[j] = v; }, j)),
      ctx.editing ? ctl(`Ligne ${i + 1}`, () => rowMenu(b, i, ctx, draw)) : null)));
    fill(wrap,
      h('div', { class: 'tscroll' }, h('table', { class: 'tbl' + (nc > 3 ? ' dense' : '') }, thead, tbody)),
      ctx.editing ? h('div', { class: 'tadd' },
        addBtn('Ligne', () => { b.rows.push(Array(nc).fill('')); changed(ctx); draw({ row: b.rows.length - 1 }); }, 'tbl-add-row'),
        addBtn('Colonne', () => { b.cols.push(''); b.rows.forEach((r) => r.push('')); changed(ctx); draw(); }, 'tbl-add-col')) : null,
    );
    if (focus && ctx.editing) {
      const first = cells[(showHead ? nc : 0) + focus.row * nc];
      if (first) first.focus();
    }
  };
  draw();
  return wrap;
}
function rowMenu(b, i, ctx, draw) {
  const last = i === b.rows.length - 1;
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, `Ligne ${i + 1}`),
    h('div', { class: 'group noicon' },
      h('button', { class: 'item', onclick: () => { b.rows.splice(i + 1, 0, Array(b.cols.length).fill('')); changed(ctx); close(); draw({ row: i + 1 }); } }, h('div', { class: 'grow t' }, 'Insérer une ligne dessous')),
      i > 0 ? h('button', { class: 'item', onclick: () => { const [r] = b.rows.splice(i, 1); b.rows.splice(i - 1, 0, r); changed(ctx); close(); draw(); } }, h('div', { class: 'grow t' }, 'Monter')) : null,
      !last ? h('button', { class: 'item', onclick: () => { const [r] = b.rows.splice(i, 1); b.rows.splice(i + 1, 0, r); changed(ctx); close(); draw(); } }, h('div', { class: 'grow t' }, 'Descendre')) : null,
      h('button', { class: 'item', onclick: () => { b.rows.splice(i + 1, 0, [...b.rows[i]]); changed(ctx); close(); draw(); } }, h('div', { class: 'grow t' }, 'Dupliquer')),
      last ? h('div', { class: 'item' }, h('div', { class: 'grow t' }, 'Ligne de total en gras'), toggleSw(!!b.foot, (v) => { b.foot = v; changed(ctx); draw(); })) : null,
      h('button', { class: 'item danger', onclick: () => { const [r] = b.rows.splice(i, 1); changed(ctx); close(); draw(); sfx('del'); toast('Ligne supprimée.', { action: { label: 'Annuler', fn: () => { b.rows.splice(i, 0, r); changed(ctx); draw(); } } }); } }, h('div', { class: 'grow t' }, 'Supprimer la ligne')),
    ),
  ));
}
function colSheet(b, ctx, draw) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Colonnes'),
    h('div', { class: 'group noicon' }, b.cols.map((c, j) => h('div', { class: 'item' },
      h('div', { class: 'grow t' }, plain(c).trim() || `Colonne ${j + 1}`),
      j > 0 ? h('button', { class: 'iconbtn sm', 'aria-label': 'Vers la gauche', html: pic('arrow-left'), onclick: () => { const sw = (a) => { [a[j - 1], a[j]] = [a[j], a[j - 1]]; }; sw(b.cols); b.rows.forEach(sw); changed(ctx); close(); draw(); } }) : null,
      b.cols.length > 1 ? h('button', { class: 'iconbtn sm', 'aria-label': 'Supprimer la colonne', html: ICON.trash, onclick: () => { b.cols.splice(j, 1); b.rows.forEach((r) => r.splice(j, 1)); changed(ctx); close(); draw(); sfx('del'); } }) : null))),
    h('button', { class: 'btn block', onclick: () => { b.cols.push(''); b.rows.forEach((r) => r.push('')); changed(ctx); close(); draw(); } }, ic('plus'), 'Ajouter une colonne'),
  ));
}
function toggleSw(on, onChange) {
  const el = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(on) });
  el.addEventListener('click', () => { on = !on; el.setAttribute('aria-checked', String(on)); onChange(on); });
  return el;
}

// ======================= MACROS =======================
const MAC = [['p', 'Protéines', 4], ['g', 'Glucides', 4], ['l', 'Lipides', 9]];
export const kcalOf = (it) => MAC.reduce((s, [k, , f]) => s + (Number(it[k]) || 0) * f, 0);
function macros(b, ctx) {
  const el = h('div', { class: 'sp macros' });
  const draw = () => {
    b.items = b.items || [];
    fill(el,
      b.items.map((it) => {
        const k = kcalOf(it);
        const parts = MAC.map(([key, n, f]) => { const g = Number(it[key]) || 0; return { key, n, g, pc: k ? Math.round((g * f * 100) / k) : 0 }; });
        return h(ctx.editing ? 'button' : 'div', { class: 'mac', onclick: ctx.editing ? () => macSheet(b, it, ctx, draw) : null },
          h('div', { class: 'mac-h' }, h('span', { class: 'mac-n' }, it.n), h('span', { class: 'mac-k num' }, `≈ ${fmtN(Math.round(k / 50) * 50)} kcal`), ctx.editing ? h('span', { class: 'mac-e', html: pic('edit') }) : null),
          h('div', { class: 'mac-bar' }, parts.map((p) => h('i', { class: 'm-' + p.key, style: { width: p.pc + '%' } }))),
          h('div', { class: 'mac-l' }, parts.map((p) => h('span', null, h('i', { class: 'm-' + p.key }), p.n + ' ', h('b', { class: 'num' }, `${fmtN(p.g)} g`), h('span', { class: 'muted num' }, ` · ${p.pc} %`)))));
      }),
      ctx.editing ? addBtn('Ajouter une ligne', () => macSheet(b, null, ctx, draw), 'mac-add') : null,
    );
  };
  draw();
  return el;
}
function macSheet(b, item, ctx, draw) {
  const it = item ? { ...item } : { id: rid(), n: '', p: '', g: '', l: '' };
  sheet((close) => {
    const num = (label, key) => h('label', { class: 'field' }, h('span', null, label), h('input', { class: 'input', inputmode: 'decimal', value: it[key] ?? '', placeholder: '0', oninput: (e) => { it[key] = Number(e.target.value.replace(',', '.')) || 0; } }));
    return h('div', { class: 'stack' },
      h('h2', null, item ? 'Modifier' : 'Nouvelle ligne'),
      h('label', { class: 'field' }, h('span', null, 'Nom'), h('input', { class: 'input', value: it.n, placeholder: 'Ex. Sèche', oninput: (e) => { it.n = e.target.value; } })),
      h('div', { class: 'btns three' }, num('Protéines (g)', 'p'), num('Glucides (g)', 'g'), num('Lipides (g)', 'l')),
      h('p', { class: 'tiny muted' }, 'Les calories et les pourcentages se calculent tout seuls.'),
      h('button', { class: 'btn primary lg block', onclick: () => { if (!String(it.n).trim()) it.n = 'Sans nom'; const i = b.items.findIndex((x) => x.id === it.id); if (i >= 0) b.items[i] = it; else b.items.push(it); changed(ctx); close(); draw(); } }, 'Enregistrer'),
      item ? h('button', { class: 'btn danger block', onclick: () => { b.items = b.items.filter((x) => x.id !== it.id); changed(ctx); close(); draw(); sfx('del'); } }, 'Retirer cette ligne') : null,
    );
  });
}

// ======================= SEMAINE =======================
export function weekDone(b) {
  const wk = weekKey();
  b.done = b.done || {};
  for (const k of Object.keys(b.done)) if (k < wk) delete b.done[k];
  return (b.done[wk] = b.done[wk] || []);
}
let justDone = null;
export function toggleWeekItem(b, id) {
  const done = weekDone(b);
  const i = done.indexOf(id);
  if (i >= 0) done.splice(i, 1); else { done.push(id); sfx('pop'); justDone = id; setTimeout(() => { if (justDone === id) justDone = null; }, 600); }
  haptic('light');
}
export function weekItemRow(b, item, { onToggle, onEdit = null } = {}) {
  const cat = CATS[item.c] || CATS.autre;
  const isDone = weekDone(b).includes(item.id);
  const linked = item.link && noteById(item.link);
  return h('div', { class: 'witem' + (isDone ? ' done' : '') + (isDone && justDone === item.id ? ' just' : ''), 'data-item': item.id },
    h('button', { class: 'wmain', onclick: () => { toggleWeekItem(b, item.id); onToggle(); } },
      h('span', { class: 'wbox', html: ICON.check }),
      h('span', { class: `wic c-${cat.c}`, html: pic(cat.i) }),
      h('span', { class: 'wx' }, item.x)),
    linked ? h('button', { class: 'wlink', 'aria-label': `Ouvrir ${linked.title}`, html: pic('arrow-up-right'), onclick: () => open(item.link) }) : null,
    onEdit ? h('button', { class: 'wedit', 'aria-label': 'Modifier', html: pic('edit'), onclick: onEdit }) : null,
  );
}

function week(b, ctx) {
  const el = h('div', { class: 'sp week' });
  const draw = () => {
    const today = dayIndex();
    const mon = new Date(); mon.setDate(mon.getDate() - today);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const range = `Du ${mon.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })} au ${sun.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })} · les cases se vident chaque lundi`;
    fill(el,
      head('Cette semaine', range),
      h('div', { class: 'wdays' }, b.days.map((items, d) => {
        const done = weekDone(b).filter((id) => items.some((x) => x.id === id)).length;
        const date = new Date(mon); date.setDate(mon.getDate() + d);
        return h('div', { class: 'wday' + (d === today ? ' today' : '') + (d < today ? ' past' : ''), 'data-day': d },
          h('div', { class: 'wd-h' },
            h('span', { class: 'wd-n' }, DAYS[d].slice(0, 3)),
            h('span', { class: 'wd-d num' }, date.getDate()),
            items.length ? h('span', { class: 'wd-c num' + (done === items.length ? ' full' : '') }, `${done}/${items.length}`) : null),
          h('div', { class: 'witems' },
            items.length ? items.map((it) => weekItemRow(b, it, { onToggle: () => { changed(ctx); draw(); }, onEdit: ctx.editing ? () => itemSheet(b, d, it, () => { changed(ctx); draw(); }) : null })) : (ctx.editing ? null : h('div', { class: 'wempty' }, 'Libre')),
            ctx.editing ? h('button', { class: 'wadd sm', 'data-add-day': d, onclick: () => itemSheet(b, d, null, () => { changed(ctx); draw(); }) }, ic('plus'), 'Ajouter') : null));
      })),
    );
  };
  draw();
  return el;
}

function itemSheet(b, day, item, after) {
  const it = item ? { ...item } : { id: rid(), c: 'etudes', x: '', link: null };
  let catsEl = null; let linkEl = null;
  sheet((close) => {
    const input = h('input', { class: 'input', id: 'witem-text', value: it.x, placeholder: 'Ex. Révisions de chimie', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done' });
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
      h('div', { class: 'list-head' }, 'Note liée (ouverte avec la flèche)'), linkEl,
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
      head(`Séance du ${new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}`,
        last ? `En gris : tes charges du ${fmtDate(last, { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Note tes charges : elles serviront de repère la prochaine fois',
        dates.length ? h('button', { class: 'btn sm ghost', id: 'work-history', onclick: () => history(b, ctx, draw) }, 'Historique') : null),
      groups.map((gp) => {
        const G = gp.g && WGROUP[gp.g];
        const rows = gp.rows.map((r) => exRow(b, r, today, ctx, draw));
        if (!G) return rows;
        const label = gp.g === 'circuit' ? `${G.n} ${gp.rows[0].b} → ${gp.rows[gp.rows.length - 1].b}` : `${G.n} ${gp.rows.map((x) => x.b).join(' + ')}`;
        return h('div', { class: `wgroup g-${G.c}` }, h('div', { class: 'wg-h' }, ic(gp.g === 'circuit' ? 'repeat' : 'arrows-lr'), label), rows);
      }),
      ctx.editing ? addBtn('Ajouter un exercice', () => exSheet(b, null, ctx, draw), 'ex-add') : null,
    );
  };
  draw();
  return el;
}
function exRow(b, r, today, ctx, draw) {
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
      const all = Array.from(document.querySelectorAll('#layer .page:last-child .load'));
      const nx = all[all.indexOf(input) + 1];
      if (nx) nx.focus(); else input.blur();
    });
    sets.push(h('label', { class: 'set' }, h('span', { class: 'sl' }, `${isNote ? 'R' : 'S'}${i + 1}`), input, isNote ? null : h('span', { class: 'su' }, 'kg')));
  }
  const meta = [r.tp && r.tp !== '—' ? `tempo ${r.tp}` : null, r.rest ? `repos ${r.rest}` : null].filter(Boolean).join(' · ');
  return h('div', { class: `ex k-${k.c}`, 'data-ex': r.b },
    h('div', { class: 'ex-h' },
      h('span', { class: 'exb' }, r.b),
      h('span', { class: 'exn' }, r.n),
      h('span', { class: 'exr num' }, `${r.s} × ${r.r}${r.rpe ? ` · RPE ${r.rpe}` : ''}`),
      ctx.editing ? h('button', { class: 'iconbtn sm', 'aria-label': `Modifier ${r.n}`, html: pic('edit'), onclick: () => exSheet(b, r, ctx, draw) }) : null),
    meta ? h('div', { class: 'ex-m' }, h('i', { class: `sw c-${k.c}` }), k.n + ' · ' + meta) : null,
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
      h('div', { class: 'btns two' }, f('Repère', 'b', 'A1'), f('Séries', 's', '3', 'numeric')),
      f('Exercice', 'n', 'Ex. Squat'),
      h('div', { class: 'btns two' }, f('Répétitions', 'r', '8'), f('RPE', 'rpe', '8')),
      h('div', { class: 'btns two' }, f('Tempo', 'tp', '3-0-1-0'), f('Repos', 'rest', '90 s')),
      h('div', { class: 'list-head' }, 'Type'), chips(Object.entries(KCAT).map(([k, v]) => [k, v.n, v.c]), 'k'),
      h('div', { class: 'list-head' }, 'Enchaînement'), chips([[null, 'Seul', null], ['circuit', 'Circuit', 'violet'], ['ss1', 'Superset 1', 'orange'], ['ss2', 'Superset 2', 'pink']], 'g'),
      h('div', { class: 'list-head' }, 'À noter à chaque série'),
      chips([['kg', 'Charge en kg', null], ['note', 'Une note (cardio)', null]], 'unit'),
      h('button', { class: 'btn primary lg block', onclick: () => {
        r.s = Math.max(1, Math.min(10, Number(r.s) || 1));
        if (!r.n.trim()) { toast('Donne un nom à l’exercice.'); return; }
        const i = b.rows.findIndex((x) => x.id === r.id);
        if (i >= 0) b.rows[i] = r; else b.rows.push(r);
        changed(ctx); close(); draw();
      } }, 'Enregistrer'),
      row ? h('div', { class: 'btns two' },
        h('button', { class: 'btn', onclick: () => { const i = b.rows.findIndex((x) => x.id === r.id); if (i > 0) { const [x] = b.rows.splice(i, 1); b.rows.splice(i - 1, 0, x); changed(ctx); close(); draw(); } } }, ic('arrow-up'), 'Monter'),
        h('button', { class: 'btn danger', onclick: () => { b.rows = b.rows.filter((x) => x.id !== r.id); changed(ctx); close(); draw(); sfx('del'); } }, h('span', { html: ICON.trash, style: { display: 'contents' } }), 'Retirer'),
      ) : null,
    );
  });
}
function history(b, ctx, draw) {
  const dates = Object.keys(b.log || {}).filter((d) => Object.values(b.log[d]).some((a) => a.some(Boolean))).sort().reverse();
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Historique'),
    dates.length ? dates.map((d) => h('div', { class: 'win hist' },
      h('div', { class: 'win-h' }, h('span', { class: 'win-t sm' }, fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })),
        h('button', { class: 'link muted', onclick: async () => { close({ instant: true }); if (await ask('Effacer cette séance ?', null, 'Effacer', { danger: true })) { delete b.log[d]; changed(ctx); draw(); } } }, 'Effacer')),
      h('div', { class: 'win-b' }, b.rows.filter((r) => b.log[d][r.id] && b.log[d][r.id].some(Boolean)).map((r) => h('div', { class: 'kv' }, h('span', null, `${r.b} ${r.n}`), h('span', { class: 'num' }, b.log[d][r.id].filter(Boolean).join(' / ') + (r.unit === 'note' ? '' : ' kg'))))),
    )) : h('p', { class: 'muted' }, 'Pas encore de séance notée. Remplis les cases de charge pendant ta séance : elles sont gardées par date.'),
  ));
}

// ======================= SUIVI DU JOUR =======================
export function trackStatus(it, v) {
  if (v === '' || v == null || isNaN(Number(String(v).replace(',', '.')))) return null;
  const x = Number(String(v).replace(',', '.'));
  return it.op === '<' ? x <= it.goal : it.op === '>' ? x >= it.goal : x === it.goal;
}
export const goalText = (it) => `${it.op === '<' ? 'max.' : it.op === '>' ? 'min.' : ''} ${Number(it.goal || 0).toLocaleString('fr-CH')} ${it.u}`.trim();
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
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  return input;
}
function track(b, ctx) {
  const el = h('div', { class: 'sp track' });
  const draw = () => {
    const today = todayKey();
    fill(el,
      head('Aujourd’hui', 'La case se vide toute seule le lendemain'),
      b.items.map((it) => {
        const dot = h('i', { class: 'tdot' });
        const paint = (v) => { const s = trackStatus(it, v); dot.className = 'tdot ' + (s === null ? '' : s ? 'ok' : 'no'); };
        const input = trackInput(it, ctx, paint);
        paint(input.value);
        const prev = Object.keys(it.hist || {}).filter((d) => d < today).sort().reverse();
        const last7 = prev.slice(0, 7).map((d) => Number(String(it.hist[d]).replace(',', '.'))).filter((x) => !isNaN(x));
        const avg = last7.length ? Math.round(last7.reduce((s, x) => s + x, 0) / last7.length) : null;
        return h('div', { class: 'trow', 'data-tracker': it.n },
          h('div', { class: 'grow' },
            h('div', { class: 't' }, dot, it.n),
            h('div', { class: 's' }, `Objectif ${goalText(it)}${prev.length ? ` · hier ${it.hist[prev[0]] || '–'}` : ''}${avg !== null && last7.length > 1 ? ` · moy. 7 j ${avg.toLocaleString('fr-CH')}` : ''}`)),
          h('div', { class: 'tin' }, input, h('span', { class: 'tu' }, it.u)),
          ctx.editing ? h('button', { class: 'iconbtn sm', 'aria-label': `Modifier ${it.n}`, html: pic('edit'), onclick: () => trackSheet(b, it, ctx, draw) }) : null);
      }),
      ctx.editing ? addBtn('Ajouter un suivi', () => trackSheet(b, null, ctx, draw), 'track-add') : null,
    );
  };
  draw();
  return el;
}
function trackSheet(b, item, ctx, draw) {
  const it = item ? { ...item } : { id: rid(), n: '', op: '>', goal: 0, u: '', hist: {} };
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, item ? 'Modifier le suivi' : 'Nouveau suivi'),
    h('input', { class: 'input', value: it.n, placeholder: 'Ex. Sommeil, eau, pas', oninput: (e) => { it.n = e.target.value; } }),
    h('div', { class: 'chips' }, [['<', 'Au maximum'], ['>', 'Au minimum']].map(([o, l]) => h('button', { class: 'chip', 'aria-pressed': String(it.op === o), onclick: (e) => { it.op = o; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === e.currentTarget))); } }, l))),
    h('div', { class: 'btns two' },
      h('input', { class: 'input', inputmode: 'decimal', value: it.goal || '', placeholder: 'Objectif', oninput: (e) => { it.goal = Number(e.target.value.replace(',', '.')) || 0; } }),
      h('input', { class: 'input', value: it.u, placeholder: 'Unité (kcal, g, h…)', oninput: (e) => { it.u = e.target.value; } })),
    h('button', { class: 'btn primary lg block', onclick: () => { if (!it.n.trim()) return; const i = b.items.findIndex((x) => x.id === it.id); if (i >= 0) b.items[i] = it; else b.items.push(it); changed(ctx); close(); draw(); } }, 'Enregistrer'),
    item ? h('button', { class: 'btn danger block', onclick: () => { b.items = b.items.filter((x) => x.id !== it.id); changed(ctx); close(); draw(); } }, 'Retirer ce suivi') : null,
  ));
}

// ======================= BUDGET =======================
export const chf = (n) => `${Number(n || 0).toLocaleString('fr-CH', { maximumFractionDigits: 2 })}.–`;
export const total = (b) => (b.rows || []).reduce((s, r) => s + (Number(r.a) || 0), 0);
const KIND = { in: { i: 'trend-up', c: 'green', n: 'Entrées' }, out: { i: 'trend-down', c: 'red', n: 'Sorties' }, stock: { i: 'coins', c: 'yellow', n: 'Avoir' } };
function budget(b, ctx) {
  const el = h('div', { class: 'sp budget' });
  const draw = () => {
    const K = KIND[b.kind] || KIND.out;
    fill(el,
      h('div', { class: 'sp-head' },
        h('span', { class: `wic c-${K.c}`, html: pic(K.i) }),
        h('div', { class: 'grow' }, h('div', { class: 'sp-t' }, b.title || K.n)),
        h('div', { class: 'btot num' }, 'CHF ' + chf(total(b))),
        ctx.editing ? h('button', { class: 'iconbtn sm', id: 'budget-edit', 'aria-label': 'Renommer', html: pic('edit'), onclick: () => budgetSheet(b, ctx, draw) }) : null),
      h('div', { class: 'brows' },
        (b.rows || []).map((r) => h('div', { class: 'brow' + (r.done ? ' done' : '') },
          h('button', { class: 'box sm' + (r.done ? ' on' : ''), 'aria-label': r.done ? 'Décocher' : 'Cocher', 'data-silent': '', html: ICON.check, onclick: () => { r.done = !r.done; changed(ctx); draw(); haptic('light'); } }),
          h('button', { class: 'bmain', onclick: () => rowSheet(b, r, ctx, draw) },
            h('span', { class: 'grow' }, h('span', { class: 'bn' }, r.n), r.note ? h('span', { class: 'bnote' }, r.note) : null),
            h('span', { class: 'ba num' }, chf(r.a)))))),
      ctx.editing ? addBtn('Ajouter une ligne', () => rowSheet(b, null, ctx, draw), 'budget-add') : null,
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
    h('div', { class: 'chips' }, Object.entries(KIND).map(([k, v]) => h('button', { class: 'chip', 'aria-pressed': String(b.kind === k), onclick: (e) => { b.kind = k; e.currentTarget.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === e.currentTarget))); } }, v.n))),
    h('button', { class: 'btn primary lg block', onclick: () => { changed(ctx); close(); draw(); } }, 'Enregistrer'),
  ));
}
function summary(b, ctx) {
  const blocks = ctx.note.blocks.filter((x) => x.t === 'budget');
  const ins = blocks.filter((x) => x.kind === 'in').reduce((s, x) => s + total(x), 0);
  const outs = blocks.filter((x) => x.kind === 'out').reduce((s, x) => s + total(x), 0);
  const left = ins - outs;
  const pc = ins > 0 ? Math.max(0, Math.min(100, Math.round((outs / ins) * 100))) : 0;
  return h('div', { class: 'sp sum' },
    head('Chaque mois', 'Calculé avec tes entrées et tes sorties'),
    h('div', { class: 'sum-big' }, h('span', { class: 'sum-k' }, 'Il te reste'), h('b', { class: 'num ' + (left >= 0 ? 'pos' : 'neg') }, 'CHF ' + chf(left))),
    h('div', { class: 'sum-bar' }, h('i', { style: { width: pc + '%' } })),
    h('div', { class: 'sum-l' }, h('span', null, 'Entrées ', h('b', { class: 'num' }, chf(ins))), h('span', null, 'Sorties ', h('b', { class: 'num' }, chf(outs)), ` · ${pc} %`)),
  );
}
