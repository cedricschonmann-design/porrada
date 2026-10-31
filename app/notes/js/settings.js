// Réglages : apparence, sons, et surtout la sécurité de tes notes (sauvegardes, copies automatiques, corbeille, transfert).

import { state, save, exportCode, importCode, checkCode, exportJSON, importJSON, resetContent, storageStatus, listCopies, restoreCopy, restoreNote, forgetNote, purgeTrash, keepStorage } from './store.js';
import { h, fill, ICON, sheet, seg, toggle, toast, copyText, ask, ago } from './ui.js';
import { BUILD } from './version.js';

const item = ({ ic, t, s, right, onclick, id, cls = '' }) => h(onclick ? 'button' : 'div', { class: 'item ' + cls, onclick, id },
  ic ? h('span', { class: 'ic', html: ICON[ic] }) : null,
  h('div', { class: 'grow' }, h('div', { class: 't' }, t), s ? h('div', { class: 's' }, s) : null),
  right || (onclick ? h('span', { class: 'chev', html: ICON.chev }) : null));
const dateLong = (ts) => new Date(ts).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' });

export function openSettings() {
  purgeTrash();
  keepStorage();
  sheet((close) => {
    const safety = h('div', { class: 'group', id: 'safety' }, item({ ic: 'shield', t: 'Vérification…' }));
    const paintSafety = async () => {
      const st = await storageStatus();
      const last = state.settings.lastBackup;
      const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
      const ok = (yes) => h('span', { class: 'state ' + (yes ? 'ok' : 'no') }, yes ? 'Oui' : 'Non');
      fill(safety,
        item({ ic: 'lock', t: 'Stockage protégé', s: st.persisted ? 'L’iPhone ne videra pas tes notes.' : 'Ouvre Notes depuis son icône pour le protéger.', right: ok(!!st.persisted) }),
        item({ ic: 'clock', t: 'Copies automatiques', s: st.copies.length ? `${st.copies.length} copies · la dernière ${ago(st.copies[0].at)}` : 'La première se fait dans quelques secondes.', id: 'copies', onclick: () => { close({ instant: true }); copiesSheet(); } }),
        item({ ic: 'download', t: 'Sauvegarder dans un fichier', s: days === null ? 'Jamais fait : à faire maintenant.' : `Dernière fois : ${days === 0 ? 'aujourd’hui' : `il y a ${days} jour${days > 1 ? 's' : ''}`}.`, id: 'backup', cls: days === null || days >= 7 ? 'warn' : '', onclick: () => { close({ instant: true }); backup(); } }),
        item({ ic: 'trash', t: 'Corbeille', s: (state.trash || []).length ? `${state.trash.length} note${state.trash.length > 1 ? 's' : ''} · gardées 30 jours` : 'Vide', id: 'trash', onclick: () => { close({ instant: true }); trashSheet(); } }),
      );
    };
    paintSafety();
    return h('div', { class: 'stack' },
      h('h2', null, 'Réglages'),
      h('div', { class: 'list-head' }, 'Sécurité de tes notes'),
      safety,
      h('p', { class: 'tiny muted pad' }, 'Tes notes sont gardées à deux endroits sur ce téléphone, avec une copie par jour pendant 30 jours. Le fichier de sauvegarde, lui, peut aller sur iCloud Drive : c’est ce qui te protège si tu perds ton téléphone.'),
      h('div', { class: 'list-head' }, 'Transfert'),
      h('div', { class: 'group' },
        item({ ic: 'paste', t: 'Importer un code', s: 'Coller un code NOTES1… reçu', id: 'transfer', onclick: () => { close({ instant: true }); transfer(); } }),
        item({ ic: 'copy', t: 'Copier mon code', s: 'Pour passer tes notes sur un autre téléphone', id: 'copy-my-code', onclick: async () => { const code = await exportCode(); toast((await copyText(code)) ? 'Code copié.' : 'Copie impossible.', { ok: true }); } }),
        item({ ic: 'upload', t: 'Restaurer un fichier de sauvegarde', id: 'restore', onclick: () => { close({ instant: true }); restoreFile(); } }),
      ),
      h('div', { class: 'list-head' }, 'Apparence'),
      seg([['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']], state.settings.theme || 'auto', (v) => { state.settings.theme = v; save(); }),
      h('div', { class: 'group' },
        item({ ic: 'sound', t: 'Petits sons', s: 'Quand tu coches une case', right: toggle(state.settings.sound !== false, (v) => { state.settings.sound = v; save(); }, 'Petits sons') }),
        item({ ic: 'vibrate', t: 'Vibrations', right: toggle(state.settings.haptics !== false, (v) => { state.settings.haptics = v; save(); }, 'Vibrations') }),
      ),
      h('button', { class: 'btn ghost block', id: 'reset', onclick: async () => { close({ instant: true }); if (await ask('Remettre le contenu de départ ?', 'Tes notes actuelles sont remplacées. Une copie est gardée dans les copies automatiques.', 'Remettre', { danger: true })) { await resetContent(); toast('Contenu de départ remis.', { ok: true }); } } }, 'Remettre le contenu de départ'),
      h('p', { class: 'tiny muted center' }, `Notes · ${state.books.length} carnets · ${state.notes.length} notes · version ${BUILD.startsWith('__') ? 'locale' : BUILD}`),
    );
  });
}

