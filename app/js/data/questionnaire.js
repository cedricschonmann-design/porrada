// « Construis ton jeu » : questionnaire (les questions s'adaptent aux réponses) et moteur de stratégie.
//
// Le calcul :
// 1. Chaque réponse ajoute des points à 16 traits (garde, dessus, dos, jambes, lutte, projections,
//    pression, mobilité, souplesse, explosivité, patience, contre, kimono, cardio, force, finition).
// 2. Ton profil de traits est comparé à 12 styles de jeu (similarité cosinus) : le style le plus proche
//    gagne, sans favoriser ceux qui ont plus de réponses associées.
// 3. Le plan n'est pas celui du style : il est construit à partir de TES gardes, TES passages, TA façon
//    de prendre le dos, TON debout, TES soumissions, ta morphologie, ton règlement et tes faiblesses.
// Tout se calcule sur le téléphone, sans connexion.

import { norm } from '../ui.js';
import { SUB_BY_ID } from './submissions.js';
import { illegalFor, REF_BY_ID } from './referees.js';

const v = (a, id) => (a[id] ? a[id].v : null);
const has = (a, id, x) => { const val = v(a, id); return Array.isArray(val) ? val.includes(x) : val === x; };
const gi = (a) => v(a, 'tenue') !== 'nogi';
const nogi = (a) => v(a, 'tenue') !== 'gi';

const TRAITS = ['guard', 'top', 'back', 'legs', 'wrestle', 'throws', 'pressure', 'mobility', 'flex', 'explo', 'patience', 'counter', 'gi', 'cardio', 'force', 'finish'];

