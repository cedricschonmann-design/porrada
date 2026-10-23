// Amis : ajout par QR code, profil d'un ami, score, palmarès.

import { state, save, upsertFriend, headToHead, myCard } from '../store.js';
import { h, fill, ICON, push, sheet, toast, belt, day, ask, sfx, haptic, norm, plural } from '../ui.js';
import { onMessage, send, toCode, stamped } from '../net.js';
import { qrSvg } from '../qr.js';
import { avatarOf, squareJpeg } from '../people.js';
import { subName } from '../data/submissions.js';
import { header, scanAny } from '../app.js';
import { showMyCode, live } from './settings.js';
import { openInvite, sentence, tallyOf } from './combat.js';
import { openChat, lastMessage } from './chat.js';

let query = '';

export function render() {
  const all = Object.values(state.friends);
  const activity = (f) => Math.max(f.addedAt || 0, f.lastMsgAt || 0, ...headToHead(f.id).fights.map((x) => x.startAt || x.createdAt || 0));
  const friends = all
    .sort((a, b) => (b.unread || 0) - (a.unread || 0) || activity(b) - activity(a));
  return h('div', null,
    header('Amis', { extra: h('button', { class: 'iconbtn', 'aria-label': 'Ajouter un ami', id: 'add-friend', html: ICON.userplus, onclick: addFriend }) }),
    all.length === 0 ? h('div', { class: 'empty', style: { marginTop: '8px' } },
      h('div', { class: 'art', html: ICON.friends }),
      h('h3', null, 'Ajoute ton premier partenaire'),
      h('p', null, 'Scanne son code ami, ou montre-lui le tien. Ensuite : défis, messages et palmarès.'),
      h('div', { class: 'btns two', style: { width: '100%', marginTop: '8px' } },
        h('button', { class: 'btn primary', onclick: () => scanAny('Vise le code ami de ton partenaire.') }, h('span', { html: ICON.scan, style: { display: 'contents' } }), 'Scanner'),
        h('button', { class: 'btn', onclick: showMyCode }, h('span', { html: ICON.qr, style: { display: 'contents' } }), 'Mon code'),
      ),
    ) : null,
    all.length > 5 ? h('div', { class: 'searchbar', style: { marginBottom: '12px' } }, h('span', { html: ICON.search, style: { display: 'contents' } }),
      (() => {
        const i = h('input', { class: 'input', placeholder: 'Chercher un ami', value: query, 'aria-label': 'Chercher un ami' });
        i.addEventListener('input', () => {
          query = i.value;
          document.querySelectorAll('#friend-rows > [data-q]').forEach((r) => r.classList.toggle('hidden', !!query && !r.dataset.q.includes(norm(query))));
        });
        return i;
      })()) : null,
    all.length ? h('div', { class: 'rows', id: 'friend-rows' }, friends.map(friendRow)) : null,
  );
}

export function scoreChip(friendId, onclick) {
  const s = headToHead(friendId);
  return h(onclick ? 'button' : 'span', {
    class: 'score' + (s.wins > s.losses ? ' lead' : ''),
    onclick,
    'aria-label': `Score : toi ${s.wins}, ${state.friends[friendId] ? state.friends[friendId].name : ''} ${s.losses}`,
  }, h('span', null, s.wins), h('span', { class: 'sep' }, '–'), h('span', null, s.losses));
}

function friendRow(f) {
  const s = headToHead(f.id);
  const last = lastMessage(f.id);
  const subLine = last
    ? `${last.from === state.me.id ? 'Toi : ' : ''}${last.text}`
    : `${f.username ? '@' + f.username + ' · ' : ''}${s.fights.length ? plural(s.fights.length, 'combat', 'combats') : 'Pas encore de combat'}`;
  const q = norm(f.name + ' ' + (f.username || '') + ' ' + (f.academy || ''));
  return h('div', { class: 'rowc' + (query && !q.includes(norm(query)) ? ' hidden' : ''), 'data-q': q, style: { padding: '10px 10px 10px 12px' } },
    h('button', { class: 'hstack grow', style: { background: 'none', border: '0', padding: '0', textAlign: 'left', color: 'inherit', gap: '12px' }, onclick: () => openFriend(f.id), 'aria-label': `Profil de ${f.name}` },
      avatarOf(f, { size: 48 }),
      h('div', { class: 'grow' },
        h('div', { class: 'hstack', style: { gap: '8px' } }, h('span', { class: 't ellipsis' }, f.name), belt(f.belt, f.stripes)),
        h('div', { class: 's ellipsis', style: f.unread ? { color: 'var(--ink)', fontWeight: '700' } : null }, subLine),
      ),
    ),
    s.fights.length ? scoreChip(f.id, (e) => { e.stopPropagation(); openPalmares(f.id); }) : null,
    h('button', { class: 'iconbtn', style: { position: 'relative' }, 'aria-label': `Écrire à ${f.name}`, onclick: () => openChat(f.id) },
      h('span', { html: ICON.chat, style: { display: 'contents' } }),
      f.unread ? h('span', { class: 'badge' }, f.unread > 9 ? '9+' : f.unread) : null),
  );
}

