// Séances : des notes comme dans l'appli Notes de l'iPhone, rangées par client.
// Chaque client a aussi sa fiche (objectifs, blessures, infos utiles).

import {
  state, save, saveQuiet, onChange, clientById, noteById, notesOf, addClient, removeClient,
  addNote, removeNote, isEmptyNote, noteTitle, notePreview,
} from './store.js';
import { h, fill, ICON, push, sheet, ask, toast, haptic, sfx, initials, norm, day, copyText } from './ui.js';
import { header, installBanner } from './app.js';

let query = '';
export function isTyping() {
  const a = document.activeElement;
  return !!(a && (a.id === 'search' || a.closest && a.closest('.page, .sheet')) && /INPUT|TEXTAREA/.test(a.tagName));
}

// ---------- Petits morceaux ----------
const GRADS = [
  'linear-gradient(135deg,#8a5cff,#ff4fa3)', 'linear-gradient(135deg,#ff8a3d,#ff4f6d)', 'linear-gradient(135deg,#1fbf8f,#2d7dff)',
  'linear-gradient(135deg,#c04dff,#5b35d6)', 'linear-gradient(135deg,#ffb23d,#ff6a3d)', 'linear-gradient(135deg,#2d5bff,#8a5cff)',
];
function badge(name, key, size = 44) {
  let n = 0;
  for (const ch of String(key || name || '?')) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const el = h('span', { class: 'av', 'aria-hidden': 'true' });
  el.style.setProperty('--s', size + 'px');
  const clip = h('span', { class: 'clip ini' }, initials(name));
  clip.style.background = GRADS[n % GRADS.length];
  el.append(clip);
  return el;
}
const ic = (name) => h('span', { html: ICON[name], style: { display: 'contents' } });
const longDate = (ts) => {
  const d = new Date(ts);
  const s = d.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${s.charAt(0).toUpperCase() + s.slice(1)} à ${d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`;
};
const lastActivity = (c) => Math.max(c.updatedAt || 0, ...state.notes.filter((n) => n.clientId === c.id).map((n) => n.updatedAt));
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function clientRow(c) {
  const list = notesOf(c.id);
  return h('button', { class: 'rowc', 'data-client': c.id, onclick: () => openClient(c.id) },
    badge(c.name, c.id),
    h('div', { class: 'grow' },
      h('div', { class: 't ellipsis' }, c.name),
      h('div', { class: 's ellipsis' }, list.length ? `${plural(list.length, 'séance', 'séances')} · dernière le ${day(list[0].createdAt)}` : 'Aucune séance'),
    ),
    h('span', { class: 'chev', html: ICON.chev }),
  );
}
function noteRow(n, { showClient = true } = {}) {
  const c = n.clientId ? clientById(n.clientId) : null;
  const pv = notePreview(n);
  return h('button', { class: 'rowc note-row', 'data-note': n.id, onclick: () => openNote(n.id) },
    h('div', { class: 'grow' },
      h('div', { class: 't ellipsis' }, noteTitle(n)),
      h('div', { class: 's ellipsis' }, h('b', null, day(n.createdAt)), showClient && c ? `  ${c.name}` : '', pv ? `  ${pv}` : ''),
    ),
    h('span', { class: 'chev', html: ICON.chev }),
  );
}

// ---------- Écran principal ----------
export function render() {
  const results = h('div', { id: 'notes-list' });
  const input = h('input', { class: 'input', id: 'search', type: 'search', placeholder: 'Rechercher un client ou une séance', value: query, autocomplete: 'off', enterkeyhint: 'search', 'aria-label': 'Rechercher' });
  input.addEventListener('input', () => { query = input.value; drawList(results); });
  drawList(results);
  return h('div', null,
    header('Séances', { extra: h('button', { class: 'iconbtn grad', id: 'new-note', 'aria-label': 'Nouvelle séance', html: ICON.edit, onclick: () => newNote(null) }) }),
    installBanner(),
    h('div', { class: 'searchbar' }, ic('search'), input),
    results,
  );
}

function drawList(el) {
  const q = norm(query.trim());
  if (q) {
    const cs = state.clients.filter((c) => norm(c.name).includes(q) || norm(c.note).includes(q));
    const ns = state.notes.filter((n) => norm(n.title + ' ' + n.body).includes(q)).sort((a, b) => b.updatedAt - a.updatedAt);
    fill(el,
      cs.length ? [h('div', { class: 'section-head section' }, h('h3', null, 'Clients')), h('div', { class: 'rows' }, cs.map(clientRow))] : null,
      ns.length ? [h('div', { class: 'section-head section' }, h('h3', null, 'Séances')), h('div', { class: 'rows' }, ns.slice(0, 40).map((n) => noteRow(n)))] : null,
      !cs.length && !ns.length ? h('p', { class: 'muted center', style: { marginTop: '28px' } }, 'Aucun résultat.') : null,
    );
    return;
  }
  const clients = [...state.clients].sort((a, b) => lastActivity(b) - lastActivity(a));
  const loose = notesOf(null);
  const recent = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt);
  fill(el,
    h('div', { class: 'section-head section' }, h('h3', null, 'Clients'), clients.length ? h('button', { class: 'link', id: 'add-client', onclick: addClientSheet }, 'Ajouter') : null),
    clients.length || loose.length
      ? h('div', { class: 'rows' },
        clients.map(clientRow),
        loose.length ? h('button', { class: 'rowc', 'data-client': 'none', onclick: () => openClient(null) },
          h('span', { class: 'tipic', html: ICON.note }),
          h('div', { class: 'grow' }, h('div', { class: 't' }, 'Sans client'), h('div', { class: 's' }, plural(loose.length, 'séance', 'séances'))),
          h('span', { class: 'chev', html: ICON.chev })) : null,
        clients.length ? null : h('button', { class: 'btn block', id: 'add-client', onclick: addClientSheet }, ic('plus'), 'Ajouter un client'))
      : h('div', { class: 'empty' },
        h('div', { class: 'art', html: ICON.friends }),
        h('h3', null, 'Ajoute ton premier client'),
        h('p', null, 'Chaque client a sa fiche et ses séances.'),
        h('button', { class: 'btn primary', id: 'add-client', onclick: addClientSheet }, ic('plus'), 'Ajouter un client')),
    recent.length ? [
      h('div', { class: 'section-head section' }, h('h3', null, 'Dernières séances'), recent.length > 6 ? h('button', { class: 'link', onclick: openAll }, 'Tout voir') : null),
      h('div', { class: 'rows' }, recent.slice(0, 6).map((n) => noteRow(n))),
    ] : null,
  );
}

// ---------- Nouveau client ----------
export function addClientSheet(after) {
  let input = null;
  sheet((close) => {
    input = h('input', { class: 'input', id: 'client-name', placeholder: 'Prénom et nom', autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', maxlength: '60' });
    const ok = () => {
      const v = input.value.trim();
      if (!v) { input.classList.add('err', 'shake'); setTimeout(() => input.classList.remove('shake'), 400); return; }
      const c = addClient(v);
      close();
      sfx('success');
      if (typeof after === 'function') after(c); else openClient(c.id);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    return h('div', { class: 'stack' }, h('h2', null, 'Nouveau client'), input, h('button', { class: 'btn primary lg block', id: 'client-save', onclick: ok }, 'Ajouter'));
  });
  if (input) input.focus({ preventScroll: true });
}

function renameClient(c) {
  let input = null;
  sheet((close) => {
    input = h('input', { class: 'input', value: c.name, autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', maxlength: '60' });
    const ok = () => { const v = input.value.trim(); if (!v) return; c.name = v; c.updatedAt = Date.now(); save(); close(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    return h('div', { class: 'stack' }, h('h2', null, 'Renommer'), input, h('button', { class: 'btn primary lg block', onclick: ok }, 'Enregistrer'));
  });
  if (input) input.focus({ preventScroll: true });
}

// ---------- Page d'un client ----------
export function openClient(id) {
  const c0 = id ? clientById(id) : null;
  push((page) => {
    const wrap = h('div');
    const draw = () => {
      const c = id ? clientById(id) : null;
      if (id && !c) { page.close({ instant: true }); return; }
      const list = notesOf(id);
      page.setTitle(c ? c.name : 'Sans client');
      const fiche = c ? h('textarea', { class: 'input autosize', id: 'client-note', placeholder: 'Objectifs, blessures, matériel, disponibilités…' }, c.note || '') : null;
      if (fiche) {
        fiche.addEventListener('input', () => { c.note = fiche.value; c.updatedAt = Date.now(); grow(fiche); saveQuiet(); });
        requestAnimationFrame(() => grow(fiche));
      }
      fill(wrap,
        h('div', { class: 'hstack', style: { gap: '14px', margin: '0 2px 16px' } },
          c ? badge(c.name, c.id, 56) : h('span', { class: 'tipic', html: ICON.note }),
          h('div', { class: 'grow' }, h('h1', { class: 'client-name' }, c ? c.name : 'Sans client'), h('div', { class: 'muted small', style: { marginTop: '4px' } }, list.length ? plural(list.length, 'séance', 'séances') : 'Aucune séance')),
        ),
        c ? h('div', { class: 'card stack fiche' },
          h('div', { class: 'between' }, h('h3', null, 'Fiche client'), h('span', { class: 'tiny muted' }, 'Enregistrée toute seule')),
          fiche) : null,
        h('button', { class: 'btn primary lg block', id: 'new-session', style: { marginTop: '14px' }, onclick: () => newNote(id) }, ic('edit'), 'Nouvelle séance'),
        list.length ? [
          h('div', { class: 'section-head section' }, h('h3', null, 'Séances')),
          h('div', { class: 'rows' }, list.map((n) => noteRow(n, { showClient: false }))),
        ] : h('p', { class: 'muted center', style: { marginTop: '22px' } }, 'Pas encore de séance.'),
      );
    };
    if (c0) {
      page.setRight(h('button', { class: 'iconbtn', 'aria-label': 'Options du client', id: 'client-more', html: ICON.more, onclick: () => sheet((close) => h('div', { class: 'stack' },
        h('h2', null, c0.name),
        h('div', { class: 'group noicon' },
          h('button', { class: 'item', onclick: () => { close({ instant: true }); renameClient(clientById(id)); } }, h('div', { class: 'grow t' }, 'Renommer')),
          h('button', { class: 'item danger', id: 'client-delete', onclick: async () => {
            close({ instant: true });
            const n = notesOf(id).length;
            if (await ask(`Supprimer ${clientById(id).name} ?`, n ? `Ses ${plural(n, 'séance', 'séances')} seront aussi supprimées.` : null, 'Supprimer', { danger: true })) {
              removeClient(id); sfx('del'); page.close(); toast('Client supprimé.');
            }
          } }, h('div', { class: 'grow t' }, 'Supprimer le client'))),
      )) }));
    }
    draw();
    const off = onChange(() => { if (!isTyping()) draw(); });
    page.onClosed(() => { off(); save(); });
    return wrap;
  }, { title: c0 ? c0.name : 'Sans client' });
}

// ---------- Toutes les séances ----------
function openAll() {
  push(() => {
    const all = [...state.notes].sort((a, b) => b.createdAt - a.createdAt);
    const groups = new Map();
    for (const n of all) {
      const d = new Date(n.createdAt);
      const k = d.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(n);
    }
    return h('div', null,
      h('h1', { class: 'page-title' }, 'Toutes les séances'),
      [...groups].map(([k, list]) => [h('div', { class: 'list-head' }, k.charAt(0).toUpperCase() + k.slice(1)), h('div', { class: 'rows' }, list.map((n) => noteRow(n)))]),
    );
  }, { title: 'Toutes les séances' });
}

// ---------- Une séance (une note) ----------
function grow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

export function newNote(clientId) {
  const n = addNote(clientId);
  openNote(n.id, { fresh: true });
}

export function openNote(id, { fresh = false } = {}) {
  const n = noteById(id);
  if (!n) return;
  let titleEl = null;
  const page = push((pg) => {
    const meta = h('div', { class: 'note-meta' }, longDate(n.createdAt));
    const clientBtn = h('button', { class: 'chip', id: 'note-client', onclick: () => chooseClient(n, () => drawClient()) });
    const drawClient = () => { const c = n.clientId ? clientById(n.clientId) : null; fill(clientBtn, ic('user'), c ? c.name : 'Choisir un client'); };
    drawClient();
    titleEl = h('input', { class: 'note-title', id: 'note-title', placeholder: 'Titre', value: n.title || '', autocomplete: 'off', autocapitalize: 'sentences', enterkeyhint: 'next', maxlength: '120', 'aria-label': 'Titre de la séance' });
    const body = h('textarea', { class: 'note-body', id: 'note-body', placeholder: 'Échauffement, exercices, séries, charges, ressenti…', 'aria-label': 'Contenu de la séance' }, n.body || '');
    const touch = () => { n.title = titleEl.value; n.body = body.value; n.updatedAt = Date.now(); saveQuiet(); };
    titleEl.addEventListener('input', touch);
    titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); body.focus(); body.setSelectionRange(0, 0); } });
    body.addEventListener('input', () => { grow(body); touch(); });
    body.addEventListener('keydown', (e) => continueList(e, body));
    requestAnimationFrame(() => grow(body));

    // Barre d'outils : listes et heure, comme dans Notes
    const insertAtLineStart = (prefix) => {
      const pos = body.selectionStart;
      const start = body.value.lastIndexOf('\n', pos - 1) + 1;
      const line = body.value.slice(start, body.value.indexOf('\n', start) < 0 ? undefined : body.value.indexOf('\n', start));
      if (/^(•|\d+[.)])\s/.test(line)) return;
      body.setRangeText(prefix, start, start, 'end');
      body.dispatchEvent(new Event('input'));
    };
    const tools = h('div', { class: 'note-tools' },
      h('button', { class: 'chip', id: 'tool-bullet', 'data-silent': '', onmousedown: (e) => e.preventDefault(), onclick: () => { body.focus(); insertAtLineStart('• '); } }, '• Liste'),
      h('button', { class: 'chip', id: 'tool-number', 'data-silent': '', onmousedown: (e) => e.preventDefault(), onclick: () => { body.focus(); insertAtLineStart('1. '); } }, '1. Liste'),
      h('button', { class: 'chip', id: 'tool-time', 'data-silent': '', onmousedown: (e) => e.preventDefault(), onclick: () => { body.focus(); body.setRangeText(new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) + ' ', body.selectionStart, body.selectionEnd, 'end'); body.dispatchEvent(new Event('input')); } }, 'Heure'),
      h('button', { class: 'chip done', id: 'note-done', onclick: () => { document.activeElement && document.activeElement.blur(); } }, 'OK'),
    );

    pg.setRight(h('button', { class: 'iconbtn', 'aria-label': 'Options de la séance', id: 'note-more', html: ICON.more, onclick: () => noteMenu(n, pg) }));
    pg.onClosed(() => {
      n.title = titleEl.value; n.body = body.value;
      if (isEmptyNote(n)) removeNote(n.id); else save();
    });
    return h('div', { class: 'note' }, meta, h('div', { class: 'center' }, clientBtn), titleEl, body, tools);
  }, { title: '', cls: 'notepage' });
  // Tout de suite, dans le même geste : l'iPhone ouvre le clavier sur le titre.
  if (fresh && titleEl) titleEl.focus({ preventScroll: true });
  return page;
}

// Retour à la ligne : la liste continue toute seule (• ou 1. 2. 3.), comme dans Notes.
function continueList(e, body) {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const v = body.value;
  const pos = body.selectionStart;
  if (pos !== body.selectionEnd) return;
  const start = v.lastIndexOf('\n', pos - 1) + 1;
  const line = v.slice(start, pos);
  const m = line.match(/^(\s*)(•|-|–|\d+[.)])\s+/);
  if (!m) return;
  e.preventDefault();
  if (line.trim() === m[2]) {
    body.setRangeText('', start, pos, 'end');
  } else {
    let bullet = m[2];
    const num = bullet.match(/^(\d+)([.)])$/);
    if (num) bullet = Number(num[1]) + 1 + num[2];
    body.setRangeText('\n' + m[1] + bullet + ' ', pos, pos, 'end');
  }
  body.dispatchEvent(new Event('input'));
}

function chooseClient(n, after) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Pour quel client ?'),
    h('div', { class: 'rows' },
      state.clients.map((c) => h('button', { class: 'rowc', 'aria-pressed': String(n.clientId === c.id), onclick: () => { n.clientId = c.id; n.updatedAt = Date.now(); save(); close(); after(); haptic('light'); } },
        badge(c.name, c.id, 36), h('div', { class: 'grow t' }, c.name), n.clientId === c.id ? h('span', { class: 'chev', html: ICON.check }) : null)),
      h('button', { class: 'rowc', onclick: () => { n.clientId = null; save(); close(); after(); } }, h('span', { class: 'tipic', html: ICON.note }), h('div', { class: 'grow t' }, 'Sans client'), !n.clientId ? h('span', { class: 'chev', html: ICON.check }) : null),
    ),
    h('button', { class: 'btn block', onclick: () => { close({ instant: true }); addClientSheet((c) => { n.clientId = c.id; save(); after(); }); } }, ic('plus'), 'Nouveau client'),
  ));
}

function noteMenu(n, pg) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, noteTitle(n)),
    h('div', { class: 'group noicon' },
      h('button', { class: 'item', id: 'note-duplicate', onclick: () => {
        close({ instant: true });
        const copy = addNote(n.clientId, { title: n.title, body: n.body });
        pg.close({ instant: true, silent: true });
        openNote(copy.id);
        toast('Séance dupliquée : modifie-la pour aujourd’hui.', { ok: true });
      } }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'Dupliquer'), h('div', { class: 's' }, 'Pour refaire la même séance'))),
      h('button', { class: 'item', onclick: async () => {
        close({ instant: true });
        const text = [noteTitle(n), n.body].filter(Boolean).join('\n\n');
        if (navigator.share) { try { await navigator.share({ title: noteTitle(n), text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        toast((await copyText(text)) ? 'Séance copiée.' : 'Copie impossible.', { ok: true });
      } }, h('div', { class: 'grow t' }, 'Envoyer ou copier')),
      h('button', { class: 'item danger', id: 'note-delete', onclick: async () => {
        close({ instant: true });
        if (await ask('Supprimer cette séance ?', null, 'Supprimer', { danger: true })) {
          n.title = ''; n.body = '';
          removeNote(n.id); sfx('del'); pg.close();
        }
      } }, h('div', { class: 'grow t' }, 'Supprimer')),
    ),
  ));
}
