// Accueil : ta journée (fenêtre « Aujourd'hui »), puis une fenêtre par carnet avec ses notes en lignes.

import { state, save, addNote, addBook, removeBook, notesIn, bookById, dayIndex, daysUntil, fmtDate, todayKey, isIOS, isStandalone, restoreCopy, releaseGuard } from './store.js';
import { h, fill, ICON, sheet, ask, toast, sfx, norm, copyText } from './ui.js';
import { pic } from './pictos.js';
import { plain, fillRich } from './rich.js';
import { openNote, pictoSheet, dots } from './editor.js';
import { weekItemRow, weekDone, trackInput, trackStatus, goalText, total, chf } from './special.js';
import { openSettings, transfer, backup } from './settings.js';

let query = '';
let lost = null; // copie automatique retrouvée au démarrage (si le stockage principal était vide)
export function setLost(copy) { lost = copy; }
const ic = (name) => h('span', { html: pic(name), style: { display: 'contents' } });
const stagger = (el, i) => { if (el) el.style.setProperty('--d', i); return el; };

export function isTyping() {
  const a = document.activeElement;
  return !!(a && (a.isContentEditable || /INPUT|TEXTAREA/.test(a.tagName)));
}

export function render() {
  const results = h('div', { id: 'home-list' });
  const input = h('input', { class: 'input', id: 'search', type: 'search', placeholder: 'Rechercher', value: query, autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Rechercher dans tes notes' });
  input.addEventListener('input', () => { query = input.value; drawList(results); });
  drawList(results);
  const date = new Date().toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  let k = 0;
  return h('div', null,
    h('div', { class: 'top' },
      h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, date), h('h1', null, 'Notes')),
      h('div', { class: 'acts' },
        h('button', { class: 'iconbtn accent', id: 'new-note', 'aria-label': 'Nouvelle note', html: ICON.plus, onclick: newNoteSheet }),
        h('button', { class: 'iconbtn', 'aria-label': 'Réglages', onclick: openSettings, html: ICON.gear }))),
    stagger(installBanner(), k++),
    stagger(recoverCard(), k++),
    stagger(importCard(), k++),
    stagger(backupCard(), k++),
    stagger(todayCard(), k++),
    h('div', { class: 'searchbar' }, ic('search'), input),
    results,
  );
}

const notice = (cls, id, title, text, ...btns) => h('div', { class: 'notice ' + cls, id },
  h('div', { class: 'grow' }, h('div', { class: 'nt-t' }, title), text ? h('div', { class: 'nt-s' }, text) : null),
  btns.length ? h('div', { class: 'nt-b' }, btns) : null);

function installBanner() {
  if (!isIOS || isStandalone) return null;
  return notice('info', 'install-banner', 'Installe l’appli', 'Partager › « Sur l’écran d’accueil », puis ouvre Notes depuis l’icône : tes notes y restent.');
}

function recoverCard() {
  if (!lost) return null;
  const when = new Date(lost.at).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  return notice('warn', 'recover-card', 'Tes notes ont été retrouvées', `Une copie automatique du ${when} contient ${lost.notes} notes.`,
    h('button', { class: 'btn sm primary', onclick: async () => { const c = lost; lost = null; try { await restoreCopy(c.key); toast('Notes restaurées.', { ok: true, sound: 'success' }); } catch (e) { toast(e.message || 'Restauration impossible.'); } } }, 'Restaurer'),
    h('button', { class: 'btn sm ghost', onclick: () => { lost = null; releaseGuard(); save(); } }, 'Ignorer'));
}

// Premier lancement : importer ses notes avec un code de transfert
function importCard() {
  if (state.settings.hideImport || state.notes.length > 1) return null;
  return notice('info', 'import-card', 'Importer tes notes', 'Copie ton code de transfert, puis touche « Coller mon code ».',
    h('button', { class: 'btn sm primary', id: 'import-start', onclick: transfer }, 'Coller mon code'),
    h('button', { class: 'btn sm ghost', onclick: () => { state.settings.hideImport = true; save(); } }, 'Plus tard'));
}

