// Les arbitres, version « personnages » : qui ils sont, et comment ils comprennent les questions précises
// (catégorie de poids, valeur d'une position, situations de combat, techniques autorisées).
// Personnages fictifs : les réponses viennent des règlements officiels (voir referees.js).

import { norm } from '../ui.js';
import { REF_BY_ID, answer as topicAnswer, findSub, KEYWORDS, forMe, isYouth, IBJJF_ROWS, ibjjfCat } from './referees.js';

export const CHARS = {
  ibjjf: {
    name: 'Paulo', line: 'Précis, à cheval sur le règlement.',
    av: { sex: 'm', skin: 4, eyes: 0, hair: 'court', hairColor: 0, beard: 'mustache', build: 55, muscle: 40, outfit: 'polo', acc: ['whistle'], ears: 'chou' },
    hello: 'Bom dia ! Moi c’est Paulo, arbitre IBJJF. Demande-moi tout : points, durée, pesée, ta catégorie, ce qui t’est interdit à ta ceinture.',
  },
  adcc: {
    name: 'Sami', line: 'Direct. Ici, on cherche la soumission.',
    av: { sex: 'm', skin: 3, eyes: 5, hair: 'chauve', hairColor: 0, beard: 'full', build: 68, muscle: 85, outfit: 'tee', rash: 0, acc: ['whistle'], ears: 'chou' },
    hello: 'Salut, Sami, arbitre ADCC. Chez moi pas de points au début et je punis ceux qui tirent la garde. Vas-y, pose ta question.',
  },
  ajp: {
    name: 'Leïla', line: 'Calme, elle va droit au but.',
    av: { sex: 'f', skin: 2, eyes: 1, hair: 'chignon', hairColor: 0, beard: 'none', build: 35, muscle: 45, outfit: 'polo', acc: ['headset'] },
    hello: 'Bonjour, je suis Leïla, arbitre AJP. Grand Slam, World Pro : pas d’avantages chez nous, chaque action vaut un point. Je t’écoute.',
  },
  naga: {
    name: 'Mike', line: 'Sympa, il connaît chaque niveau par cœur.',
    av: { sex: 'm', skin: 0, eyes: 3, hair: 'boucle', hairColor: 5, beard: 'stubble', build: 50, muscle: 45, outfit: 'striped', acc: ['whistle'] },
    hello: 'Hey ! Mike, arbitre NAGA. Gi, No-Gi, débutant ou expert : dis-moi ce que tu veux savoir.',
  },
  gi: {
    name: 'Jess', line: 'Organisée, la reine des poules.',
    av: { sex: 'f', skin: 1, eyes: 2, hair: 'carre', hairColor: 4, beard: 'none', build: 40, muscle: 40, outfit: 'hoodie', acc: ['whistle', 'glasses'] },
    hello: 'Salut, c’est Jess, arbitre Grappling Industries. Ici tu combats en poule, plusieurs combats garantis. Une question ?',
  },
};

// ---------- Catégories de poids ----------
const IB_NAMES = ['Coq', 'Plume légère', 'Plume', 'Léger', 'Moyen', 'Mi-lourd', 'Lourd', 'Super-lourd', 'Ultra-lourd'];
const IB = {
  gi: { m: [57.5, 64, 70, 76, 82.3, 88.3, 94.3, 100.5], f: [48.5, 53.5, 58.5, 64, 69, 74, 79.3] },
  nogi: { m: [55.5, 61.5, 67.5, 73.5, 79.5, 85.5, 91.5, 97.5], f: [46.5, 51.5, 56.5, 61.5, 66.5, 71.5, 76.5] },
};
const ADCC_W = {
  opens: { m: [60, 65, 70, 76, 83, 91, 100], f: [50, 55, 60, 65, 70] },
  worlds: { m: [66, 77, 88, 99], f: [55, 65] },
};
const kg = (n) => String(n).replace('.', ',');
const pickClass = (limits, w) => { const i = limits.findIndex((l) => w <= l); return i < 0 ? limits.length : i; };

