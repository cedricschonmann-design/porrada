// Banque de pictos (trait 2, grille 24, comme le reste de l'appli). Aucun emoji.

import { ICON } from './ui.js';

const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const NEW = {
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'arrow-up': '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  'arrow-down-right': '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
  'corner': '<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  'arrows-lr': '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  'chevrons': '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
  'trend-up': '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  'trend-down': '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  'repeat': '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'alert': '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'bookmark': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  'pin': '<path d="M12 17v5"/><path d="M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V17h14v-1.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/>',
  'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  'dot': '<circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
  'circle': '<circle cx="12" cy="12" r="8.5"/>',
  'square': '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  'diamond': '<path d="M12 3 21 12 12 21 3 12z"/>',
  'triangle': '<path d="M12 4 21 20H3z"/>',
  'dash': '<path d="M6 12h12"/>',
  'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5A6 6 0 1 0 7.5 11.5c.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'key': '<circle cx="7.5" cy="15.5" r="5"/><path d="m11 12 10-10"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  'hourglass': '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22"/><path d="M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
  'alarm': '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>',
  'cal-check': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  'bed': '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  'dumbbell': '<rect x="4" y="6.5" width="3.5" height="11" rx="1"/><rect x="16.5" y="6.5" width="3.5" height="11" rx="1"/><path d="M7.5 12h9"/><path d="M2 10v4"/><path d="M22 10v4"/>',
  'kettlebell': '<circle cx="12" cy="15" r="6"/><path d="M8.7 10.2 8 8a4 4 0 0 1 8 0l-.7 2.2"/>',
  'trophy': '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>',
  'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'bike': '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  'apple': '<path d="M12 7c-1.5-1-4-1.2-5.6.3C4.8 8.8 4.5 11.4 5.2 14 6 17 8 20.5 10 20.5c.9 0 1.3-.5 2-.5s1.1.5 2 .5c2 0 4-3.5 4.8-6.5.7-2.6.4-5.2-1.2-6.7C16 5.8 13.5 6 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  'drop': '<path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z"/>',
  'utensils': '<path d="M3 2v7a3 3 0 0 0 6 0V2"/><path d="M6 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
  'book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  'book-open': '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  'grad': '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
  'pencil': '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>',
  'clipboard': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  'list-check': '<path d="M11 6h10"/><path d="M11 12h10"/><path d="M11 18h10"/><path d="m3 6 1.5 1.5L7 5"/><path d="m3 12 1.5 1.5L7 11"/><path d="m3 18 1.5 1.5L7 17"/>',
  'flask': '<path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.5V3"/><path d="M7.5 15h9"/>',
  'atom': '<circle cx="12" cy="12" r="1.2" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  'dna': '<path d="M3 15c6-6 12 0 18-6"/><path d="M3 9c6 6 12 0 18 6"/><path d="M7.5 10v4"/><path d="M12 11v2"/><path d="M16.5 10v4"/>',
  'landmark': '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2 20 7H4z"/>',
  'palette': '<circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2c0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3a1.7 1.7 0 0 1 1.7-1.7H17a5 5 0 0 0 5-5c0-4.4-4.5-8.7-10-8.7z"/>',
  'wallet': '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-5a3 3 0 0 0 0 6h5z"/>',
  'coins': '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4"/>',
  'banknote': '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  'card': '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
  'tag': '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>',
  'percent': '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  'cart': '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 6H5.1"/>',
  'phone': '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  'car': '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/><path d="M3 12h18"/>',
  'shirt': '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z"/>',
  'brush': '<path d="m9.1 11.9 7.6-7.6a2.4 2.4 0 1 1 3.4 3.4l-7.6 7.6"/><path d="M7.1 14.9c-1.7 0-3 1.4-3 3.1 0 1.3-2.5 1.5-2 2 1.1 1 2.5 2 4 2 2.3 0 4-1.8 4-4 0-1.7-1.3-3.1-3-3.1z"/>',
  'scissors': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9"/><path d="M14.5 14.5 20 20"/><path d="M8.1 8.1 12 12"/>',
  'gift': '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  'coffee': '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/>',
  'map-pin': '<path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  'music': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  'smile': '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  'type': '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  'bold': '<path d="M6 12h9a4 4 0 0 1 0 8H6V4h8a4 4 0 0 1 0 8"/>',
  'italic': '<path d="M19 4h-9"/><path d="M14 20H5"/><path d="M15 4 9 20"/>',
  'underline': '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/>',
  'strike': '<path d="M16 4H9a3 3 0 0 0-2.8 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><path d="M4 12h16"/>',
  'highlight': '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  'pill': '<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 12h10"/>',
  'shapes': '<path d="M8.3 10a.7.7 0 0 1-.6-1.1l3.7-6a.7.7 0 0 1 1.2 0l3.7 6a.7.7 0 0 1-.6 1.1z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  'grip': '<circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>',
  'keyboard-down': '<rect x="2" y="3" width="20" height="12" rx="2"/><path d="M6 7h.01M10 7h.01M14 7h.01M18 7h.01M7 11h10"/><path d="m9 19 3 3 3-3"/>',
  'align-left': '<path d="M3 6h18"/><path d="M3 12h12"/><path d="M3 18h16"/>',
  'align-center': '<path d="M3 6h18"/><path d="M6 12h12"/><path d="M4 18h16"/>',
  'up': '<path d="m18 15-6-6-6 6"/>',
};