export const QUESTIONS = [
  { id: 'tenue', q: 'Tu t’entraînes surtout…', type: 'one', opts: [
    { v: 'gi', l: 'En kimono (Gi)', t: { gi: 3 } },
    { v: 'nogi', l: 'Sans kimono (No-Gi)', t: { legs: 1, wrestle: 1, gi: -2 } },
    { v: 'both', l: 'Les deux', t: { gi: 1 } },
  ] },
  { id: 'xp', q: 'Tu pratiques depuis…', type: 'one', opts: [
    { v: '0', l: 'Moins d’un an', t: { patience: 1 } },
    { v: '1', l: '1 à 3 ans', t: {} },
    { v: '3', l: '3 à 6 ans', t: { finish: 1 } },
    { v: '6', l: 'Plus de 6 ans', t: { finish: 1, mobility: 1 } },
  ] },
  { id: 'morpho', q: 'Ta morphologie, comparée à tes partenaires ?', type: 'one', opts: [
    { v: 'petit', l: 'Petit et léger', t: { mobility: 3, back: 2, guard: 1, force: -1, pressure: -2 } },
    { v: 'long', l: 'Grand et fin', d: 'Longs bras, longues jambes', t: { flex: 2, guard: 2, finish: 1, pressure: -1 } },
    { v: 'trapu', l: 'Trapu et puissant', t: { wrestle: 2, force: 2, pressure: 2, flex: -1 } },
    { v: 'lourd', l: 'Grand et lourd', t: { pressure: 3, top: 2, force: 2, mobility: -2 } },
    { v: 'moyen', l: 'Dans la moyenne', t: {} },
  ] },
  { id: 'atouts', q: 'Tes deux meilleurs atouts ?', type: 'many', max: 2, opts: [
    { v: 'souplesse', l: 'La souplesse', t: { flex: 3, guard: 1 } },
    { v: 'force', l: 'La force', t: { force: 3, pressure: 1 } },
    { v: 'cardio', l: 'Le cardio', t: { cardio: 3, mobility: 1 } },
    { v: 'explosivite', l: 'L’explosivité', t: { explo: 3 } },
    { v: 'patience', l: 'La patience et la technique', t: { patience: 3, counter: 1 } },
    { v: 'equilibre', l: 'L’équilibre', t: { top: 2, throws: 1, mobility: 1 } },
  ] },
  { id: 'debout', q: 'Debout, au début du combat, tu…', type: 'one', opts: [
    { v: 'tirer', l: 'Tires la garde', t: { guard: 3 } },
    { v: 'lutte', l: 'Luttes', d: 'Double leg, single leg', t: { wrestle: 4, top: 1 } },
    { v: 'judo', l: 'Projettes', d: 'Judo, balayages', t: { throws: 4, top: 1, gi: 1 } },
    { v: 'attendre', l: 'Attends et contres', t: { counter: 3, patience: 1 } },
  ] },
  { id: 'sol', q: 'Au sol, tu te sens le mieux…', type: 'one', opts: [
    { v: 'dessous', l: 'Dessous, en garde', t: { guard: 4 } },
    { v: 'dessus', l: 'Dessus, à passer et presser', t: { top: 4 } },
    { v: 'dos', l: 'Dans son dos', t: { back: 4 } },
    { v: 'partout', l: 'Ça dépend, je m’adapte', t: { mobility: 2, back: 1, guard: 1, top: 1 } },
  ] },
  { id: 'gardes', q: 'Tes gardes préférées ?', type: 'many', max: 2,
    show: (a) => ['dessous', 'partout'].includes(v(a, 'sol')) || v(a, 'debout') === 'tirer',
    opts: [
      { v: 'fermee', l: 'Garde fermée', t: { guard: 2, patience: 1, finish: 1 } },
      { v: 'demi', l: 'Demi-garde', d: 'Avec ou sans knee shield', t: { guard: 2, explo: 1, wrestle: 1 } },
      { v: 'papillon', l: 'Garde papillon', t: { guard: 2, explo: 2 } },
      { v: 'dlr', l: 'De la Riva, berimbolo', t: { guard: 1, back: 2, mobility: 2, flex: 1 } },
      { v: 'araignee', l: 'Araignée, lasso', show: gi, t: { guard: 2, flex: 2, gi: 2 } },
      { v: 'collar', l: 'Col et manche', show: gi, t: { guard: 2, gi: 2 } },
      { v: 'slx', l: 'X-guard, single leg X', t: { guard: 1, legs: 2, explo: 1 } },
      { v: 'k', l: 'K-guard, 50/50', show: nogi, t: { legs: 3, flex: 1 } },
      { v: 'aucune', l: 'Je n’en ai pas encore', t: {} },
    ] },
  { id: 'passages', q: 'Tes passages de garde ?', type: 'many', max: 2,
    show: (a) => ['dessus', 'partout', 'dos'].includes(v(a, 'sol')) || ['lutte', 'judo'].includes(v(a, 'debout')),
    opts: [
      { v: 'toreando', l: 'Toréador, passages debout', t: { top: 2, mobility: 2, cardio: 1 } },
      { v: 'pression', l: 'Pression', d: 'Smash, over-under', t: { top: 2, pressure: 3 } },
      { v: 'kneecut', l: 'Knee cut', t: { top: 2, pressure: 1, mobility: 1 } },
      { v: 'legdrag', l: 'Leg drag', t: { top: 2, mobility: 1, back: 1 } },
      { v: 'bodylock', l: 'Body lock', t: { top: 2, wrestle: 1, pressure: 1, force: 1 } },
      { v: 'aucun', l: 'Je n’en ai pas encore', t: {} },
    ] },
  { id: 'dosroute', q: 'Comment tu prends le dos ?', type: 'one',
    show: (a) => ['dos', 'partout'].includes(v(a, 'sol')),
    opts: [
      { v: 'armdrag', l: 'Arm drag', d: 'Je tire son bras et je passe derrière', t: { back: 2, explo: 1, wrestle: 1 } },
      { v: 'berimbolo', l: 'Berimbolo, crab ride', d: 'Depuis ma garde', t: { back: 2, guard: 1, mobility: 2, flex: 1 } },
      { v: 'tortue', l: 'Sur la tortue', d: 'Ceinture de sécurité quand il se met à 4 pattes', t: { back: 2, top: 1, pressure: 1 } },
      { v: 'fhl', l: 'Front headlock', d: 'Je contrôle sa tête et je tourne', t: { back: 1, wrestle: 2, counter: 1 } },
      { v: 'tourne', l: 'Quand il se tourne', d: 'Il fuit mon passage, je prends le dos', t: { back: 2, top: 1 } },
    ] },
  { id: 'subs', q: 'Tes soumissions préférées ?', type: 'many', max: 3, opts: [
    { v: 'rnc', l: 'Étranglement arrière', t: { back: 2, finish: 1 }, sub: 'rnc' },
    { v: 'triangle', l: 'Triangle', t: { guard: 1, flex: 1, finish: 1 }, sub: 'triangle' },
    { v: 'armbar', l: 'Clé de bras', t: { guard: 1, finish: 1 }, sub: 'armbar' },
    { v: 'kimura', l: 'Kimura', t: { force: 1, finish: 1 }, sub: 'kimura' },
    { v: 'guillotine', l: 'Guillotine', t: { wrestle: 1, counter: 1, finish: 1 }, sub: 'guillotine' },
    { v: 'darce', l: 'D’Arce, anaconda', t: { wrestle: 1, pressure: 1, finish: 1 }, sub: 'darce' },
    { v: 'col', l: 'Étranglements au col', show: gi, t: { gi: 2, top: 1 }, sub: 'cross-collar' },
    { v: 'bow', l: 'Arc et flèche', show: gi, t: { gi: 1, back: 2 }, sub: 'bow-arrow' },
    { v: 'omoplata', l: 'Omoplata', t: { guard: 1, flex: 1 }, sub: 'omoplata' },
    { v: 'americana', l: 'Americana', t: { top: 1, pressure: 1 }, sub: 'americana' },
    { v: 'armtri', l: 'Arm triangle', t: { top: 1, pressure: 2 }, sub: 'arm-triangle' },
    { v: 'ankle', l: 'Clé de cheville', t: { legs: 2 }, sub: 'ankle' },
    { v: 'heel', l: 'Clé de talon', show: nogi, t: { legs: 3 }, sub: 'heel-in' },
  ] },
  { id: 'leglocks', q: 'Les clés de jambe, pour toi c’est…', type: 'one', show: nogi, opts: [
    { v: 'jamais', l: 'Je n’y touche pas', t: { legs: -2 } },
    { v: 'unpeu', l: 'Un peu, pour finir', t: { legs: 1 } },
    { v: 'arme', l: 'Mon arme principale', t: { legs: 5 } },
  ] },
  { id: 'difficultes', q: 'Ce qui te pose le plus de problèmes ?', type: 'many', max: 2, opts: [
    { v: 'montee', l: 'Sortir de la montée ou du latéral', t: {} },
    { v: 'garde', l: 'Garder ma garde', t: { guard: -1 } },
    { v: 'passer', l: 'Passer la garde', t: { top: -1 } },
    { v: 'finir', l: 'Finir mes soumissions', t: { finish: -1 } },
    { v: 'dosdef', l: 'Quand il prend mon dos', t: {} },
    { v: 'jambesdef', l: 'Les attaques de jambes', show: nogi, t: {} },
    { v: 'debout', l: 'Le debout', t: { wrestle: -1, throws: -1 } },
    { v: 'cardio', l: 'Le cardio', t: { cardio: -2 } },
  ] },
  { id: 'rythme', q: 'Ton rythme en combat ?', type: 'one', opts: [
    { v: 'explosif', l: 'Explosif', d: 'Je mets le feu d’entrée', t: { explo: 2, wrestle: 1 } },
    { v: 'constant', l: 'Constant', d: 'Je ne lâche jamais la pression', t: { cardio: 2, pressure: 2 } },
    { v: 'patient', l: 'Patient', d: 'J’attends la faute', t: { patience: 2, counter: 2 } },
  ] },
  { id: 'objectif', q: 'Ton objectif principal ?', type: 'one', opts: [
    { v: 'compet', l: 'Gagner en compétition', t: {} },
    { v: 'technique', l: 'Progresser techniquement', t: {} },
    { v: 'selfdef', l: 'Me défendre', t: { top: 1, back: 1 } },
    { v: 'plaisir', l: 'La forme et le plaisir', t: {} },
  ] },
  { id: 'regles', q: 'Tu combats sous quel règlement ?', type: 'one', show: (a) => v(a, 'objectif') === 'compet', opts: [
    { v: 'ibjjf', l: 'IBJJF', t: {} },
    { v: 'adcc', l: 'ADCC', t: { wrestle: 1, legs: 1 } },
    { v: 'ajp', l: 'AJP', t: {} },
    { v: 'naga', l: 'NAGA', t: {} },
    { v: 'gi', l: 'Grappling Industries', t: {} },
    { v: 'aucun', l: 'Pas encore choisi', t: {} },
  ] },
  { id: 'freq', q: 'Combien d’entraînements par semaine ?', type: 'one', opts: [
    { v: '1', l: '1 ou 2', t: {} },
    { v: '3', l: '3 ou 4', t: {} },
    { v: '5', l: '5 et plus', t: { cardio: 1 } },
  ] },
  { id: 'fragile', q: 'Une zone à ménager ?', help: 'La stratégie en tiendra compte.', type: 'many', max: 3, opts: [
    { v: 'genoux', l: 'Les genoux', t: { legs: -3 } },
    { v: 'epaules', l: 'Les épaules', t: {} },
    { v: 'cou', l: 'Le cou', t: { flex: -1 } },
    { v: 'dos', l: 'Le dos', t: { throws: -1 } },
    { v: 'aucune', l: 'Rien de spécial', t: {} },
  ] },
];