function weightAnswer(ref, w, p, mode) {
  const sex = p.sex === 'f' ? 'f' : 'm';
  const who = sex === 'f' ? 'Femmes' : 'Hommes';
  if (ref.id === 'ibjjf') {
    const lim = IB[mode][sex];
    const withGi = mode === 'gi' ? Math.round((w + 2.5) * 10) / 10 : w;
    const i = pickClass(lim, withGi);
    const name = sex === 'f' && i === lim.length ? 'Super-lourd' : IB_NAMES[i];
    const limit = lim[i];
    const close = limit && limit - withGi < 1.2;
    return {
      title: `Catégorie ${name}`,
      verdict: null,
      lines: [
        mode === 'gi' ? `Avec ${kg(w)} kg sans kimono, tu pèses environ ${kg(withGi)} kg avec : ${who} adultes, ${name}${limit ? ` (jusqu’à ${kg(limit)} kg kimono compris)` : ''}.` : `Avec ${kg(w)} kg : ${who} adultes, ${name}${limit ? ` (jusqu’à ${kg(limit)} kg)` : ''}.`,
        close ? 'Tu es juste sous la limite : un seul essai à la pesée, ne prends pas de risque.' : null,
        'Mêmes catégories pour les masters. Les juvéniles et les enfants ont leurs propres catégories.',
      ].filter(Boolean),
      table: lim.map((l, k) => [IB_NAMES[k], `${kg(l)} kg`]).concat([[sex === 'f' ? 'Super-lourd' : 'Ultra-lourd', `+ ${kg(lim[lim.length - 1])} kg`]]),
      follow: ['La pesée', mode === 'gi' ? 'Et en No-Gi ?' : 'Et en Gi ?', 'Durée de mon combat'],
    };
  }
  if (ref.id === 'adcc') {
    const o = ADCC_W.opens[sex]; const wc = ADCC_W.worlds[sex];
    const io = pickClass(o, w); const iw = pickClass(wc, w);
    const lab = (lim, i) => (i < lim.length ? `-${lim[i]} kg` : `+${lim[lim.length - 1]} kg`);
    return {
      title: `En Open : ${lab(o, io)}`,
      lines: [`Avec ${kg(w)} kg (${who}) : catégorie ${lab(o, io)} dans les Opens, ${lab(wc, iw)} au Mondial.`, 'Pas de kimono en ADCC : tu te pèses en tenue de combat. L’horaire de la pesée est donné par chaque événement.'],
      table: [['Opens', o.map((l) => `-${l}`).join(' · ') + ` · +${o[o.length - 1]}`], ['Mondial', wc.map((l) => `-${l}`).join(' · ') + ` · +${wc[wc.length - 1]}`]],
      follow: ['La pesée', 'Durée du combat', 'Ce qui m’est interdit'],
    };
  }
  return {
    title: 'Ça dépend de l’événement',
    lines: [`Chez ${ref.short}, les catégories de poids changent selon le niveau et l’événement : regarde la page d’inscription.`, `Avec ${kg(w)} kg, garde une marge d’un kilo pour la pesée.`],
    follow: ['La pesée', 'Durée du combat'],
  };
}

// ---------- Valeur d'une position ----------
const POS = [
  [['montee', 'mount', 'monter'], 'Montée'],
  [['prise de dos', 'dos', 'back', 'crochets'], 'Prise de dos'],
  [['passage', 'passer', 'pass'], 'Passage de garde'],
  [['renvers', 'sweep', 'balay'], 'Renversement'],
  [['amenee', 'amener', 'takedown', 'projection', 'projeter', 'double leg', 'single leg'], 'Amenée au sol'],
  [['genou sur', 'knee on', 'knee-on'], 'Genou sur le ventre'],
  [['lateral', 'side control', '100 kg'], 'Contrôle latéral'],
  [['tentative'], 'Tentative de soumission'],
];
function positionAnswer(ref, q, p, mode) {
  if (!/(combien|vaut|valent|point|rapporte|marque)/.test(q)) return null;
  const hit = POS.find(([kws]) => kws.some((k) => q.includes(k)));
  if (!hit) return null;
  const pts = ref.topics.points(p, mode);
  const row = (pts.table || []).find(([label]) => norm(label).startsWith(norm(hit[1])));
  if (!row) {
    return { title: hit[1], lines: [`${hit[1]} : ça ne rapporte pas de points à part chez ${ref.short}${mode === 'nogi' ? ' en No-Gi' : ''}.`], table: pts.table, follow: ['Les points'] };
  }
  return {
    title: `${row[0]} : ${row[1]} point${row[1] === '1' ? '' : 's'}`,
    verdict: null,
    lines: [...(pts.lines || []).slice(0, 2)],
    follow: ['Les points', 'En cas d’égalité', 'Les pénalités'],
  };
}

