// Mon jeu : questionnaire à choix (avec « Autre »), puis la stratégie calculée par l'appli.

import { state, save, profile } from '../store.js';
import { h, fill, ICON, push, toast, day, sfx, haptic, confetti } from '../ui.js';
import { visibleQuestions, buildPlan } from '../data/questionnaire.js';
import { header } from '../app.js';
import { avatarOf } from '../people.js';

export function render() {
  const versions = state.game.versions;
  const last = versions[versions.length - 1];
  if (!last) {
    return h('div', null,
      header('Mon jeu'),
      h('div', { class: 'card hero grad', style: { padding: '22px' } },
        h('div', { class: 'small', style: { fontWeight: '700', opacity: '.85' } }, '3 minutes, que des choix'),
        h('h2', { style: { fontSize: '28px', margin: '6px 0 8px' } }, 'Construis ton jeu'),
        h('p', { style: { opacity: '.9' } }, 'À la fin : ton style, ton arbre de jeu, tes finitions et un plan sur 4 semaines.'),
        h('button', { class: 'btn white lg block', id: 'start-quiz', style: { marginTop: '18px' }, onclick: () => quiz(null) }, h('span', { html: ICON.play, style: { display: 'contents' } }), 'Commencer'),
      ),
      h('div', { class: 'stack', style: { marginTop: '14px' } },
        tip('game', 'Ton style', 'Parmi 12 styles de jeu, calculé à partir de tes réponses.'),
        tip('chart', 'Ton plan', 'Construit avec tes gardes, tes passages, ton debout et ta morphologie.'),
        tip('redo', 'À refaire', 'Ton jeu évolue : refais le questionnaire, tes versions restent gardées.'),
      ),
    );
  }
  return h('div', null, header('Mon jeu'), planView(last, versions.length));
}

const tip = (ic, t, s) => h('div', { class: 'rowc' }, h('span', { class: 'tipic', html: ICON[ic] }), h('div', { class: 'grow' }, h('div', { class: 't' }, t), h('div', { class: 's' }, s)));

function acc(ic, title, body, open = false) {
  const el = h('div', { class: 'acc' + (open ? ' open' : '') });
  const btn = h('button', { 'aria-expanded': String(open), onclick: () => { const o = el.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); haptic('light'); } },
    h('span', { class: 'ic', html: ICON[ic] || '' }), h('span', { class: 't' }, title), h('span', { class: 'chev', html: ICON.chev }));
  el.append(btn, h('div', { class: 'acc-body' }, h('div', null, h('div', { class: 'acc-in' }, body))));
  return el;
}

