// Données de l'appli, gardées sur le téléphone (localStorage).

import { seed } from './seed.js';

const KEY = 'notes.v1';
const listeners = new Set();

export const rid = (n = 9) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
};

function fresh() {
  return { v: 1, books: [], notes: [], settings: { theme: 'auto', sound: true, haptics: true, timerSound: true } };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const base = fresh();
      return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
    }
  } catch (e) { /* on repart de zéro */ }
  return { ...fresh(), ...seed(rid) };
}

export const state = load();

let saveTimer = null;
export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
}
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
  listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
export function saveQuiet() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('pagehide', flush);
flush();

// ---------- Carnets et notes ----------
export const bookById = (id) => state.books.find((b) => b.id === id) || null;
export const noteById = (id) => state.notes.find((n) => n.id === id) || null;
export const notesIn = (bookId) => state.notes.filter((n) => n.book === bookId).sort((a, b) => (b.pinned - a.pinned) || (a.order ?? 99) - (b.order ?? 99) || b.updatedAt - a.updatedAt);

export function addNote(book, { title = '', icon = 'note', color = 'violet' } = {}) {
  const n = { id: rid(), book: book || (state.books[0] && state.books[0].id) || null, title, icon, color, pinned: false, blocks: [{ id: rid(), t: 'p', h: '' }], createdAt: Date.now(), updatedAt: Date.now() };
  state.notes.push(n);
  save();
  return n;
}
export function removeNote(id) { state.notes = state.notes.filter((n) => n.id !== id); save(); }
export function duplicateNote(n) {
  const copy = JSON.parse(JSON.stringify(n));
  copy.id = rid();
  copy.title = (n.title || 'Note') + ' (copie)';
  copy.pinned = false;
  copy.createdAt = copy.updatedAt = Date.now();
  copy.blocks.forEach((b) => { b.id = rid(); });
  state.notes.push(copy);
  save();
  return copy;
}
export function addBook(name, icon = 'folder', color = 'violet') {
  const b = { id: rid(), name: name.trim(), icon, color };
  state.books.push(b);
  save();
  return b;
}
export function removeBook(id) {
  const other = state.books.find((b) => b.id !== id);
  state.notes.forEach((n) => { if (n.book === id) n.book = other ? other.id : null; });
  state.books = state.books.filter((b) => b.id !== id);
  save();
}
export function touch(n) { n.updatedAt = Date.now(); }

// ---------- Dates ----------
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayIndex = (d = new Date()) => (d.getDay() + 6) % 7; // lundi = 0
export function weekKey(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - dayIndex(x));
  return todayKey(x);
}
export function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, dd] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, dd); const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((t - now) / 86400000);
}
export const fmtDate = (iso, opts = { day: '2-digit', month: '2-digit', year: '2-digit' }) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-CH', opts);
};

// ---------- Sauvegarde et transfert ----------
function b64url(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const bin = atob(str); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
export async function exportCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  if (typeof CompressionStream !== 'undefined') {
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return 'NOTES1.' + b64url(new Uint8Array(await new Response(cs).arrayBuffer()));
  }
  return 'NOTES0.' + b64url(bytes);
}
function replaceAll(data) {
  if (!data || !Array.isArray(data.notes) || !Array.isArray(data.books)) throw new Error('Ce n’est pas une sauvegarde Notes.');
  const base = fresh();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, base, data, { settings: { ...base.settings, ...(data.settings || {}) } });
  save(); flush();
}
export async function importCode(text) {
  const m = String(text || '').match(/NOTES([01])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('Ce n’est pas un code Notes.');
  let bytes = unb64url(m[2]);
  if (m[1] === '1') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Mets à jour ton iPhone pour importer ce code.');
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(ds).arrayBuffer());
  }
  replaceAll(JSON.parse(new TextDecoder().decode(bytes)));
}
export function exportJSON() { return JSON.stringify({ app: 'notes', at: Date.now(), ...state }, null, 1); }
export function importJSON(text) { replaceAll(JSON.parse(text)); }
export function resetContent() { const s = seed(rid); state.books = s.books; state.notes = s.notes; save(); flush(); }

export function keepStorage() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* tant pis */ } }
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = navigator.standalone === true || (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches);
