// Réglages (la roue dentée) et mon profil.

import { state, save, onChange, myCard, exportData, importData, wipe, ageCategory, myRecord } from '../store.js';
import { h, fill, ICON, push, sheet, toast, seg, toggle, belt, BELTS, BELT_NAME, AGE_NAME, ask, sfx, haptic, confetti, copyText, since, countUp } from '../ui.js';
import { toCode, netStatus, stamped, send } from '../net.js';
import { qrSvg } from '../qr.js';
import { avatarOf, pickPhoto, squareJpeg } from '../people.js';
import { REFEREES } from '../data/referees.js';
import { BUILD } from '../version.js';

const item = ({ ic, c, t, s, v, onclick, right, danger, id }) => h(onclick ? 'button' : 'div', { class: 'item' + (danger ? ' danger' : ''), onclick, id },
  ic ? h('span', { class: 'ic ' + (c || ''), html: ICON[ic] }) : null,
  h('div', { class: 'grow' }, h('div', { class: 't' }, t), s ? h('div', { class: 's' }, s) : null),
  v != null ? h('span', { class: 'v' }, v) : null,
  right || (onclick ? h('span', { class: 'chev', html: ICON.chev }) : null),
);

// ---------- Partager mon profil avec mes amis ----------
let bcTimer = null;
export function broadcastProfile({ photo = false } = {}) {
  clearTimeout(bcTimer);
  bcTimer = setTimeout(async () => {
    const card = myCard();
    let thumb = null;
    if (photo && state.me.photo) {
      try { thumb = await squareJpeg(state.me.photo, 128); } catch (e) { thumb = null; }
    }
    for (const id of Object.keys(state.friends)) {
      send(id, { t: 'friend', card });
      if (thumb) send(id, { t: 'photo', data: thumb });
    }
  }, 800);
}

// ---------- Photo de profil ----------
export function editPhoto() {
  const me = state.me;
  const pick = async () => {
    const url = await pickPhoto();
    if (!url) return;
    me.photo = url;
    save();
    broadcastProfile({ photo: true });
    toast('Photo enregistrée.', { ok: true, sound: 'success' });
  };
  if (!me.photo) { pick(); return; }
  sheet((close) => h('div', { class: 'stack', style: { textAlign: 'center' } },
    h('div', { style: { display: 'grid', justifyItems: 'center' } }, avatarOf(me, { size: 120, ring: true })),
    h('h2', null, 'Photo de profil'),
    h('button', { class: 'btn primary lg block', onclick: () => { close(); pick(); } }, h('span', { html: ICON.camera, style: { display: 'contents' } }), 'Choisir une autre photo'),
    h('button', { class: 'btn danger block', onclick: () => { me.photo = null; save(); broadcastProfile(); close(); sfx('del'); toast('Photo retirée.'); } }, 'Retirer la photo'),
  ));
}

// ---------- Mon code ami ----------
export function showMyCode() {
  const code = toCode(stamped(myCard()));
  sheet((close) => h('div', { class: 'stack', style: { textAlign: 'center' } },
    h('div', { style: { display: 'grid', justifyItems: 'center', gap: '8px' } },
      avatarOf(state.me, { size: 64, ring: true }),
      h('h2', null, state.me.name),
      h('div', { class: 'muted' }, '@' + (state.me.username || '')),
    ),
    qrSvg(code),
    h('p', { class: 'muted small' }, 'Ton partenaire le scanne dans PORRADA : vous êtes amis tous les deux.'),
    h('button', {
      class: 'btn block', onclick: async () => {
        const ok = await copyText(code);
        toast(ok ? 'Code copié : envoie-le par message.' : 'Copie impossible.', { ok });
      },
    }, h('span', { html: ICON.copy, style: { display: 'contents' } }), 'Copier pour l’envoyer par message'),
  ));
}