function planView(p, count, { readonly = false } = {}) {
  const planA = Array.isArray(p.planA) ? { name: 'Ton plan A', steps: p.planA } : p.planA;
  const planB = p.planB || { name: '', steps: [] };
  return h('div', { id: 'plan', class: 'stack' },
    h('div', { class: 'card hero grad style-card' },
      h('div', { class: 'k' }, `Ton style · ${day(p.at)}`),
      h('div', { class: 'name' }, p.style.name),
      h('p', { style: { opacity: '.92' } }, p.style.pitch),
      p.why ? h('p', { style: { opacity: '.92', marginTop: '8px', fontWeight: '700' } }, p.why) : null,
      p.tags ? h('div', { class: 'chips' }, p.tags.map((t) => h('span', { class: 'chip static' }, t))) : null,
    ),
    p.top3 ? h('div', { class: 'card stack' },
      h('h3', null, 'Tes styles les plus proches'),
      h('div', { class: 'stack', style: { gap: '10px' } }, p.top3.map((x, i) => h('div', { class: 'hbar' },
        h('span', null, x.name), h('b', null, `${x.pct} %`),
        h('div', { class: 'track' }, h('i', { style: { width: `${x.pct}%`, background: i === 0 ? 'var(--grad)' : 'var(--faint)', animationDelay: `${i * 90}ms` } })),
      ))),
    ) : null,
    p.flow ? h('div', { class: 'card' },
      h('h3', { style: { marginBottom: '12px' } }, 'Ton arbre de jeu'),
      h('div', { class: 'flow' }, p.flow.map((n, i) => h('div', { class: 'node' + (n.key ? ' key' : '') }, h('span', { class: 'dot' }, i + 1), h('div', null, h('div', { class: 't' }, n.t), h('div', { class: 's' }, n.s))))),
    ) : null,
    h('div', null,
      acc('play', `Plan A : ${planA.name}`, h('ol', { class: 'steps' }, planA.steps.map((x) => h('li', null, x))), !readonly),
      acc('user', 'Debout', h('ul', { class: 'bullets' }, p.stand.map((x) => h('li', null, x)))),
      acc('game', 'Tes finitions', h('div', null,
        p.finishes.map((f) => h('div', { class: 'fin-row' }, h('b', null, f.name), f.warn ? h('span', { class: 'tag danger' }, 'Interdit pour toi') : f.fav ? h('span', { class: 'tag fav' }, 'Ta préférée') : h('span', { class: 'tag ok' }, 'Autorisée'))),
        p.finishes.some((f) => f.warn) ? h('p', { class: 'small muted', style: { marginTop: '8px' } }, `${[...new Set(p.finishes.filter((f) => f.warn).map((f) => f.warn))].join(' ; ')}. Garde-les pour l’entraînement.`) : null,
        p.fed ? null : h('p', { class: 'small muted', style: { marginTop: '8px' } }, 'Pas de règlement choisi : vérifie ce qui t’est interdit dans l’espace Compétition.'),
      )),
      p.counters ? acc('swords', 'S’il fait ça, tu fais ça', h('div', { class: 'stack', style: { gap: '8px' } }, p.counters.map(([a, b]) => h('div', { class: 'week' }, h('b', null, a), h('span', null, b))))) : null,
      acc('redo', `Plan B : ${planB.name}`, h('div', { class: 'stack' }, planB.pitch || planB.style ? h('p', { class: 'muted' }, planB.pitch || `La route du style ${planB.style}.`) : null, h('ol', { class: 'steps' }, planB.steps.map((x) => h('li', null, x))))),
      p.tips && p.tips.length ? acc('sparkles', 'Joue avec ton corps', h('ul', { class: 'bullets' }, p.tips.map((x) => h('li', null, x)))) : null,
      acc('shield', 'Ta défense prioritaire', h('div', { class: 'stack' }, p.defense.map((d) => h('div', null, h('b', null, d.t), h('ul', { class: 'bullets', style: { marginTop: '8px' } }, d.b.map((x) => h('li', null, x))))))),
      p.legs ? acc('bolt', 'Les clés de jambe', h('ul', { class: 'bullets' }, p.legs.map((x) => h('li', null, x)))) : null,
      p.fragile && p.fragile.length ? acc('heart', 'Ce que tu ménages', h('ul', { class: 'bullets' }, p.fragile.map((x) => h('li', null, x)))) : null,
      acc('calendar', 'Ton plan sur 4 semaines', h('div', { class: 'stack', style: { gap: '8px' } }, p.weeks.map((w) => h('div', { class: 'week' }, h('b', null, `${w.w} · ${w.t || ''}`.replace(/ · $/, '')), h('span', null, w.drill || w.t), w.spar ? h('span', { class: 'muted small' }, w.spar) : null)))),
      p.notes.length ? acc('note', 'Tes précisions', h('ul', { class: 'bullets' }, p.notes.map((n) => h('li', null, h('span', { class: 'muted' }, n.q + ' '), '« ' + n.t + ' »')))) : null,
    ),
    p.goal ? h('div', { class: 'card tint' }, p.goal) : null,
    readonly ? null : h('div', { class: 'btns', style: { marginTop: '6px' } },
      h('button', { class: 'btn primary lg block', id: 'redo-quiz', onclick: () => quiz(p.answers) }, h('span', { html: ICON.redo, style: { display: 'contents' } }), 'Mon jeu a évolué'),
      count > 1 ? h('button', { class: 'btn block', onclick: versionsView }, `Mes ${count} versions`) : null,
    ),
  );
}

function versionsView() {
  push(() => h('div', null,
    h('h1', { class: 'page-title' }, 'Mes versions'),
    h('div', { class: 'rows' }, [...state.game.versions].reverse().map((v, i) => h('button', {
      class: 'rowc', onclick: () => push(() => planView(v, 0, { readonly: true }), { title: v.style.name }),
    }, h('span', { class: 'tipic', html: ICON.game }), h('div', { class: 'grow' }, h('div', { class: 't' }, v.style.name), h('div', { class: 's' }, `${day(v.at)}${i === 0 ? ' · actuelle' : ''}`)), h('span', { class: 'chev', html: ICON.chev })))),
  ), { title: 'Mes versions' });
}

