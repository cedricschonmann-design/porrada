// « Construis ton jeu » : le questionnaire et le moteur qui en tire une stratégie.
// Tout se calcule sur le téléphone, sans connexion.

import { norm } from '../ui.js';
import { SUB_BY_ID } from './submissions.js';
import { illegalFor, REF_BY_ID } from './referees.js';

export const QUESTIONS = [
  { id: 'tenue', q: 'Tu t’entraînes surtout…', type: 'one', opts: [
    { v: 'gi', l: 'En kimono (Gi)', w: { araignee: 1, passeur: 1, sacados: 1 } },
    { v: 'nogi', l: 'Sans kimono (No-Gi)', w: { lutteur: 1, jambes: 1, ressort: 1 } },
    { v: 'both', l: 'Les deux', w: {} },
  ] },
  { id: 'xp', q: 'Tu pratiques depuis…', type: 'one', opts: [
    { v: '0', l: 'Moins d’un an', w: { verrou: 2, rouleau: 1 } },
    { v: '1', l: '1 à 3 ans', w: {} },
    { v: '3', l: '3 à 6 ans', w: { araignee: 1, jambes: 1 } },
    { v: '6', l: 'Plus de 6 ans', w: { jambes: 1, sacados: 1 } },
  ] },
  { id: 'gabarit', q: 'Par rapport à tes partenaires, tu es plutôt…', type: 'one', opts: [
    { v: 'petit', l: 'Petit ou léger', w: { araignee: 1, ressort: 2, sacados: 2, jambes: 1 } },
    { v: 'moyen', l: 'Dans la moyenne', w: {} },
    { v: 'grand', l: 'Grand ou lourd', w: { rouleau: 3, passeur: 1, lutteur: 1 } },
  ] },
  { id: 'atouts', q: 'Tes deux meilleurs atouts physiques ?', type: 'many', max: 2, opts: [
    { v: 'souplesse', l: 'La souplesse', w: { araignee: 3, verrou: 1 } },
    { v: 'force', l: 'La force', w: { rouleau: 3, lutteur: 1 } },
    { v: 'cardio', l: 'Le cardio', w: { passeur: 2, lutteur: 1 } },
    { v: 'explosivite', l: 'L’explosivité', w: { ressort: 2, lutteur: 2, sacados: 1 } },
    { v: 'patience', l: 'La patience et la technique', w: { verrou: 1, jambes: 2, sacados: 1 } },
  ] },
  { id: 'debout', q: 'Debout, au début du combat, tu préfères…', type: 'one', opts: [
    { v: 'tirer', l: 'Tirer la garde', w: { verrou: 2, araignee: 2, ressort: 1, jambes: 2 } },
    { v: 'lutte', l: 'Lutter (double leg, single leg)', w: { lutteur: 4, rouleau: 1, passeur: 1 } },
    { v: 'judo', l: 'Projeter (judo)', w: { rouleau: 2, passeur: 2, sacados: 1 } },
    { v: 'attendre', l: 'Attendre et contrer', w: { verrou: 1, ressort: 1, lutteur: 1 } },
  ] },
  { id: 'sol', q: 'Au sol, tu te sens mieux…', type: 'one', opts: [
    { v: 'dessous', l: 'Dessous, en garde', w: { verrou: 3, araignee: 3, ressort: 3, jambes: 2 } },
    { v: 'dessus', l: 'Dessus, à passer et presser', w: { passeur: 4, rouleau: 4, lutteur: 1 } },
    { v: 'partout', l: 'Ça dépend, je m’adapte', w: { sacados: 3, ressort: 1 } },
  ] },
  { id: 'gardes', q: 'Tes gardes préférées ?', type: 'many', max: 2, opts: [
    { v: 'fermee', l: 'Garde fermée', w: { verrou: 4 } },
    { v: 'demi', l: 'Demi-garde', w: { ressort: 3, rouleau: 1 } },
    { v: 'papillon', l: 'Garde papillon', w: { ressort: 4 } },
    { v: 'dlr', l: 'De la Riva, berimbolo', w: { araignee: 2, sacados: 3 } },
    { v: 'araignee', l: 'Araignée, lasso', w: { araignee: 4 } },
    { v: 'slx', l: 'Single leg X, X-guard', w: { jambes: 4 } },
    { v: 'aucune', l: 'Je n’en ai pas encore', w: { verrou: 1 } },
  ] },
  { id: 'passages', q: 'Tes passages de garde préférés ?', type: 'many', max: 2, opts: [
    { v: 'toreando', l: 'Toréador et passages debout', w: { passeur: 4 } },
    { v: 'pression', l: 'Pression (smash, over-under)', w: { rouleau: 4 } },
    { v: 'kneecut', l: 'Knee cut', w: { passeur: 2, rouleau: 2 } },
    { v: 'legdrag', l: 'Leg drag', w: { passeur: 3, sacados: 1 } },
    { v: 'aucun', l: 'Je n’en ai pas encore', w: {} },
  ] },
  { id: 'subs', q: 'Tes soumissions préférées ?', type: 'many', max: 3, opts: [
    { v: 'rnc', l: 'Étranglement arrière', w: { sacados: 3 }, sub: 'rnc' },
    { v: 'triangle', l: 'Triangle', w: { verrou: 2, araignee: 2 }, sub: 'triangle' },
    { v: 'armbar', l: 'Clé de bras', w: { verrou: 2, passeur: 1 }, sub: 'armbar' },
    { v: 'kimura', l: 'Kimura', w: { rouleau: 1, ressort: 1, verrou: 1 }, sub: 'kimura' },
    { v: 'guillotine', l: 'Guillotine', w: { lutteur: 3 }, sub: 'guillotine' },
    { v: 'col', l: 'Étranglements au col', w: { sacados: 1, passeur: 1 }, sub: 'cross-collar' },
    { v: 'jambes', l: 'Clés de jambe', w: { jambes: 4 }, sub: 'ankle' },
    { v: 'darce', l: "D'Arce, anaconda", w: { lutteur: 2, rouleau: 1 }, sub: 'darce' },
  ] },
  { id: 'difficultes', q: 'Ce qui te pose le plus de problèmes ?', type: 'many', max: 2, opts: [
    { v: 'montee', l: 'Sortir de la montée ou du contrôle latéral', w: {} },
    { v: 'garde', l: 'Garder ma garde', w: {} },
    { v: 'passer', l: 'Passer la garde', w: {} },
    { v: 'finir', l: 'Finir mes soumissions', w: {} },
    { v: 'debout', l: 'Le debout', w: {} },
    { v: 'cardio', l: 'Le cardio', w: {} },
  ] },
  { id: 'objectif', q: 'Ton objectif principal ?', type: 'one', opts: [
    { v: 'compet', l: 'Gagner en compétition', w: {} },
    { v: 'technique', l: 'Progresser techniquement', w: {} },
    { v: 'selfdef', l: 'Me défendre', w: { rouleau: 1, sacados: 1 } },
    { v: 'plaisir', l: 'La forme et le plaisir', w: {} },
  ] },
  { id: 'regles', q: 'Tu combats sous quel règlement ?', type: 'one', opts: [
    { v: 'ibjjf', l: 'IBJJF', w: { verrou: 1, passeur: 1 } },
    { v: 'adcc', l: 'ADCC', w: { lutteur: 2, jambes: 2 } },
    { v: 'ajp', l: 'AJP', w: { passeur: 1 } },
    { v: 'naga', l: 'NAGA', w: { jambes: 1 } },
    { v: 'gi', l: 'Grappling Industries', w: {} },
    { v: 'aucun', l: 'Aucun en particulier', w: {} },
  ] },
  { id: 'rythme', q: 'Combien d’entraînements par semaine ?', type: 'one', opts: [
    { v: '1', l: '1 ou 2', w: {} },
    { v: '3', l: '3 ou 4', w: {} },
    { v: '5', l: '5 et plus', w: {} },
  ] },
];

