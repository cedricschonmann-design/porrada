// Une note : des blocs (titres, texte, cases, puces, encadrés, outils) qu'on modifie directement.

import { state, save, saveQuiet, rid, noteById, bookById, touch, removeNote, duplicateNote, daysUntil, fmtDate } from './store.js';
import { h, fill, ICON, push, sheet, ask, toast, haptic, sfx, seg, toggle, ago, copyText } from './ui.js';
import { pic, GROUPS, COLORS, FONTS, SIZES, MARKS } from './pictos.js';
import { clean, fillRich, hydrate, picHTML, pillHTML, sentinel, atStart, splitAtCaret, setCaret, plain } from './rich.js';
import { renderSpecial, SPECIAL, newSpecial } from './special.js';

const TEXT = ['h1', 'h2', 'h3', 'p', 'todo', 'bul', 'num', 'call'];
const LIST = ['todo', 'bul', 'num'];
const TYPE_NAME = { h1: 'Titre', h2: 'Sous-titre', h3: 'Petit titre', p: 'Texte', todo: 'Case à cocher', bul: 'Puce', num: 'Numéro', call: 'Encadré' };
const ic = (name) => h('span', { html: pic(name), style: { display: 'contents' } });
const LEVEL = { h1: 1, h2: 2, h3: 3 };

let current = null;
export const editingNote = () => current;

export function openNote(id, { focusTitle = false } = {}) {
  const n = noteById(id);
  if (!n) return null;
  let titleInput = null;
  const api = push((page) => {
    const ed = editor(n, page);
    current = ed;
    page.onClosed(() => { ed.commitActive(); if (current === ed) current = null; touchIfChanged(n); save(); });
    page.setRight(h('button', { class: 'iconbtn', id: 'note-more', 'aria-label': 'Options de la note', html: ICON.more, onclick: () => noteMenu(n, page, ed) }));
    titleInput = ed.titleInput;
    return ed.view;
  }, { title: n.title || 'Note', cls: 'notepage' });
  if (focusTitle && titleInput) titleInput.focus({ preventScroll: true });
  return api;
}
function touchIfChanged() { /* la date est mise à jour à chaque modification */ }