function addFriend() {
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Ajouter un ami'),
    h('p', { class: 'muted' }, 'Un seul des deux scanne : vous devenez amis tous les deux.'),
    h('div', { class: 'choice-grid' },
      h('button', { class: 'choice', onclick: () => { close(); scanAny('Vise le code ami de ton partenaire.'); } }, h('span', { class: 'ico', html: ICON.scan }), 'Scanner son code'),
      h('button', { class: 'choice', onclick: () => { close(); showMyCode(); } }, h('span', { class: 'ico', html: ICON.qr }), 'Montrer mon code'),
    ),
  ));
}

// ---------- Profil d'un ami ----------
export function openFriend(id) {
  const f0 = state.friends[id];
  if (!f0) return;
  push((page) => {
    const wrap = h('div');
    const draw = () => {
      const f = state.friends[id];
      if (!f) { page.close(); return; }
      const s = headToHead(id);
      fill(wrap,
        h('div', { class: 'profile-hero' },
          avatarOf(f, { size: 128, ring: true }),
          h('h2', null, f.name),
          f.username ? h('div', { class: 'handle' }, '@' + f.username) : null,
          h('div', { style: { marginTop: '4px' } }, belt(f.belt, f.stripes, true)),
          f.academy ? h('div', { class: 'muted small' }, f.academy) : null,
        ),
        h('div', { class: 'stack', style: { marginTop: '16px' } },
          h('button', { class: 'btn primary lg block', id: 'challenge', onclick: () => openInvite(id) }, h('span', { html: ICON.fist, style: { display: 'contents' } }), `Défier ${f.name}`),
          h('div', { class: 'btns two' },
            h('button', { class: 'btn', onclick: () => openChat(id) }, h('span', { html: ICON.chat, style: { display: 'contents' } }), 'Message'),
            h('button', { class: 'btn', onclick: () => openPalmares(id) }, h('span', { html: ICON.medal, style: { display: 'contents' } }), 'Palmarès'),
          ),
          h2hBanner(id, () => openPalmares(id)),
        ),
        s.fights.length ? h('div', null,
          h('div', { class: 'section-head section' }, h('h3', null, 'Derniers combats'), s.fights.length > 3 ? h('button', { class: 'link', onclick: () => openPalmares(id) }, 'Tout voir') : null),
          h('div', { class: 'glass' }, s.fights.slice(0, 3).map((fi) => fightRow(fi, f.name))),
        ) : null,
        h('div', { class: 'center', style: { marginTop: '26px' } },
          h('button', {
            class: 'link danger', onclick: async () => {
              if (await ask(`Retirer ${f.name} ?`, 'Vos combats restent dans ton historique.', 'Retirer', { danger: true })) {
                delete state.friends[id];
                save();
                sfx('del');
                page.close();
              }
            },
          }, 'Retirer cet ami'),
        ),
      );
    };
    draw();
    live(page, draw);
    return wrap;
  }, { title: f0.name });
}

function h2hBanner(id, onclick) {
  const s = headToHead(id);
  const f = state.friends[id] || { name: 'Partenaire' };
  return h(onclick ? 'button' : 'div', { class: 'h2h', onclick, 'aria-label': `Score : toi ${s.wins}, ${f.name} ${s.losses}` },
    h('div', { class: 'who' }, avatarOf(state.me, { size: 52 }), h('span', null, 'Toi')),
    h('div', { class: 'big' }, h('span', null, s.wins), h('span', { class: 'sep' }), h('span', null, s.losses)),
    h('div', { class: 'who' }, avatarOf(f, { size: 52 }), h('span', null, f.name)),
  );
}

