// Échanges entre téléphones.
// 1) En direct par Internet : un relais public gratuit (protocole MQTT). Chaque message est
//    chiffré avec la clé de l'ami (AES-GCM) : le relais ne voit que du charabia.
// 2) Sans réseau : le même message s'affiche en QR code, l'autre le scanne.

import { state, save, rid, b64url, unb64url } from './store.js';

const DEFAULT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];
const PREFIX = 'porrada/v1/';
const KEEPALIVE = 30;
const enc = new TextEncoder();
const dec = new TextDecoder();

let ws = null;
let status = 'offline';
let brokerIdx = 0;
let failures = 0;
let nextPid = 1;
let buf = new Uint8Array(0);
let lastRx = 0;
let pingTimer = null;
let retryTimer = null;
let started = false;
const inflight = new Map();
const outbox = [];
const handlers = new Set();
const statusFns = new Set();

export function onMessage(fn) { handlers.add(fn); return () => handlers.delete(fn); }
export function onStatus(fn) { statusFns.add(fn); return () => statusFns.delete(fn); }
export function isOnline() { return status === 'online'; }
export function netStatus() { return status; }

function setStatus(s) {
  if (s === status) return;
  status = s;
  for (const fn of statusFns) { try { fn(s); } catch (e) { console.error(e); } }
}

function brokerUrl() {
  const q = new URLSearchParams(location.search).get('broker');
  if (q) return q;
  if (state.settings.broker) return state.settings.broker;
  return DEFAULT_BROKERS[brokerIdx % DEFAULT_BROKERS.length];
}

// ---------- Paquets MQTT 3.1.1 (le strict nécessaire) ----------
function str(s) {
  const b = enc.encode(s);
  const out = new Uint8Array(b.length + 2);
  out[0] = b.length >> 8; out[1] = b.length & 255; out.set(b, 2);
  return out;
}
function cat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function packet(first, body) {
  const len = [];
  let x = body.length;
  do { let d = x % 128; x = Math.floor(x / 128); if (x > 0) d |= 128; len.push(d); } while (x > 0);
  return cat(new Uint8Array([first, ...len]), body);
}
function u16(n) { return new Uint8Array([n >> 8, n & 255]); }
function pid() { nextPid = nextPid % 65535 + 1; return nextPid; }

function sendRaw(bytes) {
  if (ws && ws.readyState === 1) ws.send(bytes);
}

function connect() {
  clearTimeout(retryTimer);
  if (!state.me) return;
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  if (!navigator.onLine) { setStatus('offline'); return; }
  setStatus('connecting');
  let sock;
  try {
    sock = new WebSocket(brokerUrl(), ['mqtt']);
  } catch (e) {
    fail();
    return;
  }
  ws = sock;
  sock.binaryType = 'arraybuffer';
  buf = new Uint8Array(0);
  const timeout = setTimeout(() => { if (sock.readyState !== 1 || status !== 'online') sock.close(); }, 9000);
  sock.onopen = () => {
    const clientId = 'p' + state.me.id + state.device;
    const vh = cat(str('MQTT'), new Uint8Array([4, 0x00]), u16(KEEPALIVE)); // session persistante
    sendRaw(packet(0x10, cat(vh, str(clientId))));
  };
  sock.onmessage = (ev) => {
    lastRx = Date.now();
    buf = cat(buf, new Uint8Array(ev.data));
    parse();
  };
  sock.onclose = () => {
    clearTimeout(timeout);
    if (ws === sock) { ws = null; stopPing(); if (status !== 'offline') fail(); }
  };
  sock.onerror = () => { /* onclose suit */ };
}

function fail() {
  setStatus('offline');
  failures++;
  if (!state.settings.broker && failures % 3 === 0) brokerIdx++;
  const wait = Math.min(15000, 1000 * Math.pow(2, Math.min(failures, 4)));
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, wait);
}

function parse() {
  for (;;) {
    if (buf.length < 2) return;
    let mult = 1, len = 0, i = 1, d;
    do {
      if (i >= buf.length) return;
      d = buf[i++];
      len += (d & 127) * mult;
      mult *= 128;
    } while (d & 128);
    if (buf.length < i + len) return;
    const type = buf[0] >> 4;
    const flags = buf[0] & 15;
    const body = buf.slice(i, i + len);
    buf = buf.slice(i + len);
    handlePacket(type, flags, body);
  }
}

