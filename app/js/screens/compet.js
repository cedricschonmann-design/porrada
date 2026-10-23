// Compét. : un arbitre par fédération. On lui pose ses questions sur les règles.

import { state, save } from '../store.js';
import { h, ICON, full, seg, belt, BELT_NAME } from '../ui.js';
import { REFEREES, QUICK, answer, VERIFIED } from '../data/referees.js';
import { header } from '../app.js';

export function render() {
  const me = state.me;
  return h('div', null,
    header('Compét.'),
    h('p', { class: 'muted', style: { margin: '0 4px 16px' } }, 'Choisis ta fédération et pose ta question à son arbitre : points, durée, pesée, tenue, et ce qui t’est interdit.'),
    h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', padding: '12px 14px' } },
      belt(me.belt, me.stripes),
      h('span', { class: 'small' }, `Réponses adaptées à ta ceinture ${BELT_NAME[me.belt].toLowerCase()}. Change-la dans ton profil.`),
    ),
    h('div', { class: 'list' }, REFEREES.map((r) => h('button', { class: 'row', 'data-ref': r.id, onclick: () => openReferee(r) },
      h('span', { class: 'ref-badge' }, h('b', null, r.short)),
      h('div', { class: 'grow' }, h('div', { class: 'title' }, `Arbitre ${r.short}`), h('div', { class: 'sub' }, r.full)),
      h('span', { class: 'chev', html: ICON.chev }),
    ))),
    h('p', { class: 'small muted', style: { margin: '18px 4px' } }, `Règles vérifiées en ${VERIFIED} sur les règlements officiels. Le règlement de chaque événement fait toujours foi.`),
  );
}

function openReferee(r) {
  let mode = state.settings.refMode || 'gi';
  const log = [];
  full((close) => {
    const wrap = h('div', { class: 'inner stack', id: 'referee' });
    const answers = h('div', { class: 'stack' });
    const input = h('input', { class: 'input', placeholder: 'Pose ta question', 'aria-label': 'Ta question', enterkeyhint: 'send' });
    const ask = (q, topic) => {
      const res = topic ? r.topics[topic](state.me, mode) : answer(r, q, state.me, mode);
      log.unshift({ q, res, topic });
      drawAnswers();
      window.requestAnimationFrame(() => answers.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    const drawAnswers = () => answers.replaceChildren(...log.map(({ q, res }) => h('div', { class: 'answer' },
      h('div', { class: 'q' }, q),
      h('h3', null, res.verdict === true ? '✓ ' : res.verdict === false ? '✗ ' : '', res.title),
      res.table ? h('table', null, h('tbody', null, res.table.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v))))) : null,
      res.list && res.list.length ? h('div', { style: { marginTop: '6px' } }, h('ul', null, res.list.map((x) => h('li', null, x)))) : null,
      res.ok && res.ok.length ? h('div', { style: { marginTop: '12px' } }, h('b', null, 'Autorisé pour toi'), h('ul', { style: { marginTop: '6px' } }, res.ok.map((x) => h('li', null, x)))) : null,
      res.lines && res.lines.length ? h('ul', { style: { marginTop: res.table || res.list ? '12px' : '0' } }, res.lines.map((x) => h('li', null, x))) : null,
      h('div', { class: 'src' }, 'Source : ', h('a', { href: r.source, target: '_blank', rel: 'noopener' }, r.sourceLabel)),
    )));
    const send = () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      input.blur();
      ask(q);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    wrap.append(
      h('div', { class: 'bar-top' },
        h('button', { class: 'iconbtn', 'aria-label': 'Retour', onclick: close, html: ICON.back }),
        h('span'),
      ),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
        h('span', { class: 'ref-badge', style: { width: '68px', height: '68px' } }, h('b', null, r.short)),
        h('div', null, h('h2', null, `Arbitre ${r.short}`), h('div', { class: 'small muted' }, r.full)),
      ),
      h('div', { class: 'card' }, r.hello),
      seg([['gi', 'Gi (kimono)'], ['nogi', 'No-Gi']], mode, (v) => {
        mode = v;
        state.settings.refMode = v;
        save();
        if (log.length) { const last = log[0]; log.length = 0; ask(last.q, last.topic); }
      }),
      h('div', { class: 'chips' }, QUICK.filter(([k]) => r.topics[k]).map(([k, l]) => h('button', { class: 'chip', onclick: () => ask(l, k) }, l))),
      h('div', { class: 'askbar' }, input, h('button', { class: 'iconbtn', style: { width: '58px', height: '58px', background: 'var(--accent)', color: '#000', border: '2.5px solid var(--ink)' }, 'aria-label': 'Envoyer la question', onclick: send, html: ICON.send })),
      answers,
    );
    return wrap;
  });
}
