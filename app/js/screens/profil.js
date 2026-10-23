// Mon profil : identité, ceinture, réglages, sauvegarde.

import { state, save, myCard, exportData, importData } from '../store.js';
import { h, full, sheet, toast, seg, belt, avatar, BELTS, AGES, icon, copyText, ask, fill } from '../ui.js';
import { toCode, netStatus, stamped } from '../net.js';
import { qrSvg } from '../qr.js';
import { BUILD } from '../version.js';

export function showMyCode() {
  const code = toCode(stamped(myCard()));
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Mon code ami'),
    h('p', { class: 'muted' }, 'Ton partenaire le scanne dans PORRADA (Amis › Scanner) et vous êtes amis tous les deux.'),
    qrSvg(code),
    h('button', {
      class: 'btn block', onclick: async () => {
        const ok = await copyText(code);
        toast(ok ? 'Code copié : envoie-le par message.' : 'Copie impossible.');
      },
    }, icon('copy'), 'Copier le code'),
    h('p', { class: 'small muted' }, 'Pas de caméra ? Envoie ce code par WhatsApp, ton partenaire le colle dans « Scanner › Coller un code ».'),
  ));
}

export function openProfile() {
  const me = state.me;
  full((close) => {
    const wrap = h('div', { class: 'inner stack' });
    const draw = () => {
      const name = h('input', { class: 'input', value: me.name, maxlength: '24', 'aria-label': 'Prénom', onchange: (e) => { if (e.target.value.trim()) { me.name = e.target.value.trim(); save(); } } });
      const status = netStatus();
      fill(wrap, 
        h('div', { class: 'bar-top' },
          h('button', { class: 'iconbtn', 'aria-label': 'Fermer', onclick: close, html: icon('close').innerHTML }),
          h('h2', { class: 'tape small' }, 'Mon profil'),
          h('span', { style: { width: '48px' } }),
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', margin: '6px 0 10px' } },
          avatar(me.name, { me: true, lg: true }),
          h('div', null, h('h2', null, me.name), h('div', { style: { marginTop: '10px' } }, belt(me.belt, me.stripes, true))),
        ),
        h('label', { class: 'field' }, h('span', null, 'Prénom'), name),
        h('div', { class: 'field' }, h('span', null, 'Ceinture'),
          h('div', { class: 'chips' }, BELTS.map(([v, l]) => h('button', {
            class: 'chip', 'aria-pressed': String(me.belt === v), onclick: () => { me.belt = v; save(); draw(); },
          }, belt(v, 0), l))),
        ),
        h('div', { class: 'field' }, h('span', null, 'Barrettes'),
          seg([[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], me.stripes || 0, (v) => { me.stripes = v; save(); draw(); })),
        h('label', { class: 'field' }, h('span', null, 'Catégorie d’âge'),
          h('select', { class: 'input', onchange: (e) => { me.age = e.target.value; save(); } }, AGES.map(([v, l]) => h('option', { value: v, selected: me.age === v }, l)))),
        h('div', { class: 'field' }, h('span', null, 'Affichage'),
          seg([['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']], state.settings.theme || 'auto', (v) => { state.settings.theme = v; save(); })),
        h('div', { class: 'field' }, h('span', null, 'Bips du chrono'),
          seg([[true, 'Activés'], [false, 'Coupés']], state.settings.sound !== false, (v) => { state.settings.sound = v; save(); })),
        h('button', { class: 'btn block', onclick: showMyCode }, icon('qr'), 'Mon code ami'),
        h('div', { class: 'card' },
          h('h3', null, status === 'online' ? 'Relié aux amis' : status === 'connecting' ? 'Connexion…' : 'Hors ligne'),
          h('p', { class: 'small muted', style: { marginTop: '6px' } }, status === 'online'
            ? 'Les invitations et les résultats arrivent en direct sur le téléphone de tes amis.'
            : 'Sans réseau, tout marche quand même : les invitations et les résultats passent par QR code.'),
        ),
        h('div', { class: 'card' },
          h('h3', null, 'Sauvegarde'),
          h('p', { class: 'small muted', style: { margin: '6px 0 12px' } }, 'Tes données sont seulement sur ce téléphone. Exporte-les avant d’en changer.'),
          h('div', { class: 'btns two' },
            h('button', { class: 'btn small', onclick: exportFile }, 'Exporter'),
            h('button', { class: 'btn small', onclick: importFile }, 'Importer'),
          ),
        ),
        h('p', { class: 'small muted', style: { textAlign: 'center' } }, `PORRADA, version ${BUILD.startsWith('__') ? 'de test' : BUILD}`),
      );
    };
    draw();
    return wrap;
  });
}

function exportFile() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const file = new File([blob], `porrada-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Sauvegarde PORRADA' }).catch(() => {});
    return;
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
}

function importFile() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    const ok = await ask('Remplacer tes données ?', 'Les données de ce téléphone seront remplacées par la sauvegarde.', 'Remplacer', { danger: true });
    if (!ok) return;
    try {
      importData(await f.text());
      toast('Sauvegarde importée.');
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast(e.message || 'Fichier illisible.');
    }
  };
  input.click();
}
