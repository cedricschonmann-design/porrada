// Combats entre amis : invitation, compte à rebours commun, chrono du round, résultat.

import { state, save, rid, fightById, friendName } from '../store.js';
import { h, fill, ICON, sheet, toast, seg, mmss, SPEED, sfx, haptic, keepAwake, unlockAudio, norm, ask, plural, confetti } from '../ui.js';
import { onMessage, send, toCode, isOnline } from '../net.js';
import { qrSvg } from '../qr.js';
import { avatarOf } from '../people.js';
import { subsFor, KIND_LABEL, subName, SUB_BY_ID, FAMILIES } from '../data/submissions.js';

const COUNTDOWN = 10000 / SPEED;
const INVITE_TTL = 120000;

let board = null;     // combat affiché : { fid, close, received, stop }
let waiting = null;   // mon invitation en attente : { fid, close }
let incoming = null;  // invitation reçue : { fid, close }

export function isBusy() { return !!board; }
const roundMs = (f) => (f.minutes * 60000) / SPEED;
const other = (f) => (f.a === state.me.id ? f.b : f.a);
const modeLabel = (m) => (m === 'nogi' ? 'No-Gi' : 'Gi');
const person = (id) => (id === state.me.id ? state.me : state.friends[id] || { name: friendName(id) });

// ---------- Inviter ----------
export function openInvite(friendId, preset = null) {
  const f = state.friends[friendId];
  if (!f) return;
  let minutes = (preset && preset.minutes) || state.settings.lastMinutes || 5;
  let mode = (preset && preset.mode) || state.settings.lastMode || 'gi';
  sheet((close) => {
    const val = h('div', { class: 'v num', id: 'inv-min' }, `${minutes} min`);
    const quick = h('div', { class: 'chips' });
    const setMin = (m) => { minutes = Math.max(1, Math.min(20, m)); val.textContent = `${minutes} min`; drawQuick(); };
    const drawQuick = () => fill(quick, ...[3, 4, 5, 6, 7, 8, 10].map((m) => h('button', { class: 'chip', 'data-min': m, 'aria-pressed': String(m === minutes), onclick: () => { setMin(m); sfx('toggle'); } }, `${m} min`)));
    drawQuick();
    return h('div', { class: 'stack' },
      h('div', { class: 'hstack', style: { gap: '12px' } }, avatarOf(f, { size: 52, ring: true }), h('div', null, h('h2', null, `Défier ${f.name}`), h('div', { class: 'muted small' }, 'Le chrono démarre chez vous deux quand il accepte.'))),
      h('div', { class: 'field' }, h('span', null, 'Durée du round'),
        h('div', { class: 'card', style: { padding: '10px 12px' } },
          h('div', { class: 'stepper', style: { justifyContent: 'space-between' } },
            h('button', { class: 'iconbtn', 'aria-label': 'Moins une minute', html: ICON.minus, onclick: () => setMin(minutes - 1) }),
            val,
            h('button', { class: 'iconbtn', 'aria-label': 'Plus une minute', html: ICON.plus, onclick: () => setMin(minutes + 1) }),
          ),
        ),
        quick,
      ),
      h('div', { class: 'field' }, h('span', null, 'Tenue'), seg([['gi', 'Gi (kimono)'], ['nogi', 'No-Gi']], mode, (v) => { mode = v; })),
      h('button', {
        class: 'btn primary lg block', id: 'inv-send', onclick: () => {
          unlockAudio();
          state.settings.lastMinutes = minutes;
          state.settings.lastMode = mode;
          close();
          sendInvite(friendId, minutes, mode);
        },
      }, h('span', { html: ICON.fist, style: { display: 'contents' } }), 'Envoyer le défi'),
    );
  });
}

