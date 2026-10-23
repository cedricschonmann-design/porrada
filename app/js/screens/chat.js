// Messages entre amis : chiffrés de bout en bout, enregistrés sur le téléphone.

import { state, save, rid, headToHead, onChange } from '../store.js';
import { h, fill, ICON, push, toast, sfx, haptic, hm, longDay } from '../ui.js';
import { onMessage, onStatus, send } from '../net.js';
import { avatarOf } from '../people.js';
import { subName } from '../data/submissions.js';

const QUICK = ['Oss 🤙', 'Open mat ce soir ?', 'Revanche ?', 'Bien joué 👊', 'J’arrive', 'Pas ce soir'];
let openFor = null; // ami dont la conversation est ouverte
let redraw = null;

const list = (id) => (state.messages[id] = state.messages[id] || []);
export function lastMessage(id) {
  const l = state.messages[id];
  return l && l.length ? l[l.length - 1] : null;
}

async function deliverOut(friendId, m) {
  const { live } = await send(friendId, { t: 'msg', mid: m.mid, text: m.text, ts: m.ts }, { queue: true });
  if (live && m.st === 'pending') { m.st = 'sent'; save(); }
}

export function sendText(friendId, text) {
  const t = String(text || '').trim().slice(0, 1000);
  if (!t) return;
  const m = { mid: rid(10), from: state.me.id, text: t, ts: Date.now(), st: 'pending' };
  list(friendId).push(m);
  const f = state.friends[friendId];
  if (f) f.lastMsgAt = m.ts;
  save();
  sfx('send');
  haptic('light');
  deliverOut(friendId, m);
}

export function openChat(friendId) {
  const f0 = state.friends[friendId];
  if (!f0) return;
  push((page) => {
    openFor = friendId;
    const f = () => state.friends[friendId] || f0;
    if (f().unread) { f().unread = 0; save(); }
    const chat = h('div', { class: 'chat', id: 'chat' });
    const input = h('textarea', { class: 'input', rows: '1', placeholder: 'Message', 'aria-label': 'Message', enterkeyhint: 'send' });
    const sendBtn = h('button', { class: 'iconbtn grad', 'aria-label': 'Envoyer', id: 'chat-send', 'data-silent': '', html: ICON.send });
    const doSend = () => { const v = input.value; if (!v.trim()) return; input.value = ''; autosize(); sendText(friendId, v); input.focus(); };
    const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; };
    input.addEventListener('input', autosize);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
    sendBtn.addEventListener('click', doSend);
    const chips = h('div', { class: 'chips scroll' }, QUICK.map((q) => h('button', { class: 'chip', 'data-silent': '', onclick: () => sendText(friendId, q) }, q)));

    let count = -1;
    const draw = () => {
      const msgs = list(friendId);
      // fil : messages + combats terminés avec cet ami
      const fights = headToHead(friendId).fights.map((fi) => ({ kind: 'fight', ts: fi.result.at || fi.startAt, fi }));
      const items = [...msgs.map((m) => ({ kind: 'msg', ts: m.ts, m })), ...fights].sort((a, b) => a.ts - b.ts);
      const out = [];
      let lastDay = '';
      items.forEach((it, i) => {
        const d = longDay(it.ts);
        if (d !== lastDay) { out.push(h('div', { class: 'day-sep' }, d)); lastDay = d; }
        if (it.kind === 'fight') {
          const r = it.fi.result;
          const txt = !r.winner ? 'Match nul' : r.winner === state.me.id ? `Tu gagnes ${r.method === 'submission' ? 'par ' + subName(r.sub).toLowerCase() : 'aux points'}` : `${f().name} gagne ${r.method === 'submission' ? 'par ' + subName(r.sub).toLowerCase() : 'aux points'}`;
          out.push(h('div', { class: 'event-pill' }, h('span', { html: ICON.fist, style: { display: 'contents' } }), `Combat · ${txt}`));
          return;
        }
        const m = it.m;
        const mine = m.from === state.me.id;
        const lastMine = mine && !items.slice(i + 1).some((x) => x.kind === 'msg' && x.m.from === state.me.id);
        const tick = mine ? (m.st === 'delivered' ? 'Reçu' : m.st === 'sent' ? 'Envoyé' : 'En attente de réseau') : null;
        const row = h('div', { class: 'msg-row ' + (mine ? 'me' : 'them') },
          mine ? null : avatarOf(f(), { size: 28 }),
          h('div', { class: 'bubble' }, m.text, h('div', { class: 'meta' }, hm(m.ts), lastMine ? ' · ' + tick : '')),
        );
        if (count >= 0 && i < items.length - 1) row.style.animation = 'none';
        out.push(row);
      });
      if (!items.length) {
        out.push(h('div', { class: 'empty', style: { marginTop: '20px' } }, h('div', { class: 'art', html: ICON.chat }), h('p', null, `Écris à ${f().name}. Vos messages sont chiffrés : seul lui peut les lire.`)));
      }
      fill(chat, ...out);
      const grew = msgs.length !== count;
      count = msgs.length;
      if (grew) requestAnimationFrame(() => { page.el.scrollTop = page.el.scrollHeight; });
    };
    redraw = draw;
    page.setRight(h('div', { class: 'hstack', style: { gap: '8px' } },
      h('button', { class: 'iconbtn', 'aria-label': `Défier ${f0.name}`, html: ICON.fist, onclick: () => import('./combat.js').then((c) => c.openInvite(friendId)) }),
      avatarOf(f0, { size: 40, onclick: () => import('./amis.js').then((a) => a.openFriend(friendId)), label: `Profil de ${f0.name}` }),
    ));
    page.onClosed(() => { if (openFor === friendId) { openFor = null; redraw = null; } });
    draw();
    return [
      h('div', { class: 'chat-wrap bottom' }, chat),
      h('div', { class: 'composer' }, chips, h('div', { class: 'bar' }, input, sendBtn)),
    ];
  }, { title: f0.name, bareNav: true, cls: 'chatpage' });
}

