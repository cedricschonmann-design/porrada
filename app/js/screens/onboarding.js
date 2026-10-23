// Inscription : bienvenue, compte, toi, ta pratique, ta photo ou ton avatar, c'est parti.

import { state, save, createMe, importData } from '../store.js';
import { h, fill, ICON, seg, toast, sfx, haptic, belt, BELTS, confetti } from '../ui.js';
import { avatarOf, fullBody, pickPhoto } from '../people.js';
import { defaultFor } from '../avatar.js';
import { openAvatarEditor } from './avatar-editor.js';

export const LOGO = `<svg viewBox="0 0 1024 1024" aria-hidden="true"><g transform="translate(0 6)" fill="#fff">
<path class="fillin" fill-rule="evenodd" d="M512 232c-172 0-302 78-302 176s130 176 302 176 302-78 302-176-130-176-302-176zm0 64c-118 0-206 40-206 90s88 90 206 90 206-40 206-90-88-90-206-90z"/>
<g stroke="#000" stroke-width="26" stroke-linejoin="round" class="fillin"><g transform="translate(486 598) rotate(42)"><rect x="-60" y="0" width="120" height="300"/><rect x="-60" y="176" width="120" height="86" fill="#000" stroke="none"/><rect x="-60" y="192" width="120" height="12" stroke="none"/><rect x="-60" y="214" width="120" height="12" stroke="none"/><rect x="-60" y="236" width="120" height="12" stroke="none"/></g><g transform="translate(538 598) rotate(-42)"><rect x="-60" y="0" width="120" height="296"/></g><path d="M420 500 Q512 474 604 500 L618 646 Q512 676 406 646 Z"/></g>
<path class="fillin" d="M422 612 Q520 562 610 524" fill="none" stroke="#000" stroke-width="22" stroke-linecap="round"/>
<path class="draw" pathLength="1" d="M512 232c-172 0-302 78-302 176s130 176 302 176 302-78 302-176-130-176-302-176z" fill="none" stroke="#fff" stroke-width="18"/>
</g></svg>`;

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
    av: (prev && prev.av) || null,
    photo: (prev && prev.photo) || null,
    pic: (prev && prev.pic) || 'avatar',
  };
  let step = prev ? 1 : 0;
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

    if (step === 0) {
      body.append(
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '22px', textAlign: 'center' } },
          h('div', { class: 'logo-mark', html: LOGO }),
          h('div', { class: 'wordmark' }, 'PORRADA'),
          h('p', { class: 'muted', style: { fontSize: '17px', maxWidth: '300px' } }, 'Ton jeu, tes combats, ton journal et les règles des compétitions. Dans ta poche.'),
        ),
      );
      foot.append(
        h('button', { class: 'btn primary lg block', id: 'onb-start', onclick: () => go(1) }, 'Créer mon compte'),
        h('button', { class: 'btn ghost block', onclick: restore }, 'J’ai une sauvegarde'),
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
      setTimeout(() => (d.email ? user : mail).focus(), 350);
    }

    if (step === 2) {
      const name = h('input', { class: 'input', id: 'onb-name', autocomplete: 'given-name', placeholder: 'Ton prénom', value: d.name, maxlength: '24' });
      const year = h('input', { class: 'input', id: 'onb-year', type: 'number', inputmode: 'numeric', placeholder: 'Par exemple 1998', value: d.birthYear || '', min: '1930', max: String(new Date().getFullYear() - 4) });
      body.append(
        h('h1', null, 'Enchanté'),
        h('p', { class: 'muted' }, 'Ton âge et ta catégorie servent aux arbitres : durée des combats, pesée, ce qui t’est interdit.'),
        field('Prénom', name),
        field('Année de naissance', year),
        h('div', { class: 'field' }, h('span', null, 'Tu combats chez les'), seg([['m', 'Hommes'], ['f', 'Femmes']], d.sex, (v) => { d.sex = v; if (!d.avTouched) d.av = null; })),
      );
      foot.append(h('button', {
        class: 'btn primary lg block', id: 'onb-next', onclick: () => {
          if (!name.value.trim()) return err(name, 'Écris ton prénom.');
          const y = Number(year.value);
          const now = new Date().getFullYear();
          if (year.value && (y < 1930 || y > now - 4)) return err(year, 'Année de naissance à vérifier.');
          d.name = name.value.trim(); d.birthYear = year.value ? y : null;
          go(3);
        },
      }, 'Continuer'));
      setTimeout(() => name.focus(), 350);
    }

    if (step === 3) {
      const chips = h('div', { class: 'chips' });
      const drawBelts = () => fill(chips, ...BELTS.map(([v, l]) => h('button', {
        class: 'chip', 'aria-pressed': String(v === d.belt), onclick: () => { d.belt = v; drawBelts(); sfx('toggle'); },
      }, belt(v, 0), l)));
      drawBelts();
      const acad = h('input', { class: 'input', placeholder: 'Facultatif', value: d.academy, maxlength: '40', autocomplete: 'organization' });
      const kg = h('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: 'Facultatif, en kg', value: d.weight || '', step: '0.1', min: '20', max: '250' });
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
      if (!d.av) d.av = defaultFor(d.sex);
      const person = () => ({ name: d.name, av: d.av, photo: d.photo, pic: d.pic, belt: d.belt, stripes: d.stripes });
      const preview = h('div', { class: 'photo-pick' }, avatarOf(person(), { size: 132, ring: true }));
      const choose = (pic) => { d.pic = pic; draw(); };
      body.append(
        h('h1', null, 'Ta tête sur le tapis'),
        h('p', { class: 'muted' }, 'Crée ton avatar de combattant, ou mets une photo. Tu pourras changer plus tard.'),
        preview,
        h('div', { class: 'choice-grid' },
          h('button', {
            class: 'choice', id: 'onb-avatar', 'aria-pressed': String(d.pic === 'avatar'), onclick: () => {
              openAvatarEditor(d.av, { belt: d.belt, stripes: d.stripes, onSave: (av) => { d.av = av; d.avTouched = true; d.pic = 'avatar'; draw(); } });
            },
          }, h('span', { class: 'ico', html: ICON.sparkles }), 'Créer mon avatar', h('span', { class: 'd' }, 'Kimono, rashguard, cheveux…')),
          h('button', {
            class: 'choice', 'aria-pressed': String(d.pic === 'photo'), onclick: async () => {
              const url = await pickPhoto();
              if (url) { d.photo = url; choose('photo'); sfx('success'); }
            },
          }, h('span', { class: 'ico', html: ICON.camera }), 'Mettre une photo', h('span', { class: 'd' }, 'Depuis ta galerie')),
        ),
      );
      foot.append(h('button', { class: 'btn primary lg block', id: 'onb-next', onclick: () => finish() }, 'Terminer'));
    }

    if (step === 5) {
      const me = state.me;
      body.append(
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '10px', textAlign: 'center' } },
          me.pic === 'photo' && me.photo ? avatarOf(me, { size: 150, ring: true }) : fullBody(me, 'fullbody'),
          h('h1', null, `Bienvenue, ${me.name}`),
          h('p', { class: 'muted', style: { maxWidth: '300px' } }, 'Commence par construire ton jeu, ou ajoute tes partenaires pour les défier.'),
        ),
      );
      const fb = body.querySelector('.fullbody');
      if (fb) { fb.style.height = '250px'; fb.style.width = 'auto'; fb.classList.add('bounce'); }
      foot.append(h('button', { class: 'btn primary lg block', id: 'onb-done', onclick: () => { el.remove(); onDone(); } }, 'Entrer sur le tapis'));
      setTimeout(() => { confetti(); sfx('win'); haptic('heavy'); }, 250);
    }
  }

  function finish() {
    const data = {
      email: d.email, username: d.username, name: d.name, birthYear: d.birthYear, sex: d.sex,
      belt: d.belt, stripes: d.stripes, academy: d.academy, weight: d.weight, av: d.av || defaultFor(d.sex),
      photo: d.pic === 'photo' ? d.photo : null, pic: d.pic === 'photo' && d.photo ? 'photo' : 'avatar', onboarded: true,
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
    const input = h('input', { type: 'file', accept: 'application/json,.json' });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
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

  draw();
}

export function logoMark(size = 64) {
  const m = h('div', { class: 'logo-mark', html: LOGO });
  m.style.width = size + 'px'; m.style.height = size + 'px'; m.style.borderRadius = Math.round(size * 0.27) + 'px';
  return m;
}