export const PICTO = { ...ICON, ...Object.fromEntries(Object.entries(NEW).map(([k, d]) => [k, P(d)])) };
export const pic = (id) => PICTO[id] || PICTO.dot;

// Familles proposées dans la banque
export const GROUPS = [
  ['Flèches', ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-up-right', 'arrow-down-right', 'corner', 'arrows-lr', 'chevrons', 'chev', 'trend-up', 'trend-down', 'repeat', 'redo']],
  ['Repères', ['check', 'check-circle', 'close', 'x-circle', 'plus', 'minus', 'alert', 'info', 'help', 'star', 'heart', 'flag', 'bookmark', 'pin', 'target', 'dot', 'circle', 'square', 'diamond', 'triangle', 'sparkles', 'lightbulb', 'eye', 'lock', 'key', 'link']],
  ['Temps', ['clock', 'calendar', 'cal-check', 'alarm', 'hourglass', 'timer', 'sun', 'moon', 'bed']],
  ['Sport', ['dumbbell', 'kettlebell', 'fist', 'swords', 'belt', 'medal', 'trophy', 'flame', 'bolt', 'activity', 'bike', 'scale', 'apple', 'drop', 'utensils']],
  ['Études', ['book', 'book-open', 'grad', 'pencil', 'edit', 'note', 'clipboard', 'list-check', 'flask', 'atom', 'dna', 'landmark', 'globe', 'palette']],
  ['Argent', ['wallet', 'coins', 'banknote', 'card', 'receipt', 'tag', 'percent', 'cart', 'chart']],
  ['Vie', ['home', 'user', 'friends', 'mail', 'phone', 'chat', 'car', 'shirt', 'brush', 'scissors', 'gift', 'coffee', 'camera', 'music', 'map-pin', 'smile', 'folder']],
];

// Couleurs (les mêmes partout : texte, surligneur, pastilles, carnets)
export const COLORS = [
  ['ink', 'Normal'], ['muted', 'Gris'], ['red', 'Rouge'], ['orange', 'Orange'], ['yellow', 'Jaune'],
  ['green', 'Vert'], ['teal', 'Turquoise'], ['blue', 'Bleu'], ['violet', 'Violet'], ['pink', 'Rose'],
];
export const COLOR_NAME = Object.fromEntries(COLORS);

// Polices : celles de l'iPhone (aucun téléchargement), avec un repli ailleurs
export const FONTS = [
  ['sans', 'Archivo', "'Archivo', -apple-system, system-ui, sans-serif"],
  ['wide', 'Archivo large', "'Archivo', -apple-system, system-ui, sans-serif"],
  ['sys', 'SF Pro', "-apple-system, system-ui, 'Helvetica Neue', sans-serif"],
  ['round', 'Arrondie', "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif"],
  ['serif', 'New York', "ui-serif, 'New York', Georgia, serif"],
  ['didot', 'Didot', "Didot, 'Bodoni 72', ui-serif, Georgia, serif"],
  ['mono', 'SF Mono', "ui-monospace, 'SF Mono', Menlo, monospace"],
  ['type', 'Machine', "'American Typewriter', 'Courier New', monospace"],
  ['hand', 'Manuscrite', "Noteworthy, 'Bradley Hand', 'Segoe Print', cursive"],
  ['marker', 'Feutre', "'Marker Felt', 'Chalkboard SE', 'Comic Sans MS', cursive"],
];
export const SIZES = [['s', 'Petit'], ['m', 'Normal'], ['l', 'Grand'], ['xl', 'Très grand']];
export const MARKS = ['dot', 'dash', 'arrow-right', 'chevrons', 'check', 'star', 'diamond', 'square', 'heart', 'bolt'];
