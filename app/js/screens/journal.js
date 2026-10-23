// Journal privé : séances, soumissions placées et subies, et le mode cours (entre les rounds).

import { state, save, rid } from '../store.js';
import { h, ICON, sheet, full, toast, seg, hhmmss, mmss, day, hm, plural, keepAwake, unlockAudio, beep, buzzer, ask, SPEED, norm, fill } from '../ui.js';
import { subName, SUB_BY_ID } from '../data/submissions.js';
import { header } from '../app.js';
import { subPicker } from './combat.js';

let courseView = null;

function totals() {
  const t = { given: 0, received: 0, sessions: state.journal.length, minutes: 0, giv: {}, rec: {} };
  for (const s of state.journal) {
    t.minutes += s.minutes || 0;
    for (const g of s.given || []) { t.given++; if (g.sub) t.giv[g.sub] = (t.giv[g.sub] || 0) + 1; }
    for (const r of s.received || []) { t.received++; if (r.sub) t.rec[r.sub] = (t.rec[r.sub] || 0) + 1; }
  }
  return t;
}
const top = (obj, n = 3) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

export function render() {
  const t = totals();
  const sessions = [...state.journal].sort((a, b) => b.start - a.start);
  return h('div', null,
    header('Journal'),
    state.course
      ? h('button', { class: 'btn primary block big', onclick: openCourse }, 'Reprendre le cours en cours')
      : h('button', { class: 'btn primary block big', id: 'start-course', onclick: startCourse }, h('span', { style: { display: 'contents' }, html: ICON.play }), 'Commencer le cours'),
    h('p', { class: 'small muted', style: { margin: '6px 4px 18px' } }, 'Pendant le cours, deux gros boutons te laissent noter tes soumissions entre deux rounds. Privé : rien ne quitte ton téléphone.'),
    h('div', { class: 'statgrid' },
      h('div', { class: 'stat' }, h('div', { class: 'v' }, t.given), h('div', { class: 'k' }, 'Soumissions placées')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, t.received), h('div', { class: 'k' }, 'Soumissions subies')),
      h('div', { class: 'stat' }, h('div', { class: 'v' }, Math.round(t.minutes / 60)), h('div', { class: 'k' }, 'Heures de tapis')),
    ),
    (top(t.giv).length || top(t.rec).length) ? h('div', { class: 'card', style: { marginTop: '12px' } },
      top(t.giv).length ? h('div', null, h('b', null, 'Tes soumissions préférées'), h('div', { class: 'chips', style: { marginTop: '8px' } }, top(t.giv).map(([id, n]) => h('span', { class: 'chip', style: { pointerEvents: 'none' } }, `${subName(id)} × ${n}`)))) : null,
      top(t.rec).length ? h('div', { style: { marginTop: '14px' } }, h('b', null, 'Ce qui te piège le plus'), h('div', { class: 'chips', style: { marginTop: '8px' } }, top(t.rec).map(([id, n]) => h('span', { class: 'chip', style: { pointerEvents: 'none' } }, `${subName(id)} × ${n}`)))) : null,
    ) : null,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px' } },
      h('h3', null, 'Tes séances'),
      h('button', { class: 'btn small', onclick: () => editSession(null) }, h('span', { style: { display: 'contents' }, html: ICON.plus }), 'Ajouter'),
    ),
    sessions.length ? h('div', { class: 'list' }, sessions.map((s) => h('button', { class: 'row', onclick: () => editSession(s.id) },
      h('div', { class: 'grow' },
        h('div', { class: 'title' }, `${day(s.start)}, ${s.mode === 'nogi' ? 'No-Gi' : 'Gi'}`),
        h('div', { class: 'sub' }, `${plural(s.minutes || 0, 'minute', 'minutes')} · ${(s.given || []).length} placée${(s.given || []).length > 1 ? 's' : ''}, ${(s.received || []).length} subie${(s.received || []).length > 1 ? 's' : ''}`),
      ),
      h('span', { class: 'chev', html: ICON.chev }),
    ))) : h('div', { class: 'empty' }, h('p', null, 'Aucune séance pour l’instant. Lance « Commencer le cours » en arrivant sur le tapis.')),
  );
}

// ---------- Mode cours ----------
function startCourse() {
  let mode = state.settings.lastMode || 'gi';
  sheet((close) => h('div', { class: 'stack' },
    h('h2', null, 'Commencer le cours'),
    h('div', { class: 'field' }, h('span', null, 'Aujourd’hui c’est'), seg([['gi', 'Gi (kimono)'], ['nogi', 'No-Gi']], mode, (v) => { mode = v; })),
    h('button', {
      class: 'btn primary block big', id: 'go-course', onclick: () => {
        unlockAudio();
        state.course = { id: rid(8), start: Date.now(), mode, given: [], received: [], round: null };
        save();
        close();
        openCourse();
      },
    }, 'C’est parti'),
  ));
}

