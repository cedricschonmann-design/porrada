// Inscription : bienvenue, compte, toi, ta pratique, ta photo, c'est parti.

import { state, save, createMe, importData, importTransfer, isIOS, isStandalone } from '../store.js';
import { h, fill, ICON, seg, toast, sfx, haptic, belt, BELTS, confetti, sheet } from '../ui.js';
import { avatarOf, pickPhoto } from '../people.js';

export const LOGO = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><text x="512" y="613.5" text-anchor="middle" fill="#fff" style="font-family:Archivo,sans-serif;font-weight:900;font-stretch:125%;font-size:300px;letter-spacing:-0.01em">BJJ</text></svg>`;

const USER_RE = /^[a-z0-9._]{3,20}$/;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function startOnboarding(onDone) {
  const prev = state.me; // ancienne version : on garde l'identité et les amis
  const d = {
    email: (prev && prev.email) || '',
    username: (prev && prev.username) || '',
    name: (prev && prev.name) || '',
    birthYear: (prev && prev.birthYear) || '',
    sex: (prev && prev.sex) || 'm',
    belt: (prev && prev.belt) || 'blanche',
    stripes: (prev && prev.stripes) || 0,
    academy: (prev && prev.academy) || '',
    weight: (prev && prev.weight) || '',
    photo: (prev && prev.photo) || null,
  };
  let step = prev ? 1 : 0;
  let inSafari = false;
  let dir = 1;
  const STEPS = 6;
  const root = document.getElementById('app');
  const el = h('div', { class: 'onb' });
  fill(root, el);
  document.body.dataset.tab = 'jeu';

  const go = (n) => { dir = n > step ? 1 : -1; step = n; draw(); sfx(dir > 0 ? 'push' : 'close'); };
  const field = (label, input, hint) => h('label', { class: 'field' }, h('span', null, label), input, hint || null);
  const err = (input, msg) => {
    sfx('error'); haptic('medium');
    input.classList.add('err', 'shake');
    setTimeout(() => input.classList.remove('shake'), 400);
    input.focus();
    toast(msg);
  };

  function draw() {
    const top = h('div', { class: 'between', style: { minHeight: '44px' } },
      step > 0 && step < STEPS - 1 && !(prev && step === 1) ? h('button', { class: 'backbtn', onclick: () => go(step - 1) }, h('span', { html: ICON.back, style: { display: 'contents' } }), h('span', null, 'Retour')) : h('span'),
      step > 0 && step < STEPS - 1 ? h('div', { class: 'dots' }, Array.from({ length: STEPS - 2 }, (_, i) => h('i', { class: i + 1 <= step ? 'on' : '' }))) : h('span'),
      h('span', { style: { width: '80px' } }),
    );
    const body = h('div', { class: 'step' + (dir < 0 ? ' back' : '') });
    const foot = h('div', { class: 'stack', style: { marginTop: '18px' } });
    fill(el, top, body, foot);

    if (step === 0 && isIOS && !isStandalone && !inSafari) {
      // Dans Safari : on installe d'abord, sinon le compte resterait dans Safari.
      const stepRow = (n, ic, t, sub) => h('div', { class: 'rowc', style: { textAlign: 'left' } },
        h('span', { class: 'tipic', style: { fontWeight: '900' } }, ic ? h('span', { html: ICON[ic], style: { display: 'contents' } }) : n),
        h('div', { class: 'grow' }, h('div', { class: 't' }, t), sub ? h('div', { class: 's' }, sub) : null));
      body.append(
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '16px', textAlign: 'center' } },
          logoMark(84),
          h('h1', null, 'Installe PORRADA'),
          h('p', { class: 'muted', style: { maxWidth: '320px' } }, 'Crée ton compte dans l’appli installée : il y restera, même si tu fermes Safari.'),
        ),
        h('div', { class: 'stack', style: { marginTop: '6px' } },
          stepRow(1, 'share', 'Touche Partager', 'Le carré avec une flèche, en bas de Safari'),
          stepRow(2, 'plus', '« Sur l’écran d’accueil »', 'Puis Ajouter'),
          stepRow(3, 'star', 'Ouvre PORRADA depuis l’icône', 'Et crée ton compte'),
        ),
      );
      foot.append(
        h('button', { class: 'btn ghost block', onclick: () => { inSafari = true; draw(); } }, 'Continuer dans Safari quand même'),
      );
    } else if (step === 0) {
      body.append(
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '22px', textAlign: 'center' } },
          h('div', { class: 'logo-mark', html: LOGO }),
          h('div', { class: 'wordmark' }, 'PORRADA'),
          h('p', { class: 'muted', style: { fontSize: '17px', maxWidth: '300px' } }, 'Ton jeu, tes combats, ton journal et les règles des compétitions. Dans ta poche.'),
        ),
      );
      foot.append(
        h('button', { class: 'btn primary lg block', id: 'onb-start', onclick: () => go(1) }, 'Créer mon compte'),
        h('button', { class: 'btn ghost block', id: 'onb-restore', onclick: restore }, 'J’ai déjà un compte'),
      );
      setTimeout(() => sfx('levelup'), 600);
    }

    if (step === 1) {
      const mail = h('input', { class: 'input', id: 'onb-email', type: 'email', inputmode: 'email', autocomplete: 'email', placeholder: 'toi@exemple.ch', value: d.email, autocapitalize: 'off' });
      const user = h('input', { class: 'input', id: 'onb-user', autocomplete: 'username', placeholder: 'ton_pseudo', value: d.username, autocapitalize: 'off', spellcheck: 'false', maxlength: '20' });
      const uHint = h('div', { class: 'hint' }, 'Lettres, chiffres, point ou tiret bas. Tes amis le voient.');
      mail.addEventListener('input', () => {
        mail.classList.remove('err');
        if (!d.usernameTouched) {
          const s = mail.value.split('@')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._]/g, '').slice(0, 20);
          user.value = s;
        }
      });
      user.addEventListener('input', () => {
        d.usernameTouched = true;
        user.value = user.value.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9._]/g, '');
        const ok = USER_RE.test(user.value);
        user.classList.toggle('err', !!user.value && !ok);
        uHint.classList.toggle('err', !!user.value && !ok);
      });
      body.append(
        h('h1', null, prev ? 'Complète ton compte' : 'Ton compte'),
        h('p', { class: 'muted' }, prev ? 'Nouvelle version de PORRADA : il manque juste quelques infos. Tes amis et tes données sont gardés.' : 'Il reste sur ce téléphone : pas de mot de passe à retenir.'),
        field('E-mail', mail),
        field('Nom d’utilisateur', h('div', { class: 'input-wrap' }, h('span', { class: 'prefix' }, '@'), user), uHint),
      );
      foot.append(h('button', {
        class: 'btn primary lg block', id: 'onb-next', onclick: () => {
          if (!MAIL_RE.test(mail.value.trim())) return err(mail, 'Cet e-mail n’a pas l’air valide.');
          if (!USER_RE.test(user.value)) return err(user, 'Choisis un nom d’utilisateur de 3 à 20 caractères.');
          d.email = mail.value.trim(); d.username = user.value;
          go(2);
        },
      }, 'Continuer'));
    }

    if (step === 2) {
      const name = h('input', { class: 'input', id: 'onb-name', autocomplete: 'given-name', placeholder: 'Ton prénom', value: d.name, maxlength: '24', enterkeyhint: 'next' });
      const year = h('input', { class: 'input', id: 'onb-year', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '4', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Par exemple 1998', value: d.birthYear || '' });
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); year.focus(); } });
      year.addEventListener('input', () => {
        const v = year.value.replace(/\D/g, '').slice(0, 4);
        if (v !== year.value) year.value = v;
        year.classList.remove('err');
        if (v.length === 4) year.blur();
      });
      body.append(
        h('h1', null, 'Enchanté'),
        h('p', { class: 'muted' }, 'Ton âge et ta catégorie servent aux arbitres : durée des combats, pesée, ce qui t’est interdit.'),
        field('Prénom', name),
        field('Année de naissance', year),
        h('div', { class: 'field' }, h('span', null, 'Tu combats chez les'), seg([['m', 'Hommes'], ['f', 'Femmes']], d.sex, (v) => { d.sex = v; })),
      );
      foot.append(h('button', {
        class: 'btn primary lg block', id: 'onb-next', onclick: () => {
          if (!name.value.trim()) return err(name, 'Écris ton prénom.');
          const y = Number(year.value);
          const now = new Date().getFullYear();
          if (year.value && (year.value.length !== 4 || y < 1930 || y > now - 4)) return err(year, `Écris ton année de naissance en 4 chiffres, entre 1930 et ${now - 4}.`);
          d.name = name.value.trim(); d.birthYear = year.value ? y : null;
          go(3);
        },
      }, 'Continuer'));
    }

    if (step === 3) {
      const chips = h('div', { class: 'chips' });
      const drawBelts = () => fill(chips, ...BELTS.map(([v, l]) => h('button', {
        class: 'chip', 'aria-pressed': String(v === d.belt), onclick: () => { d.belt = v; drawBelts(); sfx('toggle'); },
      }, belt(v, 0), l)));
      drawBelts();
      const acad = h('input', { class: 'input', placeholder: 'Facultatif', value: d.academy, maxlength: '40', autocomplete: 'organization' });
      const kg = h('input', { class: 'input', type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Facultatif, en kg', value: d.weight ? String(d.weight).replace('.', ',') : '' });
      body.append(
        h('h1', null, 'Ta pratique'),
        h('div', { class: 'field' }, h('span', null, 'Ceinture'), chips),
        h('div', { class: 'field' }, h('span', null, 'Barrettes'), seg([[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], d.stripes, (v) => { d.stripes = v; })),
        h('div', { class: 'btns two' }, field('Académie', acad), field('Poids', kg)),
        h('p', { class: 'hint' }, 'Avec ton poids, les arbitres te donnent ta catégorie.'),
      );
      foot.append(h('button', {
        class: 'btn primary lg block', id: 'onb-next', onclick: () => {
          d.academy = acad.value.trim();
          const w = Number(String(kg.value).replace(',', '.'));
          d.weight = w >= 20 && w <= 250 ? Math.round(w * 10) / 10 : null;
          go(4);
        },
      }, 'Continuer'));
    }

    if (step === 4) {
      const person = { id: prev && prev.id, name: d.name, photo: d.photo };
      const pick = async () => { const url = await pickPhoto(); if (url) { d.photo = url; sfx('success'); haptic('medium'); draw(); } };
      body.append(
        h('h1', null, 'Ta photo de profil'),
        h('p', { class: 'muted' }, 'Tes amis la voient sur ton profil, dans vos messages et pendant vos combats.'),
        h('div', { class: 'photo-pick', style: { margin: '10px auto' } },
          avatarOf(person, { size: 132, ring: true, onclick: pick, label: 'Choisir une photo' }),
          h('span', { class: 'iconbtn grad edit', html: ICON.camera, 'aria-hidden': 'true' })),
        h('button', { class: 'btn lg block', id: 'onb-photo', onclick: pick }, h('span', { html: ICON.image, style: { display: 'contents' } }), d.photo ? 'Choisir une autre photo' : 'Choisir une photo'),
      );
      foot.append(h('button', { class: 'btn primary lg block', id: 'onb-next', onclick: () => finish() }, d.photo ? 'Terminer' : 'Plus tard'));
    }

    if (step === 5) {
      const me = state.me;
      body.append(
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '10px', textAlign: 'center' } },
          h('div', { style: { animation: 'pop .6s var(--spring) both' } }, avatarOf(me, { size: 150, ring: true })),
          h('h1', null, `Bienvenue, ${me.name}`),
          h('p', { class: 'muted', style: { maxWidth: '300px' } }, 'Commence par construire ton jeu, ou ajoute tes partenaires pour les défier.'),
        ),
      );
      foot.append(h('button', { class: 'btn primary lg block', id: 'onb-done', onclick: () => { el.remove(); onDone(); } }, 'Entrer sur le tapis'));
      setTimeout(() => { confetti(); sfx('win'); haptic('heavy'); }, 250);
    }
  }

  function finish() {
    const data = {
      email: d.email, username: d.username, name: d.name, birthYear: d.birthYear, sex: d.sex,
      belt: d.belt, stripes: d.stripes, academy: d.academy, weight: d.weight,
      photo: d.photo || null, onboarded: true,
    };
    if (prev) {
      Object.assign(state.me, data);
      if (!state.me.beltSince) state.me.beltSince = state.me.createdAt || Date.now();
      if (!state.me.promotions) state.me.promotions = [];
      save();
    } else {
      createMe({ ...data, beltSince: Date.now() });
    }
    go(5);
  }

  function restore() {
    const ta = h('textarea', { class: 'input', id: 'transfer-code', placeholder: 'PRDT1.…', 'aria-label': 'Code de transfert' });
    const doImport = async (text) => {
      try {
        await importTransfer(text);
        toast('Compte récupéré.', { ok: true, sound: 'success' });
        setTimeout(() => location.reload(), 700);
      } catch (e) { sfx('error'); toast(e.message || 'Code illisible.'); }
    };
    sheet((close) => h('div', { class: 'stack' },
      h('h2', null, 'Récupérer mon compte'),
      h('p', { class: 'muted' }, 'Dans Safari (ou sur ton ancien téléphone), va dans Réglages › Transférer mon compte, puis colle le code ici.'),
      h('button', {
        class: 'btn primary lg block', onclick: async () => {
          let text = '';
          try { text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
          if (/PRDT[01]\./.test(text)) { close(); doImport(text); } else { ta.focus(); toast('Colle le code dans la case.'); }
        },
      }, h('span', { html: ICON.paste, style: { display: 'contents' } }), 'Coller mon code'),
      ta,
      h('button', { class: 'btn block', onclick: () => { if (ta.value.trim()) { close(); doImport(ta.value); } } }, 'Valider le code'),
      h('div', { class: 'sep-or' }, 'ou'),
      h('button', {
        class: 'btn ghost block', onclick: () => {
          const input = h('input', { type: 'file', accept: 'application/json,.json' });
          input.onchange = async () => {
            const f = input.files[0];
            if (!f) return;
            try { importData(await f.text()); close(); toast('Sauvegarde importée.', { ok: true, sound: 'success' }); setTimeout(() => location.reload(), 700); } catch (e) { sfx('error'); toast(e.message || 'Fichier illisible.'); }
          };
          input.click();
        },
      }, 'Importer un fichier de sauvegarde'),
    ));
  }

  draw();
}

export function logoMark(size = 64) {
  const m = h('div', { class: 'logo-mark', html: LOGO });
  m.style.width = size + 'px'; m.style.height = size + 'px'; m.style.borderRadius = Math.round(size * 0.27) + 'px';
  return m;
}
