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
    v: 1,
    me: null,
    device: rid(6),
    friends: {},
    fights: [],
    journal: [],
    course: null,
    game: { versions: [] },
    refLog: [],
    seen: [],
    settings: { theme: 'auto', sound: true, broker: '' },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return Object.assign(fresh(), s, { settings: Object.assign(fresh().settings, s.settings || {}) });
  } catch (e) {
    console.warn('Lecture des données impossible', e);
    return fresh();
  }
}

export const state = load();

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

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function createMe({ name, belt, stripes, age }) {
  const key = crypto.getRandomValues(new Uint8Array(32));
  state.me = {
    id: rid(12),
    name: name.trim().slice(0, 24),
    belt, stripes: stripes || 0, age: age || 'adulte',
    key: b64url(key),
    createdAt: Date.now(),
  };
  save();
}

export function myCard() {
  const m = state.me;
  return { t: 'card', id: m.id, name: m.name, belt: m.belt, stripes: m.stripes, key: m.key };
}

export function upsertFriend(card) {
  if (!card || !card.id || card.id === state.me.id) return null;
  const prev = state.friends[card.id];
  state.friends[card.id] = {
    id: card.id,
    name: String(card.name || 'Partenaire').slice(0, 24),
    belt: card.belt || 'blanche',
    stripes: card.stripes || 0,
    key: card.key || (prev && prev.key),
    addedAt: prev ? prev.addedAt : Date.now(),
  };
  save();
  return { friend: state.friends[card.id], isNew: !prev };
}

export function fightById(fid) { return state.fights.find((f) => f.fid === fid); }

export function friendName(id) {
  if (state.me && id === state.me.id) return state.me.name;
  return (state.friends[id] && state.friends[id].name) || 'Partenaire';
}

// Palmarès entre moi et un ami
export function headToHead(friendId) {
  const me = state.me.id;
  const fights = state.fights
    .filter((f) => f.status === 'done' && f.result && [f.a, f.b].includes(friendId) && [f.a, f.b].includes(me))
    .sort((x, y) => (y.startAt || y.createdAt) - (x.startAt || x.createdAt));
  const s = { wins: 0, losses: 0, draws: 0, subWins: 0, ptsWins: 0, subLosses: 0, ptsLosses: 0, fights };
  for (const f of fights) {
    const r = f.result;
    if (!r.winner) { s.draws++; continue; }
    if (r.winner === me) { s.wins++; r.method === 'submission' ? s.subWins++ : s.ptsWins++; }
    else { s.losses++; r.method === 'submission' ? s.subLosses++ : s.ptsLosses++; }
  }
  return s;
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