// ---------- Champs à modifier ----------
function editText({ title, value, placeholder, type = 'text', inputmode, prefix, validate, onSave, hint }) {
  sheet((close) => {
    const input = h('input', { class: 'input', value: value || '', placeholder, type, inputmode, autocapitalize: type === 'email' || prefix ? 'off' : null, spellcheck: 'false' });
    const err = h('div', { class: 'hint' }, hint || '');
    const ok = () => {
      const v = input.value.trim();
      const msg = validate ? validate(v) : null;
      if (msg) { sfx('error'); input.classList.add('err', 'shake'); setTimeout(() => input.classList.remove('shake'), 400); err.textContent = msg; err.classList.add('err'); return; }
      onSave(v);
      close();
      toast('Enregistré.', { ok: true, sound: 'success' });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    setTimeout(() => input.focus(), 300);
    return h('div', { class: 'stack' },
      h('h2', null, title),
      prefix ? h('div', { class: 'input-wrap' }, h('span', { class: 'prefix' }, prefix), input) : input,
      err,
      h('button', { class: 'btn primary lg block', onclick: ok }, 'Enregistrer'),
    );
  });
}

function choose(title, options, value, onPick) {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, title),
    h('div', { class: 'group noicon' }, options.map(([v, l, s]) => h('button', {
      class: 'item', onclick: () => { onPick(v); close(); sfx('toggle'); },
    }, h('div', { class: 'grow' }, h('div', { class: 't' }, l), s ? h('div', { class: 's' }, s) : null),
      v === value ? h('span', { html: ICON.check, style: { color: 'var(--green)', display: 'grid', width: '22px' } }) : null))),
  ));
}

const BELT_RANK = { blanche: 0, bleue: 1, violette: 2, marron: 3, noire: 4 };
export function editBelt(after) {
  const me = state.me;
  let b = me.belt;
  let st = me.stripes || 0;
  sheet((close) => {
    const chips = h('div', { class: 'chips' });
    const drawChips = () => fill(chips, ...BELTS.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(v === b), onclick: () => { b = v; st = v === me.belt ? me.stripes || 0 : 0; drawChips(); stripes.replaceWith(stripes = mkStripes()); } }, belt(v, 0), l)));
    const mkStripes = () => seg([[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], st, (v) => { st = v; });
    let stripes = mkStripes();
    drawChips();
    return h('div', { class: 'stack' },
      h('h2', null, 'Ma ceinture'),
      chips,
      h('div', { class: 'field' }, h('span', null, 'Barrettes'), stripes),
      h('button', {
        class: 'btn primary lg block', onclick: () => {
          const up = BELT_RANK[b] > BELT_RANK[me.belt] || (b === me.belt && st > (me.stripes || 0));
          const newBelt = b !== me.belt;
          if (up) {
            me.promotions = me.promotions || [];
            me.promotions.push({ belt: b, stripes: st, at: Date.now() });
          }
          if (newBelt) me.beltSince = Date.now();
          me.belt = b; me.stripes = st;
          save();
          close();
          broadcastProfile();
          if (up) {
            setTimeout(() => { confetti(); sfx('levelup'); haptic('heavy'); }, 200);
            toast(newBelt ? `Ceinture ${BELT_NAME[b].toLowerCase()}, félicitations !` : `${st} barrette${st > 1 ? 's' : ''}, bravo !`, { ok: true, ms: 3500 });
          } else toast('Enregistré.', { ok: true });
          after && after();
        },
      }, 'Enregistrer'),
    );
  });
}