// Mots repérés dans les réponses « Autre »
const FREE_WORDS = [
  [['berimbolo', 'crab ride', 'dos', 'back', 'seatbelt'], { sacados: 2 }],
  [['lasso', 'spider', 'araignee', 'worm', 'lapel', 'revers'], { araignee: 2 }],
  [['heel', 'talon', 'ashi', 'saddle', '411', 'leg lock', 'cheville', 'jambe'], { jambes: 2 }],
  [['lutte', 'wrestling', 'double', 'single', 'snap'], { lutteur: 2 }],
  [['judo', 'projection', 'osoto', 'uchi'], { rouleau: 1, passeur: 1 }],
  [['pression', 'pressure', 'smash', 'lourd'], { rouleau: 2 }],
  [['butterfly', 'papillon', 'demi', 'half', 'knee shield', 'z guard'], { ressort: 2 }],
  [['garde fermee', 'closed guard', 'rubber', 'high guard'], { verrou: 2 }],
  [['toreando', 'torreando', 'leg drag', 'passage', 'pass'], { passeur: 2 }],
];

const ARCH = {
  verrou: {
    name: 'Le Verrou',
    pitch: 'Tu attires ton adversaire dans ta garde fermée et tu l’enfermes dans une chaîne d’attaques.',
    stand: 'Tire la garde dès que tu tiens un bon contrôle (col et manche en Gi, nuque et poignet en No-Gi), et ferme-la tout de suite.',
    plan: ['Ferme ta garde et casse sa posture : tire sa tête vers toi, contrôle un bras.', 'Sors ta hanche du côté du bras contrôlé pour prendre l’angle.', 'Enchaîne : clé de bras, puis triangle, puis omoplata selon sa défense.', 'S’il se redresse : renversement en ciseau ou hip bump.'],
    fin: ['armbar', 'triangle', 'omoplata', 'kimura', 'cross-collar'],
    start: 'garde fermée',
  },
  araignee: {
    name: 'L’Araignée',
    pitch: 'Tu tiens ton adversaire à distance avec tes jambes et tu le déséquilibres jusqu’à la faute.',
    stand: 'Tire la garde en t’asseyant, et pose tout de suite un pied sur sa hanche ou son biceps.',
    plan: ['Contrôle ses deux bras d’abord (manches en Gi, poignets en No-Gi).', 'Installe ta garde araignée ou lasso, un pied sur le biceps.', 'Tire-le en avant pour le déséquilibrer : renversement ou triangle.', 'S’il recule, passe en De la Riva et va chercher son dos.'],
    planNogi: ['Contrôle ses poignets et colle un tibia contre le sien.', 'Installe ta De la Riva ou ta garde en K.', 'Fais-le tomber vers l’avant pour le renverser, ou entre sur ses jambes.', 'S’il recule, enchaîne vers son dos ou un triangle.'],
    fin: ['triangle', 'omoplata', 'armbar', 'bow-arrow', 'rnc'],
    start: 'garde araignée',
  },
  ressort: {
    name: 'Le Ressort',
    pitch: 'Tu joues près de lui, sous lui, et tu exploses au bon moment pour renverser ou prendre le dos.',
    stand: 'Garde le contact : tire en garde papillon ou en demi-garde, sans laisser d’espace.',
    plan: ['Prends l’underhook (ton bras sous son aisselle) en demi-garde ou en papillon.', 'Tête collée à lui, viens sur ton côté.', 'Renverse avec le crochet papillon, ou fais un old school sweep.', 'S’il se défend en reculant, glisse derrière lui et prends son dos.'],
    fin: ['rnc', 'guillotine', 'kimura', 'armbar', 'darce'],
    start: 'demi-garde avec underhook',
  },
  jambes: {
    name: 'Le Chasseur de jambes',
    pitch: 'Pendant que les autres pensent passages et montées, toi tu vas chercher les jambes.',
    stand: 'Tire la garde en t’asseyant près de ses pieds, ou entre directement en single leg X.',
    plan: ['Assieds-toi et colle tes pieds à ses hanches.', 'Entre en single leg X ou en X-guard.', 'Renverse-le, ou garde la jambe et casse son équilibre.', 'Finis par la clé de cheville, ou monte au-dessus s’il se défend.'],
    fin: ['ankle', 'heel-in', 'heel-out', 'kneebar', 'toehold'],
    start: 'single leg X',
  },
  passeur: {
    name: 'Le Passeur',
    pitch: 'Tu bouges autour de sa garde plus vite qu’il ne peut la reconstruire.',
    stand: 'Amène-le au sol, ou laisse-le tirer la garde et reste debout pour passer.',
    plan: ['Contrôle ses genoux ou ses chevilles avant de bouger.', 'Toréador d’un côté, leg drag ou knee cut de l’autre.', 'Tiens le contrôle latéral 3 secondes, puis genou sur le ventre.', 'Monte en montée ou prends le dos quand il se tourne.'],
    fin: ['armbar', 'cross-collar', 'arm-triangle', 'rnc', 'americana'],
    start: 'debout face à sa garde ouverte',
  },
  rouleau: {
    name: 'Le Rouleau compresseur',
    pitch: 'Tu avances lentement et tu écrases. Chaque centimètre gagné, tu ne le rends pas.',
    stand: 'Va au corps-à-corps, amène-le au sol, puis colle-toi à lui.',
    plan: ['Écrase ses jambes (smash) ou passe en over-under.', 'Tête basse, épaule sur lui : il porte ton poids.', 'Installe le 100 kg et ne laisse aucun espace.', 'Isole un bras ou la tête : americana, kimura ou arm triangle.'],
    fin: ['arm-triangle', 'americana', 'kimura', 'ezekiel', 'north-south'],
    start: 'contrôle latéral',
  },
  lutteur: {
    name: 'Le Lutteur',
    pitch: 'Tu gagnes le combat debout, puis tu punis chaque tentative de se relever.',
    stand: 'Attaque en premier : double leg ou single leg. S’il baisse la tête, snap down.',
    plan: ['Fais-le baisser la tête avec un snap down.', 'Contrôle-le par la nuque (front headlock).', 'Guillotine ou D’Arce s’il pousse, son dos s’il tourne.', 'S’il tire la garde, reste en appui et passe tout de suite.'],
    fin: ['guillotine', 'darce', 'anaconda', 'rnc', 'arm-triangle'],
    start: 'front headlock',
  },
  sacados: {
    name: 'Le Sac à dos',
    pitch: 'Toutes les routes mènent à son dos. Une fois accroché, tu ne lâches plus.',
    stand: 'Cherche l’arm drag : tire son bras et passe dans son dos dès le debout.',
    plan: ['Crée un angle : arm drag, berimbolo ou crab ride.', 'Prends la ceinture de sécurité (un bras dessus, un bras dessous).', 'Mets tes crochets, ou un triangle de corps.', 'Étranglement arrière en No-Gi, arc et flèche en Gi.'],
    fin: ['rnc', 'bow-arrow', 'gi-choke-back', 'armbar', 'triangle'],
    start: 'son dos, avec la ceinture de sécurité',
  },
};