export function visibleQuestions(answers) {
  return QUESTIONS.filter((q) => !q.show || q.show(answers)).map((q) => ({ ...q, opts: q.opts.filter((o) => !o.show || o.show(answers)) }));
}

// Mots repérés dans les réponses « Autre »
const FREE_WORDS = [
  [['berimbolo', 'crab ride', 'dos', 'back', 'seatbelt', 'truck'], { back: 2, mobility: 1 }],
  [['lasso', 'spider', 'araignee', 'worm', 'lapel', 'revers'], { guard: 1, flex: 1, gi: 2 }],
  [['heel', 'talon', 'ashi', 'saddle', '411', 'leg lock', 'cheville', 'jambe', 'k guard'], { legs: 3 }],
  [['lutte', 'wrestling', 'double', 'single', 'snap', 'front headlock'], { wrestle: 3 }],
  [['judo', 'projection', 'osoto', 'uchi', 'seoi'], { throws: 3 }],
  [['pression', 'pressure', 'smash', 'lourd', 'cross face'], { pressure: 2, top: 1 }],
  [['butterfly', 'papillon', 'demi', 'half', 'knee shield', 'z guard', 'underhook'], { guard: 1, explo: 1 }],
  [['garde fermee', 'closed guard', 'rubber', 'high guard', 'williams'], { guard: 2, patience: 1 }],
  [['toreando', 'torreando', 'leg drag', 'passage', 'pass', 'body lock'], { top: 2, mobility: 1 }],
  [['contre', 'counter', 'sprawl'], { counter: 2 }],
];

// ---------- Les 12 styles (profils de traits) ----------
const STYLES = {
  verrou: { name: 'Le Verrou', fam: 'guard', mod: ['guard', 'fermee'], t: { guard: 3, patience: 2, finish: 2, flex: 1 },
    pitch: 'Tu attires ton adversaire dans ta garde fermée et tu l’enfermes dans une chaîne d’attaques.' },
  araignee: { name: 'L’Araignée', fam: 'guard', mod: ['guard', 'araignee'], modNogi: ['guard', 'dlr'], t: { guard: 3, flex: 3, gi: 2, patience: 1 },
    pitch: 'Tu tiens ton adversaire à distance avec tes jambes et tu le déséquilibres jusqu’à la faute.' },
  ressort: { name: 'Le Ressort', fam: 'guard', mod: ['guard', 'demi'], t: { guard: 3, explo: 3, wrestle: 1, back: 1 },
    pitch: 'Tu joues collé à lui, dessous, et tu exploses au bon moment pour renverser ou prendre le dos.' },
  renverseur: { name: 'Le Renverseur', fam: 'guard', mod: ['guard', 'papillon'], t: { guard: 2, explo: 2, top: 2, mobility: 1 },
    pitch: 'Ta garde n’est qu’un tremplin : tu renverses, tu te retrouves dessus, et tu continues.' },
  jambes: { name: 'Le Chasseur de jambes', fam: 'legs', mod: ['guard', 'slx'], modNogi: ['guard', 'k'], t: { legs: 4, guard: 1, patience: 1, finish: 1 },
    pitch: 'Pendant que les autres pensent passages et montées, toi tu vas chercher les jambes.' },
  moderne: { name: 'L’Acrobate', fam: 'back', mod: ['guard', 'dlr'], t: { guard: 1, back: 3, mobility: 3, flex: 2 },
    pitch: 'De la Riva, berimbolo, inversions : tu tournes autour de lui jusqu’à son dos.' },
  passeur: { name: 'Le Passeur', fam: 'top', mod: ['pass', 'toreando'], t: { top: 3, mobility: 3, cardio: 2 },
    pitch: 'Tu bouges autour de sa garde plus vite qu’il ne peut la reconstruire.' },
  rouleau: { name: 'Le Rouleau compresseur', fam: 'top', mod: ['pass', 'pression'], t: { top: 3, pressure: 4, force: 2 },
    pitch: 'Tu avances lentement et tu écrases. Chaque centimètre gagné, tu ne le rends pas.' },
  lutteur: { name: 'Le Lutteur', fam: 'stand', mod: ['back', 'fhl'], t: { wrestle: 4, top: 2, explo: 2, force: 1 },
    pitch: 'Tu gagnes le combat debout, puis tu punis chaque tentative de se relever.' },
  judoka: { name: 'Le Judoka', fam: 'stand', mod: ['pass', 'kneecut'], t: { throws: 4, top: 2, gi: 1, force: 1 },
    pitch: 'Une projection propre, et tu tombes déjà en contrôle : le combat commence là où les autres finissent.' },
  sacados: { name: 'Le Sac à dos', fam: 'back', mod: ['back', 'tortue'], t: { back: 4, finish: 2, patience: 1, mobility: 1 },
    pitch: 'Toutes les routes mènent à son dos. Une fois accroché, tu ne lâches plus.' },
  contreur: { name: 'Le Contreur', fam: 'counter', mod: ['guard', 'demi'], t: { counter: 4, patience: 3, finish: 1 },
    pitch: 'Tu laisses venir. Chaque attaque qu’il tente devient une ouverture pour toi.' },
};