// ---------- Réglages ----------
export function openSettings() {
  push((page) => {
    const wrap = h('div');
    const draw = () => {
      const me = state.me;
      const s = state.settings;
      const status = netStatus();
      fill(wrap,
        h('h1', { class: 'page-title' }, 'Réglages'),
        h('button', { class: 'rowc', style: { padding: '14px' }, onclick: () => openMyProfile() },
          avatarOf(me, { size: 60, ring: true }),
          h('div', { class: 'grow' },
            h('div', { class: 't', style: { fontSize: '19px' } }, me.name),
            h('div', { class: 's' }, '@' + (me.username || '…')),
            h('div', { style: { marginTop: '6px' } }, belt(me.belt, me.stripes)),
          ),
          h('span', { class: 'chev', html: ICON.chev }),
        ),

        h('div', { class: 'group-title' }, 'Compte'),
        h('div', { class: 'group' },
          item({ ic: 'at', c: 'c1', t: 'Nom d’utilisateur', v: '@' + (me.username || ''), onclick: () => editText({ title: 'Nom d’utilisateur', value: me.username, prefix: '@', hint: 'Lettres, chiffres, point ou tiret bas.', validate: (v) => (/^[a-z0-9._]{3,20}$/.test(v) ? null : 'De 3 à 20 caractères : lettres minuscules, chiffres, point ou tiret bas.'), onSave: (v) => { me.username = v; save(); broadcastProfile(); } }) }),
          item({ ic: 'mail', c: 'c5', t: 'E-mail', v: me.email || 'Ajouter', onclick: () => editText({ title: 'E-mail', value: me.email, type: 'email', inputmode: 'email', validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'Cet e-mail n’a pas l’air valide.'), onSave: (v) => { me.email = v; save(); } }) }),
          item({ ic: 'user', c: 'c2', t: 'Prénom', v: me.name, onclick: () => editText({ title: 'Prénom', value: me.name, validate: (v) => (v ? null : 'Écris ton prénom.'), onSave: (v) => { me.name = v.slice(0, 24); save(); broadcastProfile(); } }) }),
          item({ ic: 'cake', c: 'c3', t: 'Année de naissance', v: me.birthYear ? `${me.birthYear} · ${AGE_NAME[ageCategory(me.birthYear)].split(' (')[0]}` : 'Ajouter', onclick: () => editText({ title: 'Année de naissance', value: me.birthYear || '', type: 'number', inputmode: 'numeric', validate: (v) => { const y = Number(v); return y >= 1930 && y <= new Date().getFullYear() - 4 ? null : 'Année à vérifier.'; }, onSave: (v) => { me.birthYear = Number(v); save(); } }) }),
          item({ ic: 'flag', c: 'c7', t: 'Catégorie', v: me.sex === 'f' ? 'Femmes' : 'Hommes', onclick: () => choose('Tu combats chez les', [['m', 'Hommes'], ['f', 'Femmes']], me.sex, (v) => { me.sex = v; save(); }) }),
        ),

        h('div', { class: 'group-title' }, 'Ma pratique'),
        h('div', { class: 'group' },
          item({ ic: 'belt', c: 'c1', t: 'Ceinture', v: `${BELT_NAME[me.belt]}${me.stripes ? ' · ' + me.stripes + ' barrette' + (me.stripes > 1 ? 's' : '') : ''}`, onclick: () => editBelt() }),
          item({ ic: 'home', c: 'c4', t: 'Académie', v: me.academy || 'Ajouter', onclick: () => editText({ title: 'Mon académie', value: me.academy, placeholder: 'Nom de ton club', onSave: (v) => { me.academy = v.slice(0, 40); save(); broadcastProfile(); } }) }),
          item({ ic: 'scale', c: 'c3', t: 'Poids', v: me.weight ? `${me.weight} kg` : 'Ajouter', onclick: () => editText({ title: 'Mon poids (kg)', value: me.weight || '', type: 'number', inputmode: 'decimal', hint: 'Sert à trouver ta catégorie de poids chez les arbitres.', validate: (v) => { const w = Number(String(v).replace(',', '.')); return w >= 20 && w <= 250 ? null : 'Poids à vérifier.'; }, onSave: (v) => { me.weight = Math.round(Number(String(v).replace(',', '.')) * 10) / 10; save(); } }) }),
          item({ ic: 'flame', c: 'c6', t: 'Objectif par semaine', v: `${s.weeklyGoal || 3} séances`, onclick: () => choose('Séances par semaine', [1, 2, 3, 4, 5, 6].map((n) => [n, `${n} séance${n > 1 ? 's' : ''}`]), s.weeklyGoal || 3, (v) => { s.weeklyGoal = v; save(); }) }),
          item({ ic: 'whistle', c: 'c2', t: 'Ma fédération', v: s.fed ? (REFEREES.find((r) => r.id === s.fed) || {}).short : 'Aucune', onclick: () => choose('Ma fédération', [[null, 'Aucune en particulier'], ...REFEREES.map((r) => [r.id, r.short, r.full])], s.fed || null, (v) => { s.fed = v; save(); }) }),
        ),

        h('div', { class: 'group-title' }, 'Apparence'),
        h('div', { class: 'group' },
          item({ ic: 'camera', c: 'c5', t: 'Photo de profil', v: me.photo ? 'Changer' : 'Ajouter', onclick: () => editPhoto() }),
          item({ ic: 'moon', c: 'c7', t: 'Thème', right: seg([['auto', 'Auto'], ['dark', 'Sombre'], ['light', 'Clair']], s.theme || 'auto', (v) => { s.theme = v; save(); }, { cls: 'sm' }) }),
          item({ ic: 'motion', c: 'c4', t: 'Réduire les animations', right: toggle(!!s.reduceMotion, (v) => { s.reduceMotion = v; save(); }, 'Réduire les animations') }),
        ),

        h('div', { class: 'group-title' }, 'Sons et vibrations'),
        h('div', { class: 'group' },
          item({ ic: 'sound', c: 'c1', t: 'Sons de l’appli', right: toggle(s.sound !== false, (v) => { s.sound = v; save(); }, 'Sons de l’appli') }),
          item({ ic: 'timer', c: 'c6', t: 'Bips du chrono', s: 'Compte à rebours, fin de round', right: toggle(s.timerSound !== false, (v) => { s.timerSound = v; save(); }, 'Bips du chrono') }),
          item({ ic: 'vibrate', c: 'c3', t: 'Vibrations', right: toggle(s.haptics !== false, (v) => { s.haptics = v; save(); if (v) haptic('medium'); }, 'Vibrations') }),
        ),

        h('div', { class: 'group-title' }, 'Amis'),
        h('div', { class: 'group' },
          item({ ic: 'qr', c: 'c2', t: 'Mon code ami', onclick: showMyCode }),
          item({ ic: 'wifi', c: status === 'online' ? 'c4' : 'c7', t: 'Connexion avec les amis', v: status === 'online' ? 'En direct' : status === 'connecting' ? 'Connexion…' : 'Hors ligne', onclick: () => sheet(() => h('div', { class: 'stack' }, h('h2', null, status === 'online' ? 'Relié en direct' : 'Hors ligne'), h('p', { class: 'muted' }, status === 'online' ? 'Invitations, messages et résultats arrivent tout de suite sur le téléphone de tes amis. Ils sont chiffrés : seul ton ami peut les lire.' : 'Sans réseau, tout marche quand même : les invitations et les résultats passent par QR code. Les messages partiront dès que tu auras du réseau.'))) }),
        ),

        h('div', { class: 'group-title' }, 'Mes données'),
        h('div', { class: 'group' },
          item({ ic: 'download', c: 'c5', t: 'Exporter une sauvegarde', s: 'À faire avant de changer de téléphone', onclick: exportFile }),
          item({ ic: 'upload', c: 'c7', t: 'Importer une sauvegarde', onclick: importFile }),
          item({ ic: 'trash', c: 'c6', t: 'Supprimer mon compte', danger: true, onclick: deleteAccount }),
        ),

        h('div', { class: 'group-title' }, 'À propos'),
        h('div', { class: 'group' },
          item({ ic: 'help', c: 'c1', t: 'Comment ça marche', onclick: howItWorks }),
          item({ ic: 'shield', c: 'c4', t: 'Confidentialité', onclick: privacy }),
          item({ ic: 'info', c: 'c7', t: 'Version', v: BUILD.startsWith('__') ? 'de test' : BUILD }),
        ),
        h('p', { class: 'disclaimer', style: { margin: '20px 0 0' } }, 'PORRADA, faite pour les pratiquants de JJB et de grappling.'),
      );
    };
    draw();
    live(page, draw);
    return wrap;
  }, { title: 'Réglages' });
}

