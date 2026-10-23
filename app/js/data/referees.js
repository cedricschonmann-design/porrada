// Les arbitres : un par fédération. Règles vérifiées en octobre 2026 sur les règlements officiels.
// Chaque réponse renvoie au règlement officiel, qui fait toujours foi.

import { norm } from '../ui.js';
import { SUBMISSIONS } from './submissions.js';

export const VERIFIED = 'octobre 2026';

// ---------- IBJJF : tableau des techniques interdites (manuel juin 2024) ----------
// A = 4-12 ans · B = 13-15 ans · C = 16-17 ans + ceintures blanches adultes/masters
// D = bleues et violettes · E = marrons et noires (sauf adultes en No-Gi) · F = marrons et noires adultes en No-Gi
export const IBJJF_ROWS = [
  { id: 'stretch', label: 'Soumissions qui écartent les jambes (banana split, chaise électrique)', cats: 'A' },
  { id: 'spinechoke', label: 'Étranglement avec torsion de la colonne', cats: 'AB' },
  { id: 'sfl', label: 'Clé de cheville droite', cats: 'AB' },
  { id: 'ezekiel', label: 'Ezekiel (étranglement avec la manche ou l’avant-bras)', cats: 'AB' },
  { id: 'guillotine', label: 'Guillotine de face', cats: 'AB' },
  { id: 'omoplata', label: 'Omoplata', cats: 'AB' },
  { id: 'triangle', label: 'Triangle en tirant la tête', cats: 'AB' },
  { id: 'armtri', label: 'Arm triangle', cats: 'AB' },
  { id: 'kidney', label: 'Garde fermée qui écrase les reins ou les côtes', cats: 'ABC' },
  { id: 'wrist', label: 'Clé de poignet', cats: 'ABC' },
  { id: 'bicep', label: 'Écrase-biceps', cats: 'ABCD' },
  { id: 'calf', label: 'Écrase-mollet', cats: 'ABCD' },
  { id: 'knee', label: 'Clé de genou', cats: 'ABCD' },
  { id: 'toe', label: 'Toe hold', cats: 'ABCD' },
  { id: 'sfl_turn', label: 'Clé de cheville en tournant vers le pied libre', cats: 'ABCD' },
  { id: 'heel', label: 'Clé de talon', cats: 'ABCDE' },
  { id: 'kneetwist', label: 'Clés qui tordent le genou', cats: 'ABCDE' },
  { id: 'reap', label: 'Reaping (ta jambe traverse au-dessus du genou adverse)', cats: 'ABCDE' },
  { id: 'toe_out', label: 'Toe hold avec pression vers l’extérieur', cats: 'ABCDE' },
  { id: 'slam', label: 'Slam (soulever et écraser l’adversaire)', cats: 'ABCDEF' },
  { id: 'spine', label: 'Clé de colonne sans étranglement (twister, neck crank…)', cats: 'ABCDEF' },
  { id: 'scissor', label: 'Ciseau pour amener au sol (kani basami)', cats: 'ABCDEF' },
  { id: 'fingers', label: 'Tordre les doigts vers l’arrière', cats: 'ABCDEF' },
  { id: 'headthrow', label: 'Projeter sur la tête en défendant un single leg', cats: 'ABCDEF' },
  { id: 'suplex', label: 'Suplex qui fait tomber sur la tête ou la nuque', cats: 'ABCDEF' },
];
const CAT_LABEL = {
  A: '4 à 12 ans', B: '13 à 15 ans', C: '16-17 ans et ceintures blanches', D: 'ceintures bleues et violettes',
  E: 'ceintures marron et noires', F: 'ceintures marron et noires adultes en No-Gi',
};

export function ibjjfCat(p, mode) {
  if (p.age === 'u13') return 'A';
  if (p.age === 'u16') return 'B';
  if (p.age === 'u18' || p.belt === 'blanche') return 'C';
  if (p.belt === 'bleue' || p.belt === 'violette') return 'D';
  return p.age === 'adulte' && mode === 'nogi' ? 'F' : 'E';
}

