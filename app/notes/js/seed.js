// Contenu de départ (neutre) : des carnets vides et une note qui montre tout ce qu'on peut faire.
// Tes vraies notes ne sont pas dans le code : elles arrivent par un code de transfert (Réglages).

const pic = (i, c) => `<span class="pic" data-i="${i}" data-c="${c}"></span>`;

export function seed(rid) {
  const B = { planning: rid(), sport: rid(), etudes: rid(), finances: rid(), objectifs: rid() };
  const now = Date.now();
  const b = (t, extra = {}) => ({ id: rid(), t, ...extra });
  const inDays = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  return {
    books: [
      { id: B.planning, name: 'Planning', icon: 'calendar', color: 'violet' },
      { id: B.sport, name: 'Sport', icon: 'dumbbell', color: 'orange' },
      { id: B.etudes, name: 'Études', icon: 'grad', color: 'red' },
      { id: B.finances, name: 'Finances', icon: 'wallet', color: 'green' },
      { id: B.objectifs, name: 'Objectifs', icon: 'target', color: 'yellow' },
    ],
    notes: [{
      id: rid(), book: B.planning, title: 'Bienvenue', icon: 'sparkles', color: 'violet', pinned: true, createdAt: now, updatedAt: now,
      blocks: [
        b('call', { h: 'Touche un texte pour l’écrire. La barre en bas te donne le <b>gras</b>, les <span class="c-orange">couleurs</span>, les pictos et les pastilles.', c: 'violet', i: 'info' }),
        b('h2', { h: `${pic('list-check', 'green')} Des cases` }),
        b('todo', { h: 'Une chose à faire', done: true }),
        b('todo', { h: 'Un objectif avec une date', done: false, date: inDays(30), sub: 'Une précision en dessous' }),
        b('h2', { h: `${pic('arrow-right', 'blue')} Des puces` }),
        b('bul', { h: 'Une flèche', m: 'arrow-right', s: { c: 'blue' } }),
        b('bul', { h: 'Une étoile <span class="pill" data-c="pink">Important</span>', m: 'star', s: { c: 'yellow' } }),
        b('p', { h: 'Une autre police, en plus grand.', s: { f: 'hand', z: 'l' } }),
        b('div'),
        b('p', { h: 'Le « + » ajoute aussi des outils : semaine, séance de sport avec tes charges, suivi du jour, budget.', s: { c: 'muted' } }),
      ],
    }],
  };
}
