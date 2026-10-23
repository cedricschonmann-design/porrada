// Données enregistrées sur le téléphone (localStorage). Rien ne part sur un serveur,
// sauf les messages chiffrés échangés avec les amis (voir net.js).

const KEY = 'porrada.v1';
const listeners = new Set();

export function rid(len = 12) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const b of bytes) s += abc[b % abc.length];
  return s;
}

export function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function fresh() {
  return {
    v: 2,
    me: null,
    device: rid(6),
    friends: {},
    messages: {},
    fights: [],
    journal: [],
    course: null,
    game: { versions: [] },
    refChats: {},
    seen: [],
    settings: {
      theme: 'auto', sound: true, timerSound: true, haptics: true, reduceMotion: false,
      weeklyGoal: 3, broker: '', roundWork: 5, roundRest: 1,
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const st = Object.assign(fresh(), s, { settings: Object.assign(fresh().settings, s.settings || {}) });
    if (!st.messages) st.messages = {};
    if (!st.refChats) st.refChats = {};
    delete st.refLog;
    if (st.me) { delete st.me.av; delete st.me.pic; }
    for (const f of Object.values(st.friends || {})) { delete f.av; delete f.pic; }
    return st;
  } catch (e) {
    console.warn('Lecture des données impossible', e);
    return fresh();
  }
}

export const state = load();

let saveTimer = null;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Enregistrement impossible', e);
  }
  for (const fn of listeners) {
    try { fn(); } catch (e) { console.error(e); }
  }
}
export function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---------- Âge et catégorie ----------
export function ageFromYear(y) { return y ? new Date().getFullYear() - Number(y) : null; }
export function ageCategory(y) {
  const a = ageFromYear(y);
  if (a == null) return 'adulte';
  if (a < 13) return 'u13';
  if (a < 16) return 'u16';
  if (a < 18) return 'u18';
  if (a < 30) return 'adulte';
  return 'master';
}
// Profil utilisé par les arbitres et la stratégie
export function profile() {
  const m = state.me || {};
  return { belt: m.belt || 'blanche', stripes: m.stripes || 0, age: m.birthYear ? ageCategory(m.birthYear) : (m.age || 'adulte'), sex: m.sex || 'm', weight: m.weight || null };
}

export function createMe(data) {
  const key = crypto.getRandomValues(new Uint8Array(32));
  state.me = {
    id: rid(12),
    key: b64url(key),
    createdAt: Date.now(),
    name: '', username: '', email: '', birthYear: null, sex: 'm',
    belt: 'blanche', stripes: 0, beltSince: Date.now(), promotions: [], academy: '', weight: null,
    photo: null,
    onboarded: false,
    ...data,
  };
  save();
  return state.me;
}

export function myCard() {
  const m = state.me;
  return {
    t: 'card', id: m.id, name: m.name, u: m.username || '', belt: m.belt, stripes: m.stripes, key: m.key,
    pic: m.photo ? 1 : 0, ac: (m.academy || '').slice(0, 40),
  };
}

export function upsertFriend(card) {
  if (!card || !card.id || !state.me || card.id === state.me.id) return null;
  const prev = state.friends[card.id];
  state.friends[card.id] = {
    ...(prev || {}),
    id: card.id,
    name: String(card.name || 'Partenaire').slice(0, 24),
    username: String(card.u || (prev && prev.username) || '').slice(0, 24),
    belt: card.belt || 'blanche',
    stripes: card.stripes || 0,
    key: card.key || (prev && prev.key),
    academy: card.ac != null ? String(card.ac).slice(0, 40) : (prev && prev.academy) || '',
    photo: card.pic === 0 ? null : (prev && prev.photo) || null,
    addedAt: prev ? prev.addedAt : Date.now(),
    unread: prev ? prev.unread || 0 : 0,
  };
  save();
  return { friend: state.friends[card.id], isNew: !prev };
}

