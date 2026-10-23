// Affichage d'une personne : photo, avatar dessiné, ou initiales.

import { h, initials } from './ui.js';
import { avatarSvg } from './avatar.js';

// person : { name, av, photo, pic, belt, stripes }
export function avatarOf(person, { size = 44, ring = false, dot = null, onclick = null, label = null } = {}) {
  const p = person || {};
  const tag = onclick ? 'button' : 'span';
  const el = h(tag, { class: 'av' + (ring ? ' ring' : ''), onclick, 'aria-label': label || (onclick ? p.name : null), type: onclick ? 'button' : null });
  el.style.setProperty('--s', size + 'px');
  const clip = h('span', { class: 'clip' });
  if (p.photo && p.pic === 'photo') {
    clip.append(h('img', { src: p.photo, alt: '' }));
  } else if (p.av) {
    clip.innerHTML = avatarSvg(p.av, { mode: 'bust', belt: p.belt, stripes: p.stripes });
  } else {
    clip.style.display = 'grid';
    clip.style.placeItems = 'center';
    clip.textContent = initials(p.name);
  }
  el.append(clip);
  if (dot !== null) el.append(h('span', { class: 'dot' + (dot ? ' on' : '') }));
  return el;
}

export function fullBody(person, cls = 'fullbody') {
  const p = person || {};
  const wrap = h('div', { style: { display: 'contents' } });
  wrap.innerHTML = avatarSvg(p.av, { mode: 'full', belt: p.belt, stripes: p.stripes });
  const svg = wrap.firstElementChild;
  svg.setAttribute('class', cls);
  return svg;
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
