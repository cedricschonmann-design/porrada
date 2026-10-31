// Accueil : « Aujourd'hui » (ta journée, tes suivis, tes échéances), puis tes carnets de notes.

import { state, save, addNote, addBook, removeBook, notesIn, noteById, bookById, dayIndex, daysUntil, fmtDate, todayKey, isIOS, isStandalone } from './store.js';
import { h, fill, ICON, sheet, ask, toast, haptic, sfx, ago, norm, copyText } from './ui.js';
import { pic } from './pictos.js';
import { plain, fillRich } from './rich.js';
import { openNote, pictoSheet, dots } from './editor.js';
import { weekItemRow, trackInput, trackStatus, total, chf } from './special.js';
import { openSettings, transfer } from './settings.js';

let query = '';
const ic = (name) => h('span', { html: pic(name), style: { display: 'contents' } });

export function isTyping() {
  const a = document.activeElement;
  return !!(a && (a.isContentEditable || /INPUT|TEXTAREA/.test(a.tagName)));
}

export function render() {
  const results = h('div', { id: 'home-list' });
  const input = h('input', { class: 'input', id: 'search', type: 'search', placeholder: 'Rechercher dans tes notes', value: query, autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Rechercher' });
  input.addEventListener('input', () => { query = input.value; drawList(results); });
  drawList(results);
  return h('div', null,
    h('div', { class: 'top' },
      h('h1', null, 'Notes'),
      h('div', { class: 'acts' },
        h('button', { class: 'iconbtn grad', id: 'new-note', 'aria-label': 'Nouvelle note', html: ICON.edit, onclick: newNoteSheet }),
        h('button', { class: 'iconbtn', 'aria-label': 'Réglages', onclick: openSettings, html: ICON.gear }))),
    installBanner(),
    importCard(),
    backupCard(),
    todayCard(),
    h('div', { class: 'searchbar', style: { marginTop: '14px' } }, ic('search'), input),
    results,
  );
}

function installBanner() {
  if (!isIOS || isStandalone) return null;
  return h('div', { class: 'card tint stack', style: { marginBottom: '14px' }, id: 'install-banner' },
    h('div', { class: 'hstack' }, h('span', { class: 'ntile sm c-violet', html: ICON.share }), h('div', { class: 'grow' }, h('h3', null, 'Installe l’appli'), h('div', { class: 'small muted' }, 'Partager › « Sur l’écran d’accueil », puis ouvre Notes depuis l’icône : tes notes y restent.'))));
}

// Premier lancement : importer ses notes avec un code de transfert
function importCard() {
  if (state.settings.hideImport || state.notes.length > 1) return null;
  return h('div', { class: 'card tint stack', style: { marginBottom: '14px' }, id: 'import-card' },
    h('div', { class: 'hstack' }, h('span', { class: 'ntile sm c-violet', html: pic('download') }), h('div', { class: 'grow' }, h('h3', null, 'Importer tes notes'), h('div', { class: 'small muted' }, 'Colle le code de transfert que tu as reçu : tes carnets et tes notes arrivent d’un coup.'))),
    h('div', { class: 'btns two' },
      h('button', { class: 'btn primary', id: 'import-start', onclick: transfer }, 'Coller mon code'),
      h('button', { class: 'btn', onclick: () => { state.settings.hideImport = true; save(); } }, 'Plus tard')));
}

// Rappel de sauvegarde : tes notes ne doivent dépendre d'un seul endroit.
function backupCard() {
  const last = state.settings.lastBackup;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (state.notes.length <= 1 || (days !== null && days < 14)) return null;
  return h('button', { class: 'card backup-card', id: 'backup-card', onclick: openSettings },
    h('span', { class: 'bk-t' }, days === null ? 'Sauvegarde pas encore faite' : `Dernière sauvegarde il y a ${days} jours`),
    h('span', { class: 'bk-s' }, 'Réglages › Sauvegarder mes notes'));
}

// ---------- Aujourd'hui ----------
function todayCard() {
  const d = dayIndex();
  const notes = [...state.notes].sort((a, b) => b.pinned - a.pinned);
  const wk = notes.map((n) => ({ n, b: n.blocks.find((x) => x.t === 'week') })).find((x) => x.b);
  const tr = notes.map((n) => ({ n, b: n.blocks.find((x) => x.t === 'track') })).find((x) => x.b);
  const deadlines = [];
  for (const n of state.notes) for (const b of n.blocks) if (b.t === 'todo' && b.date && !b.done) deadlines.push({ n, b, d: daysUntil(b.date) });
  deadlines.sort((a, b) => a.d - b.d);
  const quick = [];
  for (const n of state.notes) for (const b of n.blocks) if (b.t === 'call' && b.qa) quick.push({ n, b });

  const items = h('div', { class: 'witems' });
  const drawItems = () => fill(items, wk && wk.b.days[d].length
    ? wk.b.days[d].map((it) => weekItemRow(wk.b, it, { onToggle: () => { wk.n.updatedAt = Date.now(); save(); } }))
    : h('p', { class: 'muted small' }, wk ? 'Rien de prévu aujourd’hui.' : 'Ajoute un bloc « Semaine » dans une note pour voir ta journée ici.'));
  drawItems();
  const dateLabel = new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  return h('section', { class: 'card today', id: 'today' },
    h('button', { class: 'today-h', onclick: () => wk && openNote(wk.n.id) },
      h('div', { class: 'grow' }, h('div', { class: 'td-k' }, 'Aujourd’hui'), h('div', { class: 'td-d' }, dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1))),
      wk ? h('span', { class: 'chev', html: ICON.chev }) : null),
    items,
    tr && tr.b.items.length ? h('div', { class: 'td-track' }, tr.b.items.map((it) => {
      const dot = h('i', { class: 'tdot' });
      const paint = (v) => { const s = trackStatus(it, v); dot.className = 'tdot ' + (s === null ? '' : s ? 'ok' : 'no'); };
      const input = trackInput(it, { note: tr.n }, paint);
      paint(input.value);
      return h('label', { class: 'tmini' }, h('span', { class: 'tn' }, dot, it.n), h('span', { class: 'tg' }, `${it.op === '<' ? '<' : it.op === '>' ? '>' : ''} ${it.goal.toLocaleString('fr-CH')} ${it.u}`), input);
    })) : null,
    deadlines.length ? h('div', { class: 'td-due' }, deadlines.slice(0, 3).map(({ n, b, d: dd }) => h('button', { class: 'due-row', onclick: () => openNote(n.id) },
      h('span', { class: 'due ' + (dd < 0 ? 'late' : dd <= 14 ? 'soon' : dd <= 45 ? 'mid' : 'far') }, h('b', null, dd < 0 ? `${-dd} j de retard` : dd === 0 ? 'aujourd’hui' : `J-${dd}`)),
      h('span', { class: 'grow ellipsis' }, plain(b.h)),
      h('span', { class: 'tiny muted' }, fmtDate(b.date))))) : null,
    quick.map(({ b }) => h('button', { class: 'td-quick cc-' + (b.c || 'violet'), onclick: async () => { const ok = await copyText(plain(b.h).replace(/^.*?:\s*/, '')); toast(ok ? 'Copié.' : 'Copie impossible.', { ok }); } },
      h('span', { class: 'cicon', html: pic(b.i || 'info') }), fillRich(h('span', { class: 'grow' }), b.h), h('span', { class: 'tiny muted' }, 'copier'))),
  );
}

// ---------- Liste des notes ----------
function noteCard(n, i = 0) {
  const todos = n.blocks.filter((b) => b.t === 'todo');
  const done = todos.filter((b) => b.done).length;
  const firstText = n.blocks.find((b) => ['p', 'bul', 'num', 'call', 'h2', 'h3'].includes(b.t) && plain(b.h).trim());
  let metaEl = null;
  if (n.blocks.some((b) => b.t === 'week')) {
    const wk = n.blocks.find((b) => b.t === 'week');
    metaEl = h('span', null, `${wk.days[dayIndex()].length} prévu${wk.days[dayIndex()].length > 1 ? 's' : ''} aujourd’hui`);
  } else if (n.blocks.some((b) => b.t === 'work')) {
    const w = n.blocks.find((b) => b.t === 'work');
    metaEl = h('span', null, `${w.rows.length} exercices`);
  } else if (n.blocks.some((b) => b.t === 'budget' && (b.kind === 'in' || b.kind === 'out'))) {
    const left = n.blocks.filter((b) => b.t === 'budget' && b.kind === 'in').reduce((s, b) => s + total(b), 0) - n.blocks.filter((b) => b.t === 'budget' && b.kind === 'out').reduce((s, b) => s + total(b), 0);
    metaEl = h('span', null, `Reste ${chf(left)} par mois`);
  } else if (todos.length) {
    metaEl = h('span', { class: 'mprog' }, h('span', { class: 'hbar' }, h('i', { style: { width: `${Math.round((done / todos.length) * 100)}%` } })), h('span', { class: 'num' }, `${done}/${todos.length}`));
  } else if (firstText) {
    metaEl = h('span', { class: 'ellipsis' }, plain(firstText.h));
  }
  return h('button', { class: 'ncard', 'data-note': n.id, style: { animationDelay: `${Math.min(i, 12) * 28}ms` }, onclick: () => openNote(n.id) },
    h('span', { class: 'ntile c-' + (n.color || 'violet'), html: pic(n.icon || 'note') }),
    h('span', { class: 'nc-t' }, n.title || 'Sans titre'),
    h('span', { class: 'nc-m' }, metaEl),
    n.pinned ? h('span', { class: 'nc-pin', html: pic('pin') }) : null,
  );
}

function drawList(el) {
  const q = norm(query.trim());
  if (q) {
    const hits = state.notes.map((n) => {
      const texts = n.blocks.map((b) => plain(b.h || '') + ' ' + (b.sub || '') + (b.days ? b.days.flat().map((x) => x.x).join(' ') : '') + (b.rows ? b.rows.map((r) => r.n).join(' ') : ''));
      const inTitle = norm(n.title).includes(q);
      const hit = texts.find((t) => norm(t).includes(q));
      return inTitle || hit ? { n, hit } : null;
    }).filter(Boolean);
    fill(el, hits.length ? h('div', { class: 'rows', style: { marginTop: '14px' } }, hits.map(({ n, hit }) => h('button', { class: 'rowc', onclick: () => openNote(n.id) },
      h('span', { class: 'ntile sm c-' + n.color, html: pic(n.icon) }),
      h('div', { class: 'grow' }, h('div', { class: 't ellipsis' }, n.title), hit ? h('div', { class: 's ellipsis' }, hit.trim()) : null),
      h('span', { class: 'chev', html: ICON.chev })))) : h('p', { class: 'muted center', style: { marginTop: '28px' } }, 'Aucun résultat.'));
    return;
  }
  const pinned = state.notes.filter((n) => n.pinned).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  fill(el,
    pinned.length ? [h('div', { class: 'section-head section' }, h('h3', null, 'Épinglées')), h('div', { class: 'ngrid' }, pinned.map(noteCard))] : null,
    state.books.map((bk) => {
      const list = notesIn(bk.id).filter((n) => !n.pinned);
      const all = notesIn(bk.id).length;
      return [
        h('div', { class: 'section-head section bookhead' },
          h('button', { class: 'bk', 'data-book': bk.id, onclick: () => bookMenu(bk) }, h('span', { class: 'ntile xs c-' + bk.color, html: pic(bk.icon) }), h('h3', null, bk.name), h('span', { class: 'small muted' }, all)),
          h('button', { class: 'iconbtn sm', 'aria-label': `Nouvelle note dans ${bk.name}`, html: ICON.plus, onclick: () => createIn(bk.id) })),
        list.length ? h('div', { class: 'ngrid' }, list.map(noteCard)) : h('p', { class: 'muted small', style: { margin: '0 4px' } }, all ? 'Ses notes sont épinglées plus haut.' : 'Vide pour l’instant.'),
      ];
    }),
    h('button', { class: 'btn block', id: 'new-book', style: { marginTop: '22px' }, onclick: newBookSheet }, ic('folder'), 'Nouveau carnet'),
  );
}

function createIn(bookId) {
  const n = addNote(bookId, { color: (bookById(bookId) || {}).color || 'violet', icon: 'note' });
  openNote(n.id, { focusTitle: true });
}
function newNoteSheet() {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Nouvelle note'),
    h('p', { class: 'muted small' }, 'Dans quel carnet ?'),
    h('div', { class: 'rows' }, state.books.map((bk) => h('button', { class: 'rowc', 'data-new-in': bk.id, onclick: () => { close({ instant: true }); createIn(bk.id); } },
      h('span', { class: 'ntile sm c-' + bk.color, html: pic(bk.icon) }), h('div', { class: 'grow t' }, bk.name), h('span', { class: 'chev', html: ICON.chev })))),
  ));
}
function newBookSheet() {
  let color = 'blue'; let icon = 'folder';
  let input = null;
  sheet((close) => {
    input = h('input', { class: 'input', id: 'book-name', placeholder: 'Nom du carnet', autocomplete: 'off', enterkeyhint: 'done', maxlength: '30' });
    const prev = h('span', { class: 'ntile c-' + color, html: pic(icon) });
    const ok = () => { const v = input.value.trim(); if (!v) { input.focus(); return; } addBook(v, icon, color); close(); sfx('success'); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    return h('div', { class: 'stack' },
      h('h2', null, 'Nouveau carnet'),
      h('div', { class: 'hstack' }, h('button', { class: 'plain-btn', 'aria-label': 'Choisir le picto', onclick: () => pictoSheet((id, c) => { icon = id; if (c !== 'ink') color = c; prev.className = 'ntile c-' + color; prev.innerHTML = pic(icon); }, color) }, prev), input),
      dots(color, (c) => { color = c; prev.className = 'ntile c-' + color; }),
      h('button', { class: 'btn primary lg block', id: 'book-save', onclick: ok }, 'Créer'),
    );
  });
  if (input) input.focus({ preventScroll: true });
}
function bookMenu(bk) {
  sheet((close) => {
    const input = h('input', { class: 'input', value: bk.name, maxlength: '30', autocomplete: 'off', oninput: (e) => { bk.name = e.target.value; } });
    return h('div', { class: 'stack' },
      h('h2', null, 'Carnet'),
      h('div', { class: 'hstack' }, h('button', { class: 'plain-btn', 'aria-label': 'Changer le picto', onclick: () => { close({ instant: true }); pictoSheet((id, c) => { bk.icon = id; if (c !== 'ink') bk.color = c; save(); }, bk.color); } }, h('span', { class: 'ntile c-' + bk.color, html: pic(bk.icon) })), input),
      dots(bk.color, (c) => { bk.color = c; save(); close(); }),
      h('button', { class: 'btn primary block', onclick: () => { if (!bk.name.trim()) bk.name = 'Carnet'; save(); close(); } }, 'Enregistrer'),
      state.books.length > 1 ? h('button', { class: 'btn danger block', onclick: async () => {
        close({ instant: true });
        if (await ask(`Supprimer le carnet « ${bk.name} » ?`, 'Ses notes ne sont pas effacées : elles vont dans un autre carnet.', 'Supprimer', { danger: true })) { removeBook(bk.id); toast('Carnet supprimé.'); }
      } }, 'Supprimer le carnet') : null,
    );
  });
}
