// « Construis ton jeu » : le questionnaire (avec des questions qui dépendent des réponses)
// et le moteur qui en tire une stratégie. Tout se calcule sur le téléphone, sans connexion.

import { norm } from '../ui.js';
import { SUB_BY_ID } from './submissions.js';
import { illegalFor, REF_BY_ID } from './referees.js';

const v = (a, id) => (a[id] ? a[id].v : null);
const has = (a, id, x) => { const val = v(a, id); return Array.isArray(val) ? val.includes(x) : val === x; };
const gi = (a) => v(a, 'tenue') !== 'nogi';
const nogi = (a) => v(a, 'tenue') !== 'gi';

export const QUESTIONS = [
  { id: 'tenue', q: 'Tu t’entraînes surtout…', type: 'one', opts: [
    { v: 'gi', em: '🥋', l: 'En kimono (Gi)', w: { araignee: 1, passeur: 1, sacados: 1 } },
    { v: 'nogi', em: '🩳', l: 'Sans kimono (No-Gi)', w: { lutteur: 1, jambes: 2, ressort: 1 } },
    { v: 'both', em: '🔁', l: 'Les deux', w: {} },
  ] },
  { id: 'xp', q: 'Tu pratiques depuis…', type: 'one', opts: [
    { v: '0', em: '🌱', l: 'Moins d’un an', w: { verrou: 2, rouleau: 1 } },
    { v: '1', em: '🌿', l: '1 à 3 ans', w: {} },
    { v: '3', em: '🌳', l: '3 à 6 ans', w: { araignee: 1, jambes: 1 } },
    { v: '6', em: '🏔️', l: 'Plus de 6 ans', w: { jambes: 1, sacados: 1 } },
  ] },
  { id: 'morpho', q: 'Ta morphologie, comparée à tes partenaires ?', type: 'one', opts: [
    { v: 'petit', em: '🐜', l: 'Petit et léger', w: { ressort: 2, sacados: 2, jambes: 1 } },
    { v: 'long', em: '🦒', l: 'Grand et fin', d: 'Longs bras, longues jambes', w: { verrou: 2, araignee: 3 } },
    { v: 'trapu', em: '🦬', l: 'Trapu et puissant', w: { lutteur: 3, rouleau: 2, ressort: 1 } },
    { v: 'lourd', em: '🐻', l: 'Grand et lourd', w: { rouleau: 4, passeur: 1 } },
    { v: 'moyen', em: '🙂', l: 'Dans la moyenne', w: {} },
  ] },
  { id: 'atouts', q: 'Tes deux meilleurs atouts ?', type: 'many', max: 2, opts: [
    { v: 'souplesse', em: '🧘', l: 'La souplesse', w: { araignee: 3, verrou: 1, jambes: 1 } },
    { v: 'force', em: '💪', l: 'La force', w: { rouleau: 3, lutteur: 1 } },
    { v: 'cardio', em: '🫁', l: 'Le cardio', w: { passeur: 2, lutteur: 1 } },
    { v: 'explosivite', em: '⚡', l: 'L’explosivité', w: { ressort: 2, lutteur: 2, sacados: 1 } },
    { v: 'patience', em: '🧠', l: 'La patience et la technique', w: { verrou: 1, jambes: 2, sacados: 1 } },
    { v: 'equilibre', em: '🎯', l: 'L’équilibre', w: { passeur: 2, rouleau: 1 } },
  ] },
  { id: 'debout', q: 'Debout, au début du combat, tu…', type: 'one', opts: [
    { v: 'tirer', em: '⬇️', l: 'Tires la garde', w: { verrou: 2, araignee: 2, ressort: 1, jambes: 2 } },
    { v: 'lutte', em: '🤼', l: 'Luttes', d: 'Double leg, single leg', w: { lutteur: 4, rouleau: 1, passeur: 1 } },
    { v: 'judo', em: '🌀', l: 'Projettes', d: 'Judo, balayages', w: { rouleau: 2, passeur: 2, sacados: 1 } },
    { v: 'attendre', em: '⏳', l: 'Attends et contres', w: { verrou: 1, ressort: 1, lutteur: 1 } },
  ] },
  { id: 'sol', q: 'Au sol, tu te sens le mieux…', type: 'one', opts: [
    { v: 'dessous', em: '🛡️', l: 'Dessous, en garde', w: { verrou: 3, araignee: 3, ressort: 3, jambes: 2 } },
    { v: 'dessus', em: '🧱', l: 'Dessus, à passer et presser', w: { passeur: 4, rouleau: 4, lutteur: 1 } },
    { v: 'dos', em: '🎒', l: 'Dans son dos', w: { sacados: 5 } },
    { v: 'partout', em: '🔄', l: 'Ça dépend, je m’adapte', w: { sacados: 2, ressort: 1, passeur: 1 } },
  ] },
  { id: 'gardes', q: 'Tes gardes préférées ?', type: 'many', max: 2,
    show: (a) => ['dessous', 'partout'].includes(v(a, 'sol')) || v(a, 'debout') === 'tirer',
    opts: [
      { v: 'fermee', em: '🔒', l: 'Garde fermée', w: { verrou: 4 } },
      { v: 'demi', em: '🌓', l: 'Demi-garde', d: 'Avec ou sans knee shield', w: { ressort: 3, rouleau: 1 } },
      { v: 'papillon', em: '🦋', l: 'Garde papillon', w: { ressort: 4 } },
      { v: 'dlr', em: '🪝', l: 'De la Riva, berimbolo', w: { araignee: 2, sacados: 3 } },
      { v: 'araignee', em: '🕷️', l: 'Araignée, lasso', show: gi, w: { araignee: 4 } },
      { v: 'collar', em: '🧵', l: 'Col et manche', show: gi, w: { araignee: 2, verrou: 1 } },
      { v: 'slx', em: '❌', l: 'X-guard, single leg X', w: { jambes: 3, ressort: 1 } },
      { v: 'k', em: '🦵', l: 'K-guard, 50/50', show: nogi, w: { jambes: 4 } },
      { v: 'aucune', em: '🤷', l: 'Je n’en ai pas encore', w: { verrou: 1 } },
    ] },
  { id: 'passages', q: 'Tes passages de garde ?', type: 'many', max: 2,
    show: (a) => ['dessus', 'partout', 'dos'].includes(v(a, 'sol')) || ['lutte', 'judo'].includes(v(a, 'debout')),
    opts: [
      { v: 'toreando', em: '🐂', l: 'Toréador, passages debout', w: { passeur: 4 } },
      { v: 'pression', em: '🪨', l: 'Pression', d: 'Smash, over-under', w: { rouleau: 4 } },
      { v: 'kneecut', em: '🔪', l: 'Knee cut', w: { passeur: 2, rouleau: 2 } },
      { v: 'legdrag', em: '↪️', l: 'Leg drag', w: { passeur: 3, sacados: 1 } },
      { v: 'bodylock', em: '🫂', l: 'Body lock', w: { rouleau: 2, lutteur: 2 } },
      { v: 'aucun', em: '🤷', l: 'Je n’en ai pas encore', w: {} },
    ] },
  { id: 'subs', q: 'Tes soumissions préférées ?', type: 'many', max: 3, opts: [
    { v: 'rnc', l: 'Étranglement arrière', w: { sacados: 3 }, sub: 'rnc' },
    { v: 'triangle', l: 'Triangle', w: { verrou: 2, araignee: 2 }, sub: 'triangle' },
    { v: 'armbar', l: 'Clé de bras', w: { verrou: 2, passeur: 1 }, sub: 'armbar' },
    { v: 'kimura', l: 'Kimura', w: { rouleau: 1, ressort: 1, verrou: 1 }, sub: 'kimura' },
    { v: 'guillotine', l: 'Guillotine', w: { lutteur: 3 }, sub: 'guillotine' },
    { v: 'darce', l: 'D’Arce, anaconda', w: { lutteur: 2, rouleau: 1 }, sub: 'darce' },
    { v: 'col', l: 'Étranglements au col', show: gi, w: { sacados: 1, passeur: 1 }, sub: 'cross-collar' },
    { v: 'bow', l: 'Arc et flèche', show: gi, w: { sacados: 2 }, sub: 'bow-arrow' },
    { v: 'omoplata', l: 'Omoplata', w: { araignee: 2, verrou: 1 }, sub: 'omoplata' },
    { v: 'americana', l: 'Americana', w: { rouleau: 2 }, sub: 'americana' },
    { v: 'ankle', l: 'Clé de cheville', w: { jambes: 3 }, sub: 'ankle' },
    { v: 'heel', l: 'Clé de talon', show: nogi, w: { jambes: 4 }, sub: 'heel-in' },
  ] },
  { id: 'leglocks', q: 'Les clés de jambe, pour toi c’est…', type: 'one', show: nogi, opts: [
    { v: 'jamais', em: '🙈', l: 'Je n’y touche pas', w: {} },
    { v: 'unpeu', em: '🦶', l: 'Un peu, pour finir', w: { jambes: 2 } },
    { v: 'arme', em: '🎯', l: 'Mon arme principale', w: { jambes: 6 } },
  ] },
  { id: 'difficultes', q: 'Ce qui te pose le plus de problèmes ?', type: 'many', max: 2, opts: [
    { v: 'montee', em: '😰', l: 'Sortir de la montée ou du latéral', w: {} },
    { v: 'garde', em: '🚪', l: 'Garder ma garde', w: {} },
    { v: 'passer', em: '🧗', l: 'Passer la garde', w: {} },
    { v: 'finir', em: '🔚', l: 'Finir mes soumissions', w: {} },
    { v: 'dosdef', em: '🎒', l: 'Quand il prend mon dos', w: {} },
    { v: 'jambesdef', em: '🦵', l: 'Les attaques de jambes', show: nogi, w: {} },
    { v: 'debout', em: '🤼', l: 'Le debout', w: {} },
    { v: 'cardio', em: '🫠', l: 'Le cardio', w: {} },
  ] },
  { id: 'rythme', q: 'Ton rythme en combat ?', type: 'one', opts: [
    { v: 'explosif', em: '💥', l: 'Explosif', d: 'Je mets le feu d’entrée', w: { lutteur: 1, ressort: 2, sacados: 1 } },
    { v: 'constant', em: '🚂', l: 'Constant', d: 'Je ne lâche jamais la pression', w: { rouleau: 2, passeur: 2 } },
    { v: 'patient', em: '🐍', l: 'Patient', d: 'J’attends la faute', w: { verrou: 2, araignee: 1, jambes: 1 } },
  ] },
  { id: 'objectif', q: 'Ton objectif principal ?', type: 'one', opts: [
    { v: 'compet', em: '🏆', l: 'Gagner en compétition', w: {} },
    { v: 'technique', em: '📈', l: 'Progresser techniquement', w: {} },
    { v: 'selfdef', em: '🛡️', l: 'Me défendre', w: { rouleau: 1, sacados: 1 } },
    { v: 'plaisir', em: '😄', l: 'La forme et le plaisir', w: {} },
  ] },
  { id: 'regles', q: 'Tu combats sous quel règlement ?', type: 'one', show: (a) => v(a, 'objectif') === 'compet', opts: [
    { v: 'ibjjf', l: 'IBJJF', w: { verrou: 1, passeur: 1 } },
    { v: 'adcc', l: 'ADCC', w: { lutteur: 2, jambes: 2 } },
    { v: 'ajp', l: 'AJP', w: { passeur: 1 } },
    { v: 'naga', l: 'NAGA', w: { jambes: 1 } },
    { v: 'gi', l: 'Grappling Industries', w: {} },
    { v: 'aucun', l: 'Pas encore choisi', w: {} },
  ] },
  { id: 'freq', q: 'Combien d’entraînements par semaine ?', type: 'one', opts: [
    { v: '1', em: '1️⃣', l: '1 ou 2', w: {} },
    { v: '3', em: '3️⃣', l: '3 ou 4', w: {} },
    { v: '5', em: '🔥', l: '5 et plus', w: {} },
  ] },
  { id: 'fragile', q: 'Une zone à ménager ?', help: 'La stratégie en tiendra compte.', type: 'many', max: 3, opts: [
    { v: 'genoux', em: '🦵', l: 'Les genoux', w: { jambes: -3 } },
    { v: 'epaules', em: '💪', l: 'Les épaules', w: {} },
    { v: 'cou', em: '🦒', l: 'Le cou', w: { araignee: -1, sacados: -1 } },
    { v: 'dos', em: '🔙', l: 'Le dos', w: { lutteur: -1, rouleau: -1 } },
    { v: 'aucune', em: '✅', l: 'Rien de spécial', w: {} },
  ] },
];

