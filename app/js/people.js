// Affichage d'une personne : sa photo de profil, sinon ses initiales sur un dégradé.

import { h, initials, ICON } from './ui.js';

const GRADS = [
  'linear-gradient(135deg,#8a5cff,#ff4fa3)',
  'linear-gradient(135deg,#ff8a3d,#ff4f6d)',
  'linear-gradient(135deg,#1fbf8f,#2d7dff)',
  'linear-gradient(135deg,#c04dff,#5b35d6)',
  'linear-gradient(135deg,#ffb23d,#ff6a3d)',
  'linear-gradient(135deg,#2d5bff,#8a5cff)',
];
function gradFor(key) {
  let n = 0;
  for (const c of String(key || '?')) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[n % GRADS.length];
}

// person : { id, name, photo }
export function avatarOf(person, { size = 44, ring = false, dot = null, onclick = null, label = null } = {}) {
  const p = person || {};
  const tag = onclick ? 'button' : 'span';
  const el = h(tag, { class: 'av' + (ring ? ' ring' : ''), onclick, 'aria-label': label || (onclick ? p.name : null), type: onclick ? 'button' : null });
  el.style.setProperty('--s', size + 'px');
  const clip = h('span', { class: 'clip' });
  if (p.photo) {
    clip.append(h('img', { src: p.photo, alt: '' }));
  } else {
    clip.classList.add('ini');
    clip.style.background = gradFor(p.id || p.name);
    clip.textContent = initials(p.name);
  }
  el.append(clip);
  if (dot !== null) el.append(h('span', { class: 'dot' + (dot ? ' on' : '') }));
  return el;
}

// Pastille d'un arbitre : son initiale sur un dégradé, avec un petit sifflet.
export function refBadge(name, grad, size = 44) {
  const el = h('span', { class: 'av refav', 'aria-hidden': 'true' });
  el.style.setProperty('--s', size + 'px');
  const clip = h('span', { class: 'clip ini' }, initials(name));
  clip.style.background = grad;
  el.append(clip, h('span', { class: 'whistle', html: ICON.whistle }));
  return el;
}

// Choisir une photo (galerie ou appareil) : recadrée en carré, compressée.
export function pickPhoto(size = 320) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'image/*' });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) { resolve(null); return; }
      try { resolve(await squareJpeg(URL.createObjectURL(f), size, true)); } catch (e) { resolve(null); }
    };
    input.click();
  });
}

export async function squareJpeg(src, size = 128, revoke = false) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  if (revoke) URL.revokeObjectURL(src);
  return c.toDataURL('image/jpeg', 0.8);
}