// Rappel : une sauvegarde hors du téléphone au moins chaque semaine.
function backupCard() {
  if (state.notes.length <= 1) return null;
  const last = state.settings.lastBackup;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (days !== null && days < 7) return null;
  return notice('warn', 'backup-card', days === null ? 'Aucune sauvegarde pour l’instant' : `Dernière sauvegarde il y a ${days} jours`,
    'Un fichier à garder dans Fichiers ou iCloud Drive, au cas où ton téléphone se perd.',
    h('button', { class: 'btn sm primary', id: 'backup-now', onclick: backup }, 'Sauvegarder'));
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

  const items = wk ? wk.b.days[d] : [];
  const done = wk ? weekDone(wk.b).filter((id) => items.some((x) => x.id === id)).length : 0;
  const count = h('span', { class: 'win-c num' + (items.length && done === items.length ? ' full' : '') }, items.length ? `${done}/${items.length}` : '');
  const bar = h('div', { class: 'seg-bar' });
  const list = h('div', { class: 'witems' });
  const drawItems = () => {
    const dn = wk ? weekDone(wk.b).filter((id) => items.some((x) => x.id === id)).length : 0;
    count.textContent = items.length ? `${dn}/${items.length}` : '';
    count.classList.toggle('full', !!items.length && dn === items.length);
    fill(bar, items.map((_, k) => h('i', { class: k < dn ? 'on' : null })));
    fill(list, items.length
      ? items.map((it) => weekItemRow(wk.b, it, { onToggle: () => { wk.n.updatedAt = Date.now(); save(); } }))
      : h('p', { class: 'muted small pad' }, wk ? 'Rien de prévu aujourd’hui.' : 'Ajoute un bloc « Semaine » dans une note pour voir ta journée ici.'));
  };
  drawItems();

  const parts = [];
  if (tr && tr.b.items.length) {
    parts.push(h('div', { class: 'win-part tlines' }, tr.b.items.map((it) => {
      const dot = h('i', { class: 'tdot' });
      const paint = (v) => { const s = trackStatus(it, v); dot.className = 'tdot ' + (s === null ? '' : s ? 'ok' : 'no'); };
      const input = trackInput(it, { note: tr.n }, paint);
      paint(input.value);
      return h('label', { class: 'tline' }, dot, h('span', { class: 'tn' }, it.n), h('span', { class: 'tg' }, goalText(it)), input);
    })));
  }
  if (deadlines.length) {
    parts.push(h('div', { class: 'win-part' }, deadlines.slice(0, 3).map(({ n, b, d: dd }) => h('button', { class: 'due-row', onclick: () => openNote(n.id) },
      h('span', { class: 'due ' + (dd < 0 ? 'late' : dd <= 14 ? 'soon' : dd <= 45 ? 'mid' : 'far') }, h('b', null, dd < 0 ? `${-dd} j de retard` : dd === 0 ? 'aujourd’hui' : `J-${dd}`)),
      h('span', { class: 'grow ellipsis' }, plain(b.h)),
      h('span', { class: 'tiny muted num' }, fmtDate(b.date))))));
  }
  if (quick.length) {
    parts.push(h('div', { class: 'win-part' }, quick.map(({ b }) => h('button', { class: 'td-quick cc-' + (b.c || 'blue'), onclick: async () => { const ok = await copyText(plain(b.h).replace(/^.*?:\s*/, '')); toast(ok ? 'Copié.' : 'Copie impossible.', { ok }); } },
      h('span', { class: 'cicon', html: pic(b.i || 'info') }), fillRich(h('span', { class: 'grow' }), b.h), h('span', { class: 'copy' }, 'Copier')))));
  }

  return h('section', { class: 'win today', id: 'today' },
    h('button', { class: 'win-h', onclick: () => wk && openNote(wk.n.id) },
      h('span', { class: 'live', 'aria-hidden': 'true' }), h('span', { class: 'win-t' }, 'Aujourd’hui'), count, wk ? h('span', { class: 'chev', html: ICON.chev }) : null),
    items.length ? bar : null,
    list,
    parts,
  );
}

// ---------- Notes ----------
function noteMeta(n) {
  const todos = n.blocks.filter((b) => b.t === 'todo');
  const done = todos.filter((b) => b.done).length;
  const firstText = n.blocks.find((b) => ['p', 'bul', 'num', 'call', 'h2', 'h3'].includes(b.t) && plain(b.h).trim());
  const tr = n.blocks.find((b) => b.t === 'track');
  if (tr && tr.items.length) {
    const it = tr.items[0]; const v = (it.hist || {})[todayKey()];
    return v ? `${it.n} aujourd’hui : ${v} ${it.u}` : `${it.n} : à noter aujourd’hui`;
  }
  const wk = n.blocks.find((b) => b.t === 'week');
  if (wk) { const c = wk.days[dayIndex()].length; return `${c} prévu${c > 1 ? 's' : ''} aujourd’hui`; }
  const w = n.blocks.find((b) => b.t === 'work');
  if (w) return `${w.rows.length} exercices`;
  if (n.blocks.some((b) => b.t === 'budget' && (b.kind === 'in' || b.kind === 'out'))) {
    const left = n.blocks.filter((b) => b.t === 'budget' && b.kind === 'in').reduce((s, b) => s + total(b), 0) - n.blocks.filter((b) => b.t === 'budget' && b.kind === 'out').reduce((s, b) => s + total(b), 0);
    return `Reste CHF ${chf(left)} par mois`;
  }
  if (todos.length) return h('span', { class: 'mprog' }, h('span', { class: 'hbar' }, h('i', { style: { width: `${Math.round((done / todos.length) * 100)}%` } })), h('span', { class: 'num' }, `${done}/${todos.length}`));
  if (firstText) return plain(firstText.h);
  return null;
}

