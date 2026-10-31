// Texte enrichi : nettoyage du contenu tapé, pictos et pastilles dans le texte, curseur.

import { pic } from './pictos.js';

// Couleurs « témoin » envoyées à l'éditeur de l'iPhone, puis rangées en classes (qui suivent le thème)
const SENTINEL = {
  ink: '#fefefe', muted: '#8f8f97', red: '#ff5470', orange: '#ff8a3d', yellow: '#ffd23f',
  green: '#34e29b', teal: '#2dd4bf', blue: '#5b8cff', violet: '#a78bfa', pink: '#ff4fa3',
};
const toRgb = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
const BY_RGB = Object.fromEntries(Object.entries(SENTINEL).map(([k, v]) => [toRgb(v), k]));
const BY_HEX = Object.fromEntries(Object.entries(SENTINEL).map(([k, v]) => [v, k]));
export const sentinel = (c) => SENTINEL[c] || SENTINEL.ink;
const colorName = (v) => {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  return BY_RGB[s.replace(/\s+/g, ' ').replace(/,\s*/g, ', ')] || BY_HEX[s] || null;
};

// Garde seulement ce qu'on sait afficher : gras, italique, souligné, barré, couleurs, pictos, pastilles, retours à la ligne.
export function clean(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '');
  const out = document.createElement('div');
  walk(t.content, out);
  return out.innerHTML.replace(/(<br>)+$/, '').replace(/^(&nbsp;|\s)+$/, '');
}
function walk(src, dst) {
  for (const n of Array.from(src.childNodes)) {
    if (n.nodeType === 3) { dst.append(n.textContent.replace(/​/g, '')); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName.toLowerCase();
    if (tag === 'br') { dst.append(document.createElement('br')); continue; }
    if (n.classList.contains('pic')) {
      const s = document.createElement('span');
      s.className = 'pic';
      s.dataset.i = n.dataset.i || 'dot';
      if (n.dataset.c) s.dataset.c = n.dataset.c;
      dst.append(s);
      continue;
    }
    if (n.classList.contains('pill')) {
      const s = document.createElement('span');
      s.className = 'pill';
      s.dataset.c = n.dataset.c || 'violet';
      s.textContent = n.textContent.trim();
      if (s.textContent) dst.append(s);
      continue;
    }
    if (['script', 'style', 'svg', 'img', 'iframe', 'object'].includes(tag)) continue;
    if ((tag === 'div' || tag === 'p' || tag === 'li') && dst.childNodes.length && dst.lastChild.nodeName !== 'BR') dst.append(document.createElement('br'));
    const style = (n.getAttribute('style') || '').toLowerCase();
    const get = (prop) => { const m = style.match(new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)')); return m ? m[1].trim() : null; };
    const wraps = [];
    if (tag === 'b' || tag === 'strong' || /^(bold|[6-9]00)$/.test(get('font-weight') || '')) wraps.push('b');
    if (tag === 'i' || tag === 'em' || get('font-style') === 'italic') wraps.push('i');
    const deco = get('text-decoration') || get('text-decoration-line') || '';
    if (tag === 'u' || deco.includes('underline')) wraps.push('u');
    if (tag === 's' || tag === 'strike' || tag === 'del' || deco.includes('line-through')) wraps.push('s');
    let c = null; let hl = null;
    for (const cls of Array.from(n.classList)) {
      if (cls.startsWith('c-')) c = cls.slice(2);
      if (cls.startsWith('hl-')) hl = cls.slice(3);
    }
    c = colorName(get('color')) || colorName(tag === 'font' ? n.getAttribute('color') : null) || c;
    hl = colorName(get('background-color')) || hl;
    let target = dst;
    for (const w of wraps) { const el = document.createElement(w); target.append(el); target = el; }
    if (c || hl) {
      const span = document.createElement('span');
      span.className = [c ? 'c-' + c : '', hl ? 'hl-' + hl : ''].filter(Boolean).join(' ');
      target.append(span);
      target = span;
    }
    walk(n, target);
  }
}

// Affiche un contenu nettoyé, avec les pictos dessinés
export function fillRich(el, html) {
  el.innerHTML = clean(html);
  hydrate(el);
  return el;
}
export function hydrate(el) {
  el.querySelectorAll('.pic').forEach((p) => { p.innerHTML = pic(p.dataset.i); p.contentEditable = 'false'; });
  el.querySelectorAll('.pill').forEach((p) => { p.contentEditable = 'false'; });
}
export const picHTML = (id, c) => `<span class="pic" data-i="${id}"${c && c !== 'ink' ? ` data-c="${c}"` : ''} contenteditable="false">${pic(id)}</span>`;
export const pillHTML = (text, c) => `<span class="pill" data-c="${c}" contenteditable="false">${escapeHTML(text)}</span>`;
export const escapeHTML = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
export function plain(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '').replace(/<br\s*\/?>/g, '\n');
  return t.content.textContent;
}

// ---------- Curseur ----------
export function atStart(el) {
  const s = getSelection();
  if (!s.rangeCount) return false;
  const r = s.getRangeAt(0);
  if (!r.collapsed || !el.contains(r.startContainer)) return false;
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.startContainer, r.startOffset);
  const frag = pre.cloneContents();
  return !frag.textContent.replace(/​/g, '').length && !frag.querySelector('.pic, .pill');
}
// Coupe le texte au curseur : ce qui suit part dans un nouveau bloc
export function splitAtCaret(el) {
  const s = getSelection();
  if (!s.rangeCount) return '';
  const r = s.getRangeAt(0);
  if (!r.collapsed) r.deleteContents();
  const after = document.createRange();
  after.setStart(r.endContainer, r.endOffset);
  after.setEnd(el, el.childNodes.length);
  const div = document.createElement('div');
  div.append(after.extractContents());
  return clean(div.innerHTML);
}
export function setCaret(el, where = 'end') {
  el.focus({ preventScroll: true });
  const s = getSelection();
  const r = document.createRange();
  if (typeof where === 'number') {
    let left = where;
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = tw.nextNode();
    while (node) {
      if (node.textContent.length >= left) { r.setStart(node, left); r.collapse(true); s.removeAllRanges(); s.addRange(r); return; }
      left -= node.textContent.length;
      node = tw.nextNode();
    }
    where = 'end';
  }
  r.selectNodeContents(el);
  r.collapse(where === 'start');
  s.removeAllRanges();
  s.addRange(r);
}
export const textLength = (el) => el.textContent.length;