export function openPalmares(id) {
  const f = state.friends[id] || { name: 'Partenaire' };
  push(() => {
    const s = headToHead(id);
    const stat = (v, k, cls = '') => h('div', { class: 'stat ' + cls }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k));
    const subsWon = {}; const subsLost = {};
    for (const fi of s.fights) {
      for (const x of tallyOf(fi, state.me.id)) if (x) subsWon[x] = (subsWon[x] || 0) + 1;
      for (const x of tallyOf(fi, id)) if (x) subsLost[x] = (subsLost[x] || 0) + 1;
    }
    const subList = (bag) => Object.entries(bag).sort((a, b) => b[1] - a[1]).map(([sid, n]) => h('span', { class: 'chip static' }, subName(sid), h('span', { class: 'n' }, '×' + n)));
    return h('div', { class: 'stack' },
      h('h1', { class: 'page-title', style: { marginBottom: '4px' } }, 'Palmarès'),
      h2hBanner(id, null),
      h('div', { class: 'stats' },
        stat(s.subWins, 'Victoires par soumission', 'give'),
        stat(s.ptsWins, 'Victoires aux points', 'give'),
        stat(s.draws, s.draws > 1 ? 'Matchs nuls' : 'Match nul'),
        stat(s.subLosses, 'Défaites par soumission', 'take'),
        stat(s.ptsLosses, 'Défaites aux points', 'take'),
        stat(s.fights.length, s.fights.length > 1 ? 'Combats' : 'Combat'),
      ),
      h('div', { class: 'card between' }, h('div', null, h('h3', null, 'Soumissions'), h('div', { class: 'small muted' }, 'Tous vos rounds confondus')), h('div', { class: 'score' + (s.subsFor > s.subsAgainst ? ' lead' : '') }, h('span', null, s.subsFor), h('span', { class: 'sep' }, '–'), h('span', null, s.subsAgainst))),
      Object.keys(subsWon).length ? h('div', { class: 'card stack' }, h('h3', null, 'Tes soumissions sur lui'), h('div', { class: 'chips' }, subList(subsWon))) : null,
      Object.keys(subsLost).length ? h('div', { class: 'card stack' }, h('h3', null, 'Ses soumissions sur toi'), h('div', { class: 'chips' }, subList(subsLost))) : null,
      h('div', { class: 'section-head', style: { marginTop: '10px' } }, h('h3', null, 'Tous vos combats')),
      s.fights.length ? h('div', { class: 'glass' }, s.fights.map((fi) => fightRow(fi, f.name))) : h('div', { class: 'empty' }, h('p', null, `Pas encore de combat contre ${f.name}. Défie-le depuis son profil.`)),
    );
  }, { title: 'Palmarès' });
}

export function describeResult(fi, otherName) {
  return sentence(fi, otherName);
}

function fightRow(fi, otherName) {
  const r = fi.result;
  const cls = !r.winner ? 'd' : r.winner === state.me.id ? 'w' : 'l';
  const letter = { w: 'V', l: 'D', d: 'N' }[cls];
  return h('div', { class: 'fight' },
    h('div', { class: 'res ' + cls, 'aria-label': { w: 'Victoire', l: 'Défaite', d: 'Nul' }[cls] }, letter),
    h('div', { class: 'grow' },
      h('div', { style: { fontWeight: '750' } }, describeResult(fi, otherName)),
      h('div', { class: 'small muted' }, `${day(fi.startAt || fi.createdAt)} · ${fi.mode === 'nogi' ? 'No-Gi' : 'Gi'} · ${fi.minutes} min`),
    ),
  );
}

// ---------- Messages réseau : cartes d'ami, photos ----------
async function sendMyPhoto(id) {
  if (!state.me.photo) return;
  try { send(id, { t: 'photo', data: await squareJpeg(state.me.photo, 128) }); } catch (e) { /* tant pis */ }
}

onMessage(async (msg) => {
  if (!state.me) return;
  if (msg.t === 'card') {
    if (msg.id === state.me.id) { toast('C’est ton propre code.'); return; }
    const res = upsertFriend(msg);
    if (!res) return;
    if (res.isNew) { sfx('success'); haptic('medium'); }
    toast(res.isNew ? `${res.friend.name} est ton ami.` : `${res.friend.name} est déjà ton ami.`, { ok: res.isNew, action: { label: 'Voir', fn: () => openFriend(res.friend.id) } });
    // On envoie notre carte en retour pour qu'il nous ajoute aussi.
    const { live: isLive } = await send(msg.id, { t: 'friend', card: myCard() }, { queue: true });
    sendMyPhoto(msg.id);
    if (!isLive) {
      sheet((close) => h('div', { class: 'stack', style: { textAlign: 'center' } },
        h('h2', null, 'À ton tour'),
        h('p', { class: 'muted' }, `Pas de réseau pour prévenir ${res.friend.name}. Fais-lui scanner ton code pour qu’il t’ajoute aussi.`),
        qrSvg(toCode(stamped(myCard()))),
        h('button', { class: 'btn block', onclick: close }, 'C’est fait'),
      ));
    }
  } else if (msg.t === 'friend' && msg.card && msg.card.id === msg.from) {
    const res = upsertFriend(msg.card);
    if (res && res.isNew) {
      sfx('success');
      toast(`${res.friend.name} t’a ajouté : vous êtes amis.`, { ok: true, action: { label: 'Voir', fn: () => openFriend(res.friend.id) } });
      sendMyPhoto(msg.from);
    }
  } else if (msg.t === 'photo' && state.friends[msg.from]) {
    const d = String(msg.data || '');
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d) && d.length < 80000) {
      state.friends[msg.from].photo = d;
      save();
    }
  }
});