async function sendInvite(friendId, minutes, mode) {
  const fid = rid(10);
  const fight = { fid, a: state.me.id, b: friendId, inviter: state.me.id, mode, minutes, status: 'invited', createdAt: Date.now() };
  state.fights.push(fight);
  save();
  sfx('send');
  const { msg, live } = await send(friendId, { t: 'invite', fid, to: friendId, mode, minutes }, { queue: false });
  showWaiting(fight, toCode(msg), live);
}

function showWaiting(fight, code, live) {
  const name = friendName(fight.b);
  let qrShown = !live;
  const close = sheet((closeIt) => {
    const wrap = h('div', { class: 'stack', id: 'waiting', style: { textAlign: 'center' } });
    const draw = () => fill(wrap,
      h('div', { style: { display: 'grid', justifyItems: 'center', gap: '10px' } },
        qrShown ? null : h('div', { style: { animation: 'pulse 1.6s infinite' } }, avatarOf(person(fight.b), { size: 84, ring: true })),
        h('h2', null, live ? `Défi envoyé à ${name}` : `Fais scanner ce code par ${name}`),
        h('p', { class: 'muted' }, `${fight.minutes} min · ${modeLabel(fight.mode)}. ${live ? 'Dès qu’il accepte, le compte à rebours démarre chez vous deux.' : 'Pas de réseau : il scanne ce code avec PORRADA (Amis › Scanner).'}`),
      ),
      qrShown ? qrSvg(code) : h('div', { class: 'hstack', style: { justifyContent: 'center', padding: '6px 0' } }, h('div', { class: 'spinner' }), h('b', null, 'En attente de sa réponse…')),
      !qrShown ? h('button', { class: 'link', onclick: () => { qrShown = true; draw(); } }, 'Il n’a rien reçu ? Montrer le QR code') : null,
      h('button', {
        class: 'btn block', onclick: () => {
          fight.status = 'cancelled';
          save();
          closeIt();
          send(fight.b, { t: 'cancel', fid: fight.fid }, { queue: false });
        },
      }, 'Annuler le défi'),
    );
    draw();
    return wrap;
  }, { locked: true, onClose: () => { if (waiting && waiting.fid === fight.fid) waiting = null; } });
  waiting = { fid: fight.fid, close };
  setTimeout(() => {
    if (waiting && waiting.fid === fight.fid && fight.status === 'invited') {
      fight.status = 'expired';
      save();
      waiting.close();
      toast(`${name} n’a pas répondu. Défi expiré.`);
    }
  }, INVITE_TTL);
}

// ---------- Recevoir une invitation ----------
function onInvite(msg) {
  if (msg.to !== state.me.id) { toast('Ce défi est pour quelqu’un d’autre.'); return; }
  const friend = state.friends[msg.from];
  if (!friend) { toast('Ce défi vient de quelqu’un qui n’est pas encore ton ami. Scanne d’abord son code ami.'); return; }
  if (Date.now() - msg.ts > INVITE_TTL) { toast(`Le défi de ${friend.name} a expiré.`); return; }
  let fight = fightById(msg.fid);
  if (!fight) {
    fight = { fid: msg.fid, a: msg.from, b: state.me.id, inviter: msg.from, mode: msg.mode === 'nogi' ? 'nogi' : 'gi', minutes: Number(msg.minutes) || 5, status: 'invited', createdAt: msg.ts };
    state.fights.push(fight);
    save();
  }
  if (fight.status !== 'invited') return;
  sfx('notify');
  haptic('heavy');
  if (incoming) incoming.close();
  const close = sheet((closeIt) => h('div', { class: 'stack', id: 'incoming', style: { textAlign: 'center' } },
    h('div', { style: { display: 'grid', justifyItems: 'center', gap: '10px', margin: '4px 0 6px' } },
      avatarOf(friend, { size: 96, ring: true }),
      h('h2', { style: { fontSize: '26px' } }, `${friend.name} te défie`),
      h('div', { class: 'chips', style: { justifyContent: 'center' } }, h('span', { class: 'chip static' }, h('span', { html: ICON.timer, style: { display: 'contents' } }), `${fight.minutes} min`), h('span', { class: 'chip static' }, modeLabel(fight.mode))),
    ),
    h('button', { class: 'btn primary lg block', id: 'accept', onclick: () => { closeIt(); accept(fight); } }, 'Accepter'),
    h('button', {
      class: 'btn ghost block', onclick: () => {
        fight.status = 'declined';
        save();
        closeIt();
        send(fight.a, { t: 'decline', fid: fight.fid }, { queue: false });
      },
    }, 'Pas maintenant'),
  ), { locked: true, onClose: () => { if (incoming && incoming.fid === fight.fid) incoming = null; } });
  incoming = { fid: fight.fid, close };
}