export function resume() { if (state.course) openCourse(); }

function openCourse() {
  if (courseView) return;
  keepAwake(true);
  let timer = null;
  courseView = full((close, el) => {
    const c = () => state.course;
    const wrap = h('div', { class: 'inner stack', id: 'course' });
    const elapsed = h('div', { class: 'num elapsed' }, '0:00');
    const roundBox = h('div');
    const draw = () => {
      if (!c()) return;
      fill(wrap, 
        h('div', { class: 'bar-top' },
          h('h2', { class: 'tape small' }, `Cours ${c().mode === 'nogi' ? 'No-Gi' : 'Gi'}`),
          h('button', { class: 'btn small', onclick: () => { close(); } }, 'Réduire'),
        ),
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } }, h('span', { class: 'muted' }, 'Sur le tapis depuis'), elapsed),
        h('div', { class: 'bigtwo' },
          h('button', { class: 'hit give', id: 'hit-give', onclick: () => hit('given') }, h('span', { class: 'n' }, c().given.length), 'J’ai soumis'),
          h('button', { class: 'hit take', id: 'hit-take', onclick: () => hit('received') }, h('span', { class: 'n' }, c().received.length), 'J’ai été soumis'),
        ),
        roundBox,
        lastLine(),
        h('button', { class: 'btn dark block', id: 'end-course', onclick: endCourse }, h('span', { style: { display: 'contents' }, html: ICON.stop }), 'Terminer le cours'),
      );
      drawRound();
    };
    const lastLine = () => {
      const all = [...c().given.map((x) => ({ ...x, k: 'given' })), ...c().received.map((x) => ({ ...x, k: 'received' }))].sort((a, b) => b.at - a.at);
      if (!all.length) return h('p', { class: 'small muted', style: { textAlign: 'center' } }, 'Touche un bouton après chaque soumission. Tu choisis laquelle, ou tu passes.');
      const l = all[0];
      return h('div', { class: 'card', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px' } },
        h('div', null, h('div', { class: 'small muted' }, `Dernière, à ${hm(l.at)}`), h('b', null, `${l.k === 'given' ? 'Placée' : 'Subie'} : ${l.sub ? subName(l.sub) : 'sans précision'}`)),
        h('button', {
          class: 'btn small', onclick: () => {
            const arr = c()[l.k];
            const i = arr.findIndex((x) => x.at === l.at);
            if (i >= 0) arr.splice(i, 1);
            save(); draw();
          },
        }, 'Annuler'),
      );
    };
    const hit = (k) => {
      const mode = c().mode;
      sheet((closeS) => {
        const recent = Object.entries([...state.journal.flatMap((s) => s[k] || []), ...c()[k]].reduce((m, x) => { if (x.sub) m[x.sub] = (m[x.sub] || 0) + 1; return m; }, {}))
          .sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => SUB_BY_ID[id] && !(mode === 'nogi' && SUB_BY_ID[id].kind === 'kimono')).slice(0, 6);
        const add = (sub) => { c()[k].push({ sub: sub || null, at: Date.now() }); save(); closeS(); draw(); beep(k === 'given' ? 880 : 440, 0.08, 0.3); };
        return h('div', { class: 'stack' },
          h('h2', null, k === 'given' ? 'Tu as soumis avec…' : 'Tu as été soumis par…'),
          recent.length ? h('div', { class: 'chips' }, recent.map((id) => h('button', { class: 'chip', onclick: () => add(id) }, subName(id)))) : null,
          subPicker(mode, (id) => add(id), () => add(null), { backLabel: 'Passer (sans préciser)', title: null }),
        );
      });
    };
    // Petit chrono de round
    const drawRound = () => {
      const r = c().round;
      if (!r) {
        fill(roundBox, h('div', { class: 'card' },
          h('b', null, 'Chrono de round'),
          h('div', { class: 'chips', style: { marginTop: '10px' } }, [3, 4, 5, 6, 7, 8, 10].map((m) => h('button', {
            class: 'chip', onclick: () => { unlockAudio(); c().round = { start: Date.now(), min: m }; save(); drawRound(); },
          }, `${m} min`))),
        ));
      } else {
        fill(roundBox, h('div', { class: 'card accent', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
          h('div', null, h('div', { class: 'small muted' }, `Round de ${r.min} min`), h('div', { class: 'num', id: 'round-left', style: { fontSize: '40px', lineHeight: '1' } }, '')),
          h('button', { class: 'btn small', onclick: () => { c().round = null; save(); drawRound(); } }, 'Stop'),
        ));
      }
    };
    const tickFn = () => {
      if (!c()) return;
      elapsed.textContent = hhmmss(Date.now() - c().start);
      const r = c().round;
      if (r) {
        const left = r.start + (r.min * 60000) / SPEED - Date.now();
        const n = document.getElementById('round-left');
        if (n) n.textContent = mmss(left * SPEED);
        if (left <= 0) { buzzer(); c().round = null; save(); drawRound(); toast('Fin du round : note tes soumissions.'); }
      }
    };
    const endCourse = async () => {
      const cc = c();
      if (!(await ask('Terminer le cours ?', `${plural(cc.given.length, 'soumission placée', 'soumissions placées')}, ${plural(cc.received.length, 'subie', 'subies')}.`, 'Terminer'))) return;
      const minutes = Math.max(1, Math.round((Date.now() - cc.start) / 60000));
      state.journal.push({ id: cc.id, start: cc.start, minutes, mode: cc.mode, given: cc.given, received: cc.received, note: '' });
      state.course = null;
      save();
      close();
      toast('Séance enregistrée dans ton journal.');
    };
    draw();
    tickFn();
    timer = setInterval(tickFn, 250);
    return wrap;
  }, {
    onClose: () => { clearInterval(timer); courseView = null; keepAwake(false); },
  });
}

