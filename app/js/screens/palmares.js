// Palmarès de compétition (comme sur Smoothcomp) : on note soi-même ses compétitions et ses combats.

import { state, save, rid, onChange } from '../store.js';
import { h, fill, ICON, push, sheet, toast, seg, ask, sfx, haptic, day, plural, svgEl, BELTS, belt, confetti } from '../ui.js';
import { REFEREES } from '../data/referees.js';
import { subName } from '../data/submissions.js';
import { subPicker } from './combat.js';

const FEDS = [...REFEREES.map((r) => [r.id, r.short]), ['autre', 'Autre']];
const FED_NAME = Object.fromEntries(FEDS);
const HOW = [['sub', 'Soumission'], ['pts', 'Points'], ['adv', 'Avantages'], ['dec', 'Décision'], ['dq', 'Disqualification']];
const HOW_NAME = Object.fromEntries(HOW);
const MEDALS = [['or', 'Or'], ['argent', 'Argent'], ['bronze', 'Bronze'], [null, 'Aucune']];

const comps = () => (state.comps = state.comps || []);

export function compStats() {
  const s = { wins: 0, losses: 0, draws: 0, fights: 0, comps: comps().length, by: { w: {}, l: {} }, medals: { or: 0, argent: 0, bronze: 0 } };
  for (const c of comps()) {
    if (c.medal && s.medals[c.medal] != null) s.medals[c.medal]++;
    for (const m of c.matches || []) {
      s.fights++;
      if (m.res === 'w') { s.wins++; s.by.w[m.how] = (s.by.w[m.how] || 0) + 1; } else if (m.res === 'l') { s.losses++; s.by.l[m.how] = (s.by.l[m.how] || 0) + 1; } else s.draws++;
    }
  }
  return s;
}