const isYouth = (p) => ['u13', 'u16', 'u18'].includes(p.age);
const level = (p) => (p.belt === 'blanche' ? 'debutant' : p.belt === 'bleue' || p.belt === 'violette' ? 'intermediaire' : 'avance');

// Une soumission est-elle interdite pour ce profil ? Renvoie la raison, ou null.
export function illegalFor(fed, sub, p, mode) {
  if (!sub) return null;
  if (mode === 'nogi' && sub.kind === 'kimono') return 'impossible sans kimono';
  if (fed === 'ibjjf') {
    if (!sub.row) return null;
    const row = IBJJF_ROWS.find((r) => r.id === sub.row);
    const cat = ibjjfCat(p, mode);
    return row && row.cats.includes(cat) ? 'interdite en IBJJF pour les ' + CAT_LABEL[cat] : null;
  }
  if (fed === 'adcc') {
    const heel = sub.row === 'heel';
    if (heel && (isYouth(p) || (p.age === 'master' && level(p) !== 'avance'))) return 'clé de talon interdite en ADCC pour ta catégorie';
    if (sub.fam === 'spine' && sub.id === 'neck-crank') return 'neck crank interdit en ADCC';
    if (sub.fam === 'spine' && isYouth(p)) return 'clés de colonne interdites en ADCC pour les jeunes';
    return null;
  }
  if (fed === 'naga') {
    if (mode === 'gi' && (sub.row === 'heel' || sub.row === 'toe')) return 'clés de talon et toe holds interdites en NAGA Gi';
    if (mode === 'nogi' && sub.row === 'heel' && (isYouth(p) || p.belt === 'blanche')) return 'clé de talon interdite en NAGA pour les débutants';
    return null;
  }
  return null;
}

// ---------- Les fiches des arbitres ----------
const T = (rows) => ({ table: rows });

function forMe(p) {
  const age = { u13: 'moins de 13 ans', u16: '13-15 ans', u18: '16-17 ans', adulte: 'adulte', master: 'master' }[p.age] || 'adulte';
  return `ceinture ${p.belt}, ${age}`;
}