// ---------- Situations ----------
const SITUATIONS = [
  {
    kw: ['tirer la garde', 'tire la garde', 'pull guard', 'pull'],
    a: {
      ibjjf: () => ({ title: 'Tirer la garde : oui', verdict: true, lines: ['C’est autorisé, mais prends d’abord une prise sur ton adversaire : tirer la garde sans prise est pénalisé.', 'Sauter en garde fermée, c’est autre chose : demande-moi « sauter en garde ».'] }),
      adcc: () => ({ title: 'Tirer la garde : ça coûte cher', verdict: null, lines: ['Pendant le temps de points, tirer la garde ou t’asseoir sans raison te donne un point négatif.', 'En première moitié (sans points), tu peux le faire.'] }),
    },
  },
  {
    kw: ['sauter en garde', 'saute en garde', 'jump guard', 'sauter garde', 'sauter'],
    a: {
      ibjjf: (p, mode) => {
        const c = ibjjfCat(p, mode);
        const banned = ['A', 'B', 'C'].includes(c);
        return { title: banned ? 'Sauter en garde fermée : non' : 'Sauter en garde : avec prudence', verdict: banned ? false : null, lines: [banned ? 'Pour toi, sauter en garde fermée sur un adversaire debout est une faute grave : disqualification.' : 'Les règles sur le saut en garde fermée sont strictes : si ton adversaire a une jambe en arrière et se blesse, c’est pour toi. Assieds-toi plutôt.', 'Et pense à avoir une prise avant de tirer la garde.'] };
      },
      naga: () => ({ title: 'Sauter en garde : oui chez les adultes', verdict: true, lines: ['Autorisé chez les adultes en NAGA.'] }),
    },
  },
  {
    kw: ['slam', 'souleve', 'soulever', 'ecraser au sol'],
    a: { all: (p, mode, ref) => ({ title: 'Slam : non', verdict: false, lines: [`Soulever l’adversaire et l’écraser au sol est interdit en ${ref.short}, quelle que soit ta ceinture.`, 'S’il te soulève dans ta garde, ouvre-la ou lâche la prise.'] }) },
  },
  {
    kw: ['doigts dans', 'dans la manche', 'dans les manches', 'dans le pantalon'],
    a: { ibjjf: () => ({ title: 'Doigts dans les manches : non', verdict: false, lines: ['Mettre tes doigts à l’intérieur de sa manche ou de son pantalon est une faute : pénalité.', 'Tiens le tissu par l’extérieur.'] }) },
  },
  {
    kw: ['agripper le short', 'attraper le short', 'tenir le short', 'tirer le short', 'agripper le rash', 'tenir le rash', 'attraper le rash', 'le t-shirt', 'sa tenue'],
    a: {
      adcc: () => ({ title: 'Agripper sa tenue : non', verdict: false, lines: ['Interdit d’agripper le t-shirt ou le short de l’adversaire.'] }),
      ibjjf: (p, mode) => (mode === 'nogi' ? { title: 'Agripper sa tenue en No-Gi : non', verdict: false, lines: ['En No-Gi, tu ne peux pas tenir son short ni son rashguard : pénalité.'] } : null),
    },
  },
  {
    kw: ['sortir du tapis', 'sortir de la zone', 'sors du tapis', 'fuir', 'hors de la zone', 'sortie de zone'],
    a: { ibjjf: () => ({ title: 'Sortir pour fuir : sanctionné', verdict: false, lines: ['Sortir de la zone de combat pour échapper à une position ou à une soumission est sanctionné, jusqu’à la disqualification.', 'Si vous sortez sans le faire exprès, je vous arrête et vous replace au centre.'] }) },
  },
  {
    kw: ['abandon', ' taper', ' tape ', ' tap ', ' crier', ' cri '],
    a: { all: () => ({ title: 'Abandonner', verdict: null, lines: ['Tu tapes avec la main ou le pied sur l’adversaire ou le tapis, ou tu dis que tu abandonnes.', 'Si tu cries de douleur dans une soumission, je peux arrêter le combat : ça compte comme un abandon.', 'Tape tôt : une articulation, ça ne se rattrape pas.'] }) },
  },
  {
    kw: ['ongle', 'cheveux', 'bijou', 'alliance', 'bague', 'piercing', 'lunettes', 'hygiene'],
    a: { all: (p, mode, ref) => ({ title: 'Hygiène et objets', verdict: null, lines: ['Ongles des mains et des pieds coupés court.', 'Cheveux longs attachés avec un élastique souple.', 'Pas de bijoux, de bagues ni de piercings, et rien de dur sur toi.', ref.id === 'gi' ? 'Lunettes, coquille et protège-oreilles interdits en No-Gi chez Grappling Industries.' : null].filter(Boolean) }) },
  },
  {
    kw: ['master', ' age ', ' ans ', 'categorie d age', 'categories d age'],
    a: {
      ibjjf: (p) => ({ title: 'Les catégories d’âge', table: [['Juvéniles', '16-17 ans'], ['Adultes', '18 ans et +'], ['Master 1', '30 ans et +'], ['Master 2', '36 ans et +'], ['Master 3', '41 ans et +'], ['Master 4', '46 ans et +'], ['Master 5', '51 ans et +'], ['Master 6', '56 ans et +'], ['Master 7', '61 ans et +']], lines: ['C’est l’année de naissance qui compte.', p.age === 'master' ? 'Tu peux aussi t’inscrire chez les adultes.' : null].filter(Boolean) }),
    },
  },
  {
    kw: ['kani', 'ciseau', 'scissor'],
    a: {
      ibjjf: () => ({ title: 'Ciseau (kani basami) : non', verdict: false, lines: ['Interdit en IBJJF pour toutes les ceintures.'] }),
      naga: () => ({ title: 'Ciseau : seulement main au sol', verdict: null, lines: ['Autorisé seulement si ta main touche le tapis d’abord.'] }),
    },
  },
  {
    kw: ['reaping', 'reap'],
    a: {
      ibjjf: (p, mode) => {
        const c = ibjjfCat(p, mode);
        const ok = c === 'F';
        return { title: ok ? 'Reaping : oui pour toi' : 'Reaping : non', verdict: ok, lines: [ok ? 'Autorisé pour les ceintures marron et noires adultes en No-Gi.' : 'Interdit pour toi : seules les ceintures marron et noires adultes en No-Gi y ont droit.'] };
      },
    },
  },
];