// ---------- Les modules de jeu : une position, comment y aller, quoi y faire ----------
const MOD = {
  guard: {
    fermee: { name: 'Garde fermée', key: 'Garde fermée, posture cassée',
      steps: ['Casse sa posture : tire son col et contrôle une manche.', 'Prends l’angle : sors la hanche du côté du bras contrôlé.', 'Enchaîne clé de bras, triangle, omoplata selon sa défense.', 'S’il se redresse : hip bump ou renversement en ciseau.'],
      stepsNogi: ['Casse sa posture : contrôle la nuque et un poignet (prise à deux mains sur un bras).', 'Prends l’angle, monte ta garde haute.', 'Enchaîne kimura, triangle, clé de bras selon sa défense.', 'S’il se redresse : hip bump ou guillotine.'],
      counters: [['Il se redresse', 'Hip bump, ou kimura s’il pose la main au sol'], ['Il cache ses bras', 'Garde haute et omoplata'], ['Il ouvre ta garde', 'Passe en papillon ou en demi-garde, puis referme']],
      drills: ['Hip bump puis kimura, 20 fois', 'Clé de bras, triangle, omoplata en chaîne'],
      subs: ['armbar', 'triangle', 'omoplata', 'kimura', 'cross-collar', 'guillotine'] },
    demi: { name: 'Demi-garde', key: 'Demi-garde avec l’underhook',
      steps: ['Knee shield d’abord : ton tibia entre lui et toi.', 'Prends l’underhook, tête collée contre lui.', 'Viens sur ton côté : old school sweep ou dog fight.', 'S’il recule ses hanches : prends son dos.'],
      counters: [['Il te met le crossface', 'Reviens en knee shield et reprends l’underhook'], ['Il serre un whizzer', 'Kimura sur le bras du whizzer'], ['Il écrase ta demi-garde', 'Crevette et repasse en papillon']],
      drills: ['Underhook puis old school sweep, 20 fois', 'Dog fight vers le dos'],
      subs: ['kimura', 'rnc', 'guillotine', 'darce', 'bow-arrow'] },
    papillon: { name: 'Garde papillon', key: 'Papillon, un underhook',
      steps: ['Reste assis, crochets sous ses cuisses, poitrine contre lui.', 'Un underhook et un contrôle de bras.', 'Renverse vers le côté où tu tiens le bras.', 'S’il pèse sur toi : entre en single leg X.'],
      counters: [['Il écrase vers l’avant', 'Single leg X ou X-guard'], ['Il recule', 'Lève-toi : single leg ou arm drag'], ['Il cherche à passer', 'Crevette et recolle tes crochets']],
      drills: ['Renversement papillon des deux côtés, 15 fois', 'Papillon vers X-guard'],
      subs: ['guillotine', 'armbar', 'kimura', 'rnc', 'arm-triangle'] },
    dlr: { name: 'De la Riva', key: 'De la Riva, sa jambe contrôlée',
      steps: ['Crochet De la Riva et prise sur sa cheville.', 'Casse son équilibre vers l’arrière.', 'Berimbolo ou renversement par-dessous.', 'Finis dans son dos, ceinture de sécurité.'],
      counters: [['Il casse ton crochet', 'Reverse De la Riva ou single leg X'], ['Il s’agenouille', 'Garde papillon et renversement'], ['Il recule', 'Suis-le et prends sa jambe']],
      drills: ['Entrée en berimbolo, 15 fois de chaque côté', 'De la Riva vers le dos'],
      subs: ['rnc', 'bow-arrow', 'armbar', 'triangle'] },
    araignee: { name: 'Araignée-lasso', key: 'Ses deux manches, un pied sur le biceps',
      steps: ['Contrôle ses deux manches avant tout.', 'Un pied sur le biceps, l’autre en lasso.', 'Tire-le en avant : renversement ou triangle.', 'S’il recule : passe en De la Riva et va vers le dos.'],
      counters: [['Il casse tes prises', 'Repars sur col et manche avant de remettre les pieds'], ['Il passe en toréador', 'Pied sur la hanche, crevette, recolle un tibia'], ['Il s’agenouille', 'Garde papillon et renversement']],
      drills: ['Prises de manches et pied sur le biceps, 2 minutes', 'Renversement en lasso, 15 fois de chaque côté'],
      subs: ['triangle', 'omoplata', 'armbar', 'bow-arrow'] },
    collar: { name: 'Col et manche', key: 'Col et manche, pied sur la hanche',
      steps: ['Col et manche, pied sur sa hanche.', 'Menace le triangle pour qu’il recule.', 'Renversement en ciseau ou tripod.', 'Monte tout de suite et passe.'],
      counters: [['Il casse la prise du col', 'Repasse en araignée sur la manche'], ['Il se lève', 'Tripod sweep'], ['Il pousse vers toi', 'Triangle']],
      drills: ['Renversement tripod et ciseau, 15 fois', 'Col et manche vers triangle'],
      subs: ['triangle', 'cross-collar', 'omoplata', 'armbar'] },
    slx: { name: 'Single leg X', key: 'Single leg X, sa jambe entre les tiennes',
      steps: ['Entre en single leg X depuis la papillon ou l’assise.', 'Pousse sa hanche, tire son talon contre toi.', 'Renversement technique : relève-toi avec sa jambe.', 'Ou finis par la clé de cheville.'],
      counters: [['Il cache son talon', 'Clé de cheville ou toe hold'], ['Il se lève', 'Renversement en X-guard'], ['Il attaque tes jambes', 'Contrôle son genou, sors ta jambe et repars']],
      drills: ['Entrées en single leg X, 15 fois', 'Renversement technique depuis le single leg X'],
      subs: ['ankle', 'heel-out', 'kneebar', 'toehold'] },
    k: { name: 'K-guard, 50/50', key: 'Ashi garami, ses hanches cassées',
      steps: ['K-guard : un genou sur sa hanche, contrôle d’une jambe.', 'Entre en ashi garami ou en 50/50.', 'Casse son équilibre avant d’attaquer.', 'Clé de talon, ou dessus s’il se défend.'],
      counters: [['Il cache son talon', 'Passe à la clé de cheville ou au toe hold'], ['Il tourne pour s’échapper', 'Suis-le en saddle'], ['Il te passe dessus', 'Recule et repars en K-guard']],
      drills: ['Entrées en K-guard, 15 fois de chaque côté', 'Défense : cacher le talon, sortir du saddle'],
      subs: ['heel-in', 'heel-out', 'ankle', 'kneebar', 'toehold'] },
  },
  pass: {
    toreando: { name: 'Toréador', key: 'Contrôle latéral après le passage',
      steps: ['Contrôle ses genoux ou ses chevilles avant de bouger.', 'Pousse ses jambes d’un côté, cours de l’autre.', 'Tiens le latéral 3 secondes.', 'Genou sur le ventre, puis montée.'],
      counters: [['Il recolle un tibia', 'Change de côté, ou leg drag'], ['Il se met sur le côté', 'Knee cut et crossface'], ['Il se tourne pour fuir', 'Prends le dos']],
      drills: ['Toréador des deux côtés en continu, 2 minutes', 'Latéral puis genou sur le ventre'],
      subs: ['armbar', 'cross-collar', 'americana', 'arm-triangle'] },
    pression: { name: 'Passage en pression', key: 'Over-under, tête basse',
      steps: ['Écrase ses jambes (smash) ou passe en over-under.', 'Tête basse, épaule sur lui : il porte ton poids.', 'Glisse au latéral sans laisser d’espace.', 'Isole un bras ou la tête.'],
      counters: [['Il fait des cadres', 'Crossface et épaule sur la mâchoire'], ['Il cherche sa demi-garde', 'Bloque son genou avec ta main'], ['Il se tourne', 'Montée ou dos, sans lâcher la pression']],
      drills: ['Over-under : 10 passages lents par côté', 'Transitions latéral, nord-sud, latéral'],
      subs: ['arm-triangle', 'americana', 'kimura', 'ezekiel', 'north-south'] },
    kneecut: { name: 'Knee cut', key: 'Knee cut avec crossface',
      steps: ['Contrôle le revers ou l’underhook.', 'Genou en travers de sa cuisse, hanches basses.', 'Crossface pour lui tourner la tête.', 'Tombe au latéral, puis montée.'],
      counters: [['Il prend l’underhook', 'Change en leg drag'], ['Il recule ses hanches', 'Suis-le, garde le genou dedans'], ['Il récupère une demi-garde', 'Écrase et dégage le pied']],
      drills: ['Knee cut des deux côtés, 15 fois', 'Knee cut puis montée'],
      subs: ['americana', 'kimura', 'arm-triangle', 'armbar'] },
    legdrag: { name: 'Leg drag', key: 'Leg drag, hanches collées',
      steps: ['Pousse sa jambe en travers de son corps.', 'Colle tes hanches contre les siennes.', 'Contrôle sa tête ou son bras opposé.', 'Latéral ou dos quand il se tourne.'],
      counters: [['Il remet sa jambe', 'Toréador de l’autre côté'], ['Il se tourne', 'Crochets dedans, prends le dos'], ['Il te repousse', 'Garde le contrôle du genou']],
      drills: ['Leg drag vers le dos, 15 fois', 'Toréador et leg drag enchaînés'],
      subs: ['rnc', 'armbar', 'bow-arrow', 'americana'] },
    bodylock: { name: 'Body lock', key: 'Body lock, ses jambes écrasées',
      steps: ['Serre ses hanches à deux bras.', 'Écrase ses jambes au sol, tête sur son torse.', 'Libère ta jambe pas à pas.', 'Latéral ou montée, sans relâcher.'],
      counters: [['Il crochète ta jambe', 'Tourne la hanche et dégage'], ['Il fait des cadres', 'Reste bas, pression d’épaule'], ['Il se met sur le ventre', 'Prends le dos']],
      drills: ['Body lock jusqu’au latéral, 10 fois lent', 'Libérer sa jambe en demi-garde'],
      subs: ['arm-triangle', 'darce', 'kimura', 'americana'] },
  },
  back: {
    armdrag: { name: 'Arm drag', key: 'Dos : ceinture de sécurité, crochets',
      steps: ['Tire son bras en travers de toi.', 'Passe derrière en gardant le bras.', 'Ceinture de sécurité (un bras dessus, un dessous).', 'Crochets dedans, puis étranglement.'],
      counters: [['Il retire son bras', 'Single leg dans la foulée'], ['Il protège son cou', 'Attaque le bras : clé de bras'], ['Il retire un crochet', 'Triangle de corps']],
      drills: ['Arm drag vers le dos, 15 fois de chaque côté', 'Garder le dos 1 minute'],
      subs: ['rnc', 'bow-arrow', 'gi-choke-back', 'armbar'] },
    berimbolo: { name: 'Berimbolo, crab ride', key: 'Dos : crochets depuis le berimbolo',
      steps: ['Depuis la De la Riva, casse son équilibre.', 'Tourne sous lui : berimbolo, ou crab ride.', 'Prends sa ceinture ou son corps.', 'Crochets et étranglement.'],
      counters: [['Il reste assis', 'Crab ride'], ['Il se tourne face à toi', 'Repars en De la Riva'], ['Il protège son cou', 'Clé de bras depuis le dos']],
      drills: ['Berimbolo des deux côtés, 15 fois', 'Crab ride vers le dos'],
      subs: ['rnc', 'bow-arrow', 'armbar', 'triangle'] },
    tortue: { name: 'Tortue', key: 'Dos : ceinture de sécurité sur la tortue',
      steps: ['Quand il se met à 4 pattes, prends la ceinture de sécurité.', 'Colle ta poitrine à son dos.', 'Premier crochet du côté du bras du dessous.', 'Roule et mets le deuxième crochet.'],
      counters: [['Il se relève', 'Body lock et ramène-le au sol'], ['Il roule', 'Suis-le, garde la ceinture'], ['Il bloque tes crochets', 'Triangle de corps']],
      drills: ['Prise du dos sur la tortue, 15 fois', 'Garder le dos 1 minute'],
      subs: ['rnc', 'bow-arrow', 'gi-choke-back', 'armbar'] },
    fhl: { name: 'Front headlock', key: 'Front headlock',
      steps: ['Snap down : fais-lui baisser la tête.', 'Contrôle la nuque et un bras.', 'Guillotine ou D’Arce s’il pousse.', 'Tourne vers son dos s’il recule.'],
      counters: [['Il remonte la tête', 'Single leg ou double leg'], ['Il tire la garde', 'Reste en appui, passe tout de suite'], ['Il se met à 4 pattes', 'Ceinture de sécurité, dos']],
      drills: ['Snap down vers front headlock, 20 fois', 'Guillotine et D’Arce depuis le front headlock'],
      subs: ['guillotine', 'darce', 'anaconda', 'rnc'] },
    tourne: { name: 'Prise du dos au passage', key: 'Dos : il se tourne pour fuir',
      steps: ['Passe la garde, tiens le latéral.', 'Genou sur le ventre pour le faire bouger.', 'Quand il se tourne, glisse un crochet.', 'Ceinture de sécurité, puis étranglement.'],
      counters: [['Il reste à plat', 'Montée'], ['Il fait des cadres', 'Genou sur le ventre'], ['Il roule', 'Suis-le, crochets dedans']],
      drills: ['Latéral, genou sur le ventre, dos', 'Garder le dos 1 minute'],
      subs: ['rnc', 'bow-arrow', 'armbar', 'americana'] },
  },
};