function editor(n, page) {
  const list = h('div', { class: 'blocks' });
  let active = null; // { b, el }
  let saved = null;
  let blurTimer = null;

  // ---------- En-tête de la note ----------
  const tile = h('button', { class: 'ntile c-' + (n.color || 'violet'), id: 'note-icon', 'aria-label': 'Picto et couleur de la note', html: pic(n.icon || 'note'), onclick: () => noteLook(n, () => { tile.className = 'ntile c-' + n.color; tile.innerHTML = pic(n.icon); }) });
  const titleInput = h('textarea', { class: 'note-title', id: 'note-title', rows: '1', placeholder: 'Titre', 'aria-label': 'Titre de la note', enterkeyhint: 'next' }, n.title || '');
  const grow = () => { titleInput.style.height = 'auto'; titleInput.style.height = titleInput.scrollHeight + 'px'; };
  titleInput.addEventListener('input', () => { n.title = titleInput.value.replace(/\n/g, ' '); touch(n); page.setTitle(n.title || 'Note'); grow(); saveQuiet(); });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = n.blocks.find((b) => TEXT.includes(b.t));
    if (first) focusBlock(first.id, 'start'); else { insertAt(0, { t: 'p', h: '' }); }
  });
  requestAnimationFrame(grow);
  const book = bookById(n.book);
  const meta = h('div', { class: 'note-meta' },
    book ? h('span', { class: 'pill', 'data-c': book.color }, book.name) : null,
    h('span', null, `Modifiée ${ago(n.updatedAt)}`));
  const head = h('div', { class: 'note-head' }, tile, h('div', { class: 'grow' }, titleInput, meta));

  // ---------- Barre d'outils au-dessus du clavier ----------
  const keep = (fn) => ({ onpointerdown: (e) => e.preventDefault(), onmousedown: (e) => e.preventDefault(), onclick: fn });
  const tb = (id, label, icon, fn, extra = {}) => h('button', { class: 'tbtn', id, 'aria-label': label, 'data-silent': '', ...keep(fn), ...extra }, ic(icon));
  const tools = h('div', { class: 'etools', role: 'toolbar', 'aria-label': 'Mise en forme' },
    h('div', { class: 'etools-in' },
      tb('t-add', 'Ajouter un bloc', 'plus', () => { saveSel(); addSheet(); }),
      tb('t-style', 'Style du bloc', 'type', () => { saveSel(); styleSheet(); }),
      tb('t-bold', 'Gras', 'bold', () => exec('bold')),
      tb('t-italic', 'Italique', 'italic', () => exec('italic')),
      tb('t-under', 'Souligné', 'underline', () => exec('underline')),
      tb('t-strike', 'Barré', 'strike', () => exec('strikeThrough')),
      tb('t-color', 'Couleur', 'palette', () => { saveSel(); colorSheet(); }),
      tb('t-pic', 'Picto', 'shapes', () => { saveSel(); pictoSheet((id, c) => insertHTML(picHTML(id, c) + '&nbsp;')); }),
      tb('t-pill', 'Pastille', 'pill', () => { saveSel(); pillSheet(null, (t, c) => insertHTML(pillHTML(t, c) + '&nbsp;')); }),
    ),
    h('button', { class: 'tbtn done', id: 't-done', 'aria-label': 'Fermer le clavier', ...keep(() => { if (document.activeElement) document.activeElement.blur(); }) }, ic('keyboard-down')),
  );

  // ---------- Rendu des blocs ----------
  function draw(focus) {
    let num = 0;
    const items = n.blocks.map((b, i) => {
      if (b.t === 'num') num += 1; else num = 0;
      return renderBlock(b, i, num);
    });
    fill(list, items, h('button', { class: 'add-block', id: 'add-block', onclick: () => { active = null; saved = null; addSheet(); } }, ic('plus'), 'Ajouter un bloc'));
    if (focus) focusBlock(focus.id, focus.at);
  }

  function styleOf(b) {
    const s = b.s || {};
    return ['blk', 'b-' + b.t, s.f ? 'f-' + s.f : '', s.z ? 'z-' + s.z : '', s.c ? 'c-' + s.c : '', s.a === 'center' ? 'al-c' : ''].filter(Boolean).join(' ');
  }

  function progressOf(i) {
    const lv = LEVEL[n.blocks[i].t];
    let done = 0; let all = 0;
    for (let k = i + 1; k < n.blocks.length; k++) {
      const x = n.blocks[k];
      if (LEVEL[x.t] && LEVEL[x.t] <= lv) break;
      if (x.t === 'todo') { all += 1; if (x.done) done += 1; }
    }
    return { done, all };
  }

  function rt(b, cls = 'rt') {
    const el = h('div', { class: cls, contenteditable: 'true', 'data-ph': placeholderOf(b), spellcheck: 'true', autocapitalize: 'sentences' });
    fillRich(el, b.h || '');
    el.addEventListener('focus', () => { clearTimeout(blurTimer); active = { b, el }; page.el.classList.add('editing'); });
    el.addEventListener('blur', () => { commit(b, el); blurTimer = setTimeout(() => { if (!page.el.contains(document.activeElement) || !document.activeElement.isContentEditable) page.el.classList.remove('editing'); }, 120); });
    el.addEventListener('input', () => { commit(b, el); });
    el.addEventListener('keydown', (e) => onKey(e, b, el));
    el.addEventListener('click', (e) => {
      const pill = e.target.closest && e.target.closest('.pill');
      if (pill && el.contains(pill)) { e.preventDefault(); saveSel(); pillSheet(pill, (t, c) => { pill.textContent = t; pill.dataset.c = c; commit(b, el); }); }
    });
    return el;
  }
  const placeholderOf = (b) => ({ h1: 'Titre', h2: 'Sous-titre', h3: 'Petit titre', todo: 'À faire', bul: 'Élément', num: 'Élément', call: 'Texte encadré' }[b.t] || 'Écris ici');
  function commit(b, el) { b.h = clean(el.innerHTML); touch(n); saveQuiet(); }

  function renderBlock(b, i, num) {
    if (SPECIAL.includes(b.t)) {
      return h('div', { class: 'blk b-special', 'data-id': b.id, 'data-t': b.t }, renderSpecial(b, { note: n, redraw: () => draw(), menu: (extra) => blockMenu(b, extra) }));
    }
    if (b.t === 'div') {
      return h('div', { class: 'blk b-div', 'data-id': b.id }, h('button', { class: 'divline', 'aria-label': 'Séparateur', onclick: () => blockMenu(b) }));
    }
    const wrap = h('div', { class: styleOf(b), 'data-id': b.id, 'data-t': b.t });
    if (LEVEL[b.t]) {
      const el = rt(b);
      const p = progressOf(i);
      wrap.append(el);
      if (p.all) {
        wrap.append(h('div', { class: 'hprog' + (p.done === p.all ? ' full' : '') },
          h('span', { class: 'hbar' }, h('i', { style: { width: `${Math.round((p.done / p.all) * 100)}%` } })),
          h('span', { class: 'hcount num' }, `${p.done}/${p.all}`)));
      }
      return wrap;
    }
    if (b.t === 'todo') {
      const box = h('button', { class: 'box' + (b.done ? ' on' : ''), 'aria-label': b.done ? 'Décocher' : 'Cocher', 'data-silent': '', html: ICON.check, onclick: () => { b.done = !b.done; touch(n); save(); haptic('light'); if (b.done) sfx('pop'); draw(); } });
      const el = rt(b);
      const col = h('div', { class: 'col' }, el);
      if (b.sub !== undefined && b.sub !== null) {
        const sub = h('div', { class: 'sub', contenteditable: 'true', 'data-ph': 'Précision', spellcheck: 'true' }, b.sub);
        sub.addEventListener('input', () => { b.sub = sub.textContent; touch(n); saveQuiet(); });
        sub.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const nx = n.blocks[i + 1]; if (nx && TEXT.includes(nx.t)) focusBlock(nx.id, 'start'); else sub.blur(); } });
        sub.addEventListener('focus', () => { active = { b, el }; page.el.classList.add('editing'); });
        col.append(sub);
      }
      if (b.date) {
        const d = daysUntil(b.date);
        const tone = b.done ? 'done' : d < 0 ? 'late' : d <= 14 ? 'soon' : d <= 45 ? 'mid' : 'far';
        col.append(h('button', { class: 'due ' + tone, onclick: () => { active = { b, el }; saved = null; styleSheet(); } },
          ic('calendar'), fmtDate(b.date), h('b', null, b.done ? 'fait' : d === 0 ? 'aujourd’hui' : d < 0 ? `${-d} j de retard` : `J-${d}`)));
      }
      wrap.classList.toggle('done', !!b.done);
      wrap.append(box, col);
      return wrap;
    }
    if (b.t === 'bul') {
      wrap.append(h('span', { class: 'mark', html: pic(b.m || 'dot') }), rt(b));
      return wrap;
    }
    if (b.t === 'num') {
      wrap.append(h('span', { class: 'numx num' }, `${num}.`), rt(b));
      return wrap;
    }
    if (b.t === 'call') {
      wrap.classList.add('cc-' + (b.c || 'violet'));
      wrap.append(h('button', { class: 'cicon', 'aria-label': 'Picto de l’encadré', html: pic(b.i || 'info'), onclick: () => { active = { b, el: wrap.querySelector('.rt') }; saved = null; pictoSheet((id, c) => { b.i = id; if (c && c !== 'ink') b.c = c; touch(n); save(); draw(); }, b.c); } }), rt(b));
      return wrap;
    }
    wrap.append(rt(b));
    return wrap;
  }

  // ---------- Clavier : Entrée et effacement, comme dans Notes ----------
  function onKey(e, b, el) {
    const i = n.blocks.indexOf(b);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const empty = !plain(el.innerHTML).trim() && !el.querySelector('.pic, .pill');
      if (LIST.includes(b.t) && empty) { b.t = 'p'; b.h = ''; delete b.done; touch(n); save(); draw({ id: b.id, at: 'start' }); return; }
      const rest = splitAtCaret(el);
      b.h = clean(el.innerHTML);
      const t = LIST.includes(b.t) ? b.t : b.t === 'call' ? 'call' : 'p';
      const nb = { id: rid(), t, h: rest };
      if (t === 'todo') nb.done = false;
      if (t === 'bul') nb.m = b.m;
      if (t === 'call') { nb.c = b.c; nb.i = b.i; }
      if (b.s && t !== 'p') nb.s = { ...b.s };
      n.blocks.splice(i + 1, 0, nb);
      touch(n); save();
      draw({ id: nb.id, at: 'start' });
      return;
    }
    if (e.key === 'Backspace' && atStart(el)) {
      if (b.t !== 'p') { e.preventDefault(); b.t = 'p'; delete b.done; delete b.date; delete b.sub; touch(n); save(); draw({ id: b.id, at: 'start' }); return; }
      const prev = n.blocks[i - 1];
      if (prev && TEXT.includes(prev.t)) {
        e.preventDefault();
        const prevEl = list.querySelector(`[data-id="${prev.id}"] .rt`);
        const at = prevEl ? prevEl.textContent.length : 'end';
        prev.h = clean((prev.h || '') + (b.h || ''));
        n.blocks.splice(i, 1);
        touch(n); save();
        draw({ id: prev.id, at });
        return;
      }
      if (!plain(b.h).trim() && n.blocks.length > 1) { e.preventDefault(); n.blocks.splice(i, 1); touch(n); save(); draw(); }
    }
  }

  function focusBlock(id, at = 'end') {
    const el = list.querySelector(`[data-id="${id}"] .rt`);
    if (!el) return;
    setCaret(el, at);
    active = { b: n.blocks.find((x) => x.id === id), el };
    page.el.classList.add('editing');
  }

  // ---------- Sélection et commandes ----------
  function saveSel() {
    const s = getSelection();
    saved = s.rangeCount && active && active.el.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
  }
  function restoreSel() {
    if (!active || !active.el.isConnected) return false;
    active.el.focus({ preventScroll: true });
    const s = getSelection();
    if (saved) { s.removeAllRanges(); s.addRange(saved); } else setCaret(active.el, 'end');
    return true;
  }
  function exec(cmd, val = null, css = false) {
    if (!active) return;
    try { document.execCommand('styleWithCSS', false, css); } catch (e) { /* rien */ }
    document.execCommand(cmd, false, val);
    commit(active.b, active.el);
    haptic('light');
  }
  function insertHTML(html) {
    if (!restoreSel()) {
      // pas de bloc actif : on ajoute un paragraphe à la fin
      const nb = { id: rid(), t: 'p', h: '' };
      n.blocks.push(nb);
      draw({ id: nb.id, at: 'end' });
    }
    document.execCommand('insertHTML', false, html);
    hydrate(active.el);
    commit(active.b, active.el);
    haptic('light');
  }
  function commitActive() { if (active && active.el && active.el.isConnected) commit(active.b, active.el); }

  function insertAt(index, block, { focus = true } = {}) {
    const b = { id: rid(), ...block };
    n.blocks.splice(index, 0, b);
    touch(n); save();
    draw(focus && TEXT.includes(b.t) ? { id: b.id, at: 'end' } : null);
    if (!TEXT.includes(b.t)) requestAnimationFrame(() => { const el = list.querySelector(`[data-id="${b.id}"]`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    return b;
  }

  // ---------- Feuilles ----------
  function addSheet() {
    const at = active ? n.blocks.indexOf(active.b) + 1 : n.blocks.length;
    const opt = (id, icon, label, sub, fn) => h('button', { class: 'addopt', 'data-add': id, onclick: () => { close(); fn(); } }, h('span', { class: 'ai', html: pic(icon) }), h('span', { class: 'at' }, label), sub ? h('span', { class: 'as' }, sub) : null);
    let close = () => {};
    close = sheet((cl) => {
      close = cl;
      const inDays = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
      return h('div', { class: 'stack' },
        h('h2', null, 'Ajouter'),
        h('div', { class: 'list-head' }, 'Texte'),
        h('div', { class: 'addgrid' },
          opt('h1', 'type', 'Titre', null, () => insertAt(at, { t: 'h1', h: '' })),
          opt('h2', 'type', 'Sous-titre', null, () => insertAt(at, { t: 'h2', h: '' })),
          opt('h3', 'type', 'Petit titre', null, () => insertAt(at, { t: 'h3', h: '' })),
          opt('p', 'align-left', 'Texte', null, () => insertAt(at, { t: 'p', h: '' })),
          opt('todo', 'check-circle', 'Case à cocher', null, () => insertAt(at, { t: 'todo', h: '', done: false })),
          opt('goal', 'target', 'Objectif daté', null, () => insertAt(at, { t: 'todo', h: '', done: false, date: inDays(30), sub: '' })),
          opt('bul', 'dot', 'Puce', null, () => insertAt(at, { t: 'bul', h: '', m: 'dot' })),
          opt('arrow', 'arrow-right', 'Flèche', null, () => insertAt(at, { t: 'bul', h: '', m: 'arrow-right' })),
          opt('num', 'list-check', 'Liste numérotée', null, () => insertAt(at, { t: 'num', h: '' })),
          opt('call', 'info', 'Encadré', null, () => insertAt(at, { t: 'call', h: '', c: 'violet', i: 'info' })),
          opt('div', 'dash', 'Séparateur', null, () => insertAt(at, { t: 'div' }, { focus: false })),
        ),
        h('div', { class: 'list-head' }, 'Outils'),
        h('div', { class: 'addgrid' },
          opt('week', 'calendar', 'Semaine', 'Planning du lundi au dimanche', () => insertAt(at, newSpecial('week'), { focus: false })),
          opt('work', 'dumbbell', 'Séance de sport', 'Avec tes charges par série', () => insertAt(at, newSpecial('work'), { focus: false })),
          opt('track', 'activity', 'Suivi du jour', 'Calories, protéines, sommeil…', () => insertAt(at, newSpecial('track'), { focus: false })),
          opt('budget', 'wallet', 'Budget', 'Lignes et total', () => insertAt(at, newSpecial('budget'), { focus: false })),
          opt('sum', 'coins', 'Bilan', 'Entrées − sorties', () => insertAt(at, newSpecial('sum'), { focus: false })),
        ),
      );
    });
  }

  function styleSheet() {
    if (!active) return;
    const b = active.b;
    let body = null;
    const redraw = () => { draw(); active = { b, el: list.querySelector(`[data-id="${b.id}"] .rt`) }; fillSheet(); };
    const setS = (k, v) => { b.s = { ...(b.s || {}) }; if (v == null) delete b.s[k]; else b.s[k] = v; touch(n); save(); redraw(); };
    const fillSheet = () => fill(body,
      h('div', { class: 'sheet-head' }, h('h2', null, 'Style'), h('span', { class: 'tiny muted' }, TYPE_NAME[b.t])),
      h('div', { class: 'list-head' }, 'Type'),
      h('div', { class: 'chips' }, Object.entries(TYPE_NAME).map(([t, l]) => h('button', { class: 'chip', 'data-type': t, 'aria-pressed': String(b.t === t), onclick: () => {
        b.t = t;
        if (t === 'todo' && b.done === undefined) b.done = false;
        if (t === 'bul' && !b.m) b.m = 'dot';
        if (t === 'call') { b.c = b.c || 'violet'; b.i = b.i || 'info'; }
        touch(n); save(); redraw();
      } }, l))),
      b.t === 'bul' ? [h('div', { class: 'list-head' }, 'Puce'), h('div', { class: 'chips' }, MARKS.map((m) => h('button', { class: 'chip icon', 'aria-label': m, 'aria-pressed': String((b.m || 'dot') === m), html: pic(m), onclick: () => { b.m = m; touch(n); save(); redraw(); } })))] : null,
      b.t === 'todo' ? [
        h('div', { class: 'list-head' }, 'Échéance'),
        h('div', { class: 'hstack' },
          h('input', { class: 'input', type: 'date', id: 'due-date', value: b.date || '', onchange: (e) => { b.date = e.target.value || undefined; if (!b.date) delete b.date; touch(n); save(); redraw(); } }),
          b.date ? h('button', { class: 'btn sm', onclick: () => { delete b.date; touch(n); save(); redraw(); } }, 'Retirer') : null),
        h('div', { class: 'opt-line' }, h('span', null, 'Ligne de précision en dessous'), toggle(b.sub !== undefined && b.sub !== null, (v) => { if (v) b.sub = b.sub || ''; else delete b.sub; touch(n); save(); draw(); }, 'Ligne de précision')),
      ] : null,
      b.t === 'call' ? [
        h('div', { class: 'list-head' }, 'Couleur de l’encadré'),
        dots(b.c || 'violet', (c) => { b.c = c; touch(n); save(); redraw(); }),
        h('div', { class: 'opt-line' }, h('span', null, 'Afficher sur l’accueil'), toggle(!!b.qa, (v) => { b.qa = v; touch(n); save(); }, 'Afficher sur l’accueil')),
      ] : null,
      h('div', { class: 'list-head' }, 'Police'),
      h('div', { class: 'fontgrid' }, FONTS.map(([id, label]) => h('button', { class: 'fontopt f-' + id, 'data-font': id, 'aria-pressed': String(((b.s && b.s.f) || 'sans') === id), onclick: () => setS('f', id === 'sans' ? null : id) }, h('span', { class: 'fx' }, 'Aa'), h('span', { class: 'fl' }, label)))),
      h('div', { class: 'list-head' }, 'Taille'),
      seg(SIZES, (b.s && b.s.z) || 'm', (v) => setS('z', v === 'm' ? null : v)),
      h('div', { class: 'list-head' }, 'Couleur du texte'),
      dots((b.s && b.s.c) || 'ink', (c) => setS('c', c === 'ink' ? null : c)),
      h('div', { class: 'list-head' }, 'Alignement'),
      seg([['left', 'À gauche'], ['center', 'Centré']], (b.s && b.s.a) || 'left', (v) => setS('a', v === 'left' ? null : v)),
      h('div', { class: 'btns two', style: { marginTop: '14px' } },
        h('button', { class: 'btn', onclick: () => move(b, -1, redraw) }, ic('arrow-up'), 'Monter'),
        h('button', { class: 'btn', onclick: () => move(b, 1, redraw) }, ic('arrow-down'), 'Descendre'),
        h('button', { class: 'btn', onclick: () => { const i = n.blocks.indexOf(b); const c = JSON.parse(JSON.stringify(b)); c.id = rid(); n.blocks.splice(i + 1, 0, c); touch(n); save(); draw(); toast('Bloc dupliqué.', { ok: true }); } }, ic('copy'), 'Dupliquer'),
        h('button', { class: 'btn danger', id: 'block-delete', onclick: () => { closeS(); removeBlock(b); } }, ic('trash'), 'Supprimer'),
      ),
    );
    const closeS = sheet((cl, el) => { body = h('div', { class: 'stack' }); fillSheet(); return body; });
  }

  function move(b, d, after) {
    const i = n.blocks.indexOf(b);
    const j = i + d;
    if (j < 0 || j >= n.blocks.length) return;
    n.blocks.splice(i, 1);
    n.blocks.splice(j, 0, b);
    touch(n); save(); haptic('light');
    if (after) after(); else draw();
  }
  function removeBlock(b) {
    const i = n.blocks.indexOf(b);
    if (i < 0) return;
    const removed = n.blocks.splice(i, 1)[0];
    if (!n.blocks.length) n.blocks.push({ id: rid(), t: 'p', h: '' });
    touch(n); save(); sfx('del'); draw();
    toast('Bloc supprimé.', { action: { label: 'Annuler', fn: () => { n.blocks.splice(i, 0, removed); touch(n); save(); draw(); } } });
  }
  function blockMenu(b, extra = []) {
    sheet((close) => h('div', { class: 'stack' },
      h('h2', null, ({ week: 'Semaine', work: 'Séance', track: 'Suivi du jour', budget: 'Budget', sum: 'Bilan', div: 'Séparateur' })[b.t] || 'Bloc'),
      extra.length ? h('div', { class: 'group noicon' }, extra.map(([label, fn, id]) => h('button', { class: 'item', id, onclick: () => { close({ instant: true }); fn(); } }, h('div', { class: 'grow t' }, label), h('span', { class: 'chev', html: ICON.chev })))) : null,
      h('div', { class: 'btns two' },
        h('button', { class: 'btn', onclick: () => move(b, -1) }, ic('arrow-up'), 'Monter'),
        h('button', { class: 'btn', onclick: () => move(b, 1) }, ic('arrow-down'), 'Descendre'),
      ),
      h('button', { class: 'btn danger block', onclick: () => { close(); removeBlock(b); } }, ic('trash'), 'Supprimer ce bloc'),
    ));
  }

  function colorSheet() {
    const hasSel = saved && !saved.collapsed;
    sheet((close) => h('div', { class: 'stack' },
      h('h2', null, 'Couleur'),
      h('p', { class: 'muted small' }, hasSel ? 'Pour le texte sélectionné.' : 'Pour tout le bloc. Sélectionne des mots pour ne colorer qu’eux.'),
      h('div', { class: 'list-head' }, 'Texte'),
      dots(null, (c) => {
        close({ instant: true });
        if (hasSel) { restoreSel(); exec('foreColor', sentinel(c), true); } else if (active) { active.b.s = { ...(active.b.s || {}) }; if (c === 'ink') delete active.b.s.c; else active.b.s.c = c; touch(n); save(); draw({ id: active.b.id, at: 'end' }); }
      }, 'fg'),
      h('div', { class: 'list-head' }, 'Surligneur'),
      dots(null, (c) => {
        close({ instant: true });
        if (!active) return;
        if (!hasSel) { toast('Sélectionne d’abord les mots à surligner.'); return; }
        restoreSel();
        if (c === 'ink') exec('hiliteColor', 'transparent', true); else exec('hiliteColor', sentinel(c), true);
      }, 'hl'),
      hasSel ? h('button', { class: 'btn block', onclick: () => { close({ instant: true }); restoreSel(); exec('removeFormat'); } }, 'Retirer la mise en forme') : null,
    ));
  }

  // Remplir la note
  const view = h('div', { class: 'note-wrap' }, head, list, tools);
  draw();
  page.el.addEventListener('focusout', () => setTimeout(() => {
    const a = document.activeElement;
    if (!a || !page.el.contains(a) || !(a.isContentEditable || /INPUT|TEXTAREA/.test(a.tagName))) page.el.classList.remove('editing');
  }, 150));
  return { view, titleInput, commitActive, redraw: () => draw() };
}

// ---------- Petits morceaux réutilisés ----------
export function dots(value, onPick, mode = 'fg') {
  return h('div', { class: 'dots-row' }, COLORS.map(([c, label]) => h('button', {
    class: `cdot cd-${c}` + (mode === 'hl' ? ' hl' : '') + (value === c ? ' on' : ''), 'data-c': c, 'aria-label': label,
    onclick: () => onPick(c),
  }, mode === 'hl' && c === 'ink' ? ic('close') : null)));
}

export function pictoSheet(onPick, color = 'ink') {
  let c = color || 'ink';
  let grid = null;
  const drawGrid = () => fill(grid, GROUPS.map(([name, ids]) => [
    h('div', { class: 'list-head' }, name),
    h('div', { class: 'picgrid' }, ids.map((id) => h('button', { class: `picopt c-${c}`, 'data-pic': id, 'aria-label': id, html: pic(id), onclick: () => { close({ instant: true }); onPick(id, c); } }))),
  ]));
  const close = sheet(() => {
    grid = h('div');
    drawGrid();
    return h('div', { class: 'stack' },
      h('h2', null, 'Pictos'),
      dots(c, (x) => { c = x; drawGrid(); haptic('light'); }),
      grid);
  });
}

export function pillSheet(existing, onDone) {
  let c = existing ? existing.dataset.c : 'violet';
  let input = null;
  const preview = h('span', { class: 'pill big', 'data-c': c }, existing ? existing.textContent : 'Pastille');
  sheet((close) => {
    input = h('input', { class: 'input', id: 'pill-text', placeholder: 'Texte de la pastille', value: existing ? existing.textContent : '', maxlength: '28', autocomplete: 'off', enterkeyhint: 'done' });
    const ok = () => { const t = input.value.trim(); if (!t) { input.focus(); return; } close({ instant: true }); onDone(t, c); };
    input.addEventListener('input', () => { preview.textContent = input.value || 'Pastille'; });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    const quick = ['Urgent', 'Fait', 'En cours', 'Important', 'À revoir', 'Payé'];
    return h('div', { class: 'stack' },
      h('h2', null, existing ? 'Modifier la pastille' : 'Pastille'),
      h('div', { class: 'center' }, preview),
      input,
      h('div', { class: 'chips' }, quick.map((q) => h('button', { class: 'chip', onclick: () => { input.value = q; preview.textContent = q; } }, q))),
      dots(c, (x) => { c = x; preview.dataset.c = x; }),
      h('button', { class: 'btn primary lg block', id: 'pill-ok', onclick: ok }, existing ? 'Enregistrer' : 'Ajouter'),
      existing ? h('button', { class: 'btn ghost block', onclick: () => { close({ instant: true }); existing.remove(); onDone(existing.textContent, c); } }, 'Supprimer la pastille') : null,
    );
  });
}

function noteLook(n, after) {
  pictoSheet((id, c) => { n.icon = id; if (c && c !== 'ink') n.color = c; touch(n); save(); after(); }, n.color);
}

function noteMenu(n, page, ed) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, n.title || 'Note'),
    h('div', { class: 'group noicon' },
      h('button', { class: 'item', id: 'note-pin', onclick: () => { n.pinned = !n.pinned; save(); close(); toast(n.pinned ? 'Épinglée en haut de l’accueil.' : 'Désépinglée.', { ok: true }); } }, h('div', { class: 'grow t' }, n.pinned ? 'Désépingler' : 'Épingler sur l’accueil')),
      h('button', { class: 'item', id: 'note-book', onclick: () => { close({ instant: true }); chooseBook(n, () => ed.redraw()); } }, h('div', { class: 'grow t' }, 'Changer de carnet'), h('span', { class: 'v' }, (bookById(n.book) || {}).name || '')),
      h('button', { class: 'item', onclick: () => { close({ instant: true }); noteLook(n, () => { page.close({ instant: true, silent: true }); openNote(n.id); }); } }, h('div', { class: 'grow t' }, 'Picto et couleur')),
      h('button', { class: 'item', onclick: () => { close({ instant: true }); const c = duplicateNote(n); page.close({ instant: true, silent: true }); openNote(c.id); toast('Note dupliquée.', { ok: true }); } }, h('div', { class: 'grow t' }, 'Dupliquer')),
      h('button', { class: 'item', onclick: async () => { close({ instant: true }); const text = toText(n); if (navigator.share) { try { await navigator.share({ title: n.title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } } toast((await copyText(text)) ? 'Note copiée.' : 'Copie impossible.', { ok: true }); } }, h('div', { class: 'grow t' }, 'Envoyer ou copier le texte')),
      h('button', { class: 'item danger', id: 'note-delete', onclick: async () => { close({ instant: true }); if (await ask(`Supprimer « ${n.title || 'cette note'} » ?`, null, 'Supprimer', { danger: true })) { removeNote(n.id); page.close(); sfx('del'); } } }, h('div', { class: 'grow t' }, 'Supprimer la note')),
    ),
  ));
}