export async function backup() {
  const name = `notes-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([exportJSON()], name, { type: 'application/json' });
  const done = () => { state.settings.lastBackup = Date.now(); save(); };
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde Notes' });
      done();
      toast('Sauvegarde faite. Choisis « Enregistrer dans Fichiers » › iCloud Drive.', { ok: true });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(file), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  done();
  toast('Sauvegarde téléchargée.', { ok: true });
}

function restoreFile() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    if (!(await ask('Remplacer tes notes ?', 'Les notes du fichier remplacent celles du téléphone. Une copie de l’état actuel est gardée.', 'Remplacer', { danger: true }))) return;
    try { await importJSON(await f.text()); toast('Sauvegarde restaurée.', { ok: true, sound: 'success' }); } catch (e) { toast(e.message || 'Fichier illisible.'); }
  };
  input.click();
}

async function copiesSheet() {
  const copies = await listCopies().catch(() => []);
  const why = { jour: 'Copie du jour', 'avant import': 'Avant un import', 'avant restauration': 'Avant une restauration', 'avant remise à zéro': 'Avant une remise à zéro' };
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Copies automatiques'),
    h('p', { class: 'muted small' }, 'Une copie par jour (la dernière version de la journée), plus une avant chaque import. Restaurer garde aussi une copie de l’état actuel : rien n’est perdu.'),
    copies.length ? h('div', { class: 'group' }, copies.map((c) => item({
      t: dateLong(c.at) + ' · ' + new Date(c.at).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }),
      s: `${why[c.reason] || c.reason} · ${c.notes} notes`,
      right: h('button', { class: 'btn sm', onclick: async () => {
        close({ instant: true });
        if (!(await ask('Revenir à cette copie ?', `Tes notes redeviennent celles du ${dateLong(c.at)}. L’état actuel est gardé dans les copies.`, 'Restaurer'))) return;
        try { await restoreCopy(c.key); toast('Copie restaurée.', { ok: true, sound: 'success' }); } catch (e) { toast(e.message || 'Restauration impossible.'); }
      } }, 'Restaurer'),
    }))) : h('p', { class: 'muted' }, 'Pas encore de copie. La première se fait toute seule quelques secondes après une modification.'),
  ));
}

function trashSheet() {
  purgeTrash();
  sheet((close) => {
    const body = h('div', { class: 'stack' });
    const draw = () => fill(body,
      h('h2', null, 'Corbeille'),
      h('p', { class: 'muted small' }, 'Les notes supprimées restent ici 30 jours.'),
      (state.trash || []).length ? h('div', { class: 'group' }, state.trash.map((n) => item({
        t: n.title || 'Sans titre',
        s: `Supprimée ${ago(n.deletedAt)}`,
        right: h('div', { class: 'hstack' },
          h('button', { class: 'btn sm', onclick: () => { restoreNote(n.id); toast('Note restaurée.', { ok: true }); draw(); } }, 'Restaurer'),
          h('button', { class: 'iconbtn sm', 'aria-label': 'Supprimer définitivement', html: ICON.trash, onclick: async () => { close({ instant: true }); if (await ask('Supprimer définitivement ?', `« ${n.title || 'Sans titre'} » ne pourra plus être restaurée.`, 'Supprimer', { danger: true })) forgetNote(n.id); } })),
      }))) : h('p', { class: 'muted' }, 'La corbeille est vide.'),
    );
    draw();
    return body;
  });
}

export function transfer() {
  sheet((close) => {
    const area = h('textarea', { class: 'input', id: 'transfer-code', placeholder: 'Ou colle le code ici (appui long › Coller)', rows: '3', spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' });
    const info = h('p', { class: 'small muted', id: 'code-info' });
    const apply = async (text) => {
      if (!text.trim()) { toast('Copie d’abord le code, puis réessaie.'); return; }
      let n;
      try { n = await checkCode(text); } catch (e) { toast(e.message || 'Code illisible.'); return; }
      if (!(await ask(`Importer ${n.notes} notes ?`, 'Elles remplacent celles de ce téléphone. L’état actuel est gardé dans les copies automatiques (Réglages).', 'Remplacer', { danger: true }))) return;
      try { await importCode(text); close(); toast('Notes importées.', { ok: true, sound: 'success' }); } catch (e) { toast(e.message || 'Code illisible.'); }
    };
    area.addEventListener('input', async () => {
      const t = area.value.trim();
      if (!t) { info.textContent = ''; return; }
      try { const n = await checkCode(t); info.textContent = `Code valide : ${n.notes} notes dans ${n.books} carnets.`; info.className = 'small ok-text'; } catch (e) { info.textContent = e.message; info.className = 'small warn-text'; }
    });
    return h('div', { class: 'stack' },
      h('h2', null, 'Importer un code'),
      h('p', { class: 'muted small' }, '1. Copie tout le code (il commence par NOTES1.). 2. Touche le bouton ci-dessous.'),
      h('button', { class: 'btn primary lg block', id: 'paste-code', onclick: async () => {
        let text = '';
        try { text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
        if (!text.trim()) { area.focus(); toast('Colle le code dans le champ : appui long › Coller.'); return; }
        area.value = text; area.dispatchEvent(new Event('input'));
        apply(text);
      } }, h('span', { html: ICON.paste, style: { display: 'contents' } }), 'Coller depuis le presse-papiers'),
      area,
      info,
      h('button', { class: 'btn block', id: 'import-code', onclick: () => apply(area.value) }, 'Valider le code'),
    );
  });
}