const STAND = {
  tirer: { label: 'Tirer la garde', steps: ['Prends une prise avant de t’asseoir (col et manche, ou nuque et poignet en No-Gi).', 'Assieds-toi tout près de lui, pieds sur ses hanches.', 'Installe ta garde avant qu’il ne se relève.'] },
  lutte: { label: 'Lutte', steps: ['Main sur sa nuque : fais-le bouger.', 'Single leg ou double leg quand il avance.', 'Finis en passant directement la garde.'] },
  judo: { label: 'Projection', steps: ['Prise col et manche (overhook et underhook en No-Gi).', 'Déséquilibre-le vers l’avant ou l’arrière.', 'Projette et tombe directement en contrôle.'] },
  attendre: { label: 'Contre', steps: ['Mains devant, coudes serrés : laisse-le venir.', 'S’il plonge sur tes jambes : sprawl, puis guillotine ou front headlock.', 'S’il tire la garde : reste debout et passe.'] },
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
  genoux: 'Genoux : défends les clés de jambe tôt et tape tôt. Préfère les passages debout aux passages à genoux.',
  epaules: 'Épaules : tape tôt sur les kimuras et les americanas, et évite de poser la main au sol derrière toi.',
  cou: 'Cou : pas d’inversions ni de berimbolo à fond, et lâche les étranglements en cravate quand tu es dessous.',
  dos: 'Dos : évite les projections arrière et les ponts explosifs. Garde les hanches basses dessus.',
};