export function chooseBook(n, after) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Carnet'),
    h('div', { class: 'rows' }, state.books.map((bk) => h('button', { class: 'rowc', 'aria-pressed': String(n.book === bk.id), onclick: () => { n.book = bk.id; save(); close(); if (after) after(); } },
      h('span', { class: 'ntile sm c-' + bk.color, html: pic(bk.icon) }), h('div', { class: 'grow t' }, bk.name), n.book === bk.id ? h('span', { class: 'chev', html: ICON.check }) : null))),
  ));
}

export function toText(n) {
  const out = [n.title || ''];
  let k = 0;
  for (const b of n.blocks) {
    const t = plain(b.h || '');
    if (b.t === 'num') k += 1; else k = 0;
    if (b.t === 'h1' || b.t === 'h2') out.push('', t.toUpperCase());
    else if (b.t === 'h3') out.push('', t);
    else if (b.t === 'todo') out.push(`${b.done ? '[x]' : '[ ]'} ${t}${b.date ? ` (${fmtDate(b.date)})` : ''}${b.sub ? ` — ${b.sub}` : ''}`);
    else if (b.t === 'bul') out.push(`• ${t}`);
    else if (b.t === 'num') out.push(`${k}. ${t}`);
    else if (b.t === 'div') out.push('———');
    else if (TEXT.includes(b.t)) out.push(t);
  }
  return out.join('\n').trim();
}