// ---------- Le questionnaire ----------
function quiz(prev) {
  const answers = prev ? JSON.parse(JSON.stringify(prev)) : {};
  let i = 0;
  let dir = 1;
  push((page) => {
    const wrap = h('div', { id: 'quiz' });
    const draw = () => {
      const qs = visibleQuestions(answers);
      if (i >= qs.length) { finish(); return; }
      const q = qs[i];
      const many = q.type === 'many';
      const a = answers[q.id] || (answers[q.id] = { v: many ? [] : null, other: '' });
      if (many && !Array.isArray(a.v)) a.v = [];
      // nettoie les choix devenus invisibles
      if (many) a.v = a.v.filter((x) => q.opts.some((o) => o.v === x));
      const isOn = (val) => (many ? a.v.includes(val) : a.v === val);
      const otherOpen = !!a.other || a.v === '__other';
      const ta = h('textarea', { class: 'input', id: 'q-other-text', placeholder: 'Écris ta réponse', style: { marginTop: '10px', display: otherOpen ? 'block' : 'none' } }, a.other || '');
      const next = h('button', { class: 'btn primary lg block', id: 'q-next', onclick: () => go(1) }, i === qs.length - 1 ? 'Voir ma stratégie' : 'Suivant');
      const canNext = () => (many ? a.v.length > 0 : (a.v !== null && a.v !== '__other')) || a.other.trim() !== '';
      const refresh = () => { next.disabled = !canNext(); next.classList.toggle('hidden', !many && ta.style.display !== 'block' && i < qs.length - 1); };
      ta.addEventListener('input', () => { a.other = ta.value; refresh(); });
      const toggle = (val) => {
        if (many) {
          if (a.v.includes(val)) a.v = a.v.filter((x) => x !== val);
          else {
            if (val === 'aucune' || val === 'aucun') a.v = [];
            else a.v = a.v.filter((x) => x !== 'aucune' && x !== 'aucun');
            if (q.max && a.v.length >= q.max) { a.v.shift(); }
            a.v.push(val);
          }
          sfx('toggle'); haptic('light');
          drawOpts(); refresh();
        } else {
          a.v = val;
          sfx('toggle'); haptic('light');
          drawOpts(); refresh();
          if (!a.other) setTimeout(() => go(1), 260);
        }
      };
      const opts = h('div', { class: 'opts' });
      const drawOpts = () => fill(opts,
        ...q.opts.map((o) => h('button', { class: 'opt' + (many ? '' : ' one'), 'aria-pressed': String(isOn(o.v)), 'data-silent': '', onclick: () => toggle(o.v) },
          h('span', { class: 'grow' }, o.l, o.d ? h('span', { class: 'd' }, o.d) : null),
          h('span', { class: 'mark', html: ICON.check }))),
        h('button', {
          class: 'opt' + (many ? '' : ' one'), id: 'q-other', 'data-silent': '', 'aria-pressed': String(ta.style.display === 'block'),
          onclick: () => {
            const show = ta.style.display !== 'block';
            ta.style.display = show ? 'block' : 'none';
            if (!many) a.v = show ? '__other' : null;
            if (!show) { a.other = ''; ta.value = ''; }
            drawOpts(); refresh();
            if (show) setTimeout(() => ta.focus(), 50);
          },
        }, h('span', { class: 'grow' }, 'Autre', h('span', { class: 'd' }, 'Écris ta propre réponse')), h('span', { class: 'mark', html: ICON.check })),
      );
      drawOpts();
      refresh();
      fill(wrap,
        h('div', { class: 'hstack' },
          i > 0 ? h('button', { class: 'iconbtn', 'aria-label': 'Question précédente', html: ICON.back, onclick: () => go(-1) }) : null,
          h('div', { class: 'q-progress grow' }, h('i', { style: { width: `${((i + 1) / qs.length) * 100}%` } })),
          h('span', { class: 'small muted num', style: { minWidth: '44px', textAlign: 'right' } }, `${i + 1}/${qs.length}`),
        ),
        h('div', { class: 'q-wrap' + (dir < 0 ? ' back' : '') },
          h('h2', { class: 'q-title' }, q.q),
          h('p', { class: 'q-help' }, q.help || (many ? (q.max ? `Jusqu’à ${q.max} réponses.` : 'Plusieurs réponses possibles.') : 'Une seule réponse.')),
          opts, ta,
        ),
        h('div', { class: 'q-foot' }, next),
      );
    };
    const go = (d) => {
      if (d > 0) {
        const qs = visibleQuestions(answers);
        const a = answers[qs[i].id];
        if (a && a.v === '__other') a.v = null;
      }
      dir = d; i = Math.max(0, i + d);
      page.el.scrollTop = 0;
      sfx(d > 0 ? 'push' : 'close');
      draw();
    };
    const finish = () => {
      const clean = {};
      for (const q of visibleQuestions(answers)) {
        const a = answers[q.id];
        if (a) clean[q.id] = { v: a.v === '__other' ? null : a.v, other: (a.other || '').trim() };
      }
      const steps = ['Tes 16 traits de jeu…', 'Comparaison avec 12 styles…', 'Ton plan avec tes gardes et tes passages…', 'Tes finitions et ce qui t’est interdit…', 'Ton plan sur 4 semaines…'];
      const list = h('div', { class: 'stack', style: { marginTop: '22px' } });
      fill(wrap, h('div', { style: { minHeight: '60vh', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: '18px', textAlign: 'center' } },
        avatarOf(state.me, { size: 96, ring: true }),
        h('h2', null, 'Analyse de ton jeu'),
        list,
      ));
      steps.forEach((s, k) => setTimeout(() => { list.append(h('div', { class: 'hstack', style: { animation: 'fadeUp .35s both', justifyContent: 'center' } }, h('span', { class: 'spinner', style: { width: '16px', height: '16px', borderWidth: '2px' } }), h('span', { class: 'muted' }, s))); sfx('tap'); }, k * 330));
      setTimeout(() => {
        state.game.versions.push(buildPlan(clean, profile()));
        save();
        page.close({ silent: true });
        sfx('levelup'); haptic('heavy'); confetti(80);
        toast('Ta stratégie est prête.', { ok: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, steps.length * 330 + 300);
    };
    draw();
    return wrap;
  }, { title: 'Construis ton jeu', modal: true });
}