function noteRow(n) {
  return h('button', { class: 'nrow', 'data-note': n.id, onclick: () => openNote(n.id) },
    h('span', { class: 'ntile sm c-' + (n.color || 'violet'), html: pic(n.icon || 'note') }),
    h('span', { class: 'nr-x' }, h('span', { class: 'nr-t' }, n.title || 'Sans titre'), h('span', { class: 'nr-m' }, noteMeta(n))),
    h('span', { class: 'chev', html: ICON.chev }));
}

function drawList(el) {
  const q = norm(query.trim());
  if (q) {
    const hits = state.notes.map((n) => {
      const texts = n.blocks.map((b) => plain(b.h || '') + ' ' + (b.sub || '') + (b.days ? b.days.flat().map((x) => x.x).join(' ') : '') + (b.rows && b.t !== 'table' ? b.rows.map((r) => r.n).join(' ') : '') + (b.t === 'table' ? [b.cols, ...b.rows].flat().map(plain).join(' ') : ''));
      const inTitle = norm(n.title).includes(q);
      const hit = texts.find((t) => norm(t).includes(q));
      return inTitle || hit ? { n, hit } : null;
    }).filter(Boolean);
    fill(el, hits.length
      ? h('section', { class: 'win list' }, h('div', { class: 'win-h static' }, h('span', { class: 'win-t' }, 'Résultats'), h('span', { class: 'win-c num' }, hits.length)),
        h('div', { class: 'win-b' }, hits.map(({ n, hit }) => h('button', { class: 'nrow', 'data-note': n.id, onclick: () => openNote(n.id) },
          h('span', { class: 'ntile sm c-' + n.color, html: pic(n.icon) }),
          h('span', { class: 'nr-x' }, h('span', { class: 'nr-t' }, n.title), hit ? h('span', { class: 'nr-m' }, hit.trim()) : null),
          h('span', { class: 'chev', html: ICON.chev })))))
      : h('p', { class: 'muted center', style: { marginTop: '24px' } }, 'Aucun résultat.'));
    return;
  }
  const pinned = state.notes.filter((n) => n.pinned).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  let k = 5;
  fill(el,
    pinned.length ? stagger(h('section', { class: 'win list', id: 'pinned' },
      h('div', { class: 'win-h static' }, h('span', { class: 'wic', html: pic('pin') }), h('span', { class: 'win-t' }, 'Épinglées'), h('span', { class: 'win-c num' }, pinned.length)),
      h('div', { class: 'win-b' }, pinned.map(noteRow))), k++) : null,
    state.books.map((bk) => {
      const list = notesIn(bk.id).filter((n) => !n.pinned);
      const all = notesIn(bk.id).length;
      return stagger(h('section', { class: 'win list', 'data-book-win': bk.id },
        h('div', { class: 'win-h static' },
          h('button', { class: 'bk', 'data-book': bk.id, 'aria-label': `Carnet ${bk.name}`, onclick: () => bookMenu(bk) }, h('span', { class: 'wic c-' + bk.color, html: pic(bk.icon) }), h('span', { class: 'win-t' }, bk.name), h('span', { class: 'win-c num' }, all)),
          h('button', { class: 'iconbtn sm', 'aria-label': `Nouvelle note dans ${bk.name}`, html: ICON.plus, onclick: () => createIn(bk.id) })),
        list.length ? h('div', { class: 'win-b' }, list.map(noteRow)) : all ? null : h('p', { class: 'muted small pad' }, 'Vide pour l’instant.')), k++);
    }),
    h('button', { class: 'btn block ghost-line', id: 'new-book', onclick: newBookSheet }, ic('folder'), 'Nouveau carnet'),
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
    h('div', { class: 'group' }, state.books.map((bk) => h('button', { class: 'item', 'data-new-in': bk.id, onclick: () => { close({ instant: true }); createIn(bk.id); } },
      h('span', { class: 'ntile xs c-' + bk.color, html: pic(bk.icon) }), h('div', { class: 'grow t' }, bk.name), h('span', { class: 'chev', html: ICON.chev })))),
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
      h('div', { class: 'btns two' },
        h('button', { class: 'btn', onclick: () => { const i = state.books.indexOf(bk); if (i > 0) { state.books.splice(i, 1); state.books.splice(i - 1, 0, bk); save(); } close(); } }, ic('arrow-up'), 'Monter'),
        h('button', { class: 'btn', onclick: () => { const i = state.books.indexOf(bk); if (i < state.books.length - 1) { state.books.splice(i, 1); state.books.splice(i + 1, 0, bk); save(); } close(); } }, ic('arrow-down'), 'Descendre')),
      state.books.length > 1 ? h('button', { class: 'btn danger block', onclick: async () => {
        close({ instant: true });
        if (await ask(`Supprimer le carnet « ${bk.name} » ?`, 'Ses notes ne sont pas effacées : elles vont dans un autre carnet.', 'Supprimer', { danger: true })) { removeBook(bk.id); toast('Carnet supprimé.'); }
      } }, 'Supprimer le carnet') : null,
    );
  });
}