async function accept(fight) {
  unlockAudio();
  const online = isOnline();
  fight.startAt = Date.now() + COUNTDOWN + (online ? 1500 : 20000) / SPEED;
  fight.status = 'accepted';
  save();
  const { msg, live } = await send(fight.a, { t: 'accept', fid: fight.fid, startAt: fight.startAt }, { queue: false });
  openBoard(fight.fid, live ? null : toCode(msg));
}

// ---------- Le tableau : compte à rebours, chrono, résultat ----------
export function openBoard(fid, qrCode = null) {
  const fight = fightById(fid);
  if (!fight) return;
  if (board) board.close(true);
  if (waiting) waiting.close();
  if (incoming) incoming.close();
  keepAwake(true);
  let timer = null;
  let phase = null;
  let lastNum = null;
  let warned = {};
  let step = { s: 'winner' };
  let correcting = false;
  const oppId = other(fight);
  const opp = person(oppId);
  const oppName = opp.name;

  const el = h('div', { class: 'board', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'glow' }, h('i'), h('i')));
  const top = h('div', null,
    h('div', { class: 'names' },
      h('div', { class: 'who' }, avatarOf(state.me, { size: 38 }), h('span', null, state.me.name)),
      h('div', { class: 'vs' }, 'VS'),
      h('div', { class: 'who r' }, avatarOf(opp, { size: 38 }), h('span', null, oppName)),
    ),
    h('div', { class: 'meta' }, `Round de ${plural(fight.minutes, 'minute', 'minutes')} · ${modeLabel(fight.mode)}`),
  );
  const center = h('div', { class: 'center' });
  const bottom = h('div', { style: { display: 'grid', gap: '10px' } });
  el.append(top, center, bottom);
  document.getElementById('layer').append(el);
  document.body.classList.add('no-tabbar');

  const closeIt = (instant = false) => {
    clearInterval(timer);
    keepAwake(false);
    if (board && board.fid === fid) board = null;
    document.body.classList.remove('no-tabbar');
    if (instant) { el.remove(); return; }
    el.classList.add('closing');
    setTimeout(() => el.remove(), 300);
  };

  const endAt = () => (fight.stoppedAt ? Math.min(fight.stoppedAt, fight.startAt + roundMs(fight)) : fight.startAt + roundMs(fight));
  const R = 150; const C = 2 * Math.PI * R;

  const tick = () => {
    const now = Date.now();
    let p;
    if (fight.result && fight.status === 'done' && !correcting) p = 'done';
    else if (now < fight.startAt - COUNTDOWN) p = 'pre';
    else if (now < fight.startAt) p = 'count';
    else if (now < endAt()) p = 'round';
    else p = 'result';
    if (p !== phase) {
      const prev = phase;
      phase = p;
      if (p === 'round' && fight.status !== 'running') { fight.status = 'running'; save(); }
      if (p === 'result' && prev === 'round') { sfx('buzzer'); haptic('heavy'); }
      if (p === 'result' && !['ended', 'done'].includes(fight.status)) { fight.status = 'ended'; save(); }
      el.classList.remove('hot');
      draw();
    }
    update(now);
  };

  const update = (now) => {
    if (phase === 'pre') {
      const n = center.querySelector('[data-pre]');
      if (n) n.textContent = Math.ceil((fight.startAt - COUNTDOWN - now) / (1000 / SPEED)) + ' s';
    } else if (phase === 'count') {
      const num = Math.max(1, Math.ceil((fight.startAt - now) / (1000 / SPEED)));
      if (num !== lastNum) {
        lastNum = num;
        const c = center.querySelector('.count');
        if (c) { c.textContent = num; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; }
        sfx(num <= 3 ? 'count3' : 'count');
        if (num <= 3) haptic('medium');
      }
    } else if (phase === 'round') {
      const left = endAt() - now;
      const leftReal = left * SPEED;
      const clock = center.querySelector('.clock');
      if (clock) clock.textContent = mmss(leftReal);
      const ring = center.querySelector('.fgc');
      if (ring) ring.style.strokeDashoffset = (C * (1 - left / roundMs(fight))).toFixed(1);
      el.classList.toggle('hot', leftReal <= 10000);
      if (lastNum !== 'go') { lastNum = 'go'; sfx('go'); haptic('heavy'); }
      if (leftReal <= 30000 && leftReal > 29000 && !warned[30] && roundMs(fight) * SPEED > 60000) { warned[30] = true; sfx('warn'); }
      if (leftReal <= 10000 && !warned[10]) { warned[10] = true; sfx('warn'); haptic('medium'); }
    }
  };

  const draw = () => {
    fill(bottom);
    el.classList.remove('win');
    if (phase === 'pre') {
      fill(center, h('div', { style: { display: 'grid', gap: '14px', justifyItems: 'center', width: '100%' } },
        qrCode ? qrSvg(qrCode) : null,
        h('div', { class: 'label' }, qrCode ? `Fais scanner ce code par ${oppName}` : 'Prêts ?'),
        h('div', { class: 'muted' }, 'Le compte à rebours démarre dans ', h('b', { 'data-pre': '' }, '')),
      ));
      bottom.append(cancelBtn());
    } else if (phase === 'count') {
      fill(center, h('div', null, h('div', { class: 'giant count' }, '10'), h('div', { class: 'label', style: { marginTop: '6px' } }, 'Prêts ?')));
      bottom.append(cancelBtn());
    } else if (phase === 'round') {
      const ring = h('div', { class: 'tring', html: `<svg viewBox="0 0 320 320"><circle class="bgc" cx="160" cy="160" r="${R}"/><circle class="fgc" cx="160" cy="160" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg>` });
      ring.append(h('div', null, h('div', { class: 'giant clock' }, mmss(roundMs(fight) * SPEED)), h('div', { class: 'muted', style: { marginTop: '8px', fontWeight: '700' } }, 'Combattez !')));
      fill(center, ring);
      bottom.append(h('button', {
        class: 'btn lg block', onclick: async () => {
          if (!(await ask('Arrêter le combat ?', 'Par exemple s’il y a eu une soumission. Vous passez au résultat.', 'Arrêter'))) return;
          fight.stoppedAt = Date.now();
          save();
          send(oppId, { t: 'stop', fid: fight.fid, at: fight.stoppedAt }, { queue: false });
          tick();
        },
      }, h('span', { html: ICON.stop, style: { display: 'contents' } }), 'Arrêter (soumission)'));
    } else if (phase === 'result') {
      drawResult();
    } else if (phase === 'done') {
      drawDone();
    }
  };

  const cancelBtn = () => h('button', {
    class: 'btn ghost block', onclick: async () => {
      if (!(await ask('Annuler le combat ?', null, 'Annuler le combat', { danger: true, cancel: 'Continuer' }))) return;
      fight.status = 'cancelled';
      save();
      send(oppId, { t: 'cancel', fid: fight.fid }, { queue: false });
      closeIt();
    },
  }, 'Annuler');

  const back = (to) => h('button', { class: 'btn ghost block', onclick: () => { step = to; draw(); } }, h('span', { html: ICON.back, style: { display: 'contents' } }), 'Retour');

  // Saisie du résultat
  const drawResult = () => {
    if (step.s === 'winner') {
      fill(center, h('div', { class: 'pick' },
        h('h2', { style: { marginBottom: '6px' } }, 'Qui a gagné ?'),
        h('button', { class: 'who-btn me', onclick: () => { step = { s: 'how', winner: state.me.id }; draw(); } }, avatarOf(state.me, { size: 44 }), state.me.name),
        h('button', { class: 'who-btn', onclick: () => { step = { s: 'how', winner: oppId }; draw(); } }, avatarOf(opp, { size: 44 }), oppName),
        h('button', { class: 'btn block', style: { height: '56px' }, onclick: () => { step = { s: 'confirm', winner: null, method: 'draw' }; draw(); } }, 'Match nul'),
      ));
    } else if (step.s === 'how') {
      fill(center, h('div', { class: 'pick' },
        h('h2', { style: { marginBottom: '6px' } }, `${step.winner === state.me.id ? 'Tu as' : oppName + ' a'} gagné comment ?`),
        h('button', { class: 'who-btn me', onclick: () => { step = { ...step, s: 'confirm', method: 'points' }; draw(); } }, h('span', { html: ICON.chart, style: { display: 'contents' } }), 'Aux points'),
        h('button', { class: 'who-btn me', onclick: () => { step = { ...step, s: 'sub', method: 'submission' }; draw(); } }, h('span', { html: ICON.fist, style: { display: 'contents' } }), 'Par soumission'),
        back({ s: 'winner' }),
      ));
    } else if (step.s === 'sub') {
      fill(center, subPicker(fight.mode, (id) => { step = { ...step, s: 'confirm', sub: id }; draw(); }, () => { step = { ...step, s: 'how' }; draw(); }));
    } else if (step.s === 'confirm') {
      const preview = { result: { winner: step.winner, method: step.method, sub: step.sub } };
      fill(center, h('div', { class: 'pick', style: { textAlign: 'center' } },
        h('h2', null, 'Résultat'),
        h('p', { class: 'label', style: { margin: '6px 0 14px' } }, sentence(preview, oppName)),
        h('button', { class: 'btn primary lg block', id: 'validate', onclick: () => validate() }, h('span', { html: ICON.check, style: { display: 'contents' } }), 'Valider le résultat'),
        back({ s: 'winner' }),
      ));
    }
  };

  let shareCode = null;
  let byOther = false;
  let celebrated = false;
  const validate = async () => {
    const prev = fight.result;
    fight.result = { winner: step.winner, method: step.method, sub: step.sub || null, by: state.me.id, at: Date.now(), v: prev ? (prev.v || 1) + 1 : 1 };
    fight.status = 'done';
    save();
    const { msg, live } = await send(oppId, {
      t: 'result', fid: fight.fid, result: fight.result,
      fight: { a: fight.a, b: fight.b, inviter: fight.inviter, mode: fight.mode, minutes: fight.minutes, startAt: fight.startAt },
    }, { queue: true });
    shareCode = live ? null : toCode(msg);
    byOther = false;
    correcting = false;
    celebrated = false;
    phase = 'done';
    draw();
  };

  const drawDone = () => {
    const r = fight.result;
    const won = r.winner === state.me.id;
    const big = !r.winner ? 'Match nul' : won ? 'Victoire' : 'Défaite';
    if (won) el.classList.add('win');
    if (!celebrated) {
      celebrated = true;
      if (won) { setTimeout(() => { confetti(); sfx('win'); haptic('heavy'); }, 150); } else if (r.winner) sfx('lose'); else sfx('success');
    }
    fill(center, h('div', { style: { display: 'grid', gap: '12px', justifyItems: 'center', width: '100%' } },
      avatarOf(won || !r.winner ? state.me : opp, { size: 92, ring: true }),
      h('div', { class: 'giant result-big' + (won ? ' win' : '') }, big),
      h('p', { class: 'label', style: { margin: '0' } }, sentence(fight, oppName)),
      byOther ? h('p', { class: 'muted' }, `Résultat enregistré par ${oppName}.`) : null,
      shareCode ? h('div', { style: { display: 'grid', gap: '10px', justifyItems: 'center', width: '100%' } },
        h('p', { class: 'muted', style: { textAlign: 'center', margin: '8px 0 0' } }, `Pas de réseau : fais scanner ce code par ${oppName} pour qu’il ait le résultat.`),
        qrSvg(shareCode)) : null,
    ));
    fill(bottom,
      h('button', {
        class: 'btn primary lg block', id: 'rematch', onclick: () => { closeIt(); openInvite(oppId, { minutes: fight.minutes, mode: fight.mode }); },
      }, h('span', { html: ICON.redo, style: { display: 'contents' } }), 'Revanche'),
      h('div', { class: 'btns two' },
        h('button', { class: 'btn block', id: 'done', onclick: () => closeIt() }, 'Terminer'),
        h('button', { class: 'btn ghost block', onclick: () => { step = { s: 'winner' }; correcting = true; phase = 'result'; draw(); } }, 'Corriger'),
      ),
    );
  };

  board = { fid, close: closeIt, received: () => { byOther = true; shareCode = null; correcting = false; celebrated = false; phase = 'done'; draw(); }, stop: () => tick() };
  tick();
  timer = setInterval(tick, 80);
  return closeIt;
}

