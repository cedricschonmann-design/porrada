// Répertoire des soumissions.
// kind : 'kimono'    → impossible sans kimono (saisies du col, du revers, de la manche)
//        'grappling' → surtout pratiquée en No-Gi (clés de talon, twister…)
//        'both'      → marche avec et sans kimono
// row : ligne du tableau des techniques interdites de l'IBJJF (voir referees.js)

export const FAMILIES = {
  choke: 'Étranglement',
  arm: 'Clé de bras / épaule',
  leg: 'Clé de jambe',
  spine: 'Colonne / nuque',
};

export const SUBMISSIONS = [
  // Étranglements
  { id: 'rnc', name: 'Étranglement arrière', alt: 'mata-leão, rear naked choke, RNC, sleeper', fam: 'choke', kind: 'both' },
  { id: 'triangle', name: 'Triangle', alt: 'sankaku jime, triangle de jambes, triangle monté, triangle inversé', fam: 'choke', kind: 'both', row: 'triangle' },
  { id: 'arm-triangle', name: 'Arm triangle', alt: 'kata gatame, étranglement tête-bras, head and arm', fam: 'choke', kind: 'both', row: 'armtri' },
  { id: 'guillotine', name: 'Guillotine', alt: 'high elbow, arm-in, mârcelotine', fam: 'choke', kind: 'both', row: 'guillotine' },
  { id: 'darce', name: "D'Arce", alt: 'darce, brabo no-gi', fam: 'choke', kind: 'both' },
  { id: 'anaconda', name: 'Anaconda', alt: 'anaconda choke', fam: 'choke', kind: 'both' },
  { id: 'peruvian', name: 'Cravate péruvienne', alt: 'peruvian necktie', fam: 'choke', kind: 'both' },
  { id: 'japanese', name: 'Cravate japonaise', alt: 'japanese necktie', fam: 'choke', kind: 'both' },
  { id: 'von-flue', name: 'Von Flue', alt: 'von flue choke', fam: 'choke', kind: 'both' },
  { id: 'north-south', name: 'Étranglement nord-sud', alt: 'north south choke', fam: 'choke', kind: 'both' },
  { id: 'gogoplata', name: 'Gogoplata', alt: 'gogo', fam: 'choke', kind: 'both' },
  { id: 'buggy', name: 'Buggy choke', alt: 'buggy', fam: 'choke', kind: 'both' },
  { id: 'ezekiel', name: 'Ezekiel', alt: 'sode guruma jime, étranglement avec la manche', fam: 'choke', kind: 'both', row: 'ezekiel' },
  { id: 'cross-collar', name: 'Étranglement croisé', alt: 'cross collar choke, juji jime, au col', fam: 'choke', kind: 'kimono' },
  { id: 'bow-arrow', name: 'Arc et flèche', alt: 'bow and arrow choke', fam: 'choke', kind: 'kimono' },
  { id: 'baseball', name: 'Batte de baseball', alt: 'baseball bat choke', fam: 'choke', kind: 'kimono' },
  { id: 'clock', name: 'Étranglement horloge', alt: 'clock choke', fam: 'choke', kind: 'kimono' },
  { id: 'loop', name: 'Loop choke', alt: 'boucle', fam: 'choke', kind: 'kimono' },
  { id: 'sliding-collar', name: 'Col coulissant', alt: 'sliding collar choke, okuri eri jime', fam: 'choke', kind: 'kimono' },
  { id: 'lapel', name: 'Étranglement au revers', alt: 'lapel choke, worm guard, revers', fam: 'choke', kind: 'kimono' },
  { id: 'paper-cutter', name: 'Paper cutter', alt: 'coupe-papier', fam: 'choke', kind: 'kimono' },
  { id: 'brabo', name: 'Brabo', alt: "D'Arce au revers, lapel d'arce", fam: 'choke', kind: 'kimono' },
  { id: 'single-wing', name: 'Single wing', alt: 'kata ha jime', fam: 'choke', kind: 'kimono' },
  { id: 'bread-cutter', name: 'Bread cutter', alt: 'coupe-pain', fam: 'choke', kind: 'kimono' },
  { id: 'gi-choke-back', name: 'Étranglement au col depuis le dos', alt: 'collar choke from back', fam: 'choke', kind: 'kimono' },

  // Bras et épaules
  { id: 'armbar', name: 'Clé de bras', alt: 'armbar, juji gatame, armlock', fam: 'arm', kind: 'both' },
  { id: 'kimura', name: 'Kimura', alt: 'ude garami inversé, double clé', fam: 'arm', kind: 'both' },
  { id: 'americana', name: 'Americana', alt: "ude garami, clé d'épaule, keylock", fam: 'arm', kind: 'both' },
  { id: 'omoplata', name: 'Omoplata', alt: 'ashi sankaku garami', fam: 'arm', kind: 'both', row: 'omoplata' },
  { id: 'wristlock', name: 'Clé de poignet', alt: 'wrist lock, mão de vaca', fam: 'arm', kind: 'both', row: 'wrist' },
  { id: 'bicep', name: 'Écrase-biceps', alt: 'bicep slicer, bicep crusher', fam: 'arm', kind: 'both', row: 'bicep' },
  { id: 'tarikoplata', name: 'Tarikoplata', alt: 'tariko', fam: 'arm', kind: 'both' },
  { id: 'baratoplata', name: 'Baratoplata', alt: 'barato', fam: 'arm', kind: 'both' },
  { id: 'monoplata', name: 'Monoplata', alt: 'mono', fam: 'arm', kind: 'both' },

  // Jambes
  { id: 'ankle', name: 'Clé de cheville droite', alt: 'straight ankle lock, footlock, chave de pé, clé de cheville, clé de pied', fam: 'leg', kind: 'both', row: 'sfl' },
  { id: 'kneebar', name: 'Clé de genou', alt: 'kneebar, chave de joelho', fam: 'leg', kind: 'both', row: 'knee' },
  { id: 'toehold', name: 'Toe hold', alt: "clé d'orteils, clé de pied tordue", fam: 'leg', kind: 'both', row: 'toe' },
  { id: 'calf', name: 'Écrase-mollet', alt: 'calf slicer, calf crusher', fam: 'leg', kind: 'both', row: 'calf' },
  { id: 'heel-in', name: 'Clé de talon intérieure', alt: 'inside heel hook, heel hook, clé de talon, talon', fam: 'leg', kind: 'grappling', row: 'heel' },
  { id: 'heel-out', name: 'Clé de talon extérieure', alt: 'outside heel hook, heel hook', fam: 'leg', kind: 'grappling', row: 'heel' },
  { id: 'banana', name: 'Banana split', alt: 'grand écart', fam: 'leg', kind: 'both', row: 'stretch' },
  { id: 'electric', name: 'Chaise électrique', alt: 'electric chair', fam: 'leg', kind: 'both', row: 'stretch' },

  // Colonne et nuque
  { id: 'twister', name: 'Twister', alt: 'twister 10th planet', fam: 'spine', kind: 'grappling', row: 'spine' },
  { id: 'can-opener', name: 'Can opener', alt: 'ouvre-boîte, neck crank de la garde', fam: 'spine', kind: 'both', row: 'spine' },
  { id: 'neck-crank', name: 'Neck crank', alt: 'cervicale, clé de nuque', fam: 'spine', kind: 'both', row: 'spine' },
];

export const SUB_BY_ID = Object.fromEntries(SUBMISSIONS.map((s) => [s.id, s]));
export const KIND_LABEL = { kimono: 'Kimono', grappling: 'Grappling', both: 'Les deux' };

export function subName(id) {
  if (!id) return 'Soumission';
  return (SUB_BY_ID[id] && SUB_BY_ID[id].name) || 'Soumission';
}

// Soumissions possibles selon la tenue du combat
export function subsFor(mode) {
  return SUBMISSIONS.filter((s) => (mode === 'nogi' ? s.kind !== 'kimono' : true));
}