export function visibleQuestions(answers) {
  return QUESTIONS.filter((q) => !q.show || q.show(answers)).map((q) => ({ ...q, opts: q.opts.filter((o) => !o.show || o.show(answers)) }));
}

// Mots repérés dans les réponses « Autre »
const FREE_WORDS = [
  [['berimbolo', 'crab ride', 'dos', 'back', 'seatbelt', 'truck'], { sacados: 2 }],
  [['lasso', 'spider', 'araignee', 'worm', 'lapel', 'revers'], { araignee: 2 }],
  [['heel', 'talon', 'ashi', 'saddle', '411', 'leg lock', 'cheville', 'jambe', 'k guard'], { jambes: 2 }],
  [['lutte', 'wrestling', 'double', 'single', 'snap', 'front headlock'], { lutteur: 2 }],
  [['judo', 'projection', 'osoto', 'uchi', 'seoi'], { rouleau: 1, passeur: 1 }],
  [['pression', 'pressure', 'smash', 'lourd', 'cross face'], { rouleau: 2 }],
  [['butterfly', 'papillon', 'demi', 'half', 'knee shield', 'z guard', 'underhook'], { ressort: 2 }],
  [['garde fermee', 'closed guard', 'rubber', 'high guard', 'williams'], { verrou: 2 }],
  [['toreando', 'torreando', 'leg drag', 'passage', 'pass', 'body lock'], { passeur: 2 }],
];