export const REFEREES = [
  {
    id: 'ibjjf',
    short: 'IBJJF',
    full: 'International Brazilian Jiu-Jitsu Federation',
    hello: 'Arbitre IBJJF. Le règlement le plus utilisé en kimono : je te réponds sur les points, la durée, la pesée, la tenue et ce qui t’est interdit.',
    source: 'https://ibjjf.com/books-videos',
    sourceLabel: 'Livre de règles IBJJF et tableau des fautes (juin 2024)',
    topics: {
      points: () => ({
        title: 'Les points',
        ...T([['Amenée au sol', '2'], ['Renversement (sweep)', '2'], ['Genou sur le ventre', '2'], ['Passage de garde', '3'], ['Montée', '4'], ['Prise de dos avec crochets', '4']]),
        lines: [
          'Tiens la position 3 secondes pour que je compte les points.',
          'Avantage : tu frôles une position qui rapporte des points ou une soumission.',
          'Passer la garde puis monter en montée : 3 + 4 = 7 points.',
        ],
      }),
      duree: (p) => {
        const adult = { blanche: 5, bleue: 6, violette: 7, marron: 8, noire: 10 };
        let mine = adult[p.belt] || 5;
        if (p.age === 'master') mine = ['blanche', 'bleue'].includes(p.belt) ? 5 : 6;
        if (p.age === 'u18') mine = 5;
        if (p.age === 'u16') mine = 4;
        if (p.age === 'u13') mine = 3;
        return {
          title: `Ton combat dure ${mine} minutes`,
          ...T([['Blanche', '5 min'], ['Bleue', '6 min'], ['Violette', '7 min'], ['Marron', '8 min'], ['Noire', '10 min']]),
          lines: [
            'Ces durées sont celles des adultes (18 à 29 ans).',
            'Masters 1 : 5 min en blanche et bleue, 6 min de violette à noire. Masters 2 et plus : 5 min.',
            'Juvéniles (16-17 ans) : 5 min. Enfants : de 2 à 4 min selon l’âge.',
            `Pour toi (${forMe(p)}) : ${mine} minutes.`,
          ],
        };
      },
      pesee: (p, mode) => ({
        title: 'La pesée',
        lines: [
          'Juste avant ton premier combat, dans la zone d’appel. Pas la veille.',
          mode === 'gi' ? 'En Gi, tu te pèses avec ton kimono complet : veste, pantalon et ceinture. Compte environ 2 à 3 kg de kimono.' : 'En No-Gi, tu te pèses en rashguard et short.',
          'Un seul essai : au-dessus de la limite, tu es disqualifié.',
          mode === 'gi'
            ? 'Hommes adultes (kimono compris) : coq 57,5 · plume légère 64 · plume 70 · léger 76 · moyen 82,3 · mi-lourd 88,3 · lourd 94,3 · super-lourd 100,5 kg · ultra-lourd au-delà.'
            : 'Hommes adultes No-Gi : coq 55,5 · plume légère 61,5 · plume 67,5 · léger 73,5 · moyen 79,5 · mi-lourd 85,5 · lourd 91,5 · super-lourd 97,5 kg · ultra-lourd au-delà.',
          mode === 'gi'
            ? 'Femmes adultes (kimono compris) : coq 48,5 · plume légère 53,5 · plume 58,5 · léger 64 · moyen 69 · mi-lourd 74 · lourd 79,3 kg · super-lourd au-delà.'
            : 'Femmes adultes No-Gi : coq 46,5 · plume légère 51,5 · plume 56,5 · léger 61,5 · moyen 66,5 · mi-lourd 71,5 · lourd 76,5 kg · super-lourd au-delà.',
        ],
      }),
      tenue: (p, mode) => ({
        title: 'La tenue',
        lines: mode === 'gi' ? [
          'Kimono blanc, bleu royal ou noir, veste et pantalon de la même couleur.',
          'Ceinture de ton grade, bien nouée.',
          'Je contrôle ton kimono à la pesée : longueur des manches et du pantalon, épaisseur du col. Un kimono non conforme, c’est pas de combat.',
        ] : [
          'Rashguard et short de combat sans poches ni parties dures. Spats autorisés sous le short.',
          'Les couleurs de la tenue No-Gi sont encadrées par le règlement : vérifie-le avant l’événement.',
        ],
      }),
      egalite: () => ({
        title: 'En cas d’égalité',
        lines: [
          '1. Le plus de points gagne.',
          '2. À égalité de points : le plus d’avantages.',
          '3. Puis le moins de pénalités.',
          '4. Si tout est égal, c’est moi qui décide.',
          'Pas de prolongation dans un combat classique.',
        ],
      }),
      penalites: () => ({
        title: 'Les pénalités',
        lines: [
          '1re pénalité : notée, elle sert à départager.',
          '2e : un avantage pour ton adversaire.',
          '3e : 2 points pour ton adversaire.',
          '4e : disqualification.',
          'Passivité : si tu ne cherches pas à progresser pendant environ 20 secondes, je te pénalise.',
          'Une faute grave (comme une technique interdite à ta ceinture) peut entraîner la disqualification directe.',
        ],
      }),
      interdits: (p, mode) => {
        const cat = ibjjfCat(p, mode);
        const banned = IBJJF_ROWS.filter((r) => r.cats.includes(cat));
        const ok = IBJJF_ROWS.filter((r) => !r.cats.includes(cat) && ['heel', 'knee', 'toe', 'wrist', 'bicep', 'calf', 'reap', 'sfl'].includes(r.id));
        return {
          title: `Interdit pour toi (${CAT_LABEL[cat]}${mode === 'nogi' ? ', No-Gi' : ', Gi'})`,
          list: banned.map((r) => r.label),
          ok: ok.map((r) => r.label),
          lines: [
            (cat === 'C' || cat === 'A' || cat === 'B') ? 'Sauter en garde fermée sur un adversaire debout est une faute grave pour toi.' : null,
            cat === 'E' && p.age === 'adulte' ? 'En No-Gi, les ceintures marron et noires adultes ont le droit aux clés de talon et au reaping.' : null,
            'Faire une technique interdite à ta catégorie : disqualification.',
          ].filter(Boolean),
        };
      },
    },
  },
  {
    id: 'adcc',
    short: 'ADCC',
    full: 'Abu Dhabi Combat Club',
    hello: 'Arbitre ADCC. Ici on cherche la soumission : pas de points en première moitié, et je sanctionne ceux qui tirent la garde.',
    source: 'https://adcombat.com/adcc-rules-regulations/',
    sourceLabel: 'Règlement ADCC (mise à jour du 30 mai 2026)',
    topics: {
      points: () => ({
        title: 'Les points',
        ...T([['Passage de garde', '3'], ['Prise de dos (crochets ou triangle de corps)', '3'], ['Montée', '2'], ['Genou sur le ventre', '2'], ['Amenée au sol', '2 ou 4'], ['Renversement', '2 ou 4']]),
        lines: [
          'Amenée au sol ou renversement : 4 points si tu finis hors de sa garde, dos au sol à environ 75 %. Sinon 2.',
          'Pas de points pendant la première moitié du combat (dans les qualifs).',
          '3 secondes de contrôle, et 3 secondes entre deux positions : les points ne s’enchaînent pas.',
          'Pas d’avantages.',
        ],
      }),
      duree: (p) => ({
        title: 'La durée',
        ...T([['Opens adultes', '6 min (+3)'], ['Opens masters', '5 min (+2:30)'], ['Trials : qualifs / finales', '6 / 8 min'], ['Mondial : qualifs', '10 min (+5)'], ['Mondial : finales', '20 min (+10)']]),
        lines: [
          'Le chiffre entre parenthèses, c’est la prolongation.',
          'Première moitié sans points positifs. En finale, les points négatifs comptent dès le début.',
          'Jeunes : 4 min (+2) jusqu’à 12 ans, 5 min (+2:30) à partir de 13 ans.',
          p.age === 'master' ? 'Pour toi en Open : 5 minutes.' : isYouth(p) ? '' : 'Pour toi en Open : 6 minutes.',
        ].filter(Boolean),
      }),
      pesee: () => ({
        title: 'La pesée',
        lines: [
          'Le règlement ADCC ne fixe pas l’heure de la pesée : elle est indiquée dans les infos de chaque événement.',
          'Regarde ta convocation et pèse-toi avant de partir pour éviter les surprises.',
        ],
      }),
      tenue: () => ({
        title: 'La tenue',
        lines: [
          'Kimono et chaussures de lutte : facultatifs. La plupart combattent en rashguard et short.',
          'Aucune substance glissante sur le corps ni sur la tenue.',
          'Interdit d’agripper le t-shirt ou le short de l’adversaire.',
        ],
      }),
      egalite: () => ({
        title: 'En cas d’égalité',
        lines: [
          'Égalité à la fin du temps réglementaire : prolongation, et cette fois les points comptent.',
          'Toujours égal : les juges décident en jugeant tout le combat, pas seulement la prolongation.',
        ],
      }),
      penalites: () => ({
        title: 'Les points négatifs',
        lines: [
          'Tirer la garde ou t’asseoir sans raison pendant le temps de points : point négatif.',
          'Rester au sol volontairement plus de 3 secondes : point négatif.',
          'Reculer et fuir le contact : point négatif.',
          'Passivité : deux avertissements, puis un point négatif.',
          'Combat arrangé entre coéquipiers : les deux sont disqualifiés.',
        ],
      }),
      interdits: (p) => {
        const lv = level(p);
        const list = ['Slams', 'Neck crank (par exemple le full nelson)', 'Planter l’adversaire sur la tête en l’amenant au sol', 'Guillotine en crossface qui tord le menton', 'Rouler vers l’avant quand l’adversaire a ses crochets dans ton dos', 'Coups, doigts dans les yeux, morsures, moins de 4 doigts ou 5 orteils'];
        if (isYouth(p)) list.push('Clés de talon', 'Clés de colonne');
        if (p.age === 'master' && lv !== 'avance') list.push('Clés de talon');
        if (lv !== 'avance' && !isYouth(p)) list.push('Ciseau pour amener au sol (kani basami)');
        return {
          title: `Interdit pour toi (${forMe(p)})`,
          list,
          ok: isYouth(p) ? [] : ['Clés de jambe et de cheville', p.age === 'master' && lv !== 'avance' ? null : 'Clés de talon', 'Clés de poignet', 'Can opener et twister'].filter(Boolean),
          lines: ['Niveau ADCC : débutant = ceinture blanche (0 à 2 ans), avancé = marron et noire (4 ans et plus).'],
        };
      },
    },
  },
  {
    id: 'ajp',
    short: 'AJP',
    full: 'Abu Dhabi Jiu-Jitsu Pro',
    hello: 'Arbitre AJP. Le circuit du Grand Slam et du World Pro : pas d’avantages, chaque petite action vaut un point.',
    source: 'https://ajptour.com/en/ajp-competition-regulations',
    sourceLabel: 'Règlement des compétitions AJP et modifications de 2020',
    topics: {
      points: () => ({
        title: 'Les points',
        ...T([['Amenée au sol', '2'], ['Renversement', '2'], ['Genou sur le ventre', '2'], ['Passage de garde', '3'], ['Montée', '4'], ['Prise de dos', '4']]),
        lines: [
          'Depuis 2020 sur le Grand Slam Tour et le World Pro : plus d’avantages. Ce qui valait un avantage vaut 1 point.',
          'Chaque pénalité donne 1 point à ton adversaire.',
          'Ces règles concernent les ceintures bleues à noires.',
        ],
      }),
      duree: () => ({
        title: 'La durée',
        lines: [
          'Grand Slam Tour et World Pro : 5 minutes pour tous les combats, finales comprises.',
          'Pour les autres événements AJP (nationaux, enfants, masters), l’organisateur indique la durée dans le programme.',
        ],
      }),
      pesee: () => ({
        title: 'La pesée',
        lines: [
          'Sans kimono : t-shirt opaque et short jusqu’aux genoux, ou pantalon de kimono et t-shirt, ou kimono complet. Pas de singlet ni de short trop court.',
          'L’horaire dépend de l’événement : la veille, une heure avant ou pendant le tournoi.',
          'Pièce d’identité avec photo obligatoire, sinon disqualification.',
          'Pas de pesée = disqualification. Poids raté : tu passes dans la catégorie disponible au-dessus.',
        ],
      }),
      tenue: () => ({
        title: 'La tenue',
        lines: [
          'Kimono et ceinture noués en permanence dans la zone d’attente et sur le tapis.',
          'Sur le podium : en kimono, sans chaussures, casquette ni t-shirt de club ou de sponsor.',
          'Couleurs du kimono : vérifie le règlement de l’événement.',
        ],
      }),
      egalite: () => ({
        title: 'En cas d’égalité',
        lines: [
          'Égalité de points : celui qui a marqué en dernier gagne.',
          '0-0, ou seulement des points de pénalités : 1 minute de point en or, le premier qui marque gagne.',
          'Toujours rien : c’est moi qui décide.',
          'En poule (6 ou moins) : victoires, puis soumissions, puis points marqués, puis confrontation directe.',
        ],
      }),
      penalites: () => ({
        title: 'Les pénalités',
        lines: [
          'Chaque pénalité = 1 point pour ton adversaire.',
          'Disqualification : pesée manquée, pas de pièce d’identité, fausse date de naissance, combat arrangé.',
        ],
      }),
      interdits: () => ({
        title: 'Ce qui est interdit',
        list: ['Slams'],
        lines: [
          'L’AJP a son propre tableau des techniques interdites selon ta ceinture et ton âge. Je n’ai pas encore la version vérifiée ici : ouvre le règlement officiel avant de combattre.',
        ],
      }),
    },
  },
  {
    id: 'naga',
    short: 'NAGA',
    full: 'North American Grappling Association',
    hello: 'Arbitre NAGA. Gi et No-Gi, divisions par niveau : en No-Gi, même une tentative de soumission rapporte des points.',
    source: 'https://www.nagafighter.com/wp-content/uploads/naga-rules.pdf',
    sourceLabel: 'Règlement NAGA (PDF officiel)',
    topics: {
      points: (p, mode) => (mode === 'nogi' ? {
        title: 'Les points en No-Gi',
        ...T([['Amenée au sol', '2'], ['Renversement', '2'], ['Contrôle latéral', '2'], ['Montée', '2'], ['Prise de dos', '2'], ['Genou sur le ventre', '2'], ['Tentative de soumission', '1 ou 2']]),
        lines: ['Tiens la position 2 secondes.', 'Tentative franche : 1 point. Tentative complète et forte : 2 points.'],
      } : {
        title: 'Les points en Gi',
        ...T([['Amenée au sol', '2'], ['Renversement', '2'], ['Genou sur le ventre', '2'], ['Passage de garde', '3'], ['Montée', '4'], ['Prise de dos', '4']]),
        lines: ['Tiens la position 3 secondes.', 'Avantages pour les actions presque réussies : un seul point vaut plus que tous les avantages.'],
      }),
      duree: (p) => {
        let mine = 4;
        if (p.age === 'adulte') mine = { blanche: 4, bleue: 5 }[p.belt] || 6;
        if (isYouth(p)) mine = 3;
        return {
          title: `Ton combat dure ${mine} minutes`,
          ...T([['Adultes débutants (blanche)', '4 min'], ['Adultes intermédiaires (bleue)', '5 min'], ['Adultes experts (violette et +)', '6 min'], ['Masters 30 ans et +', '4 min'], ['Enfants et ados', '3 min (4 en expert)']]),
          lines: ['Prolongation : 2 minutes pour les adultes, 1 minute pour les jeunes. Une seule, sans mort subite.'],
        };
      },
      pesee: () => ({
        title: 'La pesée',
        lines: ['Tu peux te peser sans kimono.', 'L’horaire est indiqué dans les infos de l’événement.'],
      }),
      tenue: (p, mode) => ({
        title: 'La tenue',
        lines: mode === 'nogi' ? [
          'Short à cordon sans poches ni fermeture éclair.',
          'Coquille (hommes) et protège-dents obligatoires.',
          'Chaussures de lutte et protège-oreilles autorisés. Pas de strap excessif.',
        ] : [
          'Kimono de toutes les couleurs. Manches et pantalon jusqu’au poignet et à la cheville (pas plus de 4 cm au-dessus).',
          'Rashguard sous le kimono autorisé, t-shirt interdit.',
          'Coquille (hommes) et protège-dents obligatoires. Pas de chaussures ni de protège-oreilles en Gi.',
        ],
      }),
      egalite: () => ({
        title: 'En cas d’égalité',
        lines: ['Une prolongation de 2 minutes (1 minute pour les jeunes), sans pause.', 'Pas de mort subite : le premier point ne suffit pas, on va au bout de la prolongation.'],
      }),
      penalites: (p, mode) => ({
        title: 'Les pénalités',
        lines: mode === 'nogi'
          ? ['1re faute : avertissement (parfois un 2e).', '3e et 4e : 1 point pour l’adversaire.', '5e : disqualification.']
          : ['1re faute : avertissement.', '2e : un avantage pour l’adversaire.', '3e : 2 points pour l’adversaire.', '4e : disqualification.'],
      }),
      interdits: (p, mode) => {
        const list = ['Slams', 'Écraser la trachée', 'Tordre les doigts, les orteils et les petites articulations'];
        if (mode === 'nogi') {
          if (p.belt === 'blanche' || isYouth(p)) list.push('Clés de talon');
          if (isYouth(p)) list.push('Toe holds', 'Neck cranks', 'Clés de poignet', 'Écrase-mollet et écrase-biceps', 'Ezekiel');
        } else {
          list.push('Clés de talon', 'Toe holds', 'Clés de poignet et neck cranks aux niveaux débutants');
        }
        return {
          title: `Interdit pour toi (${forMe(p)}, ${mode === 'nogi' ? 'No-Gi' : 'Gi'})`,
          list,
          ok: mode === 'nogi' && !isYouth(p) ? ['Clé de cheville', 'Clé de genou', 'Toe hold', 'Neck crank', 'Clé de poignet', p.belt === 'blanche' ? null : 'Clé de talon'].filter(Boolean) : [],
          lines: ['Ciseau pour amener au sol : autorisé seulement si ta main touche le tapis d’abord.', 'Sauter en garde : autorisé chez les adultes.'],
        };
      },
    },
  },
  {
    id: 'gi',
    short: 'GI',
    full: 'Grappling Industries',
    hello: 'Arbitre Grappling Industries. Ici tu combats en poule : plusieurs combats garantis, pas d’avantages.',
    source: 'https://grapplingindustries.com/rules/',
    sourceLabel: 'Règlement Grappling Industries (9 février 2026)',
    topics: {
      points: () => ({
        title: 'Les points',
        ...T([['Montée', '4'], ['Prise de dos', '4'], ['Passage de garde', '3'], ['Renversement', '2'], ['Amenée au sol', '2'], ['Genou sur le ventre', '2'], ['Soumission forte stoppée hors surface', '2']]),
        lines: ['Tiens la position 3 secondes.', 'Pas d’avantages.'],
      }),
      duree: () => ({
        title: 'La durée',
        lines: ['5 minutes pour les adultes, masters et seniors, en Gi comme en No-Gi.'],
      }),
      format: () => ({
        title: 'Le format',
        lines: [
          '2 inscrits : le meilleur des 3 combats.',
          '3 à 5 inscrits : poule, tout le monde se rencontre.',
          '6 à 9 : poules, les 2 premiers vont en finale. 10 et plus : demi-finales et finale.',
          'Classement de poule : victoires, puis soumissions, puis confrontation directe, puis points marqués, puis points encaissés.',
          'Les catégories absolues se font à élimination directe.',
        ],
      }),
      pesee: () => ({
        title: 'La pesée',
        lines: [
          'Jusqu’à 60 minutes au plus tard avant le début de ta catégorie.',
          'Aucune marge : tu dois être pile au poids ou en dessous. Poids raté = disqualifié, sans remboursement.',
          'En Gi, tu peux te peser sans kimono. Inscrit en Gi et en No-Gi : une seule pesée.',
        ],
      }),
      tenue: (p, mode) => ({
        title: 'La tenue',
        lines: mode === 'gi' ? [
          'Kimono de toutes les couleurs, veste et pantalon peuvent être différents.',
          'Rashguard ajusté sous le kimono autorisé, t-shirt interdit.',
          'Kimono déchiré, mouillé, trop court ou sale : on te demandera de te changer.',
        ] : [
          'Short sans poches ni métal, du milieu de la cuisse au genou. Spats autorisés.',
          'Rashguard de toutes les couleurs, manches jusqu’au poignet maximum. Pas torse nu.',
          'Interdits : coquille, protège-oreilles, bijoux, lunettes.',
        ],
      }),
      egalite: () => ({
        title: 'En cas d’égalité',
        lines: ['Égalité de points : celui qui a le moins de pénalités gagne.', 'Toujours égal : je décide selon la menace de soumission, puis la domination, puis l’agressivité.'],
      }),
      penalites: () => ({
        title: 'Les pénalités',
        lines: ['1re : avertissement.', '2e : 2 points pour ton adversaire.', '3e, ou faute grave : disqualification.'],
      }),
      interdits: (p) => ({
        title: 'Ce qui est interdit',
        list: ['Slams : soulever et lâcher l’adversaire sans contrôle', 'Planter l’adversaire sur la tête ou la nuque', p.belt === 'blanche' || isYouth(p) ? 'Reaping : 1re fois pénalité, 2e fois disqualification' : null].filter(Boolean),
        lines: [
          'Faire ou forcer une technique interdite à ton niveau : disqualification.',
          'Le tableau complet des techniques par niveau est dans le règlement officiel : vérifie-le avant de t’inscrire.',
        ],
      }),
    },
  },
];