export function sentence(fight, oppName) {
  const r = fight.result;
  if (!r.winner) return 'Match nul';
  const who = r.winner === state.me.id ? 'Tu gagnes' : `${oppName} gagne`;
  return r.method === 'submission' ? `${who} par ${subName(r.sub).toLowerCase()}` : `${who} aux points`;
}

// Moteur de recherche des soumissions (Kimono / Grappling bien séparés)
export function subPicker(mode, onPick, onBack, { backLabel = 'Retour', title = 'Quelle soumission ?', recent = [] } = {}) {
  let filter = mode === 'nogi' ? 'grappling' : 'kimono';
  let fam = null;
  const input = h('input', { class: 'input', placeholder: 'Chercher : triangle, heel hook, col…', 'aria-label': 'Chercher une soumission', autocomplete: 'off', type: 'search' });
  const list = h('div', { class: 'rows list-scroll', style: { maxHeight: '42vh', overflowY: 'auto', overscrollBehavior: 'contain' } });
  const chips = h('div', { class: 'chips scroll' });
  const drawChips = () => fill(chips,
    h('button', { class: 'chip', 'data-filter': 'kimono', 'aria-pressed': String(filter === 'kimono'), onclick: () => { filter = 'kimono'; drawChips(); drawList(); } }, 'Kimono'),
    h('button', { class: 'chip', 'data-filter': 'grappling', 'aria-pressed': String(filter === 'grappling'), onclick: () => { filter = 'grappling'; drawChips(); drawList(); } }, 'Grappling (No-Gi)'),
    Object.entries(FAMILIES).map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': String(fam === k), onclick: () => { fam = fam === k ? null : k; drawChips(); drawList(); } }, l)),
  );
  const drawList = () => {
    const q = norm(input.value);
    let items = subsFor(filter === 'grappling' ? 'nogi' : 'gi')
      .filter((s) => (!q || norm(s.name + ' ' + s.alt).includes(q)) && (!fam || s.fam === fam));
    if (filter === 'kimono') items = items.sort((a, b) => (a.kind === 'kimono' ? -1 : 0) - (b.kind === 'kimono' ? -1 : 0));
    if (!q && !fam && recent.length) items = [...recent.map((id) => SUB_BY_ID[id]).filter((s) => s && items.includes(s)), ...items.filter((s) => !recent.includes(s.id))];
    fill(list, ...(items.length ? items.map((s) => h('button', { class: 'rowc', 'data-sub': s.id, style: { padding: '11px 14px' }, onclick: () => onPick(s.id) },
      h('div', { class: 'grow' }, h('div', { class: 't', style: { fontSize: '16px' } }, s.name), h('div', { class: 's' }, s.alt.split(',')[0])),
      recent.includes(s.id) && !q ? h('span', { class: 'tag fav' }, 'Souvent') : h('span', { class: 'tag ' + s.kind }, KIND_LABEL[s.kind]),
    )) : [h('p', { class: 'muted center' }, 'Aucune soumission trouvée.')]));
  };
  input.addEventListener('input', drawList);
  drawChips();
  drawList();
  return h('div', { style: { width: '100%', display: 'grid', gap: '10px', alignSelf: 'start', textAlign: 'left' } },
    title ? h('h2', null, title) : null,
    input, chips, list,
    onBack ? h('button', { class: 'btn ghost block', onclick: onBack }, backLabel) : null,
  );
}

