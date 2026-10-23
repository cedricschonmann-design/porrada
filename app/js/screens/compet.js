// Compétition : mon palmarès, et un arbitre par fédération à qui on pose ses questions.

import { state, save, profile } from '../store.js';
import { h, fill, ICON, push, seg, belt, BELT_NAME, AGE_NAME, sfx, haptic } from '../ui.js';
import { REFEREES, QUICK, VERIFIED } from '../data/referees.js';
import { CHARS, reply, topicReply } from '../data/refbrain.js';
import { refBadge } from '../people.js';
import { header } from '../app.js';
import { openSettings } from './settings.js';
import { palmaresCard } from './palmares.js';

const badge = (r, size) => refBadge(CHARS[r.id].name, CHARS[r.id].grad, size);

export function render() {
  const me = state.me;
  const p = profile();
  const fav = state.settings.fed;
  const refs = [...REFEREES].sort((a, b) => (b.id === fav) - (a.id === fav));
  return h('div', null,
    header('Compétition'),
    palmaresCard(),
    h('div', { class: 'section-head section' }, h('h3', null, 'Mon profil de compétiteur')),
    h('button', { class: 'rowc', onclick: openSettings, 'aria-label': 'Modifier mon profil de compétiteur' },
      belt(me.belt, me.stripes),
      h('div', { class: 'grow' },
        h('div', { class: 't', style: { fontSize: '15px' } }, `Ceinture ${BELT_NAME[me.belt].toLowerCase()} · ${AGE_NAME[p.age].split(' (')[0]}`),
        h('div', { class: 's' }, `${p.sex === 'f' ? 'Femmes' : 'Hommes'}${p.weight ? ' · ' + String(p.weight).replace('.', ',') + ' kg' : ' · ajoute ton poids'}`),
      ),
      h('span', { class: 'chev', html: ICON.chev }),
    ),
    h('div', { class: 'section-head section' }, h('h3', null, 'Les arbitres'), h('span', { class: 'small muted' }, 'Pose-leur tes questions')),
    h('div', { class: 'rows' }, refs.map((r) => {
      const c = CHARS[r.id];
      return h('button', { class: 'rowc refrow', 'data-ref': r.id, onclick: () => openReferee(r) },
        badge(r, 50),
        h('div', { class: 'grow' },
          h('div', { class: 'hstack', style: { gap: '8px' } }, h('span', { class: 't' }, c.name), h('span', { class: 'fedtag' }, r.short)),
          h('div', { class: 's ellipsis' }, c.line),
        ),
        h('span', { class: 'chev', html: ICON.chev }),
      );
    })),
    h('p', { class: 'disclaimer', style: { marginTop: '16px' } }, `Personnages fictifs. Règles vérifiées en ${VERIFIED} sur les règlements officiels : le règlement de chaque événement fait toujours foi.`),
  );
}

