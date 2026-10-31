// Une note. Deux modes bien séparés :
// - Lecture (par défaut) : propre et compacte ; on coche, on note ses charges et ses chiffres, on replie les fenêtres.
// - Modifier : chaque bloc a sa poignée (⋮) pour le style, le déplacer ou le supprimer ; « + Ajouter ici » dans
//   chaque fenêtre ; une barre d'outils au-dessus du clavier. « OK » pour revenir en lecture.
// Un « Titre de fenêtre » (h2) ouvre une fenêtre : tout ce qui suit, jusqu'au titre suivant, est dedans.

import { state, save, saveQuiet, rid, noteById, bookById, touch, removeNote, restoreNote, duplicateNote, daysUntil, fmtDate } from './store.js';
import { h, fill, ICON, push, sheet, ask, toast, haptic, sfx, seg, toggle, ago, copyText } from './ui.js';
import { pic, GROUPS, COLORS, FONTS, SIZES, MARKS } from './pictos.js';
import { clean, fillRich, hydrate, picHTML, pillHTML, sentinel, atStart, splitAtCaret, setCaret, plain } from './rich.js';
import { renderSpecial, SPECIAL, SPECIAL_NAME, newSpecial } from './special.js';

const TEXT = ['h1', 'h2', 'h3', 'p', 'todo', 'bul', 'num', 'call'];
const LIST = ['todo', 'bul', 'num'];
const HEAD = ['h1', 'h2'];
const TYPE_NAME = { h2: 'Titre de fenêtre', h3: 'Petit titre', p: 'Texte', todo: 'Case à cocher', bul: 'Puce', num: 'Numéro', call: 'Encadré', h1: 'Grand titre' };
const ic = (name) => h('span', { html: pic(name), style: { display: 'contents' } });
const LEVEL = { h1: 1, h2: 2, h3: 3 };
const GRIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

let current = null;
export const editingNote = () => current;

export function openNote(id, { focusTitle = false, edit = false } = {}) {
  const n = noteById(id);
  if (!n) return null;
  let ed = null;
  const api = push((page) => {
    ed = editor(n, page, { edit: edit || focusTitle });
    current = ed;
    page.onClosed(() => { ed.finish(); if (current === ed) current = null; save(); });
    page.setRight(ed.navRight);
    return ed.view;
  }, { title: n.title || 'Note', cls: 'notepage' + (edit || focusTitle ? ' edit' : '') });
  if (focusTitle && ed) ed.focusTitle();
  return api;
}