const ARCH = {
  verrou: {
    standShort: 'Tirer la garde et la fermer',
    name: 'Le Verrou', em: '🔒',
    pitch: 'Tu attires ton adversaire dans ta garde fermée et tu l’enfermes dans une chaîne d’attaques.',
    stand: 'Tire la garde dès que tu tiens un bon contrôle (col et manche en Gi, nuque et poignet en No-Gi), et ferme-la tout de suite.',
    key: 'Garde fermée, posture cassée',
    plan: ['Ferme ta garde et casse sa posture : tire sa tête vers toi, contrôle un bras.', 'Sors ta hanche du côté du bras contrôlé pour prendre l’angle.', 'Enchaîne : clé de bras, puis triangle, puis omoplata selon sa défense.', 'S’il se redresse : renversement en ciseau ou hip bump.'],
    counters: [['Il se redresse', 'Hip bump, ou kimura s’il pose la main au sol'], ['Il cache ses bras', 'Monte ta garde haute et va chercher l’omoplata'], ['Il ouvre ta garde', 'Garde papillon ou demi-garde, puis reviens fermer']],
    fin: ['armbar', 'triangle', 'omoplata', 'kimura', 'cross-collar'],
    drills: ['Hip bump → kimura, 20 fois', 'Clé de bras → triangle → omoplata en chaîne', 'Casser la posture depuis la garde fermée'],
    start: 'garde fermée',
  },
  araignee: {
    standShort: 'S’asseoir, pieds sur ses biceps',
    name: 'L’Araignée', em: '🕷️',
    pitch: 'Tu tiens ton adversaire à distance avec tes jambes et tu le déséquilibres jusqu’à la faute.',
    stand: 'Tire la garde en t’asseyant, et pose tout de suite un pied sur sa hanche ou son biceps.',
    key: 'Garde ouverte, ses deux bras contrôlés',
    plan: ['Contrôle ses deux bras d’abord (manches en Gi, poignets en No-Gi).', 'Installe ta garde araignée ou lasso, un pied sur le biceps.', 'Tire-le en avant pour le déséquilibrer : renversement ou triangle.', 'S’il recule, passe en De la Riva et va chercher son dos.'],
    planNogi: ['Contrôle ses poignets et colle un tibia contre le sien.', 'Installe ta De la Riva ou ta garde en K.', 'Fais-le tomber vers l’avant pour le renverser, ou entre sur ses jambes.', 'S’il recule, enchaîne vers son dos ou un triangle.'],
    counters: [['Il casse tes prises', 'Repars sur un col et une manche avant de remettre les pieds'], ['Il passe en toréador', 'Pied sur la hanche, crevette, recolle un tibia'], ['Il s’agenouille', 'Garde papillon et renversement']],
    fin: ['triangle', 'omoplata', 'armbar', 'bow-arrow', 'rnc'],
    drills: ['Prises de manches et pied sur le biceps', 'Renversement en lasso, 15 fois de chaque côté', 'De la Riva → prise du dos'],
    start: 'garde araignée',
  },
  ressort: {
    standShort: 'Tirer en demi-garde ou en papillon',
    name: 'Le Ressort', em: '🌀',
    pitch: 'Tu joues près de lui, sous lui, et tu exploses au bon moment pour renverser ou prendre le dos.',
    stand: 'Garde le contact : tire en garde papillon ou en demi-garde, sans laisser d’espace.',
    key: 'Demi-garde avec l’underhook',
    plan: ['Prends l’underhook (ton bras sous son aisselle) en demi-garde ou en papillon.', 'Tête collée à lui, viens sur ton côté.', 'Renverse avec le crochet papillon, ou fais un old school sweep.', 'S’il se défend en reculant, glisse derrière lui et prends son dos.'],
    counters: [['Il te met le crossface', 'Knee shield et reprends l’underhook'], ['Il recule ses hanches', 'Monte sur un genou : single leg ou dos'], ['Il écrase ta demi-garde', 'Crevette et passe en papillon']],
    fin: ['rnc', 'guillotine', 'kimura', 'armbar', 'darce'],
    drills: ['Old school sweep, 20 fois', 'Underhook → prise du dos', 'Renversement papillon des deux côtés'],
    start: 'demi-garde avec underhook',
  },
  jambes: {
    standShort: 'S’asseoir près de ses pieds',
    name: 'Le Chasseur de jambes', em: '🦵',
    pitch: 'Pendant que les autres pensent passages et montées, toi tu vas chercher les jambes.',
    stand: 'Tire la garde en t’asseyant près de ses pieds, ou entre directement en single leg X.',
    key: 'Ashi garami, ses hanches cassées',
    plan: ['Assieds-toi et colle tes pieds à ses hanches.', 'Entre en single leg X ou en X-guard.', 'Renverse-le, ou garde la jambe et casse son équilibre.', 'Finis par la clé de cheville, ou monte au-dessus s’il se défend.'],
    counters: [['Il cache son talon', 'Passe à la clé de cheville ou au toe hold'], ['Il se lève', 'Renversement en X-guard'], ['Il attaque tes jambes', 'Contrôle son genou, sors ta jambe et repars']],
    fin: ['ankle', 'heel-in', 'heel-out', 'kneebar', 'toehold'],
    drills: ['Entrées en single leg X depuis l’assise', 'Clé de cheville : grip, angle, finition', 'Défense des jambes : cacher le talon, sortir du saddle'],
    start: 'single leg X',
  },
  passeur: {
    standShort: 'L’amener au sol, ou rester debout',
    name: 'Le Passeur', em: '🐂',
    pitch: 'Tu bouges autour de sa garde plus vite qu’il ne peut la reconstruire.',
    stand: 'Amène-le au sol, ou laisse-le tirer la garde et reste debout pour passer.',
    key: 'Contrôle latéral après le passage',
    plan: ['Contrôle ses genoux ou ses chevilles avant de bouger.', 'Toréador d’un côté, leg drag ou knee cut de l’autre.', 'Tiens le contrôle latéral 3 secondes, puis genou sur le ventre.', 'Monte en montée ou prends le dos quand il se tourne.'],
    counters: [['Il recolle ses tibias', 'Change de côté : toréador puis leg drag'], ['Il se met sur le côté', 'Knee cut et crossface'], ['Il se tourne pour fuir', 'Prends le dos, crochets dedans']],
    fin: ['armbar', 'cross-collar', 'arm-triangle', 'rnc', 'americana'],
    drills: ['Toréador ↔ leg drag, en continu 2 minutes', 'Tenir le latéral 3 secondes, puis genou sur le ventre', 'Montée sur un adversaire qui se tourne'],
    start: 'debout face à sa garde ouverte',
  },
  rouleau: {
    standShort: 'Corps-à-corps, puis au sol',
    name: 'Le Rouleau compresseur', em: '🪨',
    pitch: 'Tu avances lentement et tu écrases. Chaque centimètre gagné, tu ne le rends pas.',
    stand: 'Va au corps-à-corps, amène-le au sol, puis colle-toi à lui.',
    key: 'Contrôle latéral lourd, tête basse',
    plan: ['Écrase ses jambes (smash) ou passe en over-under.', 'Tête basse, épaule sur lui : il porte ton poids.', 'Installe le contrôle latéral et ne laisse aucun espace.', 'Isole un bras ou la tête : americana, kimura ou arm triangle.'],
    counters: [['Il fait des cadres', 'Crossface et épaule sur la mâchoire'], ['Il cherche sa demi-garde', 'Bloque son genou avec ta main, passe la jambe'], ['Il se tourne', 'Montée ou dos, sans lâcher la pression']],
    fin: ['arm-triangle', 'americana', 'kimura', 'ezekiel', 'north-south'],
    drills: ['Over-under : 10 passages lents par côté', 'Transitions latéral → nord-sud → latéral', 'Arm triangle depuis le latéral'],
    start: 'contrôle latéral',
  },
  lutteur: {
    standShort: 'Double leg, single leg, snap down',
    name: 'Le Lutteur', em: '🤼',
    pitch: 'Tu gagnes le combat debout, puis tu punis chaque tentative de se relever.',
    stand: 'Attaque en premier : double leg ou single leg. S’il baisse la tête, snap down.',
    key: 'Front headlock',
    plan: ['Fais-le baisser la tête avec un snap down.', 'Contrôle-le par la nuque (front headlock).', 'Guillotine ou D’Arce s’il pousse, son dos s’il tourne.', 'S’il tire la garde, reste en appui et passe tout de suite.'],
    counters: [['Il tire la garde', 'Reste debout, contrôle les genoux et passe'], ['Il sprawl', 'Remonte au single leg ou change d’angle'], ['Il te met en front headlock', 'Mains sur ses poignets, tête haute, recule']],
    fin: ['guillotine', 'darce', 'anaconda', 'rnc', 'arm-triangle'],
    drills: ['Snap down → front headlock, 20 fois', 'Double leg sur le mur', 'Guillotine et D’Arce depuis le front headlock'],
    start: 'front headlock',
  },
  sacados: {
    standShort: 'Arm drag pour passer derrière',
    name: 'Le Sac à dos', em: '🎒',
    pitch: 'Toutes les routes mènent à son dos. Une fois accroché, tu ne lâches plus.',
    stand: 'Cherche l’arm drag : tire son bras et passe dans son dos dès le debout.',
    key: 'Ceinture de sécurité, crochets dedans',
    plan: ['Crée un angle : arm drag, berimbolo ou crab ride.', 'Prends la ceinture de sécurité (un bras dessus, un bras dessous).', 'Mets tes crochets, ou un triangle de corps.', 'Étranglement arrière en No-Gi, arc et flèche en Gi.'],
    counters: [['Il protège son cou', 'Attaque le bras : clé de bras depuis le dos'], ['Il glisse ses épaules au sol', 'Suis-le, repasse en montée'], ['Il retire un crochet', 'Triangle de corps']],
    fin: ['rnc', 'bow-arrow', 'gi-choke-back', 'armbar', 'triangle'],
    drills: ['Arm drag → dos, 15 fois de chaque côté', 'Ceinture de sécurité : garder le dos 1 minute', 'Étranglement : main de la gorge, main derrière la tête'],
    start: 'son dos, avec la ceinture de sécurité',
  },
};