const DEFENSE = {
  montee: { t: 'Sortir de la montée et du contrôle latéral', b: ['Place tes avant-bras en cadre avant de bouger, jamais les bras tendus.', 'Pont puis crevette : 3 séries de 10 au début de chaque cours.', 'Objectif : récupérer ta demi-garde avant de chercher à te relever.'] },
  garde: { t: 'Garder ta garde', b: ['Garde tes genoux entre lui et toi.', 'Contrôle ses mains ou ses manches en premier.', 'Dès qu’il dépasse tes genoux : crevette et remets un tibia devant lui.'] },
  passer: { t: 'Passer la garde', b: ['Contrôle ses hanches ou ses genoux avant de bouger.', 'Un passage principal, plus un second qui part de la même prise.', 'Tiens 3 secondes en contrôle latéral avant d’attaquer.'] },
  finir: { t: 'Finir tes soumissions', b: ['La position avant la soumission : isole d’abord le bras ou la nuque.', 'Répète ta finition 20 fois par séance, des deux côtés.', 'Si elle rate, garde ta position au lieu de tout lâcher.'] },
  debout: { t: 'Le debout', b: ['Une amenée au sol simple et une façon sûre de tirer la garde.', 'Travaille le snap down et le contrôle de la nuque.', 'Commence chaque sparring par 2 minutes debout.'] },
  cardio: { t: 'Le cardio', b: ['Respire dans les positions stables, ne retiens pas ton souffle.', 'Rounds de 6 minutes à rythme moyen plutôt que 3 à fond.', 'Lâche une prise qui ne marche pas au lieu de forcer.'] },
};