function openReferee(r) {
  const c = CHARS[r.id];
  let mode = state.settings.refMode || 'gi';
  const log = (state.refChats[r.id] = state.refChats[r.id] || []);
  push((page) => {
    const chat = h('div', { class: 'chat' });
    const chips = h('div', { class: 'chips scroll' });
    const input = h('input', { class: 'input', placeholder: `Ta question à ${c.name}`, 'aria-label': 'Ta question', enterkeyhint: 'send', id: 'ref-q' });
    let lastQ = null;
    let busy = false;

    const bubble = (res) => h('div', { class: 'bubble rich' },
      h('h3', null,
        res.verdict === true ? h('span', { class: 'verdict yes', 'aria-label': 'Oui', html: ICON.check }) : res.verdict === false ? h('span', { class: 'verdict no', 'aria-label': 'Non', html: ICON.close }) : null,
        res.title),
      res.table ? h('table', null, h('tbody', null, res.table.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v))))) : null,
      res.list && res.list.length ? h('div', null, h('div', { class: 'sub-h' }, 'Interdit'), h('ul', null, res.list.map((x) => h('li', null, x)))) : null,
      res.ok && res.ok.length ? h('div', null, h('div', { class: 'sub-h' }, 'Autorisé pour toi'), h('ul', null, res.ok.map((x) => h('li', null, x)))) : null,
      res.lines && res.lines.length ? h('ul', null, res.lines.map((x) => h('li', null, x))) : null,
      h('div', { class: 'src' }, 'Source : ', h('a', { href: r.source, target: '_blank', rel: 'noopener' }, r.sourceLabel)),
    );
    const row = (m, animate) => {
      const el = m.who === 'me'
        ? h('div', { class: 'msg-row me' }, h('div', { class: 'bubble' }, m.text))
        : h('div', { class: 'msg-row them' }, badge(r, 30), m.res ? bubble(m.res) : h('div', { class: 'bubble' }, m.text));
      if (!animate) el.style.animation = 'none';
      return el;
    };
    const drawAll = () => {
      fill(chat,
        h('div', { style: { display: 'grid', justifyItems: 'center', gap: '6px', textAlign: 'center', margin: '4px 0 12px' } },
          badge(r, 88),
          h('h2', null, c.name),
          h('div', { class: 'muted small' }, `Arbitre ${r.short} · ${r.full}`),
          h('div', { class: 'ctx', style: { justifyContent: 'center', marginTop: '6px' } },
            h('span', { class: 'tag' }, `Ceinture ${BELT_NAME[state.me.belt].toLowerCase()}`),
            h('span', { class: 'tag' }, AGE_NAME[profile().age].split(' (')[0]),
            profile().weight ? h('span', { class: 'tag' }, `${String(profile().weight).replace('.', ',')} kg`) : null),
        ),
        h('div', { class: 'msg-row them' }, badge(r, 30), h('div', { class: 'bubble' }, c.hello)),
        log.map((m) => row(m, false)),
      );
    };
    const scrollEnd = () => requestAnimationFrame(() => { page.el.scrollTo({ top: page.el.scrollHeight, behavior: 'smooth' }); });
    const drawChips = (list) => fill(chips, ...list.map((t) => h('button', { class: 'chip', 'data-silent': '', onclick: () => askIt(t) }, t)));
    const defaultChips = () => QUICK.filter(([k]) => r.topics[k]).map(([, l]) => l).concat(['Ma catégorie de poids', 'Combien vaut une montée ?', 'Tirer la garde ?']);

    const askIt = (text, { topic = null, silentQ = false } = {}) => {
      if (busy) return;
      const t = String(text || '').trim();
      if (!t) return;
      if (/^et en no-?gi/i.test(t) || /^et en gi/i.test(t)) { setMode(/no-?gi/i.test(t) ? 'nogi' : 'gi'); return; }
      busy = true;
      lastQ = { text: t, topic };
      if (!silentQ) {
        const m = { who: 'me', text: t, ts: Date.now() };
        log.push(m);
        chat.append(row(m, true));
        sfx('send');
      }
      const typing = h('div', { class: 'msg-row them' }, badge(r, 30), h('div', { class: 'bubble typing' }, h('i'), h('i'), h('i')));
      chat.append(typing);
      scrollEnd();
      setTimeout(() => {
        const p = profile();
        const qk = QUICK.find(([, l]) => l === t);
        const res = topic ? topicReply(r, topic, p, mode) : qk && r.topics[qk[0]] ? topicReply(r, qk[0], p, mode) : reply(r, t, p, mode);
        const m = { who: 'ref', res, ts: Date.now() };
        log.push(m);
        if (log.length > 60) log.splice(0, log.length - 60);
        state.refChats[r.id] = log;
        save();
        typing.replaceWith(row(m, true));
        sfx('receive'); haptic('light');
        drawChips([...(res.follow || []), ...defaultChips()].filter((x, i, a) => a.indexOf(x) === i).slice(0, 8));
        busy = false;
        scrollEnd();
      }, 520 + Math.random() * 380);
    };
    const setMode = (v) => {
      mode = v;
      state.settings.refMode = v;
      save();
      fill(modeBox, modeSeg());
      const note = { who: 'ref', res: { title: v === 'nogi' ? 'OK, on passe en No-Gi.' : 'OK, on passe en Gi.', lines: lastQ ? ['Je reprends ta dernière question.'] : [] }, ts: Date.now() };
      log.push(note);
      chat.append(row(note, true));
      if (lastQ) askIt(lastQ.text, { topic: lastQ.topic, silentQ: true });
      scrollEnd();
    };
    const modeSeg = () => seg([['gi', 'Gi'], ['nogi', 'No-Gi']], mode, setMode, { cls: 'sm' });
    const modeBox = h('div', { style: { width: '130px' } }, modeSeg());
    page.setRight(modeBox);
    const send = () => { const v = input.value; input.value = ''; askIt(v); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    drawAll();
    drawChips(defaultChips());
    setTimeout(() => { page.el.scrollTop = page.el.scrollHeight; }, 50);
    return [
      h('div', { class: 'chat-wrap' }, chat),
      log.length ? h('div', { class: 'center' }, h('button', { class: 'link muted', onclick: () => { log.length = 0; state.refChats[r.id] = []; save(); drawAll(); sfx('del'); } }, 'Effacer la conversation')) : null,
      h('div', { class: 'composer' }, chips, h('div', { class: 'bar' }, input, h('button', { class: 'iconbtn grad', 'aria-label': 'Envoyer', id: 'ref-send', 'data-silent': '', html: ICON.send, onclick: send }))),
    ];
  }, { title: c.name, bareNav: true, cls: 'chatpage' });
}