function editor(n, page, { edit = false } = {}) {
  let editing = edit;
  const list = h('div', { class: 'blocks' });
  let active = null; // { b, el } : le bloc de texte où l'on écrit
  let saved = null;
  let justChecked = null;

  // ---------- Barre de navigation : Modifier / OK, options ----------
  const modeBtn = h('button', { class: 'btn sm mode', id: 'note-edit', onclick: () => setMode(!editing) });
  const navRight = [modeBtn, h('button', { class: 'iconbtn', id: 'note-more', 'aria-label': 'Options de la note', html: ICON.more, onclick: () => noteMenu(n, page) })];

  // ---------- En-tête ----------
  const headEl = h('div', { class: 'note-head' });
  const hintEl = h('p', { class: 'edit-hint' }, 'Touche un texte pour l’écrire. La poignée', h('span', { class: 'g', html: GRIP }), 'd’un bloc sert à le déplacer, changer son style ou le supprimer.');
  let titleInput = null;
  function drawHead() {
    hintEl.hidden = !editing;
    const book = bookById(n.book);
    const tile = h(editing ? 'button' : 'span', { class: 'ntile c-' + (n.color || 'violet'), id: 'note-icon', 'aria-label': editing ? 'Changer le picto et la couleur' : null, html: pic(n.icon || 'note'),
      onclick: editing ? () => pictoSheet((id, c) => { n.icon = id; if (c && c !== 'ink') n.color = c; touch(n); save(); drawHead(); }, n.color) : null });
    const eyebrow = h('div', { class: 'note-eyebrow' }, book ? book.name : 'Note', ' · ', `modifiée ${ago(n.updatedAt)}`);
    if (editing) {
      titleInput = h('textarea', { class: 'note-title', id: 'note-title', rows: '1', placeholder: 'Titre de la note', 'aria-label': 'Titre de la note', enterkeyhint: 'next' }, n.title || '');
      const grow = () => { titleInput.style.height = 'auto'; titleInput.style.height = titleInput.scrollHeight + 'px'; };
      titleInput.addEventListener('input', () => { n.title = titleInput.value.replace(/\n/g, ' '); touch(n); page.setTitle(n.title || 'Note'); grow(); saveQuiet(); });
      titleInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const first = n.blocks.find((b) => TEXT.includes(b.t));
        if (first) focusBlock(first.id, 'start'); else insertAt(0, { t: 'p', h: '' });
      });
      requestAnimationFrame(grow);
      fill(headEl, h('div', { class: 'grow' }, eyebrow, titleInput), tile);
    } else {
      titleInput = null;
      fill(headEl, h('div', { class: 'grow' }, eyebrow, h('h1', { class: 'note-h' }, n.title || 'Sans titre')), tile);
    }
  }

  // ---------- Barres du bas (mode Modifier) ----------
  const keep = (fn) => ({ onpointerdown: (e) => e.preventDefault(), onmousedown: (e) => e.preventDefault(), onclick: fn });
  const tb = (id, label, icon, fn) => h('button', { class: 'tbtn', id, 'aria-label': label, 'data-silent': '', ...keep(fn) }, ic(icon));
  // Pendant la frappe : la mise en forme
  const tools = h('div', { class: 'etools', role: 'toolbar', 'aria-label': 'Mise en forme' },
    h('div', { class: 'etools-in' },
      tb('t-add', 'Ajouter un bloc', 'plus', () => { saveSel(); addSheet(); }),
      tb('t-style', 'Style et actions du bloc', 'type', () => { saveSel(); if (active) blockSheet(active.b); }),
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
  // Sans clavier : ajouter, ou terminer
  const ebar = h('div', { class: 'ebar' },
    h('button', { class: 'btn', id: 'ebar-add', onclick: () => { active = null; saved = null; addSheet(); } }, ic('plus'), 'Ajouter'),
    h('button', { class: 'btn', id: 'ebar-win', onclick: () => { active = null; insertAt(n.blocks.length, { t: 'h2', h: '' }); } }, ic('square'), 'Fenêtre'),
    h('button', { class: 'btn primary', id: 'ebar-ok', onclick: () => setMode(false) }, 'Terminé'),
  );

  // ---------- Rendu ----------
  function draw(focus) {
    let num = 0;
    let sec = null;
    const out = [];
    n.blocks.forEach((b, i) => {
      if (b.t === 'num') num += 1; else num = 0;
      if (b.t === 'h2') { sec = section(b, i); out.push(sec.el); return; }
      if (b.t === 'h1') { sec = null; out.push(renderBlock(b, i, num, false)); return; }
      if (sec && sec.folded) return;
      const el = renderBlock(b, i, num, !!sec);
      if (sec) sec.body.append(el);
      else if (SPECIAL.includes(b.t)) out.push(h('section', { class: 'win solo' }, el));
      else out.push(el);
    });
    const empty = !n.blocks.some((b) => !TEXT.includes(b.t) || b.t === 'h2' || plain(b.h || '').trim());
    fill(list,
      !editing && empty ? h('button', { class: 'empty-note', onclick: () => setMode(true) }, 'Note vide. Touche ici pour écrire.') : null,
      out,
    );
    if (focus) focusBlock(focus.id, focus.at);
  }

  function sectionEnd(i) { let e = i + 1; while (e < n.blocks.length && !HEAD.includes(n.blocks[e].t)) e += 1; return e; }

  // Une fenêtre : son titre, sa progression (cases cochées), son contenu.
  function section(b, i) {
    const p = progressOf(i);
    const folded = !editing && !!b.fold;
    const title = rt(b);
    const grip = editing ? gripBtn(b) : null;
    const count = p.all ? h('span', { class: 'win-c num' + (p.done === p.all ? ' full' : '') }, `${p.done}/${p.all}`) : null;
    const headRow = editing
      ? h('div', { class: 'win-h blk b-h2', 'data-id': b.id, 'data-t': 'h2' }, grip, h('div', { class: 'win-t' }, title), count)
      : h('button', { class: 'win-h b-h2', 'data-id': b.id, 'data-t': 'h2', 'aria-expanded': String(!folded), onclick: () => { b.fold = !b.fold; saveQuiet(); haptic('light'); draw(); } },
        h('div', { class: 'win-t' }, title), count, h('span', { class: 'fold', html: ICON.down }));
    const bar = p.all ? segBar(p.done, p.all) : null;
    const body = h('div', { class: 'win-b' });
    const el = h('section', { class: 'win sec' + (folded ? ' folded' : '') + (editing ? ' editing' : '') },
      headRow, bar, folded ? null : body,
      editing ? h('button', { class: 'win-add', 'data-add-in': b.id, onclick: () => { active = null; saved = null; addSheet(sectionEnd(n.blocks.indexOf(b))); } }, ic('plus'), 'Ajouter ici') : null,
      !editing && !folded && p.all > 1 && p.done === p.all ? h('button', { class: 'win-add muted', onclick: () => uncheckSection(b) }, ic('repeat'), 'Tout décocher') : null);
    return { el, body, folded };
  }
  // Pour une liste qui revient (courses, routine) : tout décocher d'un coup.
  function uncheckSection(b) {
    const s = n.blocks.indexOf(b);
    const e = sectionEnd(s);
    const was = [];
    for (let k = s + 1; k < e; k++) if (n.blocks[k].t === 'todo' && n.blocks[k].done) { n.blocks[k].done = false; was.push(n.blocks[k]); }
    touch(n); save(); draw();
    toast('Cases décochées.', { action: { label: 'Annuler', fn: () => { was.forEach((x) => { x.done = true; }); touch(n); save(); draw(); } } });
  }

  function segBar(done, all) {
    if (all > 24) return h('div', { class: 'seg-bar cont' }, h('i', { style: { width: `${Math.round((done / all) * 100)}%` } }));
    return h('div', { class: 'seg-bar' }, Array.from({ length: all }, (_, k) => h('i', { class: k < done ? 'on' : null })));
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

  function gripBtn(b) {
    return h('button', { class: 'grip', 'aria-label': 'Style et actions du bloc', 'data-grip': b.id, html: GRIP, onclick: () => { commitActive(); blockSheet(b); } });
  }

  function rt(b, cls = 'rt') {
    const el = h('div', { class: cls, 'data-ph': placeholderOf(b) });
    fillRich(el, b.h || '');
    if (!editing) return el;
    el.contentEditable = 'true';
    el.spellcheck = true;
    el.setAttribute('autocapitalize', 'sentences');
    el.addEventListener('focus', () => { active = { b, el }; });
    el.addEventListener('blur', () => commit(b, el));
    el.addEventListener('input', () => commit(b, el));
    el.addEventListener('keydown', (e) => onKey(e, b, el));
    el.addEventListener('click', (e) => {
      const pill = e.target.closest && e.target.closest('.pill');
      if (pill && el.contains(pill)) { e.preventDefault(); saveSel(); pillSheet(pill, (t, c) => { pill.textContent = t; pill.dataset.c = c; commit(b, el); }); }
    });
    return el;
  }
  const placeholderOf = (b) => ({ h1: 'Grand titre', h2: 'Titre de la fenêtre', h3: 'Petit titre', todo: 'À faire', bul: 'Élément', num: 'Élément', call: 'Texte encadré' }[b.t] || 'Écris ici');
  function commit(b, el) { b.h = clean(el.innerHTML); touch(n); saveQuiet(); }

  function renderBlock(b, i, num, inWin) {
    const grip = editing ? gripBtn(b) : null;
    if (SPECIAL.includes(b.t)) {
      return h('div', { class: 'blk b-special', 'data-id': b.id, 'data-t': b.t }, grip, h('div', { class: 'sp-wrap' }, renderSpecial(b, { note: n, editing, flat: inWin })));
    }
    if (b.t === 'div') {
      return h('div', { class: 'blk b-div', 'data-id': b.id }, grip, h('div', { class: 'divline' }));
    }
    const wrap = h('div', { class: styleOf(b), 'data-id': b.id, 'data-t': b.t });
    if (grip) wrap.append(grip);
    if (!editing && !plain(b.h || '').trim() && !/class="(pic|pill)"/.test(b.h || '') && ['p', 'bul', 'num', 'h3', 'call'].includes(b.t)) wrap.classList.add('empty');
    if (b.t === 'h1' || b.t === 'h3') {
      wrap.append(rt(b));
      const p = progressOf(i);
      if (p.all) wrap.append(h('span', { class: 'hcount num' + (p.done === p.all ? ' full' : '') }, `${p.done}/${p.all}`));
      return wrap;
    }
    if (b.t === 'todo') {
      const toggleDone = () => { b.done = !b.done; touch(n); save(); haptic('light'); if (b.done) { sfx('pop'); justChecked = b.id; } draw(); justChecked = null; };
      const box = h('button', { class: 'box' + (b.done ? ' on' : '') + (justChecked === b.id ? ' just' : ''), 'aria-label': b.done ? 'Décocher' : 'Cocher', 'data-silent': '', html: ICON.check, onclick: (e) => { e.stopPropagation(); toggleDone(); } });
      const el = rt(b);
      const col = h('div', { class: 'col' }, el);
      if (b.sub !== undefined && b.sub !== null && (editing || String(b.sub).trim())) {
        const sub = h('div', { class: 'sub', 'data-ph': 'Précision' }, b.sub);
        if (editing) {
          sub.contentEditable = 'true';
          sub.addEventListener('input', () => { b.sub = sub.textContent; touch(n); saveQuiet(); });
          sub.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const nx = n.blocks[i + 1]; if (nx && TEXT.includes(nx.t)) focusBlock(nx.id, 'start'); else sub.blur(); } });
          sub.addEventListener('focus', () => { active = { b, el }; });
        }
        col.append(sub);
      }
      if (b.date) {
        const d = daysUntil(b.date);
        const tone = b.done ? 'done' : d < 0 ? 'late' : d <= 14 ? 'soon' : d <= 45 ? 'mid' : 'far';
        col.append(h(editing ? 'button' : 'span', { class: 'due ' + tone, onclick: editing ? (e) => { e.stopPropagation(); blockSheet(b); } : null },
          ic('calendar'), fmtDate(b.date), h('b', null, b.done ? 'fait' : d === 0 ? 'aujourd’hui' : d < 0 ? `${-d} j de retard` : `J-${d}`)));
      }
      wrap.classList.toggle('done', !!b.done);
      wrap.append(box, col);
      // En lecture, toute la ligne coche la case (plus facile au pouce).
      if (!editing) wrap.addEventListener('click', (e) => { if (e.target.closest('a, .wlink')) return; toggleDone(); });
      return wrap;
    }
    if (b.t === 'bul') { wrap.append(h('span', { class: 'mark', html: pic(b.m || 'dot') }), rt(b)); return wrap; }
    if (b.t === 'num') { wrap.append(h('span', { class: 'numx num' }, `${num}.`), rt(b)); return wrap; }
    if (b.t === 'call') {
      wrap.classList.add('cc-' + (b.c || 'blue'));
      wrap.append(h(editing ? 'button' : 'span', { class: 'cicon', 'aria-label': editing ? 'Picto de l’encadré' : null, html: pic(b.i || 'info'),
        onclick: editing ? () => { active = { b, el: wrap.querySelector('.rt') }; saved = null; pictoSheet((id, c) => { b.i = id; if (c && c !== 'ink') b.c = c; touch(n); save(); draw(); }, b.c); } : null }), rt(b));
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
      if (b.t !== 'p' && b.t !== 'h2') { e.preventDefault(); b.t = 'p'; delete b.done; delete b.date; delete b.sub; touch(n); save(); draw({ id: b.id, at: 'start' }); return; }
      const prev = n.blocks[i - 1];
      if (b.t === 'p' && prev && TEXT.includes(prev.t)) {
        e.preventDefault();
        const prevEl = list.querySelector(`[data-id="${prev.id}"] .rt`);
        const at = prevEl ? prevEl.textContent.length : 'end';
        prev.h = clean((prev.h || '') + (b.h || ''));
        n.blocks.splice(i, 1);
        touch(n); save();
        draw({ id: prev.id, at });
        return;
      }
      if (!plain(b.h).trim() && n.blocks.length > 1 && b.t !== 'h2') { e.preventDefault(); n.blocks.splice(i, 1); touch(n); save(); draw(); }
    }
  }

  function focusBlock(id, at = 'end') {
    const el = list.querySelector(`[data-id="${id}"] .rt`);
    if (!el || !el.isContentEditable) return;
    setCaret(el, at);
    active = { b: n.blocks.find((x) => x.id === id), el };
    requestAnimationFrame(() => { const r = el.getBoundingClientRect(); if (r.top < 80 || r.bottom > window.innerHeight - 140) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  }

  // ---------- Modes ----------
  function setMode(on, focus = null) {
    commitActive();
    if (document.activeElement && page.el.contains(document.activeElement)) document.activeElement.blur();
    editing = on;
    if (!on) tidy();
    active = null; saved = null;
    page.el.classList.toggle('edit', on);
    page.el.classList.remove('typing');
    paintMode();
    drawHead();
    draw(focus);
    haptic('light');
  }
  // En sortant du mode Modifier, on range : les paragraphes vides disparaissent, les fenêtres sans titre en reçoivent un.
  function tidy() {
    const before = n.blocks.length;
    n.blocks = n.blocks.filter((b) => !(b.t === 'p' && !plain(b.h || '').trim() && !/class="(pic|pill)"/.test(b.h || '')));
    n.blocks.forEach((b) => { if (b.t === 'h2' && !plain(b.h || '').trim()) b.h = 'Sans titre'; });
    if (!n.blocks.length) n.blocks.push({ id: rid(), t: 'p', h: '' });
    if (n.blocks.length !== before) touch(n);
    if (!(n.title || '').trim()) n.title = 'Sans titre';
    page.setTitle(n.title);
    save();
  }
  function paintMode() {
    modeBtn.textContent = editing ? 'OK' : 'Modifier';
    modeBtn.classList.toggle('primary', editing);
  }

  // Appui long sur un bloc en lecture : on passe en mode Modifier, sur ce bloc.
  let lp = null;
  list.addEventListener('pointerdown', (e) => {
    if (editing || e.target.closest('input, button.box, .wmain, .wlink, .load, .tval, .bmain, .win-h')) return;
    const blk = e.target.closest('[data-id]');
    if (!blk) return;
    const x0 = e.clientX; const y0 = e.clientY;
    const cancel = () => { clearTimeout(lp && lp.t); lp = null; };
    lp = { t: setTimeout(() => { lp = null; haptic('medium'); suppress = Date.now(); const b = n.blocks.find((x) => x.id === blk.dataset.id); setMode(true, b && TEXT.includes(b.t) ? { id: b.id, at: 'end' } : null); }, 520), x0, y0, cancel };
  });
  let suppress = 0;
  list.addEventListener('pointermove', (e) => { if (lp && Math.hypot(e.clientX - lp.x0, e.clientY - lp.y0) > 10) lp.cancel(); });
  ['pointerup', 'pointercancel', 'scroll'].forEach((t) => list.addEventListener(t, () => { if (lp) lp.cancel(); }, { passive: true }));
  list.addEventListener('click', (e) => { if (Date.now() - suppress < 600) { e.stopPropagation(); e.preventDefault(); } }, true);

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
    const a = document.activeElement;
    try { document.execCommand('styleWithCSS', false, css); } catch (e) { /* rien */ }
    document.execCommand(cmd, false, val);
    if (active && a === active.el) commit(active.b, active.el);
    else if (a && a.isContentEditable) a.dispatchEvent(new Event('input'));
    haptic('light');
  }
  function insertHTML(html) {
    if (!restoreSel()) {
      const nb = { id: rid(), t: 'p', h: '' };
      n.blocks.push(nb);
      draw({ id: nb.id, at: 'end' });
    }
    document.execCommand('insertHTML', false, html);
    hydrate(active.el);
    commit(active.b, active.el);
    haptic('light');
  }
  function commitActive() { if (active && active.el && active.el.isConnected && active.el.isContentEditable) commit(active.b, active.el); }

  function insertAt(index, block, { focus = true } = {}) {
    const b = { id: rid(), ...block };
    n.blocks.splice(index, 0, b);
    touch(n); save();
    draw(focus && TEXT.includes(b.t) ? { id: b.id, at: 'end' } : null);
    if (!TEXT.includes(b.t)) requestAnimationFrame(() => { const el = list.querySelector(`[data-id="${b.id}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); } });
    return b;
  }

  // ---------- Ajouter ----------
  function addSheet(at = null) {
    const pos = at !== null ? at : active ? n.blocks.indexOf(active.b) + 1 : n.blocks.length;
    let close = () => {};
    const opt = (id, icon, label, sub, fn) => h('button', { class: 'addopt', 'data-add': id, onclick: () => { close({ instant: true }); fn(); } },
      h('span', { class: 'ai', html: pic(icon) }), h('span', { class: 'at' }, label, sub ? h('span', { class: 'as' }, sub) : null));
    const inDays = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    close = sheet((cl) => {
      close = cl;
      return h('div', { class: 'stack' },
        h('h2', null, 'Ajouter'),
        h('div', { class: 'list-head' }, 'Texte'),
        h('div', { class: 'addlist' },
          opt('h2', 'square', 'Fenêtre', 'Un cadre avec un titre', () => insertAt(pos, { t: 'h2', h: '' })),
          opt('p', 'align-left', 'Texte', null, () => insertAt(pos, { t: 'p', h: '' })),
          opt('todo', 'check-circle', 'Case à cocher', null, () => insertAt(pos, { t: 'todo', h: '', done: false })),
          opt('goal', 'target', 'Objectif daté', 'Avec compte à rebours', () => insertAt(pos, { t: 'todo', h: '', done: false, date: inDays(30), sub: '' })),
          opt('bul', 'dot', 'Puce', null, () => insertAt(pos, { t: 'bul', h: '', m: 'dot' })),
          opt('arrow', 'arrow-right', 'Flèche', null, () => insertAt(pos, { t: 'bul', h: '', m: 'arrow-right' })),
          opt('num', 'list-check', 'Liste numérotée', null, () => insertAt(pos, { t: 'num', h: '' })),
          opt('h3', 'type', 'Petit titre', null, () => insertAt(pos, { t: 'h3', h: '' })),
          opt('call', 'info', 'Encadré', 'Pour une info importante', () => insertAt(pos, { t: 'call', h: '', c: 'blue', i: 'info' })),
          opt('div', 'dash', 'Séparateur', null, () => insertAt(pos, { t: 'div' }, { focus: false })),
        ),
        h('div', { class: 'list-head' }, 'Outils'),
        h('div', { class: 'addlist' },
          opt('table', 'clipboard', 'Tableau', 'Lignes et colonnes', () => insertAt(pos, newSpecial('table'), { focus: false })),
          opt('macros', 'apple', 'Macros', 'Protéines, glucides, lipides', () => insertAt(pos, newSpecial('macros'), { focus: false })),
          opt('week', 'calendar', 'Semaine', 'Du lundi au dimanche', () => insertAt(pos, newSpecial('week'), { focus: false })),
          opt('work', 'dumbbell', 'Séance', 'Charges par série', () => insertAt(pos, newSpecial('work'), { focus: false })),
          opt('track', 'activity', 'Suivi du jour', 'Calories, sommeil…', () => insertAt(pos, newSpecial('track'), { focus: false })),
          opt('budget', 'wallet', 'Budget', 'Lignes et total', () => insertAt(pos, newSpecial('budget'), { focus: false })),
          opt('sum', 'coins', 'Bilan', 'Entrées moins sorties', () => insertAt(pos, newSpecial('sum'), { focus: false })),
        ),
      );
    });
  }

  // ---------- Style et actions d'un bloc ----------
  function blockSheet(b) {
    let body = null;
    let closeS = () => {};
    const isText = TEXT.includes(b.t);
    const redraw = () => { draw(); const el = list.querySelector(`[data-id="${b.id}"] .rt`); active = el ? { b, el } : null; fillSheet(); };
    const setS = (k, v) => { b.s = { ...(b.s || {}) }; if (v == null) delete b.s[k]; else b.s[k] = v; touch(n); save(); redraw(); };
    const isSec = b.t === 'h2';
    const name = isSec ? 'Fenêtre' : SPECIAL_NAME[b.t] || TYPE_NAME[b.t] || (b.t === 'div' ? 'Séparateur' : 'Bloc');
    const fillSheet = () => fill(body,
      h('div', { class: 'sheet-head' }, h('h2', null, name), isSec ? h('span', { class: 'tiny muted' }, 'avec tout son contenu') : null),
      h('div', { class: 'btns two' },
        h('button', { class: 'btn', id: 'block-up', onclick: () => { if (isSec) moveSection(b, -1); else move(b, -1); closeS({ instant: true }); } }, ic('arrow-up'), 'Monter'),
        h('button', { class: 'btn', id: 'block-down', onclick: () => { if (isSec) moveSection(b, 1); else move(b, 1); closeS({ instant: true }); } }, ic('arrow-down'), 'Descendre'),
        isSec ? null : h('button', { class: 'btn', onclick: () => { const i = n.blocks.indexOf(b); const c = JSON.parse(JSON.stringify(b)); c.id = rid(); n.blocks.splice(i + 1, 0, c); touch(n); save(); draw(); closeS({ instant: true }); toast('Bloc dupliqué.', { ok: true }); } }, ic('copy'), 'Dupliquer'),
        h('button', { class: 'btn danger', id: 'block-delete', onclick: () => { closeS({ instant: true }); if (isSec) removeSection(b); else removeBlock(b); } }, ic('trash'), 'Supprimer'),
      ),
      isSec && progressOf(n.blocks.indexOf(b)).done ? h('button', { class: 'btn block', onclick: () => { closeS({ instant: true }); uncheckSection(b); } }, ic('repeat'), 'Décocher toutes les cases') : null,
      isText && !isSec ? [
        h('div', { class: 'list-head' }, 'Type'),
        h('div', { class: 'chips' }, Object.entries(TYPE_NAME).map(([t, l]) => h('button', { class: 'chip', 'data-type': t, 'aria-pressed': String(b.t === t), onclick: () => {
          b.t = t;
          if (t === 'todo' && b.done === undefined) b.done = false;
          if (t === 'bul' && !b.m) b.m = 'dot';
          if (t === 'call') { b.c = b.c || 'blue'; b.i = b.i || 'info'; }
          touch(n); save(); redraw();
        } }, l))),
      ] : null,
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
        dots(b.c || 'blue', (c) => { b.c = c; touch(n); save(); redraw(); }),
        h('div', { class: 'opt-line' }, h('span', null, 'Afficher sur l’accueil (avec « Copier »)'), toggle(!!b.qa, (v) => { b.qa = v; touch(n); save(); }, 'Afficher sur l’accueil')),
      ] : null,
      isText && !isSec ? [
        h('div', { class: 'list-head' }, 'Police'),
        h('div', { class: 'fontgrid' }, FONTS.map(([id, label]) => h('button', { class: 'fontopt f-' + id, 'data-font': id, 'aria-pressed': String(((b.s && b.s.f) || 'sans') === id), onclick: () => setS('f', id === 'sans' ? null : id) }, h('span', { class: 'fx' }, 'Aa'), h('span', { class: 'fl' }, label)))),
        h('div', { class: 'list-head' }, 'Taille'),
        seg(SIZES, (b.s && b.s.z) || 'm', (v) => setS('z', v === 'm' ? null : v)),
        h('div', { class: 'list-head' }, 'Couleur du texte'),
        dots((b.s && b.s.c) || 'ink', (c) => setS('c', c === 'ink' ? null : c)),
        h('div', { class: 'list-head' }, 'Alignement'),
        seg([['left', 'À gauche'], ['center', 'Centré']], (b.s && b.s.a) || 'left', (v) => setS('a', v === 'left' ? null : v)),
      ] : null,
    );
    closeS = sheet(() => { body = h('div', { class: 'stack' }); fillSheet(); return body; });
  }

  function move(b, d) {
    const i = n.blocks.indexOf(b);
    const j = i + d;
    if (j < 0 || j >= n.blocks.length) return;
    n.blocks.splice(i, 1);
    n.blocks.splice(j, 0, b);
    touch(n); save(); haptic('light');
    draw();
    flash(b.id);
  }
  function moveSection(b, d) {
    const s = n.blocks.indexOf(b);
    const e = sectionEnd(s);
    if (d < 0) {
      if (s === 0) return;
      let p = s - 1;
      while (p > 0 && !HEAD.includes(n.blocks[p].t)) p -= 1;
      const chunk = n.blocks.splice(s, e - s);
      n.blocks.splice(p, 0, ...chunk);
    } else {
      if (e >= n.blocks.length) return;
      const e2 = sectionEnd(e);
      const chunk = n.blocks.splice(s, e - s);
      n.blocks.splice(s + (e2 - e), 0, ...chunk);
    }
    touch(n); save(); haptic('light');
    draw();
    flash(b.id);
  }
  function flash(id) {
    requestAnimationFrame(() => {
      const el = list.querySelector(`[data-id="${id}"]`);
      const box = el && (el.closest('.win') || el);
      if (!box) return;
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
    });
  }
  function removeBlock(b) {
    const i = n.blocks.indexOf(b);
    if (i < 0) return;
    const removed = n.blocks.splice(i, 1)[0];
    if (!n.blocks.length) n.blocks.push({ id: rid(), t: 'p', h: '' });
    touch(n); save(); sfx('del'); draw();
    toast('Bloc supprimé.', { action: { label: 'Annuler', fn: () => { n.blocks.splice(i, 0, removed); touch(n); save(); draw(); } } });
  }
  function removeSection(b) {
    const s = n.blocks.indexOf(b);
    const e = sectionEnd(s);
    const chunk = n.blocks.splice(s, e - s);
    if (!n.blocks.length) n.blocks.push({ id: rid(), t: 'p', h: '' });
    touch(n); save(); sfx('del'); draw();
    toast('Fenêtre supprimée.', { action: { label: 'Annuler', fn: () => { n.blocks.splice(s, 0, ...chunk); touch(n); save(); draw(); } } });
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

  // Frappe en cours (pour montrer la bonne barre en bas)
  const isTextTarget = (t) => t && (t.isContentEditable || t.id === 'note-title');
  page.el.addEventListener('focusin', (e) => { if (editing && isTextTarget(e.target)) page.el.classList.add('typing'); });
  page.el.addEventListener('focusout', () => setTimeout(() => {
    const a = document.activeElement;
    if (!a || !page.el.contains(a) || !isTextTarget(a)) page.el.classList.remove('typing');
  }, 120));

  const view = h('div', { class: 'note-wrap' }, headEl, hintEl, list, tools, ebar);
  paintMode();
  drawHead();
  draw();
  return {
    view, navRight,
    focusTitle: () => { if (titleInput) titleInput.focus({ preventScroll: true }); },
    finish: () => { commitActive(); if (editing) { editing = false; tidy(); } },
    redraw: () => { drawHead(); draw(); },
    setMode,
  };
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
  let c = existing ? existing.dataset.c : 'blue';
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

function noteMenu(n, page) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, n.title || 'Note'),
    h('div', { class: 'group noicon' },
      h('button', { class: 'item', id: 'note-pin', onclick: () => { n.pinned = !n.pinned; save(); close(); toast(n.pinned ? 'Épinglée en haut de l’accueil.' : 'Désépinglée.', { ok: true }); } }, h('div', { class: 'grow t' }, n.pinned ? 'Désépingler' : 'Épingler sur l’accueil')),
      h('button', { class: 'item', id: 'note-book', onclick: () => { close({ instant: true }); chooseBook(n, () => { if (current) current.redraw(); }); } }, h('div', { class: 'grow t' }, 'Changer de carnet'), h('span', { class: 'v' }, (bookById(n.book) || {}).name || '')),
      h('button', { class: 'item', onclick: () => { close({ instant: true }); pictoSheet((id, c) => { n.icon = id; if (c && c !== 'ink') n.color = c; touch(n); save(); if (current) current.redraw(); }, n.color); } }, h('div', { class: 'grow t' }, 'Picto et couleur')),
      h('button', { class: 'item', onclick: () => { close({ instant: true }); const c = duplicateNote(n); page.close({ instant: true, silent: true }); openNote(c.id); toast('Note dupliquée.', { ok: true }); } }, h('div', { class: 'grow t' }, 'Dupliquer')),
      h('button', { class: 'item', onclick: async () => { close({ instant: true }); const text = toText(n); if (navigator.share) { try { await navigator.share({ title: n.title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } } toast((await copyText(text)) ? 'Note copiée.' : 'Copie impossible.', { ok: true }); } }, h('div', { class: 'grow t' }, 'Envoyer ou copier le texte')),
      h('button', { class: 'item danger', id: 'note-delete', onclick: () => {
        close({ instant: true });
        removeNote(n.id); page.close(); sfx('del');
        toast('Note mise à la corbeille (30 jours).', { action: { label: 'Annuler', fn: () => { restoreNote(n.id); openNote(n.id); } } });
      } }, h('div', { class: 'grow t' }, 'Supprimer la note')),
    ),
  ));
}

export function chooseBook(n, after) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Carnet'),
    h('div', { class: 'group noicon' }, state.books.map((bk) => h('button', { class: 'item', 'aria-pressed': String(n.book === bk.id), onclick: () => { n.book = bk.id; save(); close(); if (after) after(); } },
      h('span', { class: 'ntile xs c-' + bk.color, html: pic(bk.icon) }), h('div', { class: 'grow t' }, bk.name), n.book === bk.id ? h('span', { class: 'chev', html: ICON.check }) : null))),
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
    else if (b.t === 'table') { if (b.cols.some((c) => plain(c).trim())) out.push(b.cols.map(plain).join(' | ')); b.rows.forEach((r) => out.push(r.map(plain).join(' | '))); }
    else if (TEXT.includes(b.t)) out.push(t);
  }
  return out.join('\n').trim();
}
