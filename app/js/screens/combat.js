// Combats entre amis : invitation, compte à rebours commun, chrono du round, résultat.

import { state, save, rid, fightById, friendName } from '../store.js';
import { h, ICON, sheet, full, toast, seg, mmss, SPEED, beep, buzzer, keepAwake, unlockAudio, norm, ask, plural, fill } from '../ui.js';
import { onMessage, send, toCode, isOnline } from '../net.js';
import { qrSvg } from '../qr.js';
import { subsFor, KIND_LABEL, subName, SUB_BY_ID } from '../data/submissions.js';

const COUNTDOWN = 10000 / SPEED;
const INVITE_TTL = 120000;
const MINUTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

let board = null;     // combat affiché : { fid, close, refresh }
let waiting = null;   // mon invitation en attente : { fid, close }
let incoming = null;  // invitation reçue : { fid, close }

export function isBusy() { return !!board; }
const roundMs = (f) => (f.minutes * 60000) / SPEED;
const other = (f) => (f.a === state.me.id ? f.b : f.a);
const modeLabel = (m) => (m === 'nogi' ? 'No-Gi' : 'Gi');

// ---------- Inviter ----------
export function openInvite(friendId) {
  const f = state.friends[friendId];
  let minutes = state.settings.lastMinutes || 5;
  let mode = state.settings.lastMode || 'gi';
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, `Inviter ${f.name}`),
    h('label', { class: 'field' }, h('span', null, 'Durée du round'),
      h('select', { class: 'input', id: 'inv-min', onchange: (e) => { minutes = Number(e.target.value); } },
        MINUTES.map((m) => h('option', { value: m, selected: m === minutes }, plural(m, 'minute', 'minutes'))))),
    h('div', { class: 'field' }, h('span', null, 'Tenue'), seg([['gi', 'Gi (kimono)'], ['nogi', 'No-Gi']], mode, (v) => { mode = v; })),
    h('button', {
      class: 'btn primary block big', id: 'inv-send', onclick: () => {
        unlockAudio();
        state.settings.lastMinutes = minutes;
        state.settings.lastMode = mode;
        close();
        sendInvite(friendId, minutes, mode);
      },
    }, 'Envoyer l’invitation'),
  ));
}

async function sendInvite(friendId, minutes, mode) {
  const fid = rid(10);
  const fight = { fid, a: state.me.id, b: friendId, inviter: state.me.id, mode, minutes, status: 'invited', createdAt: Date.now() };
  state.fights.push(fight);
  save();
  const { msg, live } = await send(friendId, { t: 'invite', fid, to: friendId, mode, minutes }, { queue: false });
  showWaiting(fight, toCode(msg), live);
}

function showWaiting(fight, code, live) {
  const name = friendName(fight.b);
  let qrShown = !live;
  const close = sheet((closeIt) => {
    const wrap = h('div', { class: 'stack', id: 'waiting' });
    const draw = () => fill(wrap, 
      h('h2', null, live ? `Invitation envoyée à ${name}` : `Fais scanner ce code par ${name}`),
      h('p', { class: 'muted' }, `Round de ${plural(fight.minutes, 'minute', 'minutes')}, en ${modeLabel(fight.mode)}. ${live ? 'Dès qu’il accepte sur son téléphone, le compte à rebours démarre chez vous deux.' : 'Pas de réseau : il scanne ce code avec PORRADA (Amis › Scanner).'}`),
      qrShown ? qrSvg(code) : h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0' } }, h('div', { class: 'spinner' }), h('b', null, 'En attente de sa réponse…')),
      !qrShown ? h('button', { class: 'link', onclick: () => { qrShown = true; draw(); } }, 'Il n’a rien reçu ? Montrer le QR code') : null,
      h('button', {
        class: 'btn block', onclick: async () => {
          fight.status = 'cancelled';
          save();
          closeIt();
          send(fight.b, { t: 'cancel', fid: fight.fid }, { queue: false });
        },
      }, 'Annuler l’invitation'),
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
      toast(`${name} n’a pas répondu. Invitation expirée.`);
    }
  }, INVITE_TTL);
}

