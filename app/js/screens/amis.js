// Amis : ajout par QR code, profil d'un ami, score et palmarès.

import { state, save, upsertFriend, headToHead, myCard, onChange } from '../store.js';
import { h, ICON, full, sheet, toast, belt, avatar, icon, day, ask, fill } from '../ui.js';
import { onMessage, send, toCode, stamped } from '../net.js';
import { qrSvg } from '../qr.js';
import { subName } from '../data/submissions.js';
import { header, scanAny } from '../app.js';
import { showMyCode } from './profil.js';
import { openInvite } from './combat.js';

export function render() {
  const friends = Object.values(state.friends).sort((a, b) => b.addedAt - a.addedAt);
  return h('div', null,
    header('Amis'),
    h('div', { class: 'btns two' },
      h('button', { class: 'btn primary', onclick: () => scanAny('Scanne le code ami ou l’invitation de ton partenaire.') }, h('span', { style: { display: 'contents' }, html: ICON.scan }), 'Scanner'),
      h('button', { class: 'btn', onclick: showMyCode }, h('span', { style: { display: 'contents' }, html: ICON.qr }), 'Mon code'),
    ),
    h('div', { class: 'gap' }),
    friends.length ? h('div', { class: 'list' }, friends.map(friendRow)) : h('div', { class: 'empty' },
      h('h3', null, 'Ajoute ton premier partenaire'),
      h('p', { style: { marginTop: '8px' } }, 'Montre-lui ton code ami, ou scanne le sien. Ensuite, tu pourras l’inviter à combattre depuis son profil.'),
    ),
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
  return h('div', { class: 'row', style: { padding: '10px 12px' } },
    h('button', { class: 'rowbtn', onclick: () => openFriend(f.id) },
      avatar(f.name),
      h('div', { class: 'grow' },
        h('div', { class: 'title' }, f.name),
        h('div', { class: 'sub', style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' } }, belt(f.belt, f.stripes),
          s.fights.length ? `${s.fights.length} combat${s.fights.length > 1 ? 's' : ''}` : 'Aucun combat'),
      ),
    ),
    scoreChip(f.id, (e) => { e.stopPropagation(); openPalmares(f.id); }),
  );
}

export function openFriend(id) {
  full((close, el) => {
    const wrap = h('div', { class: 'inner stack' });
    const draw = () => {
      const f = state.friends[id];
      if (!f) { close(); return; }
      const s = headToHead(id);
      fill(wrap, 
        h('div', { class: 'bar-top' },
          h('button', { class: 'iconbtn', 'aria-label': 'Retour', onclick: close, html: ICON.back }),
          h('span'),
        ),
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '12px', textAlign: 'center' } },
          avatar(f.name, { lg: true }),
          h('h2', null, f.name),
          belt(f.belt, f.stripes, true),
        ),
        h2hBanner(id, () => openPalmares(id)),
        h('button', { class: 'btn primary block big', onclick: () => openInvite(id) }, h('span', { style: { display: 'contents' }, html: ICON.fist }), 'Inviter à combattre'),
        h('button', { class: 'btn block', onclick: () => openPalmares(id) }, 'Voir le palmarès'),
        h('div', { style: { textAlign: 'center' } },
          h('button', {
            class: 'link', style: { color: 'var(--danger)' }, onclick: async () => {
              if (await ask(`Retirer ${f.name} ?`, 'Vos combats restent dans ton historique.', 'Retirer', { danger: true })) {
                delete state.friends[id];
                save();
                close();
              }
            },
          }, 'Retirer cet ami'),
        ),
      );
    };
    draw();
    const off = onChange(() => requestAnimationFrame(draw));
    const obs = new MutationObserver(() => { if (!el.isConnected) { off(); obs.disconnect(); } });
    obs.observe(document.getElementById('layer'), { childList: true });
    return wrap;
  });
}

function h2hBanner(id, onclick) {
  const s = headToHead(id);
  const f = state.friends[id] || { name: 'Partenaire' };
  return h('button', { class: 'h2h', style: { border: '0', width: '100%' }, onclick, 'aria-label': 'Voir le palmarès' },
    h('div', { class: 'who' }, avatar(state.me.name, { me: true }), h('span', null, 'Toi')),
    h('div', { class: 'big' }, s.wins, h('span', { class: 'sep' }, '–'), s.losses),
    h('div', { class: 'who' }, avatar(f.name), h('span', null, f.name)),
  );
}