function handlePacket(type, flags, body) {
  if (type === 2) { // CONNACK
    if (body[1] !== 0) { ws && ws.close(); return; }
    failures = 0;
    setStatus('online');
    const p = pid();
    sendRaw(packet(0x82, cat(u16(p), str(PREFIX + state.me.id), new Uint8Array([1]))));
    startPing();
    for (const [id, m] of inflight) sendRaw(publishPacket(m.topic, m.payload, id, true));
    while (outbox.length) {
      const o = outbox.shift();
      publish(o.topic, o.payload);
    }
  } else if (type === 3) { // PUBLISH
    const qos = (flags >> 1) & 3;
    const tlen = (body[0] << 8) | body[1];
    let o = 2 + tlen;
    let id = 0;
    if (qos > 0) { id = (body[o] << 8) | body[o + 1]; o += 2; }
    const payload = body.slice(o);
    if (qos === 1) sendRaw(packet(0x40, u16(id)));
    receive(payload);
  } else if (type === 4) { // PUBACK
    inflight.delete((body[0] << 8) | body[1]);
  }
}

function startPing() {
  stopPing();
  lastRx = Date.now();
  pingTimer = setInterval(() => {
    if (Date.now() - lastRx > KEEPALIVE * 1500) { ws && ws.close(); return; }
    sendRaw(new Uint8Array([0xc0, 0]));
  }, 20000);
}
function stopPing() { clearInterval(pingTimer); pingTimer = null; }

function publishPacket(topic, payload, id, dup = false) {
  return packet(0x32 | (dup ? 8 : 0), cat(str(topic), u16(id), payload));
}
function publish(topic, payload) {
  const id = pid();
  inflight.set(id, { topic, payload });
  sendRaw(publishPacket(topic, payload, id));
}

// ---------- Chiffrement ----------
const keyCache = new Map();
async function aesKey(b64) {
  if (!keyCache.has(b64)) {
    keyCache.set(b64, crypto.subtle.importKey('raw', unb64url(b64), 'AES-GCM', false, ['encrypt', 'decrypt']));
  }
  return keyCache.get(b64);
}

async function seal(msg, keyB64) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(keyB64), enc.encode(JSON.stringify(msg)));
  return enc.encode(JSON.stringify({ i: b64url(iv), c: b64url(new Uint8Array(ct)) }));
}

async function receive(payload) {
  try {
    const box = JSON.parse(dec.decode(payload));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(box.i) }, await aesKey(state.me.key), unb64url(box.c));
    deliver(JSON.parse(dec.decode(plain)), 'net');
  } catch (e) {
    console.warn('Message illisible ignoré');
  }
}

// ---------- Messages ----------
function stamp(msg) {
  return Object.assign({ mid: rid(10), from: state.me.id, ts: Date.now() }, msg);
}

export function deliver(msg, via) {
  if (!msg || !msg.t) return;
  if (msg.mid) {
    if (state.seen.includes(msg.mid)) return;
    state.seen.push(msg.mid);
    if (state.seen.length > 300) state.seen.splice(0, state.seen.length - 300);
    save();
  }
  for (const fn of handlers) {
    try { fn(msg, via); } catch (e) { console.error(e); }
  }
}

// Envoie un message à un ami. Renvoie le message (avec son identifiant) et s'il est parti en direct.
export async function send(toId, msg, { queue = true } = {}) {
  const m = stamp(msg);
  const friend = state.friends[toId];
  if (!friend || !friend.key) return { msg: m, live: false };
  const payload = await seal(m, friend.key);
  const topic = PREFIX + toId;
  if (status === 'online') {
    publish(topic, payload);
    return { msg: m, live: true };
  }
  if (queue) outbox.push({ topic, payload });
  connect();
  return { msg: m, live: false };
}

export function stamped(msg) { return stamp(msg); }

// ---------- Codes (QR ou texte à coller) ----------
export function toCode(msg) {
  return 'PRD1.' + b64url(enc.encode(JSON.stringify(msg)));
}
export function fromCode(text) {
  const m = String(text || '').match(/PRD1\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try { return JSON.parse(dec.decode(unb64url(m[1]))); } catch (e) { return null; }
}

export function startNet() {
  if (started) { connect(); return; }
  started = true;
  connect();
  window.addEventListener('online', () => { failures = 0; connect(); });
  window.addEventListener('offline', () => { if (ws) ws.close(); setStatus('offline'); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!ws || ws.readyState > 1) { failures = 0; connect(); }
      else if (Date.now() - lastRx > 25000) sendRaw(new Uint8Array([0xc0, 0]));
    }
  });
}