// Graphique en cercle : victoires (vert), défaites (gris foncé), nuls (gris clair)
export function donut(s, size = 132) {
  const R = 52; const C = 2 * Math.PI * R; const gap = s.fights > 1 ? 3 : 0;
  const parts = [['win', s.wins], ['loss', s.losses], ['draw', s.draws]].filter(([, n]) => n > 0);
  let off = 0;
  let arcs = '';
  for (const [cls, n] of parts) {
    const len = Math.max(0, (C * n) / s.fights - gap);
    arcs += `<circle class="seg ${cls}" cx="60" cy="60" r="${R}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
    off += (C * n) / s.fights;
  }
  const pct = s.fights ? Math.round((s.wins / s.fights) * 100) : 0;
  const el = svgEl(`<svg class="donut" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${s.wins} victoires, ${s.losses} défaites, ${s.draws} nuls">
    <circle class="track" cx="60" cy="60" r="${R}"/>
    <g transform="rotate(-90 60 60)">${arcs}</g>
    <text x="60" y="58" text-anchor="middle" class="big">${s.fights ? pct + ' %' : '–'}</text>
    <text x="60" y="76" text-anchor="middle" class="small">${s.fights ? 'de victoires' : 'aucun combat'}</text>
  </svg>`);
  return el;
}

function medal(kind, size = 30) {
  const colors = { or: ['#ffd96a', '#d99a1e'], argent: ['#eef1f5', '#9aa3ad'], bronze: ['#efb07a', '#a8622f'] }[kind];
  const n = { or: 1, argent: 2, bronze: 3 }[kind];
  return svgEl(`<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="m${kind}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><circle cx="16" cy="16" r="14" fill="url(#m${kind})"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/><text x="16" y="20.5" text-anchor="middle" font-size="12" font-weight="900" fill="rgba(0,0,0,.6)" font-family="Archivo, sans-serif">${n}</text></svg>`);
}

const recordLine = (s) => `${plural(s.wins, 'victoire', 'victoires')} · ${plural(s.losses, 'défaite', 'défaites')}${s.draws ? ' · ' + plural(s.draws, 'nul', 'nuls') : ''}`;
const BY = { sub: 'par soumission', pts: 'aux points', adv: 'aux avantages', dec: 'sur décision', dq: 'par disqualification' };
const byLine = (bag) => HOW.filter(([k]) => bag[k]).map(([k]) => `${bag[k]} ${BY[k]}`).join(' · ');

// Carte compacte (onglet Compétition, profil)
export function palmaresCard() {
  const s = compStats();
  if (!s.comps) {
    return h('div', { class: 'card tint between', id: 'palmares-card' },
      h('div', { class: 'grow' }, h('h3', null, 'Mon palmarès'), h('p', { class: 'small muted', style: { marginTop: '4px' } }, 'Note tes compétitions et tes combats : victoires, défaites, médailles.')),
      h('button', { class: 'btn primary sm', id: 'add-comp', onclick: () => editComp(null) }, h('span', { html: ICON.plus, style: { display: 'contents' } }), 'Ajouter'),
    );
  }
  return h('button', { class: 'card tap palm', id: 'palmares-card', onclick: openPalmaresComp },
    donut(s, 104),
    h('div', { class: 'grow', style: { textAlign: 'left' } },
      h('h3', null, 'Mon palmarès'),
      h('div', { class: 'small', style: { margin: '4px 0 8px', fontWeight: '700' } }, recordLine(s)),
      h('div', { class: 'medals' }, ['or', 'argent', 'bronze'].map((k) => h('span', { class: 'm' }, medal(k, 24), h('b', null, s.medals[k])))),
    ),
    h('span', { class: 'chev', html: ICON.chev }),
  );
}

export function openPalmaresComp() {
  push((page) => {
    const wrap = h('div', { class: 'stack' });
    const draw = () => {
      const s = compStats();
      const list = [...comps()].sort((a, b) => b.date - a.date);
      fill(wrap,
        h('h1', { class: 'page-title', style: { marginBottom: '0' } }, 'Mon palmarès'),
        h('div', { class: 'card', style: { display: 'grid', justifyItems: 'center', gap: '12px', padding: '20px' } },
          donut(s, 170),
          h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'var(--green)' } }), `Victoires ${s.wins}`), h('span', null, h('i', { style: { background: 'var(--loss)' } }), `Défaites ${s.losses}`), s.draws ? h('span', null, h('i', { style: { background: 'var(--glass-3)' } }), `Nuls ${s.draws}`) : null),
          h('div', { class: 'medals big' }, ['or', 'argent', 'bronze'].map((k) => h('span', { class: 'm' }, medal(k, 30), h('b', null, s.medals[k])))),
        ),
        h('div', { class: 'stats two' },
          h('div', { class: 'stat' }, h('div', { class: 'v' }, s.wins), h('div', { class: 'k' }, s.wins > 1 ? 'Victoires' : 'Victoire'), byLine(s.by.w) ? h('div', { class: 'k', style: { marginTop: '4px', fontSize: '12px' } }, byLine(s.by.w)) : null),
          h('div', { class: 'stat' }, h('div', { class: 'v' }, s.losses), h('div', { class: 'k' }, s.losses > 1 ? 'Défaites' : 'Défaite'), byLine(s.by.l) ? h('div', { class: 'k', style: { marginTop: '4px', fontSize: '12px' } }, byLine(s.by.l)) : null),
        ),
        h('button', { class: 'btn primary lg block', id: 'add-comp', onclick: () => editComp(null) }, h('span', { html: ICON.plus, style: { display: 'contents' } }), 'Ajouter une compétition'),
        list.length ? h('div', { class: 'rows' }, list.map((c) => {
          const w = (c.matches || []).filter((m) => m.res === 'w').length;
          const l = (c.matches || []).filter((m) => m.res === 'l').length;
          return h('button', { class: 'rowc', onclick: () => editComp(c.id) },
            c.medal ? medal(c.medal, 34) : h('span', { class: 'nomedal' }, h('span', { html: ICON.compet, style: { display: 'contents' } })),
            h('div', { class: 'grow' },
              h('div', { class: 't ellipsis' }, c.name || 'Compétition'),
              h('div', { class: 's' }, `${day(c.date)} · ${FED_NAME[c.fed] || 'Autre'} · ${c.mode === 'nogi' ? 'No-Gi' : 'Gi'}${c.category ? ' · ' + c.category : ''}`),
            ),
            h('span', { class: 'score' + (w > l ? ' lead' : '') }, h('span', null, w), h('span', { class: 'sep' }, '–'), h('span', null, l)),
          );
        })) : null,
      );
    };
    draw();
    page.onClosed(onChangeOnce(draw, page));
    return wrap;
  }, { title: 'Mon palmarès' });
}

function onChangeOnce(fn, page) {
  let raf = 0;
  return onChange(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (page.isOpen()) fn(); }); });
}