// ---------- Réception ----------
onMessage((msg) => {
  if (!state.me) return;
  if (msg.t === 'msg' && state.friends[msg.from]) {
    const l = list(msg.from);
    if (l.some((x) => x.mid === msg.mid)) return;
    l.push({ mid: msg.mid, from: msg.from, text: String(msg.text || '').slice(0, 1000), ts: Math.min(Date.now(), msg.ts || Date.now()) });
    if (l.length > 500) l.splice(0, l.length - 500);
    const f = state.friends[msg.from];
    f.lastMsgAt = Date.now();
    send(msg.from, { t: 'ack', ref: msg.mid });
    if (openFor === msg.from) {
      save();
      sfx('receive');
    } else {
      f.unread = (f.unread || 0) + 1;
      save();
      sfx('notify');
      haptic('medium');
      toast(`${f.name} : ${String(msg.text).slice(0, 60)}`, { action: { label: 'Ouvrir', fn: () => openChat(msg.from) } });
    }
  } else if (msg.t === 'ack' && state.messages[msg.from]) {
    const m = state.messages[msg.from].find((x) => x.mid === msg.ref);
    if (m && m.st !== 'delivered') { m.st = 'delivered'; save(); }
  }
});

// Messages en attente : on les renvoie dès que le réseau revient.
onStatus((s) => {
  if (s !== 'online' || !state.me) return;
  for (const [id, msgs] of Object.entries(state.messages)) {
    for (const m of msgs) if (m.from === state.me.id && m.st === 'pending' && state.friends[id]) deliverOut(id, m);
  }
});

// La conversation ouverte suit les changements (nouveaux messages, accusés).
onChange(() => { if (redraw) requestAnimationFrame(() => redraw && redraw()); });
