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
  return { v: 1, books: [], notes: [], trash: [], settings: { theme: 'auto', sound: true, haptics: true, timerSound: true } };
}

// Ce qui s'est passé au démarrage : données trouvées, absentes ou abîmées (pour proposer une récupération).
export const boot = { found: false, broken: false };
// Tant qu'une récupération est possible, la copie du jour n'est pas écrasée par un contenu vide.
const guard = { hold: true };
export function releaseGuard() { guard.hold = false; }

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* stockage indisponible */ }
  if (raw) {
    try {
      const data = JSON.parse(raw);
      const base = fresh();
      boot.found = true;
      return { ...base, ...data, trash: data.trash || [], settings: { ...base.settings, ...(data.settings || {}) } };
    } catch (e) {
      // Données abîmées : on les met de côté au lieu de les écraser.
      boot.broken = true;
      try { localStorage.setItem(KEY + '.abime.' + Date.now(), raw); } catch (e2) { /* plein */ }
    }
  }
  return { ...fresh(), ...seed(rid) };
}

export const state = load();

let saveTimer = null;
let mirrorTimer = null;
export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.error(e); }
  // Copie du jour dans un deuxième coffre (IndexedDB), quelques secondes après la dernière modification.
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => { snapshot('jour').catch(() => {}); }, 4000);
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
// (Le contenu de départ n’est écrit qu’à la première modification : une récupération reste possible jusque-là.)

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
// Une note supprimée va dans la corbeille pendant 30 jours.
const TRASH_DAYS = 30;
export function removeNote(id) {
  const n = noteById(id);
  if (!n) return;
  state.trash = [{ ...n, deletedAt: Date.now() }, ...(state.trash || []).filter((x) => x.id !== id)];
  state.notes = state.notes.filter((x) => x.id !== id);
  save();
}
export function restoreNote(id) {
  const n = (state.trash || []).find((x) => x.id === id);
  if (!n) return null;
  state.trash = state.trash.filter((x) => x.id !== id);
  const { deletedAt, ...note } = n;
  if (!bookById(note.book)) note.book = state.books[0] ? state.books[0].id : null;
  state.notes.push(note);
  save();
  return note;
}
export function forgetNote(id) { state.trash = (state.trash || []).filter((x) => x.id !== id); save(); }
export function purgeTrash() {
  const limit = Date.now() - TRASH_DAYS * 86400000;
  const before = (state.trash || []).length;
  state.trash = (state.trash || []).filter((x) => x.deletedAt > limit);
  if (state.trash.length !== before) saveQuiet();
}
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
  guard.hold = false;
  const keep = { lastBackup: state.settings && state.settings.lastBackup };
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, base, data, { trash: data.trash || [], settings: { ...base.settings, ...(data.settings || {}), ...(keep.lastBackup ? keep : {}) } });
  save(); flush();
}
async function decodeCode(text) {
  const m = String(text || '').replace(/\s+/g, '').match(/NOTES([01])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('Ce n’est pas un code Notes. Copie bien tout le code, du début (NOTES1.) à la fin.');
  let bytes = unb64url(m[2]);
  if (m[1] === '1') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Mets à jour ton iPhone pour importer ce code.');
    try {
      const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(ds).arrayBuffer());
    } catch (e) { throw new Error('Le code est incomplet : copie-le en entier.'); }
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function checkCode(text) { const d = await decodeCode(text); return { notes: (d.notes || []).length, books: (d.books || []).length }; }
// Avant de tout remplacer, on garde une copie de l'état actuel (restaurable dans l'historique).
export async function importCode(text) {
  const data = await decodeCode(text);
  await snapshot('avant import').catch(() => {});
  replaceAll(data);
}
export function exportJSON() { return JSON.stringify({ app: 'notes', at: Date.now(), ...state }, null, 1); }
export async function importJSON(text) {
  const data = JSON.parse(text);
  await snapshot('avant restauration').catch(() => {});
  replaceAll(data);
}
export async function resetContent() {
  await snapshot('avant remise à zéro').catch(() => {});
  const s = seed(rid); state.books = s.books; state.notes = s.notes; save(); flush();
}

// ---------- Copies automatiques (IndexedDB) ----------
// Une copie par jour (la dernière version de la journée), gardée 30 jours, plus une copie avant chaque
// import, restauration ou remise à zéro. C'est un deuxième coffre, séparé du stockage principal.
const DB = 'notes-copies';
const DAY_KEEP = 30;
const EVENT_KEEP = 15;
let dbp = null;
function db() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('indisponible'));
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('copies', { keyPath: 'key' }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => { dbp = null; reject(r.error); };
    });
  }
  return dbp;
}
function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction('copies', mode);
    const out = fn(t.objectStore('copies'));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}
export async function snapshot(reason = 'jour') {
  const daily = reason === 'jour';
  if (daily && guard.hold && !(boot.found && !boot.broken)) return;
  const rec = {
    key: daily ? 'jour-' + todayKey() : 'evt-' + Date.now(),
    at: Date.now(), reason, notes: state.notes.length,
    data: JSON.stringify({ ...state }),
  };
  if (!rec.notes) return;
  await tx('readwrite', (s) => s.put(rec));
  await prune();
}
async function prune() {
  const all = await listCopies();
  const days = all.filter((c) => c.key.startsWith('jour-'));
  const evts = all.filter((c) => c.key.startsWith('evt-'));
  const drop = [...days.slice(DAY_KEEP), ...evts.slice(EVENT_KEEP)];
  if (drop.length) await tx('readwrite', (s) => { drop.forEach((c) => s.delete(c.key)); });
}
// Liste sans le contenu (plus léger), la plus récente d'abord.
export async function listCopies() {
  const all = await tx('readonly', (s) => s.getAll());
  return (all || []).map(({ data, ...meta }) => meta).sort((a, b) => b.at - a.at);
}
export async function restoreCopy(key) {
  const rec = await tx('readonly', (s) => s.get(key));
  if (!rec) throw new Error('Copie introuvable.');
  await snapshot('avant restauration').catch(() => {});
  replaceAll(JSON.parse(rec.data));
}
// Au démarrage : si le stockage principal est vide ou abîmé alors qu'une copie existe, on la propose.
export async function findLostNotes() {
  if (boot.found && !boot.broken) { guard.hold = false; return null; }
  const all = await listCopies().catch(() => []);
  const best = all.find((c) => c.notes > 1);
  if (!best) guard.hold = false;
  return best || null;
}

export function keepStorage() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* tant pis */ } }
export async function storageStatus() {
  let persisted = null;
  try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) { /* inconnu */ }
  const copies = await listCopies().catch(() => []);
  return { persisted, copies };
}
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = navigator.standalone === true || (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches);