export function openPalmares(id) {
  full((close) => {
    const f = state.friends[id] || { name: 'Partenaire' };
    const s = headToHead(id);
    return h('div', { class: 'inner stack' },
      h('div', { class: 'bar-top' },
        h('button', { class: 'iconbtn', 'aria-label': 'Retour', onclick: close, html: ICON.back }),
        h('h2', { class: 'tape small' }, 'Palmarès'),
        h('span', { style: { width: '48px' } }),
      ),
      h2hBanner(id, null),
      h('div', { class: 'statgrid' },
        stat(s.subWins, 'Victoires par soumission'),
        stat(s.ptsWins, 'Victoires aux points'),
        stat(s.draws, s.draws > 1 ? 'Matchs nuls' : 'Match nul'),
      ),
      h('div', { class: 'statgrid' },
        stat(s.subLosses, 'Défaites par soumission'),
        stat(s.ptsLosses, 'Défaites aux points'),
        stat(s.fights.length, s.fights.length > 1 ? 'Combats' : 'Combat'),
      ),
      h('h3', { style: { marginTop: '22px' } }, 'Tous vos combats'),
      s.fights.length ? h('div', { class: 'list' }, s.fights.map((fi) => fightRow(fi, f.name))) : h('div', { class: 'empty' }, h('p', null, `Pas encore de combat contre ${f.name}. Invite-le depuis son profil.`)),
    );
  });
}

function stat(v, k) { return h('div', { class: 'stat' }, h('div', { class: 'v' }, v), h('div', { class: 'k' }, k)); }

export function describeResult(fi, otherName) {
  const r = fi.result;
  if (!r.winner) return 'Match nul';
  const won = r.winner === state.me.id;
  const how = r.method === 'submission' ? `par ${subName(r.sub).toLowerCase()}` : 'aux points';
  return won ? `Tu gagnes ${how}` : `${otherName} gagne ${how}`;
}

function fightRow(fi, otherName) {
  const r = fi.result;
  const cls = !r.winner ? 'd' : r.winner === state.me.id ? 'w' : 'l';
  const letter = { w: 'V', l: 'D', d: 'N' }[cls];
  return h('div', { class: 'fight' },
    h('div', { class: 'res ' + cls, 'aria-label': { w: 'Victoire', l: 'Défaite', d: 'Nul' }[cls] }, letter),
    h('div', null,
      h('div', { style: { fontWeight: '800' } }, describeResult(fi, otherName)),
      h('div', { class: 'small muted' }, `${day(fi.startAt || fi.createdAt)} · ${fi.mode === 'nogi' ? 'No-Gi' : 'Gi'} · round de ${fi.minutes} min`),
    ),
  );
}

// ---------- Messages : cartes d'ami ----------
onMessage(async (msg, via) => {
  if (!state.me) return;
  if (msg.t === 'card') {
    if (msg.id === state.me.id) { toast('C’est ton propre code.'); return; }
    const res = upsertFriend(msg);
    if (!res) return;
    toast(res.isNew ? `${res.friend.name} est ton ami.` : `${res.friend.name} est déjà ton ami.`);
    // On envoie notre carte en retour pour qu'il nous ajoute aussi.
    const { live } = await send(msg.id, { t: 'friend', card: myCard() }, { queue: true });
    if (!live) {
      sheet((close) => h('div', { class: 'stack' },
        h('h2', null, 'À ton tour'),
        h('p', { class: 'muted' }, `Pas de réseau pour prévenir ${res.friend.name}. Fais-lui scanner ton code pour qu’il t’ajoute aussi.`),
        qrSvg(toCode(stamped(myCard()))),
        h('button', { class: 'btn block', onclick: close }, 'C’est fait'),
      ));
    }
  } else if (msg.t === 'friend' && msg.card && msg.card.id === msg.from) {
    const res = upsertFriend(msg.card);
    if (res && res.isNew) toast(`${res.friend.name} t’a ajouté : vous êtes amis.`);
  }
});
