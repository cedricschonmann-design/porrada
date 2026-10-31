// Données de l'appli, gardées sur le téléphone (localStorage).

const KEY = 'coach.v1';
const listeners = new Set();

export const rid = (n = 10) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
};

function fresh() {
  return {
    v: 1,
    clients: [],
    notes: [],
    timer: { work: 120, rest: 30, rounds: 1, countdown: true, last: null },
    settings: { theme: 'auto', sound: true, haptics: true, timerSound: true },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    const base = fresh();
    return { ...base, ...data, timer: { ...base.timer, ...(data.timer || {}) }, settings: { ...base.settings, ...(data.settings || {}) } };
  } catch (e) {
    return fresh();
  }
}

export const state = load();

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 120);
  listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
export function saveQuiet() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}
export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('pagehide', flush);

// ---------- Clients et séances ----------
export const clientById = (id) => state.clients.find((c) => c.id === id) || null;
export const noteById = (id) => state.notes.find((n) => n.id === id) || null;
export const notesOf = (clientId) => state.notes.filter((n) => (n.clientId || null) === (clientId || null)).sort((a, b) => b.createdAt - a.createdAt);

export function addClient(name) {
  const c = { id: rid(), name: name.trim(), note: '', createdAt: Date.now(), updatedAt: Date.now() };
  state.clients.push(c);
  save();
  return c;
}
export function removeClient(id) {
  state.clients = state.clients.filter((c) => c.id !== id);
  state.notes = state.notes.filter((n) => n.clientId !== id);
  save();
}
export function addNote(clientId = null, { title = '', body = '' } = {}) {
  const n = { id: rid(), clientId: clientId || null, title, body, createdAt: Date.now(), updatedAt: Date.now() };
  state.notes.push(n);
  save();
  return n;
}
export function removeNote(id) {
  state.notes = state.notes.filter((n) => n.id !== id);
  save();
}
export const isEmptyNote = (n) => !n || (!String(n.title || '').trim() && !String(n.body || '').trim());
export function noteTitle(n) {
  const t = String(n.title || '').trim();
  if (t) return t;
  const first = String(n.body || '').trim().split('\n')[0];
  return first ? first.slice(0, 60) : 'Nouvelle séance';
}
export function notePreview(n) {
  const lines = String(n.body || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!String(n.title || '').trim()) lines.shift();
  return lines.join(' · ').slice(0, 120);
}

// ---------- Sauvegarde et transfert ----------
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export async function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream !== 'undefined') {
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return 'COACH1.' + b64url(new Uint8Array(await new Response(cs).arrayBuffer()));
  }
  return 'COACH0.' + b64url(bytes);
}
function replaceAll(data) {
  if (!data || !Array.isArray(data.notes) || !Array.isArray(data.clients)) throw new Error('Ce n’est pas une sauvegarde COACH.');
  const base = fresh();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, base, data, { timer: { ...base.timer, ...(data.timer || {}) }, settings: { ...base.settings, ...(data.settings || {}) } });
  save();
  flush();
}
export async function importCode(text) {
  const m = String(text || '').match(/COACH([01])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('Ce n’est pas un code COACH.');
  let bytes = unb64url(m[2]);
  if (m[1] === '1') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Mets à jour ton iPhone pour importer ce code.');
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  replaceAll(JSON.parse(new TextDecoder().decode(bytes)));
}
export function exportJSON() { return JSON.stringify({ app: 'coach', at: Date.now(), ...state }, null, 1); }
export function importJSON(text) { replaceAll(JSON.parse(text)); }

export function keepStorage() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* tant pis */ }
}
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = navigator.standalone === true || (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches);