export function fightById(fid) { return state.fights.find((f) => f.fid === fid); }

export function friendName(id) {
  if (state.me && id === state.me.id) return state.me.name;
  return (state.friends[id] && state.friends[id].name) || 'Partenaire';
}

export function unreadTotal() {
  return Object.values(state.friends).reduce((n, f) => n + (f.unread || 0), 0);
}

// Palmarès entre moi et un ami
export function headToHead(friendId) {
  const me = state.me.id;
  const fights = state.fights
    .filter((f) => f.status === 'done' && f.result && [f.a, f.b].includes(friendId) && [f.a, f.b].includes(me))
    .sort((x, y) => (y.startAt || y.createdAt) - (x.startAt || x.createdAt));
  const s = { wins: 0, losses: 0, draws: 0, subWins: 0, ptsWins: 0, subLosses: 0, ptsLosses: 0, subsFor: 0, subsAgainst: 0, fights };
  const tl = (f, id) => (f.result.tally && Array.isArray(f.result.tally[id]) ? f.result.tally[id] : f.result.method === 'submission' && f.result.winner === id ? [f.result.sub] : []);
  for (const f of fights) {
    const r = f.result;
    s.subsFor += tl(f, me).length;
    s.subsAgainst += tl(f, friendId).length;
    if (!r.winner) { s.draws++; continue; }
    if (r.winner === me) { s.wins++; r.method === 'submission' ? s.subWins++ : s.ptsWins++; }
    else { s.losses++; r.method === 'submission' ? s.subLosses++ : s.ptsLosses++; }
  }
  return s;
}

export function myRecord() {
  const me = state.me.id;
  const done = state.fights.filter((f) => f.status === 'done' && f.result);
  const r = { wins: 0, losses: 0, draws: 0, subWins: 0, fights: done.length, streak: 0 };
  const sorted = [...done].sort((a, b) => (b.startAt || b.createdAt) - (a.startAt || a.createdAt));
  let streakOpen = true;
  for (const f of sorted) {
    const w = f.result.winner;
    if (!w) { r.draws++; streakOpen = false; continue; }
    if (w === me) { r.wins++; if (f.result.method === 'submission') r.subWins++; if (streakOpen) r.streak++; } else { r.losses++; streakOpen = false; }
  }
  return r;
}

export function exportData() {
  return JSON.stringify({ app: 'porrada', exportedAt: new Date().toISOString(), data: state }, null, 1);
}

export function importData(text) {
  const parsed = JSON.parse(text);
  const data = parsed && parsed.app === 'porrada' ? parsed.data : null;
  if (!data || !data.me) throw new Error('Ce fichier ne vient pas de PORRADA.');
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh(), data);
  save();
}

export function wipe() {
  localStorage.removeItem(KEY);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh());
}

// ---------- Transfert du compte (Safari → appli installée) ----------
// Sur iPhone, l'appli de l'écran d'accueil a sa propre mémoire, séparée de Safari :
// on emballe toutes les données dans un code à copier-coller.
export async function exportTransfer() {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream !== 'undefined') {
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const gz = new Uint8Array(await new Response(cs).arrayBuffer());
    return 'PRDT1.' + b64url(gz);
  }
  return 'PRDT0.' + b64url(bytes);
}

export async function importTransfer(text) {
  const m = String(text || '').match(/PRDT([01])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('Ce n’est pas un code de transfert PORRADA.');
  let bytes = unb64url(m[2]);
  if (m[1] === '1') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Mets à jour ton iPhone pour importer ce code.');
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || !data.me) throw new Error('Ce code ne contient pas de compte.');
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh(), data, { settings: Object.assign(fresh().settings, data.settings || {}) });
  state.device = rid(6);
  save();
}

// Demande au téléphone de ne jamais effacer les données de l'appli
export function keepStorage() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* tant pis */ }
}

export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = navigator.standalone === true || (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches);
