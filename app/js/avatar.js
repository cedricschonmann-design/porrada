// Avatars dessinés : un personnage en pied (ou en buste) qui se règle entièrement.
// Tout est calculé ici, sans image : corpulence et muscles changent les proportions en continu.

export const SKIN = ['#fde0cc', '#f3c9a8', '#e6b08a', '#d09468', '#b57a4e', '#93603a', '#714629', '#4f2f1c'];
export const EYES = [['Bruns', '#5a3a22'], ['Noisette', '#8a6236'], ['Verts', '#4f8a4a'], ['Bleus', '#3f78c6'], ['Gris', '#7d8a96'], ['Noirs', '#1b1410']];
export const HAIRC = ['#151110', '#3a2417', '#6a4426', '#a7743f', '#e2c07a', '#b4532a', '#9b9b9b', '#efefef', '#4161e0', '#e2559c', '#7c3aed'];
export const HAIR = [
  ['chauve', 'Rasé net'], ['rase', 'Tondeuse'], ['court', 'Court'], ['degrade', 'Dégradé'], ['boucle', 'Bouclé'], ['afro', 'Afro'],
  ['mohawk', 'Crête'], ['carre', 'Carré'], ['long', 'Long'], ['queue', 'Queue'], ['chignon', 'Chignon'], ['tresses', 'Tresses'],
];
export const BEARD = [['none', 'Aucune'], ['stubble', 'De 3 jours'], ['short', 'Courte'], ['full', 'Fournie'], ['goatee', 'Bouc'], ['mustache', 'Moustache']];
export const OUTFIT = [['gi', 'Kimono'], ['rash', 'Rashguard'], ['tee', 'T-shirt'], ['polo', 'Polo'], ['striped', 'Rayé'], ['hoodie', 'Sweat']];
export const GI = [['Blanc', '#f4f4f1', '#d6d6cf'], ['Bleu', '#2c4fb8', '#1f3c8f'], ['Noir', '#1c1c20', '#323238']];
export const CLOTH = ['#111114', '#f2f2f2', '#2d5bff', '#7c3aed', '#7a4a26', '#e0294f', '#8a8f98', '#ff7a2f', '#14b88a', '#ffd23f', '#ff4fa3'];
export const PATCHES = [
  ['none', 'Aucun'], ['ch', 'Suisse'], ['br', 'Brésil'], ['fr', 'France'], ['pt', 'Portugal'], ['be', 'Belgique'], ['it', 'Italie'],
  ['star', 'Étoile'], ['flame', 'Flamme'], ['bolt', 'Éclair'], ['heart', 'Cœur'], ['belt', 'PORRADA'],
];
export const BELT_COLORS = { blanche: '#f2f2f2', bleue: '#2d5bff', violette: '#7c3aed', marron: '#7a4a26', noire: '#141414' };

export const DEFAULT_AV = {
  sex: 'm', skin: 2, eyes: 0, hair: 'court', hairColor: 1, beard: 'stubble', build: 45, muscle: 45,
  outfit: 'gi', gi: 0, rash: 0, sleeve: 'long', shorts: 0, patchChest: 'none', patchLeg: 'none', ears: 'normal', tape: false,
  acc: [],
};

export function defaultFor(sex) {
  return sex === 'f'
    ? { ...DEFAULT_AV, sex: 'f', hair: 'queue', hairColor: 1, beard: 'none', build: 38, muscle: 40, outfit: 'rash', rash: 3, shorts: 0 }
    : { ...DEFAULT_AV };
}

export function randomAv(sex) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const s = sex || pick(['m', 'f']);
  return {
    ...defaultFor(s),
    skin: Math.floor(Math.random() * SKIN.length),
    eyes: Math.floor(Math.random() * EYES.length),
    hair: pick(s === 'f' ? ['queue', 'chignon', 'long', 'tresses', 'carre', 'court', 'afro', 'boucle'] : ['rase', 'court', 'degrade', 'boucle', 'chauve', 'afro', 'mohawk', 'queue']),
    hairColor: Math.floor(Math.random() * 8),
    beard: s === 'f' ? 'none' : pick(['none', 'stubble', 'short', 'full', 'goatee']),
    build: Math.round(15 + Math.random() * 70),
    muscle: Math.round(15 + Math.random() * 75),
    outfit: pick(['gi', 'rash']),
    gi: Math.floor(Math.random() * 3),
    rash: Math.floor(Math.random() * CLOTH.length),
    shorts: Math.floor(Math.random() * 3),
    sleeve: pick(['long', 'short']),
    patchChest: pick(['none', 'ch', 'br', 'star', 'flame']),
    patchLeg: pick(['none', 'none', 'belt', 'bolt']),
    ears: Math.random() < 0.25 ? 'chou' : 'normal',
    tape: Math.random() < 0.4,
  };
}

// ---------- Encodage compact (pour le code ami) ----------
const ENC = [
  ['sex', ['m', 'f']], ['skin', null], ['eyes', null], ['hair', HAIR.map((x) => x[0])], ['hairColor', null], ['beard', BEARD.map((x) => x[0])],
  ['build', null], ['muscle', null], ['outfit', OUTFIT.map((x) => x[0])], ['gi', null], ['rash', null], ['sleeve', ['long', 'short']],
  ['shorts', null], ['patchChest', PATCHES.map((x) => x[0])], ['patchLeg', PATCHES.map((x) => x[0])], ['ears', ['normal', 'chou']], ['tape', [false, true]],
];
export function encodeAv(av) {
  if (!av) return null;
  return ENC.map(([k, list]) => (list ? Math.max(0, list.indexOf(av[k])) : Math.round(Number(av[k]) || 0)).toString(36)).join('.');
}
export function decodeAv(str) {
  if (typeof str !== 'string') return null;
  const parts = str.split('.');
  if (parts.length < ENC.length) return null;
  const av = { ...DEFAULT_AV };
  ENC.forEach(([k, list], i) => {
    const n = parseInt(parts[i], 36);
    if (Number.isNaN(n)) return;
    av[k] = list ? (list[n] !== undefined ? list[n] : av[k]) : n;
  });
  av.skin = clamp(av.skin, 0, SKIN.length - 1);
  av.eyes = clamp(av.eyes, 0, EYES.length - 1);
  av.hairColor = clamp(av.hairColor, 0, HAIRC.length - 1);
  av.build = clamp(av.build, 0, 100);
  av.muscle = clamp(av.muscle, 0, 100);
  av.gi = clamp(av.gi, 0, GI.length - 1);
  av.rash = clamp(av.rash, 0, CLOTH.length - 1);
  av.shorts = clamp(av.shorts, 0, CLOTH.length - 1);
  return av;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));