// Redessine une page tant qu'elle est ouverte
export function live(page, fn) {
  let raf = 0;
  page.onClosed(onChange(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (page.isOpen()) fn(); }); }));
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
  toast('Sauvegarde téléchargée.', { ok: true });
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
      toast('Sauvegarde importée.', { ok: true, sound: 'success' });
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      sfx('error');
      toast(e.message || 'Fichier illisible.');
    }
  };
  input.click();
}

async function deleteAccount() {
  const ok = await ask('Supprimer ton compte ?', 'Ton profil, tes amis, ton journal et tes combats seront effacés de ce téléphone. Pense à exporter une sauvegarde avant.', 'Tout supprimer', { danger: true });
  if (!ok) return;
  wipe();
  location.hash = '';
  location.reload();
}

function info(title, paras) {
  push(() => h('div', null, h('h1', { class: 'page-title' }, title), h('div', { class: 'card stack' }, paras.map((p) => h('p', null, p)))), { title });
}
function howItWorks() {
  info('Comment ça marche', [
    'Pas de serveur à nous : ton compte, ton journal, ta stratégie et tes combats restent sur ce téléphone.',
    'Pour ajouter un ami, l’un scanne le code de l’autre. Vous échangez une clé secrète : vos messages, invitations et résultats sont chiffrés, seul l’ami peut les lire.',
    'Avec du réseau, tout arrive en direct par un relais public gratuit. Sans réseau, les invitations et les résultats passent par QR code.',
    'Ta stratégie de jeu est calculée par l’appli à partir de tes réponses, sans connexion.',
    'Les arbitres répondent à partir des règlements officiels, vérifiés en octobre 2026. Le règlement de chaque événement fait toujours foi.',
  ]);
}
function privacy() {
  info('Confidentialité', [
    'Ton e-mail, ton année de naissance et ton poids ne quittent jamais ton téléphone.',
    'Tes amis reçoivent seulement : ton prénom, ton nom d’utilisateur, ta ceinture, ton académie et ta photo de profil, si tu en as mis une.',
    'Ton journal est privé : personne d’autre ne le voit.',
  ]);
}

