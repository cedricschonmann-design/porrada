// Contenu de départ (neutre) : des carnets vides et une note qui montre comment tout marche.
// Tes vraies notes ne sont pas dans le code : elles arrivent par un code de transfert (Réglages).

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
      id: rid(), book: B.planning, title: 'Bienvenue', icon: 'sparkles', color: 'blue', pinned: true, createdAt: now, updatedAt: now,
      blocks: [
        b('call', { h: 'Touche <b>Modifier</b> en haut pour écrire. Chaque bloc a une poignée pour le déplacer, changer son style ou le supprimer. <b>OK</b> pour finir.', c: 'blue', i: 'info' }),
        b('h2', { h: 'Une fenêtre' }),
        b('p', { h: 'Un titre de fenêtre ouvre un cadre : tout ce qui suit est dedans. Touche le titre pour replier la fenêtre.' }),
        b('todo', { h: 'Une chose faite', done: true }),
        b('todo', { h: 'Un objectif avec une date', done: false, date: inDays(30), sub: 'Une précision en dessous' }),
        b('bul', { h: 'Une flèche <span class="pill" data-c="pink">Important</span>', m: 'arrow-right' }),
        b('h2', { h: 'Un tableau' }),
        b('table', { cols: ['Jour', 'Séance', 'Durée'], rows: [['Lundi', 'Force', '60 min'], ['Mercredi', 'Cardio', '40 min']], foot: false }),
      ],
    }],
  };
}