// Ajouter / modifier une compétition et ses combats
export function editComp(id) {
  const existing = id ? comps().find((c) => c.id === id) : null;
  const me = state.me;
  const c = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: rid(8), name: '', date: Date.now(), fed: state.settings.fed || 'ibjjf', mode: state.settings.lastMode || 'gi',
    belt: me.belt, category: '', medal: null, matches: [{ res: 'w', how: 'sub', sub: null, opp: '' }],
  };
  push((page) => {
    const wrap = h('div', { class: 'stack' });
    const draw = () => {
      const d = new Date(c.date);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      fill(wrap,
        h('h1', { class: 'page-title', style: { marginBottom: '0' } }, existing ? 'Ma compétition' : 'Nouvelle compétition'),
        h('label', { class: 'field' }, h('span', null, 'Nom'), h('input', { class: 'input', id: 'comp-name', placeholder: 'Par exemple Open de Genève', value: c.name, maxlength: '60', oninput: (e) => { c.name = e.target.value; } })),
        h('div', { class: 'btns two' },
          h('label', { class: 'field' }, h('span', null, 'Date'), h('input', { class: 'input', type: 'date', value: local, onchange: (e) => { const v = new Date(e.target.value + 'T12:00').getTime(); if (v) c.date = v; } })),
          h('label', { class: 'field' }, h('span', null, 'Catégorie'), h('input', { class: 'input', placeholder: '-70 kg', value: c.category, maxlength: '30', oninput: (e) => { c.category = e.target.value; } })),
        ),
        h('div', { class: 'field' }, h('span', null, 'Fédération'), h('div', { class: 'chips' }, FEDS.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(c.fed === v), onclick: () => { c.fed = v; draw(); } }, l)))),
        h('div', { class: 'field' }, h('span', null, 'Tenue'), seg([['gi', 'Gi'], ['nogi', 'No-Gi']], c.mode, (v) => { c.mode = v; })),
        h('div', { class: 'field' }, h('span', null, 'Ceinture'), h('div', { class: 'chips' }, BELTS.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(c.belt === v), onclick: () => { c.belt = v; draw(); } }, belt(v, 0), l)))),
        h('div', { class: 'field' }, h('span', null, 'Médaille'), h('div', { class: 'chips' }, MEDALS.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(c.medal === v), onclick: () => { c.medal = v; draw(); } }, v ? medal(v, 20) : null, l)))),
        h('div', { class: 'section-head', style: { marginTop: '8px' } }, h('h3', null, `Mes combats (${c.matches.length})`)),
        c.matches.map((m, i) => matchCard(m, i)),
        h('button', { class: 'btn block', id: 'add-match', onclick: () => { c.matches.push({ res: 'w', how: 'sub', sub: null, opp: '' }); draw(); } }, h('span', { html: ICON.plus, style: { display: 'contents' } }), 'Ajouter un combat'),
        h('button', {
          class: 'btn primary lg block', id: 'save-comp', onclick: () => {
            if (!c.name.trim()) { sfx('error'); const n = document.getElementById('comp-name'); n.classList.add('err', 'shake'); n.focus(); toast('Donne un nom à la compétition.'); return; }
            c.name = c.name.trim();
            const list = comps();
            const i = list.findIndex((x) => x.id === c.id);
            const wasMedal = existing && existing.medal;
            if (i >= 0) list[i] = c; else list.push(c);
            save();
            page.close({ silent: true });
            if (c.medal && !wasMedal) { confetti(); sfx('levelup'); haptic('heavy'); } else sfx('success');
            toast(c.medal ? `Médaille d’${c.medal === 'or' ? 'or' : c.medal === 'argent' ? 'argent' : 'bronze'} enregistrée` : 'Compétition enregistrée.', { ok: true });
          },
        }, 'Enregistrer'),
        existing ? h('button', {
          class: 'btn danger block', onclick: async () => {
            if (!(await ask('Supprimer cette compétition ?', null, 'Supprimer', { danger: true }))) return;
            state.comps = comps().filter((x) => x.id !== c.id);
            save(); page.close({ silent: true }); sfx('del');
          },
        }, 'Supprimer') : null,
      );
    };
    const matchCard = (m, i) => h('div', { class: 'card stack match' },
      h('div', { class: 'between' }, h('b', null, `Combat ${i + 1}`), c.matches.length > 1 ? h('button', { class: 'link danger', onclick: () => { c.matches.splice(i, 1); draw(); } }, 'Retirer') : null),
      seg([['w', 'Victoire'], ['l', 'Défaite'], ['d', 'Nul']], m.res, (v) => { m.res = v; draw(); }, { cls: 'sm' }),
      m.res !== 'd' ? h('div', { class: 'chips' }, HOW.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(m.how === v), onclick: () => { m.how = v; if (v !== 'sub') m.sub = null; draw(); } }, l))) : null,
      m.res !== 'd' && m.how === 'sub' ? h('button', {
        class: 'rowc', style: { padding: '10px 12px' }, onclick: () => sheet((closeS) => h('div', { class: 'stack' }, h('h2', null, 'Quelle soumission ?'), subPicker(c.mode, (sid) => { m.sub = sid; closeS(); draw(); }, null, { title: null }))),
      }, h('div', { class: 'grow' }, h('div', { class: 's' }, m.res === 'w' ? 'Ta soumission' : 'Sa soumission'), h('div', { class: 't' }, m.sub ? subName(m.sub) : 'Choisir')), h('span', { class: 'chev', html: ICON.chev })) : null,
      h('input', { class: 'input', placeholder: 'Adversaire (facultatif)', value: m.opp || '', maxlength: '40', oninput: (e) => { m.opp = e.target.value; } }),
    );
    draw();
    return wrap;
  }, { title: existing ? 'Compétition' : 'Nouvelle compétition' });
}