const DEFENSE = {
  montee: { t: 'Sortir de la montée et du latéral', b: ['Avant-bras en cadre avant de bouger, jamais les bras tendus.', 'Pont puis crevette : 3 séries de 10 au début de chaque cours.', 'Objectif : récupérer ta demi-garde, pas te relever d’un coup.'] },
  garde: { t: 'Garder ta garde', b: ['Tes genoux entre lui et toi, toujours.', 'Contrôle ses mains ou ses manches en premier.', 'Dès qu’il dépasse tes genoux : crevette et remets un tibia devant lui.'] },
  passer: { t: 'Passer la garde', b: ['Contrôle ses hanches ou ses genoux avant de bouger.', 'Un passage principal, plus un second qui part de la même prise.', 'Tiens 3 secondes en latéral avant d’attaquer.'] },
  finir: { t: 'Finir tes soumissions', b: ['La position avant la soumission : isole d’abord le bras ou la nuque.', 'Répète ta finition 20 fois par séance, des deux côtés.', 'Si elle rate, garde ta position au lieu de tout lâcher.'] },
  dosdef: { t: 'Quand il prend ton dos', b: ['Protège ton cou avec deux mains, coudes serrés.', 'Glisse tes épaules au sol du côté de son bras du dessous.', 'Puis remets-toi face à lui, en garde.'] },
  jambesdef: { t: 'Les attaques de jambes', b: ['Cache ton talon : pointe du pied vers lui, genou serré.', 'Ne tourne jamais dans le sens de la clé de talon.', 'Contrôle son genou et sors ta jambe avant qu’il ne verrouille.'] },
  debout: { t: 'Le debout', b: ['Une amenée au sol simple et une façon sûre de tirer la garde.', 'Travaille le snap down et le contrôle de la nuque.', 'Commence chaque sparring par 2 minutes debout.'] },
  cardio: { t: 'Le cardio', b: ['Respire dans les positions stables, ne retiens pas ton souffle.', 'Rounds de 6 minutes à rythme moyen plutôt que 3 à fond.', 'Lâche une prise qui ne marche pas au lieu de forcer.'] },
};

