// Compétition : mon palmarès, et un arbitre par fédération à qui on pose ses questions.

import { state, save, profile } from '../store.js';
import { h, fill, ICON, push, sheet, seg, belt, BELT_NAME, AGE_NAME, sfx, haptic } from '../ui.js';
import { REFEREES, QUICK, VERIFIED } from '../data/referees.js';
import { CHARS, reply, topicReply, situationsFor, situationReply, POSITIONS, positionReply } from '../data/refbrain.js';
import { SUB_BY_ID } from '../data/submissions.js';
import { subPicker } from './combat.js';
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
    h('div', { class: 'section-head section' }, h('h3', null, 'Les règles'), h('span', { class: 'small muted' }, 'Pose ta question à un arbitre')),
    h('div', { class: 'rows' }, refs.map((r) => {
      const c = CHARS[r.id];
      return h('button', { class: 'rowc refrow', 'data-ref': r.id, onclick: () => openReferee(r) },
        badge(r, 50),
        h('div', { class: 'grow' },
          h('div', { class: 'hstack', style: { gap: '8px' } }, h('span', { class: 't' }, c.name), h('span', { class: 'fedtag' }, r.short)),
          h('div', { class: 's ellipsis' }, r.full),
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
  const p = () => profile();
  const topics = (list) => list.filter((k) => r.topics[k]).map((k) => [k, QUICK.find(([q]) => q === k)[1]]);
  const sits = Object.fromEntries(situationsFor(r));
  const pickSits = (ids) => ids.filter((id) => sits[id]).map((id) => ['sit:' + id, sits[id]]);

  // Une réponse, affichée dans un panneau
  const answerView = (question, res, again) => h('div', { class: 'stack answer' },
    h('div', { class: 'small muted' }, `${question} · ${mode === 'nogi' ? 'No-Gi' : 'Gi'}`),
    h('h2', { class: 'ans-title' },
      res.verdict === true ? h('span', { class: 'verdict yes', 'aria-label': 'Oui', html: ICON.check }) : res.verdict === false ? h('span', { class: 'verdict no', 'aria-label': 'Non', html: ICON.close }) : null,
      res.title),
    res.table ? h('table', null, h('tbody', null, res.table.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v))))) : null,
    res.list && res.list.length ? h('div', null, h('div', { class: 'sub-h' }, 'Interdit'), h('ul', null, res.list.map((x) => h('li', null, x)))) : null,
    res.ok && res.ok.length ? h('div', null, h('div', { class: 'sub-h' }, 'Autorisé pour toi'), h('ul', null, res.ok.map((x) => h('li', null, x)))) : null,
    res.lines && res.lines.length ? h('ul', null, res.lines.map((x) => h('li', null, x))) : null,
    h('div', { class: 'src' }, 'Source : ', h('a', { href: r.source, target: '_blank', rel: 'noopener' }, r.sourceLabel)),
    h('button', { class: 'btn sm', style: { justifySelf: 'start' }, onclick: () => { mode = mode === 'gi' ? 'nogi' : 'gi'; state.settings.refMode = mode; save(); fill(modeBox, modeSeg()); again(); } }, mode === 'gi' ? 'Et en No-Gi ?' : 'Et en Gi ?'),
  );
  let current = null;
  const show = (question, get) => {
    const draw = () => fill(current.body, h('div', { class: 'grab' }), answerView(question, get(), draw));
    if (current && current.isOpen()) { draw(); return; }
    let open = true;
    const close = sheet((cl, body) => { current = { body, isOpen: () => open }; return null; }, { onClose: () => { open = false; } });
    draw();
    sfx('receive'); haptic('light');
    return close;
  };

  // Les questions
  const ask = (id, label) => {
    const prof = p();
    if (id === 'poids') {
      if (prof.weight) return show(label, () => reply(r, 'ma catégorie de poids', p(), mode));
      return weightSheet();
    }
    if (id === 'pos') return positionsSheet();
    if (id === 'sub') return subSheet();
    if (id.startsWith('sit:')) return show(label, () => situationReply(r, id.slice(4), p(), mode));
    return show(label, () => topicReply(r, id, p(), mode));
  };
  const weightSheet = () => sheet((close) => {
    const input = h('input', { class: 'input', id: 'ref-weight', type: 'text', inputmode: 'decimal', placeholder: 'Ton poids en kg', autocomplete: 'off' });
    const go = () => { const w = Number(String(input.value).replace(',', '.')); if (!(w >= 25 && w <= 250)) { input.focus(); return; } close({ instant: true }); show('Ma catégorie de poids', () => reply(r, `${w} kg`, p(), mode)); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    return h('div', { class: 'stack' }, h('h2', null, 'Ton poids'), h('p', { class: 'muted small' }, 'Sans kimono. Tu peux aussi l’ajouter dans les réglages.'), input, h('button', { class: 'btn primary lg block', id: 'ref-weight-go', onclick: go }, 'Voir ma catégorie'));
  });
  const positionsSheet = () => sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Combien de points vaut…'),
    h('div', { class: 'rows' }, POSITIONS.map((label) => h('button', { class: 'rowc', 'data-pos': label, onclick: () => { close({ instant: true }); show(`Combien vaut : ${label.toLowerCase()}`, () => positionReply(r, label, p(), mode) || { title: label, lines: ['Pas de points pour ça dans ce règlement.'] }); } },
      h('div', { class: 'grow t' }, label), h('span', { class: 'chev', html: ICON.chev })))),
  ));
  const subSheet = () => sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Quelle soumission ?'),
    subPicker(mode, (id) => { close({ instant: true }); const name = SUB_BY_ID[id].name; show(`${name} autorisée ?`, () => reply(r, `${name} autorisée ?`, p(), mode)); }, null, { title: null }),
  ));

  const GROUPS = [
    ['Avant le combat', [['poids', 'Ma catégorie de poids'], ...topics(['pesee', 'tenue']), ...pickSits(['hygiene', 'age'])]],
    ['Pendant le combat', [...topics(['points']), ['pos', 'Combien vaut une position ?'], ...topics(['duree', 'egalite', 'format'])]],
    ['Autorisé ou interdit', [...topics(['interdits']), ['sub', 'Cette soumission est autorisée ?'], ...pickSits(['tirer', 'sauter', 'slam', 'kani', 'reap', 'doigts', 'agripper'])]],
    ['Les fautes', [...topics(['penalites']), ...pickSits(['sortir', 'abandon'])]],
  ];
  const modeSeg = () => seg([['gi', 'Gi'], ['nogi', 'No-Gi']], mode, (v) => { mode = v; state.settings.refMode = v; save(); fill(modeBox, modeSeg()); }, { cls: 'sm' });
  const modeBox = h('div', { style: { width: '130px' } }, modeSeg());

  push((page) => {
    page.setRight(modeBox);
    return h('div', null,
      h('div', { style: { display: 'grid', justifyItems: 'center', gap: '6px', textAlign: 'center', margin: '4px 0 6px' } },
        badge(r, 76),
        h('h1', { class: 'page-title', style: { margin: '4px 0 0' } }, c.name),
        h('div', { class: 'muted small' }, `Arbitre ${r.short} · ${r.full}`),
        h('div', { class: 'ctx', style: { justifyContent: 'center', marginTop: '6px' } },
          h('span', { class: 'tag' }, `Ceinture ${BELT_NAME[state.me.belt].toLowerCase()}`),
          h('span', { class: 'tag' }, AGE_NAME[profile().age].split(' (')[0]),
          profile().weight ? h('span', { class: 'tag' }, `${String(profile().weight).replace('.', ',')} kg`) : null),
      ),
      GROUPS.filter(([, list]) => list.length).map(([title, list]) => [
        h('div', { class: 'section-head section' }, h('h3', null, title)),
        h('div', { class: 'rows' }, list.map(([id, label]) => h('button', { class: 'rowc', 'data-q': id, onclick: () => ask(id, label) },
          h('div', { class: 'grow t', style: { fontSize: '15.5px' } }, label), h('span', { class: 'chev', html: ICON.chev })))),
      ]),
      h('p', { class: 'disclaimer', style: { marginTop: '16px' } }, `Réponses adaptées à ta ceinture et à ton âge. Source : ${r.sourceLabel}. Le règlement de chaque événement fait toujours foi.`),
    );
  }, { title: c.name });
}