// ---------- Ajouter / modifier une séance ----------
function editSession(id) {
  const existing = id ? state.journal.find((s) => s.id === id) : null;
  const s = existing ? JSON.parse(JSON.stringify(existing)) : { id: rid(8), start: Date.now(), minutes: 90, mode: state.settings.lastMode || 'gi', given: [], received: [], note: '' };
  full((close) => {
    const wrap = h('div', { class: 'inner stack' });
    const draw = () => {
      const d = new Date(s.start);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      fill(wrap, 
        h('div', { class: 'bar-top' },
          h('button', { class: 'iconbtn', 'aria-label': 'Fermer', onclick: close, html: ICON.close }),
          h('h2', { class: 'tape small' }, existing ? 'La séance' : 'Nouvelle séance'),
          h('span', { style: { width: '48px' } }),
        ),
        h('label', { class: 'field' }, h('span', null, 'Date et heure'), h('input', { class: 'input', type: 'datetime-local', value: local, onchange: (e) => { const v = new Date(e.target.value).getTime(); if (v) s.start = v; } })),
        h('label', { class: 'field' }, h('span', null, 'Durée (minutes)'), h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: '1', max: '600', value: s.minutes, onchange: (e) => { s.minutes = Math.max(1, Number(e.target.value) || 1); } })),
        h('div', { class: 'field' }, h('span', null, 'Tenue'), seg([['gi', 'Gi'], ['nogi', 'No-Gi']], s.mode, (v) => { s.mode = v; })),
        subsBlock('Soumissions placées', 'given'),
        subsBlock('Soumissions subies', 'received'),
        h('label', { class: 'field' }, h('span', null, 'Note'), h('textarea', { class: 'input', placeholder: 'Ce qui a marché, ce qui a raté…', oninput: (e) => { s.note = e.target.value; } }, s.note || '')),
        h('button', {
          class: 'btn primary block big', onclick: () => {
            if (existing) Object.assign(existing, s); else state.journal.push(s);
            save(); close(); toast('Séance enregistrée.');
          },
        }, 'Enregistrer'),
        existing ? h('button', {
          class: 'btn danger block', onclick: async () => {
            if (!(await ask('Supprimer cette séance ?', null, 'Supprimer', { danger: true }))) return;
            state.journal = state.journal.filter((x) => x.id !== id);
            save(); close();
          },
        }, 'Supprimer la séance') : null,
      );
    };
    const subsBlock = (label, k) => h('div', { class: 'field' },
      h('span', null, `${label} (${s[k].length})`),
      h('div', { class: 'chips' },
        s[k].map((x, i) => h('button', { class: 'chip', 'aria-label': 'Retirer', onclick: () => { s[k].splice(i, 1); draw(); } }, (x.sub ? subName(x.sub) : 'Sans précision') + '  ✕')),
        h('button', {
          class: 'chip', 'aria-pressed': 'true', onclick: () => sheet((closeS) => subPicker(s.mode, (sid) => { s[k].push({ sub: sid, at: s.start }); closeS(); draw(); }, () => { s[k].push({ sub: null, at: s.start }); closeS(); draw(); }, { backLabel: 'Sans préciser' })),
        }, '+ Ajouter'),
      ),
    );
    draw();
    return wrap;
  });
}
