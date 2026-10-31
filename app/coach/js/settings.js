// Réglages : apparence, sons, vibrations, sauvegarde et transfert des notes.

import { state, save, exportCode, importCode, exportJSON, importJSON } from './store.js';
import { h, ICON, sheet, seg, toggle, toast, copyText, ask } from './ui.js';
import { BUILD } from './version.js';

const item = ({ ic, c, t, s, right, onclick, id }) => h(onclick ? 'button' : 'div', { class: 'item', onclick, id },
  h('span', { class: 'ic ' + (c || ''), html: ICON[ic] }),
  h('div', { class: 'grow' }, h('div', { class: 't' }, t), s ? h('div', { class: 's' }, s) : null),
  right || (onclick ? h('span', { class: 'chev', html: ICON.chev }) : null));

export function openSettings() {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Réglages'),
    h('div', { class: 'field' }, h('span', null, 'Apparence'),
      seg([['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']], state.settings.theme || 'auto', (v) => { state.settings.theme = v; save(); })),
    h('div', { class: 'group' },
      item({ ic: 'sound', c: 'c1', t: 'Sons du timer', s: 'Bips doux à 3, 2, 1 et au départ', right: toggle(state.settings.timerSound !== false, (v) => { state.settings.timerSound = v; save(); }, 'Sons du timer') }),
      item({ ic: 'vibrate', c: 'c2', t: 'Vibrations', right: toggle(state.settings.haptics !== false, (v) => { state.settings.haptics = v; save(); }, 'Vibrations') }),
    ),
    h('div', { class: 'group-title' }, 'Mes notes'),
    h('div', { class: 'group' },
      item({ ic: 'download', c: 'c4', t: 'Sauvegarder mes notes', s: 'Un fichier à garder dans Fichiers ou à t’envoyer', id: 'backup', onclick: () => { close({ instant: true }); backup(); } }),
      item({ ic: 'upload', c: 'c5', t: 'Restaurer une sauvegarde', id: 'restore', onclick: () => { close({ instant: true }); restoreFile(); } }),
      item({ ic: 'copy', c: 'c3', t: 'Transférer vers un autre téléphone', s: 'Ou de Safari vers l’appli installée', id: 'transfer', onclick: () => { close({ instant: true }); transfer(); } }),
    ),
    h('p', { class: 'tiny muted center', style: { marginTop: '6px' } }, `COACH · ${state.clients.length} client${state.clients.length > 1 ? 's' : ''} · ${state.notes.length} séance${state.notes.length > 1 ? 's' : ''} · version ${BUILD.startsWith('__') ? 'locale' : BUILD}`),
  ));
}

async function backup() {
  const name = `coach-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([exportJSON()], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Sauvegarde COACH' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Sauvegarde téléchargée.', { ok: true });
}

function restoreFile() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    if (!(await ask('Remplacer tes notes ?', 'Les notes de la sauvegarde remplacent celles du téléphone.', 'Remplacer', { danger: true }))) return;
    try { importJSON(await f.text()); toast('Sauvegarde restaurée.', { ok: true, sound: 'success' }); } catch (e) { toast(e.message || 'Fichier illisible.'); }
  };
  input.click();
}

function transfer() {
  sheet((close) => {
    const area = h('textarea', { class: 'input', id: 'transfer-code', placeholder: 'Colle ici le code copié sur l’autre téléphone', rows: '3', spellcheck: 'false', autocapitalize: 'off' });
    return h('div', { class: 'stack' },
      h('h2', null, 'Transférer mes notes'),
      h('p', { class: 'muted small' }, 'Sur l’ancien téléphone (ou dans Safari) : « Copier mon code ». Sur le nouveau (ou dans l’appli installée) : colle le code et valide.'),
      h('button', { class: 'btn primary lg block', id: 'copy-code', onclick: async () => {
        const code = await exportCode();
        toast((await copyText(code)) ? 'Code copié : colle-le sur l’autre appareil.' : 'Copie impossible.', { ok: true });
      } }, h('span', { html: ICON.copy, style: { display: 'contents' } }), 'Copier mon code'),
      h('div', { class: 'sep-or' }, 'ou'),
      area,
      h('button', { class: 'btn block', id: 'import-code', onclick: async () => {
        let text = area.value;
        if (!text.trim() && navigator.clipboard && navigator.clipboard.readText) { try { text = await navigator.clipboard.readText(); } catch (e) { /* rien */ } }
        if (!text.trim()) { toast('Colle d’abord le code.'); return; }
        if (!(await ask('Remplacer tes notes ?', 'Les notes du code remplacent celles de ce téléphone.', 'Remplacer', { danger: true }))) return;
        try { await importCode(text); close(); toast('Notes transférées.', { ok: true, sound: 'success' }); } catch (e) { toast(e.message || 'Code illisible.'); }
      } }, 'Valider le code'),
    );
  });
}
