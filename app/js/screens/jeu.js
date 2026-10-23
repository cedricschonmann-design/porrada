// Mon jeu : le questionnaire (QCM avec « Autre ») et la fiche de stratégie.

import { state, save } from '../store.js';
import { h, ICON, full, toast, day, fill } from '../ui.js';
import { QUESTIONS, buildPlan } from '../data/questionnaire.js';
import { REF_BY_ID } from '../data/referees.js';
import { header } from '../app.js';

export function render() {
  const versions = state.game.versions;
  const last = versions[versions.length - 1];
  if (!last) {
    return h('div', null,
      header('Mon jeu'),
      h('div', { class: 'card accent', style: { padding: '24px 20px' } },
        h('h2', { style: { fontSize: '30px' } }, 'Construis ton jeu'),
        h('p', { style: { margin: '12px 0 18px' } }, `${QUESTIONS.length} questions à choix, environ 3 minutes. À la fin, tu reçois ta stratégie : ton style, ton plan A, tes finitions, ton plan B et 4 semaines de travail.`),
        h('button', { class: 'btn dark block big', id: 'start-quiz', onclick: () => quiz() }, 'Commencer'),
      ),
      h('p', { class: 'small muted', style: { margin: '14px 4px' } }, 'Ton jeu évolue : refais le questionnaire quand tu veux, tes anciennes versions restent gardées.'),
    );
  }
  return h('div', null, header('Mon jeu'), planView(last, versions.length));
}

function planView(p, count) {
  const fedName = p.fed ? REF_BY_ID[p.fed].short : null;
  return h('div', { class: 'stack', id: 'plan' },
    h('div', { class: 'plan-head' },
      h('span', { class: 'tape small accent' }, 'Ton style'),
      h('h2', { class: 'arch' }, p.style.name),
      h('p', null, p.style.pitch),
    ),
    section('Debout', h('ul', { class: 'bullets' }, p.stand.map((x) => h('li', null, x)))),
    section('Ton plan A', h('ol', { class: 'steps' }, p.planA.map((x) => h('li', null, x)))),
    section('Tes finitions', h('div', null,
      p.finishes.map((f) => h('div', { class: 'fin' },
        h('b', null, f.name),
        f.warn ? h('span', { class: 'tag danger' }, 'Interdit pour toi') : f.fav ? h('span', { class: 'tag grappling' }, 'Ta préférée') : null,
      )),
      p.finishes.some((f) => f.warn) ? h('p', { class: 'small muted', style: { marginTop: '10px' } },
        `Marquées « interdit » : ${p.finishes.filter((f) => f.warn).map((f) => f.warn).filter((x, i, a) => a.indexOf(x) === i).join(' ; ')}. Garde-les pour l’entraînement.`) : null,
      fedName ? null : h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Tu n’as pas choisi de règlement : vérifie ce qui t’est interdit dans l’onglet Compét.'),
    )),
    section(`Ton plan B : ${p.planB.name}`, h('div', null, h('p', { class: 'muted' }, p.planB.pitch), h('ol', { class: 'steps' }, p.planB.steps.map((x) => h('li', null, x))))),
    section('Ta défense prioritaire', h('div', { class: 'stack' }, p.defense.map((d) => h('div', null, h('b', null, d.t), h('ul', { class: 'bullets', style: { marginTop: '8px' } }, d.b.map((x) => h('li', null, x))))))),
    section('Ton focus sur 4 semaines', h('div', { class: 'weeks' }, p.weeks.map((w) => h('div', { class: 'week' }, h('b', null, w.w), h('span', null, w.t))))),
    p.goal ? h('div', { class: 'card' }, p.goal) : null,
    p.notes.length ? section('Tes précisions', h('ul', { class: 'bullets' }, p.notes.map((n) => h('li', null, h('span', { class: 'muted' }, n.q + ' '), '« ' + n.t + ' »')))) : null,
    h('p', { class: 'small muted' }, `Stratégie du ${day(p.at)}, en ${p.mode === 'nogi' ? 'No-Gi' : 'Gi'}${fedName ? ', règlement ' + fedName : ''}.`),
    h('button', { class: 'btn primary block big', id: 'redo-quiz', onclick: () => quiz(p.answers) }, h('span', { style: { display: 'contents' }, html: ICON.redo }), 'Refaire le questionnaire'),
    count > 1 ? h('button', { class: 'btn block', onclick: versionsView }, `Mes ${count} versions`) : null,
  );
}

function section(title, body) {
  return h('section', { class: 'plan-sec' }, h('h3', null, title), body);
}

function versionsView() {
  full((close) => h('div', { class: 'inner stack' },
    h('div', { class: 'bar-top' },
      h('button', { class: 'iconbtn', 'aria-label': 'Retour', onclick: close, html: ICON.back }),
      h('h2', { class: 'tape small' }, 'Mes versions'),
      h('span', { style: { width: '48px' } }),
    ),
    h('div', { class: 'list' }, [...state.game.versions].reverse().map((v, i) => h('button', {
      class: 'row', onclick: () => full((c2) => h('div', { class: 'inner' },
        h('div', { class: 'bar-top' }, h('button', { class: 'iconbtn', 'aria-label': 'Retour', onclick: c2, html: ICON.back }), h('span')),
        planView(v, 0))),
    },
    h('div', { class: 'grow' }, h('div', { class: 'title' }, v.style.name), h('div', { class: 'sub' }, `${day(v.at)}${i === 0 ? ', version actuelle' : ''}`)),
    h('span', { class: 'chev', html: ICON.chev })))),
  ));
}