const FRAGILE = {
  genoux: 'Genoux : en sparring, défends les clés de jambe tôt et tape tôt. Préfère les passages debout aux passages à genoux.',
  epaules: 'Épaules : tape tôt sur les kimuras et les americanas, et évite de poser la main au sol derrière toi.',
  cou: 'Cou : évite les inversions et le berimbolo à fond, et lâche les étranglements en cravate quand tu es dessous.',
  dos: 'Dos : évite les projections arrière et les ponts explosifs. Garde les hanches basses dessus.',
};

function score(answers) {
  const s = Object.fromEntries(Object.keys(ARCH).map((k) => [k, 0]));
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!a) continue;
    const vals = Array.isArray(a.v) ? a.v : [a.v];
    for (const x of vals) {
      const o = q.opts.find((y) => y.v === x);
      if (o) for (const [k, n] of Object.entries(o.w)) s[k] += n;
    }
    if (a.other) {
      const t = norm(a.other);
      for (const [words, w] of FREE_WORDS) {
        if (words.some((x) => t.includes(x))) for (const [k, n] of Object.entries(w)) s[k] += n;
      }
    }
  }
  if (v(answers, 'tenue') === 'gi') s.jambes -= 3;
  return Object.entries(s).sort((a, b) => b[1] - a[1]);
}

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export function buildPlan(answers, profile) {
  const ranked = score(answers);
  const mainId = ranked[0][0];
  const secondId = ranked.find(([k]) => k !== mainId)[0];
  const A = ARCH[mainId];
  const B = ARCH[secondId];
  const mode = v(answers, 'tenue') === 'nogi' ? 'nogi' : 'gi';
  const fed = REF_BY_ID[v(answers, 'regles')] ? v(answers, 'regles') : null;
  const plan = mode === 'nogi' && A.planNogi ? A.planNogi : A.plan;

  // Debout et règlement
  const stand = [A.stand];
  if (fed === 'adcc' && ['verrou', 'araignee', 'jambes', 'ressort'].includes(mainId)) stand.push('En ADCC, tirer la garde pendant le temps de points te coûte un point négatif : fais-le en première moitié, ou passe par une amenée au sol.');
  if (fed === 'ibjjf' && ['blanche'].includes(profile.belt) && mainId === 'verrou') stand.push('En IBJJF, sauter en garde fermée t’est interdit à ta ceinture : assieds-toi d’abord.');
  if (fed === 'ibjjf' && ['verrou', 'araignee', 'jambes', 'ressort'].includes(mainId)) stand.push('En IBJJF, prends une prise avant de tirer la garde : la tirer sans prise est pénalisé.');
  if (fed === 'naga' && mode === 'nogi') stand.push('En NAGA No-Gi, même une tentative de soumission rapporte des points : attaque souvent.');
  if (fed === 'gi') stand.push('Pas d’avantages en Grappling Industries : vise des points clairs.');
  if (fed === 'ajp') stand.push('En AJP, à égalité, c’est le dernier à avoir marqué qui gagne : garde de l’énergie pour la fin.');
  const morpho = v(answers, 'morpho');
  if (morpho === 'petit') stand.push('Plus petit que tes partenaires : cherche les angles, pas le face-à-face.');
  if (morpho === 'long') stand.push('Grand et fin : tes jambes sont longues, les triangles et les gardes ouvertes sont faits pour toi.');
  if (morpho === 'lourd' || morpho === 'trapu') stand.push('Ton poids est une arme : joue dessus avant de jouer vite.');

  // Finitions (avec ce qui t'est interdit)
  const favs = [];
  const q = QUESTIONS.find((x) => x.id === 'subs');
  for (const x of (answers.subs && answers.subs.v) || []) {
    const o = q.opts.find((y) => y.v === x);
    if (o && o.sub) favs.push(o.sub);
  }
  const fragile = (answers.fragile && answers.fragile.v) || [];
  const pool = [...new Set([...favs.filter((id) => A.fin.includes(id)), ...A.fin, ...favs])];
  const finishes = [];
  for (const id of pool) {
    const sub = SUB_BY_ID[id];
    if (!sub) continue;
    if (mode === 'nogi' && sub.kind === 'kimono') continue;
    if (mode === 'gi' && sub.kind === 'grappling') continue;
    const why = fed ? illegalFor(fed, sub, profile, mode) : null;
    finishes.push({ id, name: sub.name, fav: favs.includes(id), warn: why });
    if (finishes.filter((f) => !f.warn).length >= 4) break;
  }
  const ok = finishes.filter((f) => !f.warn);

  // Défense prioritaire
  const diffs = (answers.difficultes && answers.difficultes.v) || [];
  const defense = (diffs.length ? diffs : ['montee']).slice(0, 2).map((d) => DEFENSE[d]).filter(Boolean);

  // Clés de jambe (No-Gi)
  const ll = v(answers, 'leglocks');
  let legs = null;
  if (mode === 'nogi' || v(answers, 'tenue') === 'both') {
    legs = ll === 'arme'
      ? ['Entre depuis la single leg X ou l’ashi garami, jamais en sautant sur un pied isolé.', 'Contrôle ses hanches avant de chercher le talon : sans contrôle, il s’échappe.', 'Vérifie ce qui est autorisé à ta ceinture avant chaque compétition (onglet Compét.).']
      : ll === 'unpeu'
        ? ['Garde la clé de cheville comme finition quand il te passe dessus.', 'Apprends une entrée simple en single leg X.', 'Et surtout la défense : cacher le talon, sortir du saddle.']
        : ['Même sans les attaquer, apprends à les défendre : cacher le talon, ne pas tourner dans le mauvais sens.', 'Dès qu’il s’assoit près de tes jambes, mets-toi en appui et contrôle ses genoux.'];
  }

  // Programme de 4 semaines
  const freq = v(answers, 'freq') || '3';
  const reps = freq === '1' ? 10 : freq === '5' ? 25 : 15;
  const weeks = [
    { w: 'Semaine 1', t: 'L’entrée', drill: `${plan[0]} ${reps} répétitions de chaque côté.`, spar: `Sparring de situation : tu pars de ${A.start}.` },
    { w: 'Semaine 2', t: 'L’enchaînement', drill: `${plan[1]} Puis ${lower(plan[2])}`, spar: `Drill : ${A.drills[0]}.` },
    { w: 'Semaine 3', t: 'Les finitions', drill: `${ok.slice(0, 2).map((f) => f.name).join(' et ') || 'Tes soumissions'} : ${reps} fois par séance, lent puis vite.`, spar: `Drill : ${A.drills[1]}.` },
    { w: 'Semaine 4', t: 'Le test', drill: `3 rounds de 3 minutes en partant de ${A.start}, puis 2 rounds dans ta faiblesse : ${lower(defense[0].t)}.`, spar: `Note dans ton journal ce qui a marché.` },
  ];

  const goal = v(answers, 'objectif');
  const goalLine = {
    compet: fed ? `Objectif compétition en ${REF_BY_ID[fed].short} : demande à l’arbitre ${REF_BY_ID[fed].short} ce qui t’est interdit et ta catégorie de poids.` : 'Objectif compétition : choisis ton règlement et vérifie ce qui t’est interdit dans l’onglet Compét.',
    technique: 'Objectif technique : note dans ton journal ce qui marche et ce qui rate, après chaque cours.',
    selfdef: 'Objectif défense : travaille aussi le debout et le contrôle du dos, ce sont les positions qui comptent dans la rue.',
    plaisir: 'Objectif plaisir : garde ce plan comme fil rouge, sans pression. Le jeu viendra en jouant.',
  }[goal];

  const notes = QUESTIONS.map((x) => (answers[x.id] && answers[x.id].other ? { q: x.q, t: answers[x.id].other } : null)).filter(Boolean);
  const sol = v(answers, 'sol');
  const role = sol === 'dessous' ? 'Joueur de garde' : sol === 'dessus' ? 'Joueur du dessus' : sol === 'dos' ? 'Chasseur de dos' : 'Polyvalent';
  const rythme = { explosif: 'Explosif', constant: 'Constant', patient: 'Patient' }[v(answers, 'rythme')];

  return {
    at: Date.now(),
    mode,
    fed,
    style: { id: mainId, name: A.name, em: A.em, pitch: A.pitch },
    tags: [mode === 'nogi' ? 'No-Gi' : v(answers, 'tenue') === 'both' ? 'Gi et No-Gi' : 'Gi', role, rythme, fed ? REF_BY_ID[fed].short : null].filter(Boolean),
    flow: [
      { t: 'Debout', s: A.standShort },
      { t: 'Ta position clé', s: A.key, key: true },
      { t: 'Tes attaques', s: ok.slice(0, 3).map((f) => f.name).join(' · ') || 'À travailler' },
      { t: `S’il ${lower(A.counters[0][0]).replace(/^il /, '')}`, s: A.counters[0][1] },
      { t: `Plan B : ${B.name}`, s: `Depuis ${B.start}` },
    ],
    stand,
    planA: plan,
    counters: A.counters,
    finishes: finishes.slice(0, 6),
    planB: { name: B.name, em: B.em, pitch: B.pitch, steps: (mode === 'nogi' && B.planNogi ? B.planNogi : B.plan).slice(0, 3) },
    defense,
    legs,
    fragile: fragile.filter((x) => FRAGILE[x]).map((x) => FRAGILE[x]),
    drills: A.drills,
    weeks,
    goal: goalLine,
    notes,
    answers,
  };
}