// ---------- Recevoir une invitation ----------
function onInvite(msg, via) {
  if (msg.to !== state.me.id) { toast('Cette invitation est pour quelqu’un d’autre.'); return; }
  const friend = state.friends[msg.from];
  if (!friend) { toast('Cette invitation vient de quelqu’un qui n’est pas encore ton ami. Scanne d’abord son code ami.'); return; }
  if (Date.now() - msg.ts > INVITE_TTL) { toast(`L’invitation de ${friend.name} a expiré.`); return; }
  let fight = fightById(msg.fid);
  if (!fight) {
    fight = { fid: msg.fid, a: msg.from, b: state.me.id, inviter: msg.from, mode: msg.mode === 'nogi' ? 'nogi' : 'gi', minutes: Number(msg.minutes) || 5, status: 'invited', createdAt: msg.ts };
    state.fights.push(fight);
    save();
  }
  if (fight.status !== 'invited') return;
  beep(988, 0.12); setTimeout(() => beep(1318, 0.18), 150);
  if (incoming) incoming.close();
  const close = sheet((closeIt) => h('div', { class: 'stack', id: 'incoming' },
    h('div', { style: { display: 'grid', justifyItems: 'center', gap: '10px', textAlign: 'center', margin: '6px 0 4px' } },
      h('h2', { class: 'tape accent' }, `${friend.name} te défie`),
      h('p', { class: 'muted', style: { marginTop: '10px' } }, `Round de ${plural(fight.minutes, 'minute', 'minutes')}, en ${modeLabel(fight.mode)}.`),
    ),
    h('button', { class: 'btn primary block big', id: 'accept', onclick: () => { closeIt(); accept(fight); } }, 'Accepter'),
    h('button', {
      class: 'btn block', onclick: () => {
        fight.status = 'declined';
        save();
        closeIt();
        send(fight.a, { t: 'decline', fid: fight.fid }, { queue: false });
      },
    }, 'Refuser'),
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
  if (board) board.close();
  if (waiting) waiting.close();
  if (incoming) incoming.close();
  keepAwake(true);
  let timer = null;
  let phase = null;
  let lastNum = null;
  let step = { s: 'winner' };
  let correcting = false;
  const oppId = other(fight);
  const oppName = friendName(oppId);

  const close = full((closeIt, el) => {
    const top = h('div', null,
      h('div', { class: 'names' },
        h('div', { class: 'n' }, state.me.name),
        h('div', { class: 'vs' }, 'VS'),
        h('div', { class: 'n' }, oppName),
      ),
      h('div', { class: 'meta' }, `Round de ${plural(fight.minutes, 'minute', 'minutes')}, en ${modeLabel(fight.mode)}`),
    );
    const center = h('div', { class: 'center' });
    const bottom = h('div', { style: { display: 'grid', gap: '10px' } });
    el.append(top, center, bottom);

    const endAt = () => (fight.stoppedAt ? Math.min(fight.stoppedAt, fight.startAt + roundMs(fight)) : fight.startAt + roundMs(fight));

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
        if (p === 'result' && prev === 'round') { buzzer(); }
        if (p === 'result' && !['ended', 'done'].includes(fight.status)) { fight.status = 'ended'; save(); }
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
          if (num <= 3) beep(660, 0.14); else beep(520, 0.06, 0.25);
        }
      } else if (phase === 'round') {
        const left = endAt() - now;
        const clock = center.querySelector('.clock');
        if (clock) {
          clock.textContent = mmss(left * SPEED);
          clock.classList.toggle('hot', left * SPEED <= 10000);
        }
        const bar = center.querySelector('.progress i');
        if (bar) bar.style.width = (100 * (1 - left / roundMs(fight))).toFixed(2) + '%';
        if (lastNum !== 'go') { lastNum = 'go'; beep(880, 0.6, 0.6); }
      }
    };

    const draw = () => {
      fill(bottom, );
      if (phase === 'pre') {
        fill(center, h('div', { style: { display: 'grid', gap: '14px', justifyItems: 'center', width: '100%' } },
          qrCode ? qrSvg(qrCode) : null,
          h('div', { class: 'label' }, qrCode ? `Fais scanner ce code par ${oppName}` : 'Prêts ?'),
          h('div', { class: 'muted' }, 'Le compte à rebours démarre dans ', h('b', { 'data-pre': '' }, '')),
        ));
        bottom.append(cancelBtn());
      } else if (phase === 'count') {
        fill(center, h('div', null, h('div', { class: 'giant count' }, '10'), h('div', { class: 'label' }, 'Prêts ?')));
        bottom.append(cancelBtn());
      } else if (phase === 'round') {
        fill(center, h('div', { style: { width: '100%' } },
          h('div', { class: 'giant clock' }, mmss(roundMs(fight) * SPEED)),
          h('div', { class: 'progress' }, h('i', { style: { width: '0%' } })),
        ));
        bottom.append(h('button', {
          class: 'btn block', onclick: async () => {
            if (!(await ask('Arrêter le combat ?', 'Par exemple s’il y a eu une soumission. Vous passez à la saisie du résultat.', 'Arrêter'))) return;
            fight.stoppedAt = Date.now();
            save();
            send(oppId, { t: 'stop', fid: fight.fid, at: fight.stoppedAt }, { queue: false });
            tick();
          },
        }, 'Arrêter le combat'));
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

    // Saisie du résultat
    const drawResult = () => {
      const pickBtn = (label, onclick, primary) => h('button', { class: 'btn block big' + (primary ? ' primary' : ''), onclick }, label);
      if (step.s === 'winner') {
        fill(center, h('div', { class: 'pick', style: { width: '100%' } },
          h('h2', { style: { marginBottom: '8px' } }, 'Qui a gagné ?'),
          pickBtn(state.me.name, () => { step = { s: 'how', winner: state.me.id }; draw(); }, true),
          pickBtn(oppName, () => { step = { s: 'how', winner: oppId }; draw(); }, true),
          pickBtn('Match nul', () => { step = { s: 'confirm', winner: null, method: 'draw' }; draw(); }),
        ));
      } else if (step.s === 'how') {
        fill(center, h('div', { class: 'pick', style: { width: '100%' } },
          h('h2', { style: { marginBottom: '8px' } }, `${step.winner === state.me.id ? 'Tu as' : oppName + ' a'} gagné comment ?`),
          pickBtn('Aux points', () => { step = { ...step, s: 'confirm', method: 'points' }; draw(); }, true),
          pickBtn('Par soumission', () => { step = { ...step, s: 'sub', method: 'submission' }; draw(); }, true),
          h('button', { class: 'btn ghost block', onclick: () => { step = { s: 'winner' }; draw(); } }, 'Retour'),
        ));
      } else if (step.s === 'sub') {
        fill(center, subPicker(fight.mode, (id) => { step = { ...step, s: 'confirm', sub: id }; draw(); }, () => { step = { ...step, s: 'how' }; draw(); }));
      } else if (step.s === 'confirm') {
        const preview = { result: { winner: step.winner, method: step.method, sub: step.sub } };
        fill(center, h('div', { class: 'pick', style: { width: '100%' } },
          h('h2', null, 'Résultat'),
          h('p', { class: 'label', style: { margin: '6px 0 14px' } }, sentence(preview, oppName)),
          h('button', { class: 'btn primary block big', id: 'validate', onclick: () => validate() }, 'Valider le résultat'),
          h('button', { class: 'btn ghost block', onclick: () => { step = { s: 'winner' }; draw(); } }, 'Modifier'),
        ));
      }
    };

    let shareCode = null;
    let byOther = false;
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
      phase = 'done';
      draw();
    };

    const drawDone = () => {
      const r = fight.result;
      const won = r.winner === state.me.id;
      const big = !r.winner ? 'Match nul' : won ? 'Victoire' : 'Défaite';
      fill(center, h('div', { style: { display: 'grid', gap: '12px', justifyItems: 'center', width: '100%' } },
        h('div', { class: 'giant', style: { fontSize: 'min(17vw, 96px)', color: won ? 'var(--accent)' : '#fff' } }, big),
        h('p', { class: 'label', style: { margin: '0' } }, sentence(fight, oppName)),
        byOther ? h('p', { class: 'muted' }, `Résultat enregistré par ${oppName}.`) : null,
        shareCode ? h('div', { style: { display: 'grid', gap: '10px', justifyItems: 'center', width: '100%' } },
          h('p', { class: 'muted', style: { textAlign: 'center', margin: '8px 0 0' } }, `Pas de réseau : fais scanner ce code par ${oppName} pour qu’il ait le résultat.`),
          qrSvg(shareCode)) : null,
      ));
      fill(bottom, 
        h('button', { class: 'btn primary block', onclick: () => closeIt() }, 'Terminer'),
        h('button', { class: 'btn ghost block', onclick: () => { step = { s: 'winner' }; correcting = true; phase = 'result'; draw(); } }, 'Corriger le résultat'),
      );
    };

    board = { fid, close: closeIt, received: () => { byOther = true; shareCode = null; correcting = false; phase = 'done'; draw(); }, stop: () => tick() };
    tick();
    timer = setInterval(tick, 80);
    return null;
  }, {
    cls: 'board',
    onClose: () => {
      clearInterval(timer);
      keepAwake(false);
      if (board && board.fid === fid) board = null;
    },
  });
  return close;
}