// ---------- Mon profil ----------
function trophies() {
  const me = state.me;
  const rec = myRecord();
  const sessions = state.journal.length;
  const given = state.journal.reduce((n, s) => n + (s.given || []).length, 0);
  return [
    ['🥋', 'Premier cours', sessions >= 1],
    ['🔥', '10 séances', sessions >= 10],
    ['🏆', '1re victoire', rec.wins >= 1],
    ['⚡', '3 victoires d’affilée', rec.streak >= 3],
    ['🎯', '10 soumissions', given >= 10],
    ['🧠', 'Stratège', state.game.versions.length >= 1],
    ['🤝', '3 amis', Object.keys(state.friends).length >= 3],
    ['🎖️', 'Promu', (me.promotions || []).length >= 1],
  ];
}

export function openMyProfile() {
  push((page) => {
    const wrap = h('div');
    const draw = () => {
      const me = state.me;
      const rec = myRecord();
      const sessions = state.journal.length;
      const given = state.journal.reduce((n, s) => n + (s.given || []).length, 0);
      const stat = (v, k) => { const el = h('div', { class: 'v' }, '0'); countUp(el, v); return h('div', { class: 'stat' }, el, h('div', { class: 'k' }, k)); };
      fill(wrap,
        h('div', { class: 'profile-hero' },
          h('div', { class: 'photo-pick' }, avatarOf(me, { size: 132, ring: true, onclick: () => editPhoto(), label: 'Changer ma photo' }), h('span', { class: 'iconbtn grad edit', html: ICON.camera, 'aria-hidden': 'true' })),
          h('h2', null, me.name),
          h('div', { class: 'handle' }, '@' + (me.username || '')),
          h('div', { class: 'hstack', style: { marginTop: '4px' } }, belt(me.belt, me.stripes, true)),
          h('div', { class: 'muted small' }, `${BELT_NAME[me.belt]} depuis ${since(me.beltSince || me.createdAt)}${me.academy ? ' · ' + me.academy : ''}`),
        ),
        h('div', { class: 'btns two', style: { margin: '16px 0' } },
          h('button', { class: 'btn', onclick: () => editPhoto() }, h('span', { html: ICON.camera, style: { display: 'contents' } }), 'Ma photo'),
          h('button', { class: 'btn', onclick: showMyCode }, h('span', { html: ICON.qr, style: { display: 'contents' } }), 'Mon code'),
        ),
        h('div', { class: 'stats' },
          stat(sessions, sessions > 1 ? 'Séances' : 'Séance'),
          stat(rec.wins, rec.wins > 1 ? 'Victoires' : 'Victoire'),
          stat(given, 'Soumissions placées'),
        ),
        h('div', { class: 'section-head section' }, h('h3', null, 'Trophées')),
        h('div', { class: 'trophies' }, trophies().map(([e, l, on]) => h('div', { class: 'trophy' + (on ? ' on' : '') }, h('span', { class: 'e' }, e), l))),
        (me.promotions || []).length ? h('div', null,
          h('div', { class: 'section-head section' }, h('h3', null, 'Mes promotions')),
          h('div', { class: 'group noicon' }, [...me.promotions].reverse().map((p) => h('div', { class: 'item' }, belt(p.belt, p.stripes), h('div', { class: 'grow t' }, `${BELT_NAME[p.belt]}${p.stripes ? `, ${p.stripes} barrette${p.stripes > 1 ? 's' : ''}` : ''}`), h('span', { class: 'v' }, new Date(p.at).toLocaleDateString('fr-CH'))))),
        ) : null,
        h('button', { class: 'btn ghost block', style: { marginTop: '18px' }, onclick: () => editBelt(draw) }, 'J’ai été promu'),
      );
    };
    draw();
    live(page, draw);
    page.setRight(h('button', { class: 'iconbtn', 'aria-label': 'Réglages', html: ICON.gear, onclick: openSettings }));
    return wrap;
  }, { title: 'Mon profil' });
}