export const REF_BY_ID = Object.fromEntries(REFEREES.map((r) => [r.id, r]));

export const QUICK = [
  ['points', 'Les points'], ['duree', 'Durée du combat'], ['pesee', 'La pesée'], ['tenue', 'La tenue'],
  ['egalite', 'En cas d’égalité'], ['interdits', 'Ce qui m’est interdit'], ['penalites', 'Les pénalités'], ['format', 'Le format'],
];

const KEYWORDS = {
  pesee: ['pese', 'poids', 'balance', 'kilo', 'kg', 'peser', 'categorie de poids', 'weigh'],
  duree: ['duree', 'combien de temps', 'minute', 'temps', 'dure', 'long', 'chrono', 'prolongation', 'overtime'],
  points: ['point', 'score', 'marque', 'vaut', 'montee', 'passage', 'renvers', 'sweep', 'amene', 'takedown', 'avantage', 'dos', 'genou sur'],
  tenue: ['tenue', 'kimono', 'rashguard', 'rash', 'short', 'couleur', 'habit', 'vetement', 'spats', 'chaussure', 'coquille', 'protege'],
  egalite: ['egal', 'ex aequo', 'nul', 'departag', 'decision', 'tie'],
  penalites: ['penal', 'faute', 'avertissement', 'disqual', 'passiv', 'negatif', 'sanction', 'tirer la garde'],
  interdits: ['interdit', 'autoris', 'legal', 'droit', 'slam', 'reap', 'kani', 'ciseau', 'cle de', 'heel', 'talon'],
  format: ['format', 'poule', 'tableau', 'combien de combat', 'elimination', 'round robin'],
};