export function sentence(fight, oppName) {
  const r = fight.result;
  if (!r.winner) return 'Match nul';
  const who = r.winner === state.me.id ? 'Tu gagnes' : `${oppName} gagne`;
  return r.method === 'submission' ? `${who} par ${subName(r.sub).toLowerCase()}` : `${who} aux points`;
}

// Moteur de recherche des soumissions (Kimono / Grappling bien séparés)
function subPicker(mode, onPick, onBack, { backLabel = 'Retour', title = 'Quelle soumission ?' } = {}) {
  let filter = mode === 'nogi' ? 'grappling' : 'kimono';
  const input = h('input', { class: 'input', placeholder: 'Chercher une soumission', 'aria-label': 'Chercher une soumission', autocomplete: 'off' });
  const list = h('div', { class: 'list', style: { maxHeight: '44vh', overflowY: 'auto' } });
  const chips = h('div', { class: 'chips' });
  const drawChips = () => fill(chips, 
    h('button', { class: 'chip', 'aria-pressed': String(filter === 'kimono'), onclick: () => { filter = 'kimono'; drawChips(); drawList(); } }, 'Kimono'),
    h('button', { class: 'chip', 'aria-pressed': String(filter === 'grappling'), onclick: () => { filter = 'grappling'; drawChips(); drawList(); } }, 'Grappling (No-Gi)'),
  );
  const drawList = () => {
    const q = norm(input.value);
    const items = subsFor(filter === 'grappling' ? 'nogi' : 'gi')
      .filter((s) => !q || norm(s.name + ' ' + s.alt).includes(q))
      .sort((a, b) => (filter === 'kimono' ? (a.kind === 'kimono' ? -1 : 0) - (b.kind === 'kimono' ? -1 : 0) : 0));
    fill(list, ...(items.length ? items.map((s) => h('button', { class: 'row', style: { minHeight: '58px' }, onclick: () => onPick(s.id) },
      h('div', { class: 'grow' }, h('div', { class: 'title', style: { fontSize: '17px' } }, s.name), h('div', { class: 'sub' }, s.alt.split(',')[0])),
      h('span', { class: 'tag ' + s.kind }, KIND_LABEL[s.kind]),
    )) : [h('p', { class: 'muted' }, 'Aucune soumission trouvée.')]));
  };
  input.addEventListener('input', drawList);
  drawChips();
  drawList();
  return h('div', { style: { width: '100%', display: 'grid', gap: '12px', alignSelf: 'start' } },
    title ? h('h2', null, title) : null,
    chips, input, list,
    h('button', { class: 'btn ghost block', onclick: onBack }, backLabel),
  );
}
export { subPicker };

// ---------- Messages ----------
onMessage((msg, via) => {
  if (!state.me) return;
  const fight = msg.fid ? fightById(msg.fid) : null;
  switch (msg.t) {
    case 'invite':
      onInvite(msg, via);
      break;
    case 'accept':
      if (!fight || fight.inviter !== state.me.id || !['invited', 'expired'].includes(fight.status)) return;
      fight.startAt = msg.startAt;
      fight.status = 'accepted';
      save();
      openBoard(fight.fid);
      break;
    case 'decline':
      if (!fight) return;
      fight.status = 'declined';
      save();
      if (waiting && waiting.fid === fight.fid) waiting.close();
      toast(`${friendName(msg.from)} a refusé le combat.`);
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
      else if (newer) toast(`Résultat reçu : ${sentence(f, friendName(msg.from))}.`, 4000);
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