const TRAIT_WHY = {
  guard: 'tu aimes jouer dessous', top: 'tu aimes le dessus', back: 'tu vas chercher le dos', legs: 'les jambes t’attirent',
  wrestle: 'tu luttes debout', throws: 'tu projettes', pressure: 'tu presses', mobility: 'tu bouges vite', flex: 'tu es souple',
  explo: 'tu es explosif', patience: 'tu es patient', counter: 'tu contres', gi: 'tu te sers du kimono', cardio: 'tu as du cardio',
  force: 'tu es costaud', finish: 'tu sais finir',
};

// ---------- Calcul ----------
function traitsOf(answers) {
  const T = Object.fromEntries(TRAITS.map((k) => [k, 0]));
  const add = (w, k = 1) => { for (const [t, n] of Object.entries(w || {})) T[t] = (T[t] || 0) + n * k; };
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!a) continue;
    const vals = Array.isArray(a.v) ? a.v : [a.v];
    // Les premiers choix comptent un peu plus que les suivants
    vals.forEach((x, i) => { const o = q.opts.find((y) => y.v === x); if (o) add(o.t, i === 0 ? 1 : 0.8); });
    if (a.other) {
      const t = norm(a.other);
      for (const [words, w] of FREE_WORDS) if (words.some((x) => t.includes(x))) add(w);
    }
  }
  if (v(answers, 'tenue') === 'nogi') T.gi = Math.min(T.gi, -2);
  return T;
}

function rankStyles(T, mode) {
  const tn = Math.sqrt(TRAITS.reduce((s, k) => s + Math.max(0, T[k]) ** 2, 0)) || 1;
  return Object.entries(STYLES).map(([id, st]) => {
    let dot = 0; let an = 0;
    for (const k of TRAITS) { const a = st.t[k] || 0; dot += a * T[k]; an += a * a; }
    let score = dot / (Math.sqrt(an) * tn);
    if (mode === 'nogi' && (st.t.gi || 0) > 0) score -= 0.12; // les styles « kimono » perdent en No-Gi
    return { id, score };
  }).sort((a, b) => b.score - a.score);
}

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const first = (list, exclude = []) => (list || []).find((x) => x && !['aucune', 'aucun'].includes(x) && !exclude.includes(x));

function moduleFor(kind, id) { return MOD[kind] && MOD[kind][id] ? { kind, id, ...MOD[kind][id] } : null; }