// ---------- Couleurs utiles ----------
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16; let g = (n >> 8) & 255; let b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return '#' + [r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('');
}
const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
const f1 = (n) => Math.round(n * 10) / 10;

// ---------- Patchs ----------
function patch(id, x, y, w = 17) {
  const hh = w * 0.7;
  const X = f1(x - w / 2); const Y = f1(y - hh / 2);
  const box = (inner) => `<g>${inner}<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" rx="1.6" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"/></g>`;
  const v3 = (a, b, c) => box(`<rect x="${X}" y="${Y}" width="${f1(w / 3)}" height="${f1(hh)}" fill="${a}"/><rect x="${f1(X + w / 3)}" y="${Y}" width="${f1(w / 3)}" height="${f1(hh)}" fill="${b}"/><rect x="${f1(X + 2 * w / 3)}" y="${Y}" width="${f1(w / 3 + 0.1)}" height="${f1(hh)}" fill="${c}"/>`);
  switch (id) {
    case 'ch': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#e3242b"/><rect x="${f1(x - 1.4)}" y="${f1(y - 4)}" width="2.8" height="8" fill="#fff"/><rect x="${f1(x - 4)}" y="${f1(y - 1.4)}" width="8" height="2.8" fill="#fff"/>`);
    case 'br': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#169b3c"/><path d="M${f1(x)} ${f1(Y + 1.2)} L${f1(X + w - 1.5)} ${f1(y)} L${f1(x)} ${f1(Y + hh - 1.2)} L${f1(X + 1.5)} ${f1(y)}Z" fill="#fedf00"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(hh * 0.27)}" fill="#002776"/>`);
    case 'fr': return v3('#1f3fa8', '#fff', '#e3242b');
    case 'be': return v3('#111', '#fdda24', '#ef3340');
    case 'it': return v3('#169b62', '#fff', '#e3242b');
    case 'pt': return box(`<rect x="${X}" y="${Y}" width="${f1(w * 0.4)}" height="${f1(hh)}" fill="#0a6a2c"/><rect x="${f1(X + w * 0.4)}" y="${Y}" width="${f1(w * 0.6)}" height="${f1(hh)}" fill="#e3242b"/><circle cx="${f1(X + w * 0.4)}" cy="${f1(y)}" r="${f1(hh * 0.28)}" fill="#ffd23f"/>`);
    case 'star': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#111"/><path d="M${f1(x)} ${f1(y - 4.6)}l1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z" fill="#ffd23f"/>`);
    case 'flame': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#111"/><path d="M${f1(x)} ${f1(y + 4.8)}c-2.6 0-4-1.7-4-3.8 0-2.1 1.6-3.2 2.3-4.8.3 1.1 1 1.8 1.7 2.2.1-1.6.9-3 2.2-4.1-.2 2 1.8 3.4 1.8 5.9 0 2.6-1.6 4.6-4 4.6z" fill="#ff7a2f"/>`);
    case 'bolt': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#111"/><path d="M${f1(x + 0.8)} ${f1(y - 4.8)}l-4.2 5.8h3.4l-.8 4 4.4-6h-3.4z" fill="#ffd23f"/>`);
    case 'heart': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#fff"/><path d="M${f1(x)} ${f1(y + 3.8)}s-4.4-2.7-4.4-5.8a2.4 2.4 0 0 1 4.4-1.4 2.4 2.4 0 0 1 4.4 1.4c0 3.1-4.4 5.8-4.4 5.8z" fill="#e3242b"/>`);
    case 'belt': return box(`<rect x="${X}" y="${Y}" width="${w}" height="${f1(hh)}" fill="#000"/><ellipse cx="${f1(x)}" cy="${f1(y - 1)}" rx="${f1(w * 0.28)}" ry="${f1(hh * 0.24)}" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M${f1(x - 1)} ${f1(y + 0.4)} l-3 3.4 M${f1(x + 1)} ${f1(y + 0.4)} l3 3.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`);
    default: return '';
  }
}