function situationAnswer(ref, q, p, mode) {
  for (const s of SITUATIONS) {
    if (!s.kw.some((k) => q.includes(k))) continue;
    const fn = s.a[ref.id] || s.a.all;
    if (!fn) return { title: 'Je n’ai pas cette règle vérifiée', verdict: null, lines: [`Je préfère ne pas inventer : regarde le règlement ${ref.short} pour ce point précis.`], follow: ['Ce qui m’est interdit', 'Les pénalités'] };
    const r = fn(p, mode, ref);
    if (r) return { follow: ['Les pénalités', 'Ce qui m’est interdit'], ...r };
  }
  return null;
}

// ---------- Point d'entrée ----------
const TOPIC_FOLLOW = {
  points: ['Combien vaut une montée ?', 'En cas d’égalité', 'Les pénalités'],
  duree: ['Ma catégorie de poids', 'En cas d’égalité', 'La pesée'],
  pesee: ['Ma catégorie de poids', 'La tenue'],
  tenue: ['La pesée', 'Hygiène et ongles'],
  egalite: ['Les points', 'Les pénalités'],
  penalites: ['Tirer la garde ?', 'Sortir du tapis ?'],
  interdits: ['Clé de talon autorisée ?', 'Slam ?', 'Les pénalités'],
  format: ['Durée du combat', 'La pesée'],
};

export function reply(ref, question, p, mode) {
  const q = ' ' + norm(question) + ' ';
  // poids
  const m = q.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:kg|kilo)/) || (/(pese|poids|categorie)/.test(q) && q.match(/\b(\d{2,3}(?:[.,]\d)?)\b/));
  if (m || /(ma categorie|quelle categorie|categorie de poids|mon poids)/.test(q)) {
    const w = m ? Number(m[1].replace(',', '.')) : p.weight;
    if (w && w >= 25 && w <= 250) return weightAnswer(ref, w, p, mode);
    if (!m && /(categorie|poids)/.test(q) && !/pesee|peser/.test(q)) return { title: 'Dis-moi ton poids', lines: ['Écris par exemple « 78 kg », ou ajoute ton poids dans les réglages : je te donnerai ta catégorie.'], follow: ['78 kg, quelle catégorie ?'] };
  }
  // une soumission précise
  const sub = findSub(question);
  if (sub && !/(combien|vaut)/.test(q)) {
    const r = topicAnswer(ref, question, p, mode);
    return { ...r, follow: ['Ce qui m’est interdit', 'Les pénalités'] };
  }
  const pos = positionAnswer(ref, q, p, mode);
  if (pos) return pos;
  const sit = situationAnswer(ref, q, p, mode);
  if (sit) return sit;
  // un thème (points, durée, pesée…)
  let topic = null;
  let best = 0;
  for (const [k, words] of Object.entries(KEYWORDS)) {
    if (!ref.topics[k]) continue;
    const score = words.reduce((n, w) => n + (q.includes(w) ? w.length : 0), 0);
    if (score > best) { best = score; topic = k; }
  }
  if (topic) return { ...ref.topics[topic](p, mode), follow: TOPIC_FOLLOW[topic] || [] };
  return {
    title: 'Je n’ai pas compris',
    lines: ['Essaie avec des mots simples : « combien vaut une montée ? », « 78 kg, quelle catégorie ? », « clé de talon autorisée ? », « tirer la garde ? ».'],
    follow: ['Les points', 'Ce qui m’est interdit', 'Ma catégorie de poids'],
  };
}

export function topicReply(ref, topic, p, mode) {
  return { ...ref.topics[topic](p, mode), follow: TOPIC_FOLLOW[topic] || [] };
}

export { REF_BY_ID, forMe, isYouth, IBJJF_ROWS };