// ---------- Messages ----------
onMessage((msg) => {
  if (!state.me) return;
  const fight = msg.fid ? fightById(msg.fid) : null;
  switch (msg.t) {
    case 'invite':
      onInvite(msg);
      break;
    case 'accept':
      if (!fight || fight.inviter !== state.me.id || !['invited', 'expired'].includes(fight.status)) return;
      fight.startAt = msg.startAt;
      fight.status = 'accepted';
      save();
      sfx('success');
      openBoard(fight.fid);
      break;
    case 'decline':
      if (!fight) return;
      fight.status = 'declined';
      save();
      if (waiting && waiting.fid === fight.fid) waiting.close();
      toast(`${friendName(msg.from)} a refusé le défi.`, { sound: 'del' });
      break;
    case 'cancel':
      if (!fight || fight.status === 'done') return;
      fight.status = 'cancelled';
      save();
      if (incoming && incoming.fid === fight.fid) incoming.close();
      if (board && board.fid === fight.fid) board.close();
      toast(`${friendName(msg.from)} a annulé le combat.`);
      break;
    case 'stop':
      if (!fight || fight.stoppedAt) return;
      fight.stoppedAt = msg.at;
      save();
      if (board && board.fid === fight.fid) board.stop();
      break;
    case 'result': {
      if (!state.friends[msg.from]) return;
      let f = fight;
      if (!f) {
        const s = msg.fight || {};
        if (![s.a, s.b].includes(state.me.id)) return;
        f = { fid: msg.fid, a: s.a, b: s.b, inviter: s.inviter, mode: s.mode, minutes: s.minutes, startAt: s.startAt, createdAt: s.startAt || Date.now() };
        state.fights.push(f);
      }
      const r = msg.result;
      const cur = f.result;
      const newer = !cur || (r.v || 1) > (cur.v || 1) || ((r.v || 1) === (cur.v || 1) && (r.at < cur.at || (r.at === cur.at && r.by < cur.by)));
      if (newer) {
        f.result = { winner: r.winner || null, method: r.method, sub: SUB_BY_ID[r.sub] ? r.sub : null, by: r.by, at: r.at, v: r.v || 1 };
        f.status = 'done';
      }
      save();
      if (board && board.fid === f.fid) { if (newer) board.received(); }
      else if (newer) toast(`Résultat reçu : ${sentence(f, friendName(msg.from))}.`, { ms: 4000, sound: 'notify' });
      break;
    }
    default:
  }
});

// Au démarrage : on rouvre un combat en cours (par exemple après une mise à jour).
export function resume() {
  const now = Date.now();
  let changed = false;
  for (const f of state.fights) {
    if (f.status === 'invited' && now - f.createdAt > INVITE_TTL) { f.status = 'expired'; changed = true; }
  }
  if (changed) save();
  const live = state.fights.find((f) => ['accepted', 'running', 'ended'].includes(f.status) && f.startAt && now < f.startAt + roundMs(f) + 30 * 60000);
  if (live) openBoard(live.fid);
}