function score(answers) {
  const s = Object.fromEntries(Object.keys(ARCH).map((k) => [k, 0]));
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!a) continue;
    const vals = Array.isArray(a.v) ? a.v : [a.v];
    for (const v of vals) {
      const o = q.opts.find((x) => x.v === v);
      if (o) for (const [k, n] of Object.entries(o.w)) s[k] += n;
    }
    if (a.other) {
      const t = norm(a.other);
      for (const [words, w] of FREE_WORDS) {
        if (words.some((x) => t.includes(x))) for (const [k, n] of Object.entries(w)) s[k] += n;
      }
    }
  }
  return Object.entries(s).sort((a, b) => b[1] - a[1]);
}

const val = (answers, id) => (answers[id] ? answers[id].v : null);
const has = (answers, id, v) => {
  const a = val(answers, id);
  return Array.isArray(a) ? a.includes(v) : a === v;
};

export function buildPlan(answers, profile) {
  const ranked = score(answers);
  const mainId = ranked[0][0];
  const secondId = ranked.find(([k]) => k !== mainId)[0];
  const A = ARCH[mainId];
  const B = ARCH[secondId];
  const mode = val(answers, 'tenue') === 'nogi' ? 'nogi' : 'gi';
  const fed = REF_BY_ID[val(answers, 'regles')] ? val(answers, 'regles') : null;

  // Debout
  const stand = [A.stand];
  if (fed === 'adcc' && ['verrou', 'araignee', 'jambes', 'ressort'].includes(mainId)) {
    stand.push('Attention en ADCC : tirer la garde pendant le temps de points te coûte un point négatif. Fais-le en première moitié, ou passe par une amenée au sol.');
  }
  if (fed === 'ibjjf' && profile.belt === 'blanche' && mainId === 'verrou') {
    stand.push('En IBJJF, sauter en garde fermée t’est interdit à ta ceinture : assieds-toi d’abord.');
  }
  if (fed === 'naga' && mode === 'nogi') stand.push('En NAGA No-Gi, même une tentative de soumission rapporte des points : attaque souvent.');
  if (fed === 'gi') stand.push('Pas d’avantages en Grappling Industries : vise des points clairs.');
  if (fed === 'ajp') stand.push('En AJP, à égalité, c’est le dernier à avoir marqué qui gagne : garde de l’énergie pour la fin.');
  if (val(answers, 'gabarit') === 'petit') stand.push('Plus petit que tes partenaires : cherche les angles, pas le face-à-face.');
  if (val(answers, 'gabarit') === 'grand') stand.push('Plus lourd que tes partenaires : ton poids est une arme, joue dessus avant de jouer vite.');

  // Finitions
  const favs = [];
  const q = QUESTIONS.find((x) => x.id === 'subs');
  const subAns = answers.subs && answers.subs.v ? answers.subs.v : [];
  for (const v of subAns) {
    const o = q.opts.find((x) => x.v === v);
    if (o && o.sub) favs.push(o.sub);
  }
  const pool = [...new Set([...favs.filter((id) => A.fin.includes(id)), ...A.fin, ...favs])];
  const finishes = [];
  for (const id of pool) {
    const sub = SUB_BY_ID[id];
    if (!sub) continue;
    if (mode === 'nogi' && sub.kind === 'kimono') continue;
    const why = fed ? illegalFor(fed, sub, profile, mode) : null;
    finishes.push({ id, name: sub.name, fav: favs.includes(id), warn: why });
    if (finishes.filter((f) => !f.warn).length >= 3) break;
  }

  // Défense prioritaire
  const diffs = (answers.difficultes && answers.difficultes.v) || [];
  const defense = (diffs.length ? diffs : ['montee']).slice(0, 2).map((d) => DEFENSE[d]).filter(Boolean);

  // Programme de 4 semaines
  const freq = val(answers, 'rythme') || '3';
  const reps = freq === '1' ? 10 : freq === '5' ? 25 : 15;
  const plan = mode === 'nogi' && A.planNogi ? A.planNogi : A.plan;
  const ok = finishes.filter((f) => !f.warn);
  const weeks = [
    { w: 'Semaine 1', t: `L’entrée. ${plan[0]} ${reps} répétitions de chaque côté à chaque entraînement.` },
    { w: 'Semaine 2', t: `La suite. ${plan[1]} Puis enchaîne : ${plan[2].charAt(0).toLowerCase() + plan[2].slice(1)}` },
    { w: 'Semaine 3', t: `Les finitions. ${ok.slice(0, 2).map((f) => f.name).join(' et ') || 'Tes soumissions'} : ${reps} fois par séance, en lent puis en vitesse.` },
    { w: 'Semaine 4', t: `Sparring de situation. 3 rounds de 3 minutes en partant de : ${A.start}. Puis 2 rounds dans ta faiblesse : ${defense[0].t.toLowerCase()}.` },
  ];

  const goal = val(answers, 'objectif');
  const goalLine = {
    compet: fed ? `Objectif compétition en ${REF_BY_ID[fed].short} : demande à l’arbitre ${REF_BY_ID[fed].short}, dans l’onglet Compét., ce qui t’est interdit.` : 'Objectif compétition : choisis ton règlement et vérifie ce qui t’est interdit dans l’onglet Compét.',
    technique: 'Objectif technique : note dans ton journal ce qui marche et ce qui rate, après chaque cours.',
    selfdef: 'Objectif défense : travaille aussi le debout et le contrôle du dos, ce sont les positions qui comptent dans la rue.',
    plaisir: 'Objectif plaisir : garde ce plan comme fil rouge, sans pression. Le jeu viendra en jouant.',
  }[goal];

  const notes = QUESTIONS.map((x) => answers[x.id] && answers[x.id].other ? { q: x.q, t: answers[x.id].other } : null).filter(Boolean);

  return {
    at: Date.now(),
    mode,
    fed,
    style: { id: mainId, name: A.name, pitch: A.pitch },
    stand,
    planA: plan,
    finishes: finishes.slice(0, 5),
    planB: { name: B.name, pitch: B.pitch, steps: (mode === 'nogi' && B.planNogi ? B.planNogi : B.plan).slice(0, 3) },
    defense,
    weeks,
    goal: goalLine,
    notes,
    answers,
  };
}