// ---------- Le questionnaire ----------
function quiz(prev) {
  const answers = {};
  if (prev) for (const [k, v] of Object.entries(prev)) answers[k] = { v: Array.isArray(v.v) ? [...v.v] : v.v, other: v.other || '' };
  let i = 0;
  full((close, el) => {
    const wrap = h('div', { class: 'inner', id: 'quiz' });
    const draw = () => {
      const q = QUESTIONS[i];
      const a = answers[q.id] || (answers[q.id] = { v: q.type === 'many' ? [] : null, other: '' });
      const many = q.type === 'many';
      const otherOn = a.other !== '' || a.otherOpen;
      const isOn = (v) => (many ? a.v.includes(v) : a.v === v);
      const toggle = (v) => {
        if (many) {
          if (a.v.includes(v)) a.v = a.v.filter((x) => x !== v);
          else {
            if (q.max && a.v.length >= q.max) a.v.shift();
            a.v.push(v);
          }
          draw();
        } else {
          a.v = v;
          a.otherOpen = false;
          draw();
          setTimeout(next, 220);
        }
      };
      const otherInput = h('textarea', { class: 'input', placeholder: 'Écris ta réponse', maxlength: '160', 'aria-label': 'Autre réponse', oninput: (e) => { a.other = e.target.value; nextBtn.disabled = !canNext(); } }, a.other);
      const canNext = () => (many ? a.v.length > 0 : a.v !== null) || a.other.trim() !== '';
      const nextBtn = h('button', { class: 'btn primary block big', id: 'q-next', onclick: next, disabled: !canNext() }, i === QUESTIONS.length - 1 ? 'Voir ma stratégie' : 'Suivant');
      fill(wrap, 
        h('div', { class: 'bar-top' },
          h('button', { class: 'iconbtn', 'aria-label': i ? 'Question précédente' : 'Fermer', onclick: () => { if (i) { i--; draw(); } else close(); }, html: i ? ICON.back : ICON.close }),
          h('b', { class: 'num' }, `${i + 1} / ${QUESTIONS.length}`),
          h('span', { style: { width: '48px' } }),
        ),
        h('div', { class: 'q-progress' }, h('i', { style: { width: `${((i + 1) / QUESTIONS.length) * 100}%` } })),
        h('h2', { class: 'q-title' }, q.q),
        many ? h('p', { class: 'muted' }, q.max ? `Jusqu’à ${q.max} réponses.` : 'Plusieurs réponses possibles.') : null,
        h('div', { class: 'opts' },
          q.opts.map((o) => h('button', { class: 'opt' + (many ? '' : ' radio'), 'aria-pressed': String(isOn(o.v)), onclick: () => toggle(o.v) }, h('span', { class: 'box' }), o.l)),
          h('button', {
            class: 'opt' + (many ? '' : ' radio'), 'aria-pressed': String(otherOn), id: 'q-other',
            onclick: () => {
              if (otherOn) { a.other = ''; a.otherOpen = false; } else { a.otherOpen = true; if (!many) a.v = null; }
              draw();
              if (a.otherOpen) setTimeout(() => wrap.querySelector('textarea') && wrap.querySelector('textarea').focus(), 50);
            },
          }, h('span', { class: 'box' }), 'Autre'),
          otherOn ? otherInput : null,
        ),
        h('div', { style: { marginTop: '22px' } }, many || otherOn || i === QUESTIONS.length - 1 ? nextBtn : null),
      );
    };
    const next = () => {
      const q = QUESTIONS[i];
      const a = answers[q.id];
      if (!((q.type === 'many' ? a.v.length > 0 : a.v !== null) || a.other.trim())) return;
      if (i < QUESTIONS.length - 1) { i++; draw(); el.scrollTo(0, 0); return; }
      finish();
    };
    const finish = () => {
      const clean = {};
      for (const [k, v] of Object.entries(answers)) clean[k] = { v: v.v, other: (v.other || '').trim() };
      fill(wrap, h('div', { style: { display: 'grid', placeItems: 'center', minHeight: '70vh', gap: '18px', textAlign: 'center' } },
        h('div', { class: 'spinner', style: { width: '56px', height: '56px', borderWidth: '6px' } }),
        h('h2', null, 'Analyse de ton jeu…'),
      ));
      setTimeout(() => {
        const plan = buildPlan(clean, state.me);
        state.game.versions.push(plan);
        save();
        close();
        window.scrollTo(0, 0);
        toast(`Ton style : ${plan.style.name}.`);
      }, 1100);
    };
    draw();
    return wrap;
  });
}