// ---------- Le dessin ----------
// opts : { mode: 'full' | 'bust', belt: 'bleue', stripes: 2, idSuffix }
export function avatarSvg(cfg, opts = {}) {
  const av = { ...DEFAULT_AV, ...(cfg || {}) };
  const mode = opts.mode || 'full';
  const b = clamp(av.build, 0, 100) / 100;
  const m = clamp(av.muscle, 0, 100) / 100;
  const fem = av.sex === 'f';
  const skin = SKIN[clamp(av.skin, 0, SKIN.length - 1)];
  const skinD = shade(skin, -0.16);
  const skinDD = shade(skin, -0.32);
  const hairC = HAIRC[clamp(av.hairColor, 0, HAIRC.length - 1)];
  const hairD = shade(hairC, -0.25);
  const eyeC = EYES[clamp(av.eyes, 0, EYES.length - 1)][1];
  const outline = 'rgba(0,0,0,.28)';
  const OL = `stroke="${outline}" stroke-width="1.1"`;

  // Proportions
  const cx = 100;
  const hw0 = 22.5 + b * 3; // demi-largeur de la tête
  const hy = 58; const hh0 = 27;
  const nw = 7.5 + m * 3.5 + b * 3;
  const sw = (fem ? 34 : 39) + m * 12 + b * 9; // épaules
  const cw = sw - 3 + b * 2; // poitrine
  const ww = (fem ? 22 : 26) + b * 21 + m * 2; // taille
  const hpw = (fem ? 31 : 28) + b * 15 + m * 1.5; // hanches
  const ua = 9 + m * 7 + b * 5; // bras
  const fa = 7.5 + m * 4.5 + b * 3.5; // avant-bras
  const tt = 11 + b * 7 + m * 3.5; // cuisse
  const ct = 7.5 + b * 4.5 + m * 2.5; // mollet
  const shY = 100; const waistY = 168; const hipY = 192;
  const legGap = 3 + b * 2;

  const outfit = av.outfit;
  const giIdx = clamp(av.gi, 0, GI.length - 1);
  const isGi = outfit === 'gi';
  let top = CLOTH[clamp(av.rash, 0, CLOTH.length - 1)];
  let topD = shade(top, -0.18);
  if (isGi) { top = GI[giIdx][1]; topD = GI[giIdx][2]; }
  if (outfit === 'polo' || outfit === 'striped') { top = outfit === 'striped' ? '#f4f4f4' : '#141418'; topD = shade(top, -0.2); }
  const bottom = isGi ? GI[giIdx][1] : outfit === 'rash' ? CLOTH[clamp(av.shorts, 0, CLOTH.length - 1)] : '#24242a';
  const bottomD = isGi ? GI[giIdx][2] : shade(bottom, -0.2);
  const longSleeve = isGi || outfit === 'hoodie' || (outfit === 'rash' && av.sleeve === 'long');
  const sleeveCol = top;

  const parts = [];
  const P = (s) => parts.push(s);

  // Points des bras
  const sx = (s) => cx + s * (sw - 7);
  const ex = (s) => cx + s * (sw + 3 + b * 6 + m * 2);
  const wx = (s) => cx + s * (sw + 6 + b * 8 + m * 1.5);
  const shJ = 108; const elY = 153; const wrY = 196;

  // ----- Cheveux arrière -----
  const backHair = () => {
    const H = hairC;
    if (av.hair === 'long') P(`<path d="M${cx - hw0 - 4} ${hy - 6} Q${cx - hw0 - 10} ${hy + 40} ${cx - hw0 - 2} ${hy + 64} L${cx + hw0 + 2} ${hy + 64} Q${cx + hw0 + 10} ${hy + 40} ${cx + hw0 + 4} ${hy - 6} Z" fill="${H}" ${OL}/>`);
    if (av.hair === 'carre') P(`<path d="M${cx - hw0 - 4} ${hy - 6} Q${cx - hw0 - 7} ${hy + 18} ${cx - hw0 - 2} ${hy + 30} L${cx + hw0 + 2} ${hy + 30} Q${cx + hw0 + 7} ${hy + 18} ${cx + hw0 + 4} ${hy - 6} Z" fill="${H}" ${OL}/>`);
    if (av.hair === 'afro') P(`<circle cx="${cx}" cy="${hy - 8}" r="${hw0 + 15}" fill="${H}" ${OL}/>`);
    if (av.hair === 'queue') P(`<path d="M${cx + hw0 - 4} ${hy - 22} q16 6 15 30 q-1 22 -9 38 q-6 -18 -9 -40 z" fill="${H}" ${OL}/>`);
    if (av.hair === 'boucle') P(`<circle cx="${cx}" cy="${hy - 6}" r="${hw0 + 5}" fill="${H}"/>`);
  };

  // ----- Jambes -----
  const legs = () => {
    const lx = (s) => cx + s * (hpw * 0.5 + legGap * 0.3);
    const knee = 246; const ank = 284;
    for (const s of [-1, 1]) {
      const x = lx(s);
      // jambe en peau (cuisse → mollet)
      P(`<path d="M${x - tt} ${hipY} L${x + tt} ${hipY} L${x + ct + 1} ${knee} L${x + ct * 0.8} ${ank} L${x - ct * 0.8} ${ank} L${x - ct - 1} ${knee} Z" fill="${skin}" ${OL}/>`);
      // pied nu
      P(`<path d="M${x - ct * 0.9} ${ank - 2} Q${x - ct - 1} ${ank + 8} ${x + s * 3} ${ank + 9} Q${x + ct + 5 * s + (s > 0 ? 2 : -2)} ${ank + 8} ${x + ct * 0.9} ${ank - 2} Z" fill="${skin}" ${OL}/>`);
    }
    if (isGi || outfit === 'polo' || outfit === 'striped' || outfit === 'hoodie' || outfit === 'tee') {
      // pantalon long
      for (const s of [-1, 1]) {
        const x = lx(s);
        const w1 = tt + (isGi ? 3.5 : 2); const w2 = ct + (isGi ? 4.5 : 2.5);
        P(`<path d="M${x - w1} ${hipY - 6} L${x + w1} ${hipY - 6} L${x + w2} ${ank - 4} L${x - w2} ${ank - 4} Z" fill="${bottom}" ${OL}/>`);
        P(`<path d="M${x + s * (w1 - 4)} ${hipY + 2} L${x + s * (w2 - 3)} ${ank - 6}" stroke="${bottomD}" stroke-width="2" opacity=".7"/>`);
        if (isGi) P(`<path d="M${x - w2 + 1} ${ank - 9} L${x + w2 - 1} ${ank - 9}" stroke="${bottomD}" stroke-width="1.4"/>`);
      }
      P(`<path d="M${cx - hpw - 1} ${hipY - 12} L${cx + hpw + 1} ${hipY - 12} L${cx + hpw * 0.55 + tt * 0.9} ${hipY + 14} L${cx} ${hipY + 10} L${cx - hpw * 0.55 - tt * 0.9} ${hipY + 14} Z" fill="${bottom}"/>`);
    } else {
      // short de combat
      const sy = 236;
      for (const s of [-1, 1]) {
        const x = lx(s);
        const w1 = tt + 3.5; const w2 = tt * 0.82 + 3;
        P(`<path d="M${x - w1} ${hipY - 8} L${x + w1} ${hipY - 8} L${x + w2 + s * 2} ${sy} L${x - w2 + s * 2} ${sy} Z" fill="${bottom}" ${OL}/>`);
        P(`<path d="M${x + s * (w1 - 2)} ${hipY + 6} L${x + s * (w2 - 1)} ${sy - 1}" stroke="${isLight(bottom) ? '#111' : '#fff'}" stroke-width="2.4" opacity=".55"/>`);
      }
      P(`<path d="M${cx - hpw - 2} ${hipY - 14} L${cx + hpw + 2} ${hipY - 14} L${cx + hpw * 0.55 + tt} ${hipY + 12} L${cx} ${hipY + 6} L${cx - hpw * 0.55 - tt} ${hipY + 12} Z" fill="${bottom}"/>`);
      P(`<rect x="${cx - hpw - 2}" y="${hipY - 16}" width="${(hpw + 2) * 2}" height="5" rx="2" fill="${bottomD}"/>`);
    }
    if (av.patchLeg && av.patchLeg !== 'none') P(patch(av.patchLeg, lx(1), hipY + 16, 15));
  };

  // ----- Bras -----
  const arm = (s, layer) => {
    const S = `${sx(s)} ${shJ}`; const E = `${ex(s)} ${elY}`; const W = `${wx(s)} ${wrY}`;
    if (layer === 'skin') {
      P(`<path d="M${S} L${E}" stroke="${outline}" stroke-width="${ua + 2.2}" stroke-linecap="round"/>`);
      P(`<path d="M${E} L${W}" stroke="${outline}" stroke-width="${fa + 2.2}" stroke-linecap="round"/>`);
      P(`<path d="M${S} L${E}" stroke="${skin}" stroke-width="${ua}" stroke-linecap="round"/>`);
      P(`<path d="M${E} L${W}" stroke="${skin}" stroke-width="${fa}" stroke-linecap="round"/>`);
      if (m > 0.55) {
        const mx = (sx(s) + ex(s)) / 2 + s * 1.5; const my = (shJ + elY) / 2 + 2;
        P(`<ellipse cx="${mx}" cy="${my}" rx="${ua * 0.42 + m * 2}" ry="${ua * 0.62}" fill="${skin}" stroke="${skinD}" stroke-width=".8" opacity=".9"/>`);
      }
      // main
      const hx = wx(s) + s * 1; const hy2 = wrY + 7;
      P(`<ellipse cx="${hx}" cy="${hy2}" rx="${6.5 + b * 1.2 + m * 0.8}" ry="${8 + b}" fill="${skin}" ${OL}/>`);
      if (av.tape) {
        P(`<path d="M${hx - 5} ${hy2 + 2} h10 M${hx - 5} ${hy2 + 5.5} h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`);
        P(`<rect x="${hx - 6}" y="${hy2 - 7}" width="12" height="3.2" rx="1.2" fill="#fff" opacity=".95"/>`);
      }
    } else {
      // manches
      if (longSleeve) {
        const extra = isGi ? 4 : 1.2;
        const wEnd = isGi ? `${wx(s) - s * 0.5} ${wrY - 6}` : `${wx(s)} ${wrY - 3}`;
        P(`<path d="M${S} L${E}" stroke="${outline}" stroke-width="${ua + extra + 2.2}" stroke-linecap="round"/>`);
        P(`<path d="M${E} L${wEnd}" stroke="${outline}" stroke-width="${fa + extra + 2.2}" stroke-linecap="butt"/>`);
        P(`<path d="M${S} L${E}" stroke="${sleeveCol}" stroke-width="${ua + extra}" stroke-linecap="round"/>`);
        P(`<path d="M${E} L${wEnd}" stroke="${sleeveCol}" stroke-width="${fa + extra}" stroke-linecap="butt"/>`);
        if (outfit === 'striped') P(`<path d="M${S} L${E} L${wEnd}" stroke="#111" stroke-width="2" stroke-dasharray="3 5" fill="none"/>`);
        if (outfit === 'rash') P(`<path d="M${S} L${E} L${wEnd}" stroke="${shade(sleeveCol, isLight(sleeveCol) ? -0.25 : 0.25)}" stroke-width="2" fill="none" opacity=".6"/>`);
      } else {
        const mx = sx(s) + (ex(s) - sx(s)) * 0.5; const my = shJ + (elY - shJ) * 0.5;
        P(`<path d="M${S} L${mx} ${my}" stroke="${outline}" stroke-width="${ua + 3.6}" stroke-linecap="butt"/>`);
        P(`<path d="M${S} L${mx} ${my}" stroke="${sleeveCol}" stroke-width="${ua + 1.4}" stroke-linecap="butt"/>`);
        P(`<circle cx="${sx(s)}" cy="${shJ}" r="${(ua + 1.4) / 2}" fill="${sleeveCol}"/>`);
      }
    }
  };

  // ----- Torse -----
  const torso = () => {
    const sk = `M${cx - nw} ${shY - 12} L${cx + nw} ${shY - 12} L${cx + nw + 1} ${shY + 2} L${cx - nw - 1} ${shY + 2} Z`;
    P(`<path d="${sk}" fill="${skin}" ${OL}/>`);
    P(`<path d="M${cx - nw + 1} ${shY - 3} Q${cx} ${shY + 3} ${cx + nw - 1} ${shY - 3}" stroke="${skinD}" stroke-width="2" fill="none" opacity=".6"/>`);
    const bellyOut = b > 0.55 ? (b - 0.55) * 18 : 0;
    const d = `M${cx - nw - 2} ${shY - 2}
      C${cx - sw + 10} ${shY - 2} ${cx - sw} ${shY} ${cx - sw} ${shY + 12}
      L${cx - cw} ${shY + 30}
      Q${cx - ww - bellyOut * 0.6 - 1} ${waistY - 26} ${cx - ww - bellyOut * 0.4} ${waistY}
      Q${cx - hpw - 1} ${hipY - 14} ${cx - hpw - 1} ${hipY - 8}
      L${cx + hpw + 1} ${hipY - 8}
      Q${cx + hpw + 1} ${hipY - 14} ${cx + ww + bellyOut * 0.4} ${waistY}
      Q${cx + ww + bellyOut * 0.6 + 1} ${waistY - 26} ${cx + cw} ${shY + 30}
      L${cx + sw} ${shY + 12}
      C${cx + sw} ${shY} ${cx + sw - 10} ${shY - 2} ${cx + nw + 2} ${shY - 2} Z`;
    if (isGi) {
      // veste : descend sous la ceinture
      P(`<path d="${d}" fill="${top}" ${OL}/>`);
      P(`<path d="M${cx - hpw - 3} ${waistY + 2} L${cx - hpw - 4} ${hipY + 12} L${cx + hpw + 4} ${hipY + 12} L${cx + hpw + 3} ${waistY + 2} Z" fill="${top}" ${OL}/>`);
      // revers croisés
      const lap = topD;
      P(`<path d="M${cx - nw - 1} ${shY - 4} L${cx + 9} ${waistY - 2} L${cx + 2} ${waistY + 2} L${cx - nw - 7} ${shY + 2} Z" fill="${lap}" opacity=".9"/>`);
      P(`<path d="M${cx + nw + 1} ${shY - 4} L${cx - 3} ${waistY - 26} L${cx - 9} ${waistY - 22} L${cx + nw + 7} ${shY + 2} Z" fill="${lap}" opacity=".9"/>`);
      P(`<path d="M${cx - nw + 1} ${shY - 2} L${cx + 5} ${waistY - 30}" stroke="${shade(top, -0.1)}" stroke-width="1" opacity=".8"/>`);
      P(`<path d="M${cx + 6} ${waistY - 2} L${cx - 4} ${hipY + 12}" stroke="${topD}" stroke-width="1.6"/>`);
      if (av.patchChest && av.patchChest !== 'none') P(patch(av.patchChest, cx + cw * 0.5, shY + 26, 16));
      // ceinture
      const bc = BELT_COLORS[opts.belt] || BELT_COLORS.blanche;
      P(`<rect x="${cx - ww - 6}" y="${waistY - 4}" width="${(ww + 6) * 2}" height="9" rx="2" fill="${bc}" ${OL}/>`);
      P(`<path d="M${cx - 2} ${waistY + 3} L${cx - 13} ${waistY + 26} L${cx - 6} ${waistY + 29} L${cx + 2} ${waistY + 6} Z" fill="${bc}" ${OL}/>`);
      P(`<path d="M${cx + 2} ${waistY + 3} L${cx + 12} ${waistY + 27} L${cx + 19} ${waistY + 24} L${cx + 7} ${waistY + 2} Z" fill="${bc}" ${OL}/>`);
      const bar = opts.belt === 'noire' ? '#e01e37' : '#111';
      P(`<path d="M${cx - 10.8} ${waistY + 21} L${cx - 13} ${waistY + 26} L${cx - 6} ${waistY + 29} L${cx - 3.8} ${waistY + 24} Z" fill="${bar}"/>`);
      for (let i = 0; i < Math.min(4, opts.stripes || 0); i++) P(`<path d="M${cx - 11.4 + i * 1.7} ${waistY + 22.3 + i * 0.7} l3.6 1.6" stroke="#fff" stroke-width=".9"/>`);
      P(`<rect x="${cx - 6}" y="${waistY - 5}" width="12" height="11" rx="2.5" fill="${bc}" ${OL}/>`);
    } else {
      P(`<path d="${d}" fill="${top}" ${OL}/>`);
      if (outfit === 'striped') {
        for (let x = cx - sw + 4; x < cx + sw; x += 8) P(`<path d="M${x} ${shY} L${x + (x - cx) * 0.06} ${hipY - 8}" stroke="#111" stroke-width="3.4" opacity=".92"/>`);
        P(`<path d="${d}" fill="none" ${OL}/>`);
      }
      // ombre latérale
      P(`<path d="M${cx + cw - 6} ${shY + 28} Q${cx + ww - 4} ${waistY - 20} ${cx + ww - 2} ${waistY} Q${cx + hpw - 4} ${hipY - 14} ${cx + hpw - 3} ${hipY - 8} L${cx + hpw + 1} ${hipY - 8} Q${cx + hpw + 1} ${hipY - 14} ${cx + ww} ${waistY} Q${cx + ww + 1} ${waistY - 26} ${cx + cw} ${shY + 30} Z" fill="#000" opacity=".1"/>`);
      if (outfit === 'rash') {
        const acc = shade(top, isLight(top) ? -0.3 : 0.35);
        P(`<path d="M${cx - cw + 3} ${shY + 34} Q${cx - ww + 2} ${waistY - 20} ${cx - ww + 3} ${waistY + 4}" stroke="${acc}" stroke-width="3" fill="none" opacity=".75"/>`);
        P(`<path d="M${cx + cw - 3} ${shY + 34} Q${cx + ww - 2} ${waistY - 20} ${cx + ww - 3} ${waistY + 4}" stroke="${acc}" stroke-width="3" fill="none" opacity=".75"/>`);
      }
      // col
      if (outfit === 'polo') {
        P(`<path d="M${cx - nw - 4} ${shY - 6} L${cx} ${shY + 10} L${cx + nw + 4} ${shY - 6} L${cx + nw + 8} ${shY + 2} L${cx} ${shY + 14} L${cx - nw - 8} ${shY + 2} Z" fill="${shade(top, 0.15)}" ${OL}/>`);
        P(`<circle cx="${cx}" cy="${shY + 18}" r="1.3" fill="#888"/><circle cx="${cx}" cy="${shY + 24}" r="1.3" fill="#888"/>`);
        P(`<rect x="${cx + cw * 0.3}" y="${shY + 20}" width="15" height="9" rx="2" fill="#ffd23f"/><path d="M${cx + cw * 0.3 + 3} ${shY + 24.5} h9" stroke="#111" stroke-width="1.4"/>`);
      } else if (outfit === 'hoodie') {
        P(`<path d="M${cx - nw - 10} ${shY - 2} Q${cx} ${shY + 18} ${cx + nw + 10} ${shY - 2} Q${cx} ${shY + 6} ${cx - nw - 10} ${shY - 2} Z" fill="${topD}" ${OL}/>`);
        P(`<path d="M${cx - 4} ${shY + 8} l-1 16 M${cx + 4} ${shY + 8} l1 16" stroke="#ddd" stroke-width="1.6" stroke-linecap="round"/>`);
        P(`<path d="M${cx - ww * 0.62} ${waistY - 8} L${cx + ww * 0.62} ${waistY - 8} L${cx + ww * 0.7} ${hipY - 12} L${cx - ww * 0.7} ${hipY - 12} Z" fill="${topD}" opacity=".6"/>`);
      } else {
        P(`<path d="M${cx - nw - 3} ${shY - 4} Q${cx} ${shY + 9} ${cx + nw + 3} ${shY - 4}" stroke="${topD}" stroke-width="3.2" fill="none"/>`);
      }
      // pectoraux / poitrine
      if (fem) P(`<path d="M${cx - cw * 0.62} ${shY + 34} Q${cx - cw * 0.32} ${shY + 41} ${cx - 3} ${shY + 33} M${cx + 3} ${shY + 33} Q${cx + cw * 0.32} ${shY + 41} ${cx + cw * 0.62} ${shY + 34}" stroke="#000" stroke-width="1.2" fill="none" opacity=".18"/>`);
      else if (m > 0.45) P(`<path d="M${cx - cw * 0.7} ${shY + 30} Q${cx - cw * 0.35} ${shY + 37 + m * 3} ${cx - 2} ${shY + 30} M${cx + 2} ${shY + 30} Q${cx + cw * 0.35} ${shY + 37 + m * 3} ${cx + cw * 0.7} ${shY + 30}" stroke="#000" stroke-width="${0.8 + m}" fill="none" opacity=".2"/>`);
      if (b > 0.62) P(`<path d="M${cx - ww * 0.55} ${waistY - 4} Q${cx} ${waistY + 8 + (b - 0.62) * 14} ${cx + ww * 0.55} ${waistY - 4}" stroke="#000" stroke-width="1.2" fill="none" opacity=".16"/>`);
      if (av.patchChest && av.patchChest !== 'none' && outfit !== 'polo') P(patch(av.patchChest, cx + cw * 0.48, shY + 24, 15));
    }
  };

  // ----- Tête -----
  const head = () => {
    // oreilles
    for (const s of [-1, 1]) {
      const ex2 = cx + s * (hw0 + 0.5);
      if (av.ears === 'chou') {
        P(`<ellipse cx="${ex2 + s * 1.5}" cy="${hy + 2}" rx="6.6" ry="8.6" fill="${skin}" ${OL}/>`);
        P(`<circle cx="${ex2 + s * 2}" cy="${hy - 1}" r="2.6" fill="${skinD}" opacity=".75"/><circle cx="${ex2 + s * 1}" cy="${hy + 4}" r="2.2" fill="${skinD}" opacity=".65"/><circle cx="${ex2 + s * 3}" cy="${hy + 6}" r="1.6" fill="${skinDD}" opacity=".5"/>`);
      } else {
        P(`<ellipse cx="${ex2}" cy="${hy + 2}" rx="4.6" ry="7" fill="${skin}" ${OL}/>`);
        P(`<path d="M${ex2 + s * 0.6} ${hy - 2} q${s * 2} 3 0 7" stroke="${skinD}" stroke-width="1.2" fill="none"/>`);
      }
    }
    // visage
    const jaw = fem ? 0.86 : 0.92 + b * 0.04;
    P(`<path d="M${cx - hw0} ${hy - 4} C${cx - hw0} ${hy - hh0 - 2} ${cx + hw0} ${hy - hh0 - 2} ${cx + hw0} ${hy - 4} C${cx + hw0} ${hy + 14} ${cx + hw0 * jaw * 0.62} ${hy + hh0 - 1} ${cx} ${hy + hh0 + 1} C${cx - hw0 * jaw * 0.62} ${hy + hh0 - 1} ${cx - hw0} ${hy + 14} ${cx - hw0} ${hy - 4} Z" fill="${skin}" ${OL}/>`);
    if (b > 0.5) P(`<path d="M${cx - hw0 * 0.55} ${hy + 20} Q${cx} ${hy + 30 + (b - 0.5) * 6} ${cx + hw0 * 0.55} ${hy + 20}" stroke="${skinD}" stroke-width="1.1" fill="none" opacity=".6"/>`);
    // joues
    P(`<ellipse cx="${cx - 12}" cy="${hy + 9}" rx="4.5" ry="2.6" fill="#ff7a7a" opacity="${av.skin < 4 ? 0.2 : 0.12}"/><ellipse cx="${cx + 12}" cy="${hy + 9}" rx="4.5" ry="2.6" fill="#ff7a7a" opacity="${av.skin < 4 ? 0.2 : 0.12}"/>`);
    // yeux
    for (const s of [-1, 1]) {
      const x = cx + s * 9; const y = hy + 1;
      P(`<ellipse cx="${x}" cy="${y}" rx="4.4" ry="3.7" fill="#fff"/>`);
      P(`<circle cx="${x + 0.3}" cy="${y + 0.2}" r="2.7" fill="${eyeC}"/><circle cx="${x + 0.3}" cy="${y + 0.2}" r="1.35" fill="#111"/><circle cx="${x + 1.2}" cy="${y - 0.8}" r=".8" fill="#fff"/>`);
      P(`<path d="M${x - 4.6} ${y - 1.4} Q${x} ${y - 5.4} ${x + 4.6} ${y - 1.4}" stroke="${fem ? '#2a1a12' : skinDD}" stroke-width="${fem ? 1.6 : 1}" fill="none"/>`);
      if (fem) P(`<path d="M${x + s * 4.2} ${y - 2} l${s * 1.8} -1.4" stroke="#2a1a12" stroke-width="1.2" stroke-linecap="round"/>`);
      // sourcils
      const by = y - 8.5;
      P(`<path d="M${x - 5} ${by + (fem ? 0.6 : 0.8)} Q${x} ${by - (fem ? 2.6 : 1.6)} ${x + 5} ${by + (s > 0 ? 0.4 : 0.6)}" stroke="${av.hair === 'chauve' && av.hairColor > 6 ? '#555' : hairD}" stroke-width="${fem ? 1.7 : 2.6}" fill="none" stroke-linecap="round"/>`);
    }
    // nez
    P(`<path d="M${cx - 1} ${hy + 4} Q${cx - 3.8} ${hy + 11} ${cx - 1} ${hy + 12.4} Q${cx + 1.5} ${hy + 13} ${cx + 3} ${hy + 11.6}" stroke="${skinDD}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
    // bouche
    P(`<path d="M${cx - 6.5} ${hy + 17.5} Q${cx} ${hy + 22.5} ${cx + 6.5} ${hy + 17.5}" stroke="#7a2d2d" stroke-width="1.8" fill="${fem ? '#c25a5a' : 'none'}" fill-opacity=".55" stroke-linecap="round"/>`);
    // barbe
    const bc = hairC;
    if (!fem || av.beard !== 'none') {
      const jawPath = `M${cx - hw0 + 0.5} ${hy + 2} C${cx - hw0 + 1} ${hy + 16} ${cx - hw0 * 0.58} ${hy + hh0 + 1} ${cx} ${hy + hh0 + 2} C${cx + hw0 * 0.58} ${hy + hh0 + 1} ${cx + hw0 - 1} ${hy + 16} ${cx + hw0 - 0.5} ${hy + 2} L${cx + hw0 - 4} ${hy + 4} C${cx + hw0 - 6} ${hy + 14} ${cx + 9} ${hy + 15} ${cx} ${hy + 14.5} C${cx - 9} ${hy + 15} ${cx - hw0 + 6} ${hy + 14} ${cx - hw0 + 4} ${hy + 4} Z`;
      if (av.beard === 'stubble') P(`<path d="${jawPath}" fill="${bc}" opacity=".26"/>`);
      if (av.beard === 'short') P(`<path d="${jawPath}" fill="${bc}" opacity=".88"/><path d="M${cx - 7} ${hy + 15.3} Q${cx} ${hy + 13} ${cx + 7} ${hy + 15.3}" stroke="${bc}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
      if (av.beard === 'full') P(`<path d="M${cx - hw0 + 0.5} ${hy - 1} C${cx - hw0} ${hy + 22} ${cx - hw0 * 0.5} ${hy + hh0 + 9} ${cx} ${hy + hh0 + 10} C${cx + hw0 * 0.5} ${hy + hh0 + 9} ${cx + hw0} ${hy + 22} ${cx + hw0 - 0.5} ${hy - 1} L${cx + hw0 - 4} ${hy + 2} C${cx + hw0 - 6} ${hy + 13} ${cx + 9} ${hy + 14} ${cx} ${hy + 13.5} C${cx - 9} ${hy + 14} ${cx - hw0 + 6} ${hy + 13} ${cx - hw0 + 4} ${hy + 2} Z" fill="${bc}" ${OL}/><path d="M${cx - 5.5} ${hy + 18.5} Q${cx} ${hy + 21} ${cx + 5.5} ${hy + 18.5}" stroke="#5a2020" stroke-width="1.6" fill="none"/>`);
      if (av.beard === 'goatee') P(`<path d="M${cx - 7} ${hy + 15.5} Q${cx} ${hy + 12.5} ${cx + 7} ${hy + 15.5} L${cx + 6} ${hy + 19} Q${cx + 5} ${hy + 27} ${cx} ${hy + 28} Q${cx - 5} ${hy + 27} ${cx - 6} ${hy + 19} Z" fill="${bc}" opacity=".9"/><path d="M${cx - 4.5} ${hy + 18.8} Q${cx} ${hy + 20.6} ${cx + 4.5} ${hy + 18.8}" stroke="#5a2020" stroke-width="1.5" fill="none"/>`);
      if (av.beard === 'mustache') P(`<path d="M${cx - 8} ${hy + 16.6} Q${cx - 4} ${hy + 12.6} ${cx} ${hy + 14.6} Q${cx + 4} ${hy + 12.6} ${cx + 8} ${hy + 16.6} Q${cx + 4} ${hy + 15.4} ${cx} ${hy + 16.2} Q${cx - 4} ${hy + 15.4} ${cx - 8} ${hy + 16.6} Z" fill="${bc}"/>`);
    }
    // cheveux devant
    const H = hairC; const top = hy - hh0 + 1;
    const cap = (low, fringe = 0) => `M${cx - hw0 - 1.5} ${hy - 2 + low} C${cx - hw0 - 3} ${top - 8} ${cx + hw0 + 3} ${top - 8} ${cx + hw0 + 1.5} ${hy - 2 + low} L${cx + hw0 - 1} ${hy - 10} C${cx + hw0 - 6} ${top + 7 + fringe} ${cx - hw0 + 6} ${top + 7 + fringe} ${cx - hw0 + 1} ${hy - 10} Z`;
    switch (av.hair) {
      case 'rase': P(`<path d="${cap(-6, 2)}" fill="${H}" opacity=".55"/>`); break;
      case 'court': P(`<path d="${cap(-4, 4)}" fill="${H}" ${OL}/><path d="M${cx - 10} ${top + 9} q8 -6 20 -3" stroke="${hairD}" stroke-width="1.4" fill="none"/>`); break;
      case 'degrade': P(`<path d="${cap(-4, 2)}" fill="${H}" opacity=".45"/><path d="M${cx - hw0 + 2} ${hy - 12} C${cx - hw0} ${top - 12} ${cx + hw0} ${top - 12} ${cx + hw0 - 2} ${hy - 12} C${cx + 8} ${top + 4} ${cx - 8} ${top + 4} ${cx - hw0 + 2} ${hy - 12} Z" fill="${H}" ${OL}/>`); break;
      case 'boucle': {
        let s = '';
        for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.112); s += `<circle cx="${f1(cx + Math.cos(a) * (hw0 + 1))}" cy="${f1(hy - 7 + Math.sin(a) * (hh0 - 2))}" r="6.4" fill="${H}" stroke="${hairD}" stroke-width=".8"/>`; }
        s += `<circle cx="${cx}" cy="${top + 2}" r="8" fill="${H}"/><circle cx="${cx - 9}" cy="${top + 5}" r="6" fill="${H}"/><circle cx="${cx + 9}" cy="${top + 5}" r="6" fill="${H}"/>`;
        P(s); break;
      }
      case 'afro': P(`<path d="M${cx - hw0 - 3} ${hy - 4} C${cx - hw0 - 6} ${top - 12} ${cx + hw0 + 6} ${top - 12} ${cx + hw0 + 3} ${hy - 4} C${cx + hw0 - 4} ${top + 8} ${cx - hw0 + 4} ${top + 8} ${cx - hw0 - 3} ${hy - 4} Z" fill="${H}"/>`); break;
      case 'mohawk': P(`<path d="${cap(-6, 2)}" fill="${H}" opacity=".3"/><path d="M${cx - 5} ${top + 8} C${cx - 7} ${top - 18} ${cx + 7} ${top - 18} ${cx + 5} ${top + 8} Z" fill="${H}" ${OL}/>`); break;
      case 'carre':
      case 'long': P(`<path d="M${cx - hw0 - 3} ${hy + 6} C${cx - hw0 - 6} ${top - 10} ${cx + hw0 + 6} ${top - 10} ${cx + hw0 + 3} ${hy + 6} L${cx + hw0 - 1} ${hy - 6} C${cx + hw0 - 4} ${top + 10} ${cx + 4} ${top + 6} ${cx + 1} ${top + 5} C${cx - 6} ${top + 14} ${cx - hw0 + 4} ${top + 12} ${cx - hw0 + 1} ${hy - 6} Z" fill="${H}" ${OL}/>`); break;
      case 'queue':
      case 'chignon': P(`<path d="${cap(-3, 3)}" fill="${H}" ${OL}/><path d="M${cx - 2} ${top + 6} q-6 4 -14 3" stroke="${hairD}" stroke-width="1.3" fill="none"/>`);
        if (av.hair === 'chignon') P(`<circle cx="${cx}" cy="${top - 7}" r="9" fill="${H}" ${OL}/><path d="M${cx - 6} ${top - 1} q6 3 12 0" stroke="${hairD}" stroke-width="1.6" fill="none"/>`);
        break;
      case 'tresses': {
        P(`<path d="${cap(-2, 2)}" fill="${H}" ${OL}/><path d="M${cx} ${top + 1} L${cx} ${top + 9}" stroke="${hairD}" stroke-width="1.2"/>`);
        for (const s of [-1, 1]) {
          let t = '';
          for (let i = 0; i < 6; i++) t += `<ellipse cx="${cx + s * (hw0 + 2 - i * 0.6)}" cy="${hy + 4 + i * 8}" rx="4.4" ry="5.2" fill="${H}" stroke="${hairD}" stroke-width=".8"/>`;
          P(t);
        }
        break;
      }
      default: break;
    }
  };

  // ----- Accessoires (arbitres) -----
  const extras = (acc) => {
    if (acc.includes('whistle')) {
      P(`<path d="M${cx - nw - 2} ${shY - 6} Q${cx} ${shY + 34} ${cx + nw + 2} ${shY - 6}" stroke="#e01e37" stroke-width="1.6" fill="none"/>`);
      P(`<rect x="${cx - 6}" y="${shY + 18}" width="13" height="7" rx="3.5" fill="#d8d8de" stroke="#666" stroke-width=".8"/><circle cx="${cx - 1}" cy="${shY + 21.5}" r="1.6" fill="#666"/>`);
    }
    if (acc.includes('glasses')) {
      P(`<g fill="rgba(255,255,255,.12)" stroke="#111" stroke-width="1.8"><circle cx="${cx - 9}" cy="${hy + 1}" r="6.2"/><circle cx="${cx + 9}" cy="${hy + 1}" r="6.2"/></g><path d="M${cx - 2.8} ${hy} q2.8 -2 5.6 0 M${cx - 15} ${hy - 1} l${-hw0 + 15} -2 M${cx + 15} ${hy - 1} l${hw0 - 15} -2" stroke="#111" stroke-width="1.6" fill="none"/>`);
    }
    if (acc.includes('cap')) {
      const top = hy - hh0 + 1;
      P(`<path d="M${cx - hw0 - 2} ${hy - 8} C${cx - hw0 - 3} ${top - 8} ${cx + hw0 + 3} ${top - 8} ${cx + hw0 + 2} ${hy - 8} Z" fill="#e01e37" ${OL}/><path d="M${cx - hw0 - 3} ${hy - 9} Q${cx} ${hy - 13} ${cx + hw0 + 14} ${hy - 6} Q${cx} ${hy - 4} ${cx - hw0 - 3} ${hy - 7} Z" fill="#b5172d" ${OL}/><circle cx="${cx}" cy="${top - 4}" r="2" fill="#b5172d"/>`);
    }
    if (acc.includes('headset')) {
      P(`<path d="M${cx - hw0 - 3} ${hy} C${cx - hw0 - 4} ${hy - hh0 - 8} ${cx + hw0 + 4} ${hy - hh0 - 8} ${cx + hw0 + 3} ${hy}" stroke="#222" stroke-width="3" fill="none"/><rect x="${cx + hw0 - 1}" y="${hy - 6}" width="7" height="12" rx="3" fill="#222"/><path d="M${cx + hw0 + 2} ${hy + 5} Q${cx + hw0} ${hy + 18} ${cx + 9} ${hy + 18}" stroke="#222" stroke-width="2" fill="none"/><circle cx="${cx + 8}" cy="${hy + 18}" r="2.2" fill="#222"/>`);
    }
  };

  const k = 1.12;
  const scaleHead = (fn) => { const at = parts.length; fn(); const g = parts.splice(at); parts.push(`<g transform="translate(${cx} ${hy + 26}) scale(${k}) translate(${-cx} ${-(hy + 26)})">${g.join('')}</g>`); };
  scaleHead(backHair);
  if (mode === 'full') legs();
  arm(-1, 'skin'); arm(1, 'skin');
  torso();
  arm(-1, 'cloth'); arm(1, 'cloth');
  scaleHead(head);
  const acc = av.acc || [];
  if (acc.includes('whistle')) extras(['whistle']);
  scaleHead(() => extras(acc.filter((a) => a !== 'whistle')));

  const vb = mode === 'bust' ? '43 8 114 114' : '18 0 164 302';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-hidden="true" stroke-linejoin="round">${parts.join('')}</svg>`;
}