function findSub(q) {
  const nq = ' ' + norm(q) + ' ';
  let best = null;
  for (const s of SUBMISSIONS) {
    const names = [s.name, ...s.alt.split(',')].map((x) => norm(x).trim()).filter((x) => x.length > 3);
    for (const n of names) {
      if (nq.includes(n) && (!best || n.length > best.len)) best = { sub: s, len: n.length };
    }
  }
  return best && best.sub;
}

export function answer(ref, question, p, mode) {
  const q = norm(question);
  const sub = findSub(question);
  if (sub) {
    const why = illegalFor(ref.id, sub, p, mode);
    const unknown = ['ajp', 'gi'].includes(ref.id) && !why;
    return {
      title: sub.name,
      lines: [
        unknown
          ? `Je n’ai pas le tableau vérifié de ${ref.short} pour cette technique. Regarde le règlement officiel avant de l’utiliser.`
          : why
            ? `Non : ${why}.`
            : `Oui, elle n’est pas interdite pour toi (${forMe(p)}, ${mode === 'nogi' ? 'No-Gi' : 'Gi'}).`,
        sub.kind === 'kimono' ? 'C’est une soumission qui se fait avec le kimono.' : null,
      ].filter(Boolean),
      verdict: unknown ? null : !why,
    };
  }
  let topic = null;
  let bestScore = 0;
  for (const [k, words] of Object.entries(KEYWORDS)) {
    if (!ref.topics[k]) continue;
    const score = words.reduce((n, w) => n + (q.includes(w) ? w.length : 0), 0);
    if (score > bestScore) { bestScore = score; topic = k; }
  }
  if (!topic) {
    return {
      title: 'Je n’ai pas compris',
      lines: ['Demande-moi les points, la durée, la pesée, la tenue, l’égalité, les pénalités, ou si une soumission est autorisée (par exemple : « clé de talon autorisée ? »).'],
    };
  }
  return ref.topics[topic](p, mode);
}