export function buildPlan(answers, profile) {
  const T = traitsOf(answers);
  const tenue = v(answers, 'tenue');
  const mode = tenue === 'nogi' ? 'nogi' : 'gi';
  const ranked = rankStyles(T, mode);
  const A = STYLES[ranked[0].id];
  const fed = REF_BY_ID[v(answers, 'regles')] ? v(answers, 'regles') : null;
  const sol = v(answers, 'sol');
  const guards = (answers.gardes && answers.gardes.v) || [];
  const passes = (answers.passages && answers.passages.v) || [];
  const route = v(answers, 'dosroute');
  const morpho = v(answers, 'morpho');
  const xp = v(answers, 'xp');

  // Module principal (plan A) : d'abord TES choix, sinon celui du style
  const styleMod = () => { const [k, id] = mode === 'nogi' && A.modNogi ? A.modNogi : A.mod; return moduleFor(k, id); };
  let main = null;
  if (sol === 'dessous') main = moduleFor('guard', first(guards));
  else if (sol === 'dessus') main = moduleFor('pass', first(passes));
  else if (sol === 'dos') main = moduleFor('back', route || 'tortue');
  if (!main && A.fam === 'guard') main = moduleFor('guard', first(guards));
  if (!main && A.fam === 'top') main = moduleFor('pass', first(passes));
  if (!main && A.fam === 'back') main = moduleFor('back', route);
  if (!main) main = styleMod();
  if (!main) main = moduleFor(sol === 'dessus' ? 'pass' : 'guard', sol === 'dessus' ? (morpho === 'lourd' || morpho === 'trapu' ? 'pression' : 'toreando') : 'fermee');
  if (mode === 'nogi' && ['araignee', 'collar'].includes(main.id)) main = moduleFor('guard', 'dlr');

  // Plan B : une autre route, d'une autre famille si possible
  let alt = null;
  if (main.kind === 'guard') alt = moduleFor('guard', first(guards, [main.id])) || moduleFor('pass', first(passes)) || moduleFor('back', route);
  else if (main.kind === 'pass') alt = moduleFor('pass', first(passes, [main.id])) || moduleFor('back', route) || moduleFor('guard', first(guards));
  else alt = moduleFor('pass', first(passes)) || moduleFor('guard', first(guards));
  if (!alt) {
    const other = ranked.map((r) => STYLES[r.id]).find((st) => { const [k, id] = mode === 'nogi' && st.modNogi ? st.modNogi : st.mod; return !(k === main.kind && id === main.id); });
    const [k, id] = mode === 'nogi' && other.modNogi ? other.modNogi : other.mod;
    alt = moduleFor(k, id);
  }
  if (mode === 'nogi' && alt && ['araignee', 'collar'].includes(alt.id)) alt = moduleFor('guard', 'papillon');
  const altStyle = ranked.map((r) => STYLES[r.id]).find((st) => st !== A && (st.mod[1] === alt.id || (st.modNogi && st.modNogi[1] === alt.id))) || STYLES[ranked[1].id];

  const stepsOf = (m) => (mode === 'nogi' && m.stepsNogi ? m.stepsNogi : m.steps);

  // Debout, avec le règlement et la morphologie
  const debout = v(answers, 'debout') || (main.kind === 'guard' ? 'tirer' : 'lutte');
  const S = STAND[debout];
  const stand = [...S.steps];
  if (fed === 'adcc' && debout === 'tirer') stand.push('En ADCC, tirer la garde pendant le temps de points te coûte un point négatif : fais-le en première moitié, ou passe par une amenée au sol.');
  if (fed === 'ibjjf' && debout === 'tirer') stand.push('En IBJJF, tirer la garde sans prise est pénalisé.');
  if (fed === 'ibjjf' && profile.belt === 'blanche' && main.id === 'fermee') stand.push('Sauter en garde fermée t’est interdit à ta ceinture : assieds-toi d’abord.');
  if (fed === 'naga' && mode === 'nogi') stand.push('En NAGA No-Gi, même une tentative de soumission rapporte des points : attaque souvent.');
  if (fed === 'gi') stand.push('Pas d’avantages en Grappling Industries : vise des points clairs.');
  if (fed === 'ajp') stand.push('En AJP, à égalité, le dernier à avoir marqué gagne : garde de l’énergie pour la fin.');

  // Conseils de morphologie et d'atouts
  const atouts = (answers.atouts && answers.atouts.v) || [];
  const tips = [];
  if (morpho === 'petit') tips.push('Plus petit que tes partenaires : cherche les angles et le dos, jamais le face-à-face en force.');
  if (morpho === 'long') tips.push('Grand et fin : tes longues jambes rendent ton triangle et tes gardes ouvertes très difficiles à passer.');
  if (morpho === 'trapu') tips.push('Trapu : ton centre de gravité bas est parfait pour les amenées au sol et les passages collés.');
  if (morpho === 'lourd') tips.push('Lourd : joue avec ton poids avant de jouer vite. Chaque seconde dessus le fatigue.');
  if (atouts.includes('cardio')) tips.push('Ton cardio est une arme : impose un rythme que ton adversaire ne peut pas tenir sur 5 minutes.');
  if (atouts.includes('explosivite')) tips.push('Ton explosivité : garde-la pour les transitions (renversements, prises de dos), pas pour forcer une prise.');
  if (atouts.includes('patience')) tips.push('Ta patience : attends la faute, la position avant la soumission.');
  if (atouts.includes('souplesse')) tips.push('Ta souplesse : elle rend ta garde presque impossible à passer, sers-t’en pour recoller tes jambes.');
  if (atouts.includes('force')) tips.push('Ta force : utilise-la pour garder les positions, pas pour arracher les soumissions.');
  if (atouts.includes('equilibre')) tips.push('Ton équilibre : il te rend dur à renverser, reste dessus et presse.');
  if (xp === '0') tips.push('Moins d’un an de pratique : une seule route, répétée lentement et proprement, vaut mieux que dix techniques.');

  // Finitions : tes préférées qui collent à tes positions, puis celles des positions
  const favs = [];
  const qs = QUESTIONS.find((x) => x.id === 'subs');
  for (const x of (answers.subs && answers.subs.v) || []) { const o = qs.opts.find((y) => y.v === x); if (o && o.sub) favs.push(o.sub); }
  const fits = [...main.subs, ...alt.subs];
  const pool = [...new Set([...favs.filter((id) => fits.includes(id)), ...main.subs, ...favs, ...alt.subs])];
  const finishes = [];
  for (const id of pool) {
    const sub = SUB_BY_ID[id];
    if (!sub) continue;
    if (mode === 'nogi' && sub.kind === 'kimono') continue;
    if (mode === 'gi' && sub.kind === 'grappling') continue;
    if (has(answers, 'fragile', 'genoux') && ['heel-in', 'heel-out'].includes(id) && !favs.includes(id)) continue;
    const why = fed ? illegalFor(fed, sub, profile, mode) : null;
    finishes.push({ id, name: sub.name, fav: favs.includes(id), warn: why });
    if (finishes.filter((f) => !f.warn).length >= 4) break;
  }
  const ok = finishes.filter((f) => !f.warn);

  // Défense prioritaire
  const diffs = (answers.difficultes && answers.difficultes.v) || [];
  const defense = (diffs.length ? diffs : [main.kind === 'guard' ? 'garde' : 'montee']).slice(0, 2).map((d) => DEFENSE[d]).filter(Boolean);

  // Clés de jambe
  const ll = v(answers, 'leglocks');
  let legs = null;
  if (tenue === 'nogi' || tenue === 'both') {
    legs = ll === 'arme'
      ? ['Entre depuis le single leg X ou l’ashi garami, jamais en sautant sur un pied isolé.', 'Contrôle ses hanches avant de chercher le talon : sans contrôle, il s’échappe.', 'Vérifie ce qui est autorisé à ta ceinture avant chaque compétition (espace Compétition).']
      : ll === 'unpeu'
        ? ['Garde la clé de cheville comme finition quand il te passe dessus.', 'Apprends une entrée simple en single leg X.', 'Et surtout la défense : cacher le talon, sortir du saddle.']
        : ['Même sans les attaquer, apprends à les défendre : cacher le talon, ne pas tourner dans le mauvais sens.', 'Dès qu’il s’assoit près de tes jambes, mets-toi en appui et contrôle ses genoux.'];
  }

  // Programme sur 4 semaines
  const freq = v(answers, 'freq') || '3';
  const reps = freq === '1' ? 10 : freq === '5' ? 25 : 15;
  const steps = stepsOf(main);
  const weeks = [
    { w: 'Semaine 1', t: 'L’entrée', drill: `${S.label} : ${lower(S.steps[0])} ${reps} répétitions, puis ${lower(steps[0])}`, spar: `Sparring de situation : debout jusqu’à ${lower(main.key)}.` },
    { w: 'Semaine 2', t: 'La position clé', drill: `${main.drills[0]}. Puis : ${lower(steps[1])}`, spar: `3 rounds de 3 minutes en partant de ${lower(main.key)}.` },
    { w: 'Semaine 3', t: 'Les finitions', drill: `${ok.slice(0, 2).map((f) => f.name).join(' et ') || 'Tes soumissions'} : ${reps} fois par séance, lent puis vite.`, spar: `${main.drills[1] || main.drills[0]}.` },
    { w: 'Semaine 4', t: 'Plan B et faiblesse', drill: `${alt.name} : ${lower(stepsOf(alt)[0])}`, spar: `2 rounds dans ta faiblesse : ${lower(defense[0].t)}. Note dans ton journal ce qui a marché.` },
  ];

  const goal = v(answers, 'objectif');
  const goalLine = {
    compet: fed ? `Objectif compétition en ${REF_BY_ID[fed].short} : demande à l’arbitre ${REF_BY_ID[fed].short} ce qui t’est interdit et ta catégorie de poids.` : 'Objectif compétition : choisis ton règlement et vérifie ce qui t’est interdit dans l’espace Compétition.',
    technique: 'Objectif technique : note dans ton journal ce qui marche et ce qui rate, après chaque cours.',
    selfdef: 'Objectif défense : travaille aussi le debout et le contrôle du dos, ce sont les positions qui comptent dans la rue.',
    plaisir: 'Objectif plaisir : garde ce plan comme fil rouge, sans pression. Le jeu viendra en jouant.',
  }[goal];

  // Pourquoi ce style : tes 3 traits les plus forts qui comptent pour lui
  const strong = TRAITS.filter((k) => (A.t[k] || 0) > 0 && T[k] > 0).sort((a, b) => T[b] * (A.t[b] || 0) - T[a] * (A.t[a] || 0)).slice(0, 3);
  const why = strong.length ? `Parce que ${strong.map((k) => TRAIT_WHY[k]).join(', ').replace(/, ([^,]*)$/, ' et $1')}.` : '';

  const notes = QUESTIONS.map((x) => (answers[x.id] && answers[x.id].other ? { q: x.q, t: answers[x.id].other } : null)).filter(Boolean);
  const role = sol === 'dessous' ? 'Joueur de garde' : sol === 'dessus' ? 'Joueur du dessus' : sol === 'dos' ? 'Chasseur de dos' : 'Polyvalent';
  const rythme = { explosif: 'Explosif', constant: 'Constant', patient: 'Patient' }[v(answers, 'rythme')];
  const top3 = ranked.slice(0, 3).map((r) => ({ name: STYLES[r.id].name, pct: Math.max(5, Math.round(Math.max(0, r.score) * 100)) }));

  // Arbre de décision : 1 → 2 → 4 (si ça passe / si ça bloque)
  const ENTRY = { tirer: 'Tirer la garde', lutte: 'Amenée au sol', judo: 'Projection', attendre: 'Attendre et contrer' };
  const short = (t) => {
    let x = String(t).split(/,| ou | puis | avant | pour | dès /)[0].trim();
    if (x.length > 28) x = x.split(/ et /)[0].trim();
    if (x.length > 34) x = x.slice(0, 34).replace(/\s+\S*$/, '') + '…';
    return x.charAt(0).toUpperCase() + x.slice(1);
  };
  const finishFor = (m, skip) => (ok.find((f) => m.subs.includes(f.id) && f.id !== skip) || ok.find((f) => f.id !== skip) || null);
  const fA = finishFor(main);
  const fB = finishFor(alt, fA && fA.id);
  const cA = main.counters[0];
  const cB = alt.counters[0];
  const altSteps = stepsOf(alt);
  // Le départ doit mener à la position clé : on tire la garde pour jouer dessous, on amène au sol pour jouer dessus.
  let entry = debout;
  if (main.kind === 'guard' && (debout === 'lutte' || debout === 'judo')) entry = 'tirer';
  if (main.kind === 'pass' && debout === 'tirer') entry = 'lutte';
  const E = STAND[entry];
  const tree = {
    label: ENTRY[entry] || E.label, detail: E.steps.slice(0, 2).join(' '),
    kids: [
      { tag: 'Ça passe', ok: true, label: main.name, detail: `${main.key}. ${steps[0]}`,
        kids: [
          { tag: 'Ça passe', ok: true, label: fA ? fA.name : 'Ta finition', detail: steps[2] || steps[1] },
          { tag: cA[0], ok: false, label: short(cA[1]), detail: `${cA[0]} : ${lower(cA[1])}.` },
        ] },
      { tag: 'Ça bloque', ok: false, label: alt.name, detail: `Plan B. ${altSteps[0]}`,
        kids: [
          { tag: 'Ça passe', ok: true, label: fB ? fB.name : short(altSteps[2] || altSteps[1]), detail: altSteps[2] || altSteps[1] },
          { tag: cB[0], ok: false, label: short(cB[1]), detail: `${cB[0]} : ${lower(cB[1])}.` },
        ] },
    ],
  };

  return {
    v: 3,
    at: Date.now(),
    mode,
    fed,
    style: { id: ranked[0].id, name: A.name, pitch: A.pitch },
    tree,
    why,
    top3,
    tags: [tenue === 'both' ? 'Gi et No-Gi' : mode === 'nogi' ? 'No-Gi' : 'Gi', role, rythme, fed ? REF_BY_ID[fed].short : null].filter(Boolean),
    flow: [
      { t: 'Debout', s: `${S.label} : ${lower(S.steps[0]).replace(/\.$/, '')}` },
      { t: 'Ta position clé', s: main.key, key: true },
      { t: 'Tes attaques', s: ok.slice(0, 3).map((f) => f.name).join(' · ') || 'À travailler' },
      { t: `S’il ${lower(main.counters[0][0]).replace(/^il /, '')}`, s: main.counters[0][1] },
      { t: `Plan B : ${alt.name}`, s: alt.key },
    ],
    stand,
    tips,
    planA: { name: main.name, steps },
    counters: main.counters,
    finishes: finishes.slice(0, 6),
    planB: { name: alt.name, style: altStyle.name, steps: stepsOf(alt).slice(0, 3) },
    defense,
    legs,
    fragile: ((answers.fragile && answers.fragile.v) || []).filter((x) => FRAGILE[x]).map((x) => FRAGILE[x]),
    weeks,
    goal: goalLine,
    notes,
    answers,
  };
}
