// Création d'avatar : on voit son personnage changer en direct.

import { h, fill, ICON, seg, toggle, sfx, haptic, push } from '../ui.js';
import { avatarSvg, SKIN, EYES, HAIRC, HAIR, BEARD, GI, CLOTH, PATCHES, DEFAULT_AV, randomAv } from '../avatar.js';

const TABS = [['corps', 'Corps'], ['visage', 'Visage'], ['cheveux', 'Cheveux'], ['tenue', 'Tenue'], ['details', 'Détails']];

export function openAvatarEditor(initial, { belt = 'blanche', stripes = 0, onSave = null, title = 'Mon avatar' } = {}) {
  let av = { ...DEFAULT_AV, ...(initial || {}) };
  let tab = 'corps';
  push((page) => {
    const stage = h('div', { class: 'stage' }, h('div', { class: 'mat' }));
    const tabsEl = h('div', { class: 'ctabs', role: 'tablist' });
    const panel = h('div');
    let raf = 0;
    const paint = (bounce) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const old = stage.querySelector('svg');
        const tmp = h('div', { html: avatarSvg(av, { mode: 'full', belt, stripes }) });
        const svg = tmp.firstElementChild;
        if (old) old.replaceWith(svg); else stage.append(svg);
        if (bounce) svg.classList.add('bounce');
      });
    };
    const set = (k, v, opts = {}) => {
      av = { ...av, [k]: v };
      if (!opts.quiet) { sfx('pop'); haptic('light'); }
      paint(!opts.quiet);
      if (opts.redraw !== false) drawPanel();
    };

    const swatches = (k, colors, labels) => h('div', { class: 'swatches' }, colors.map((c, i) => h('button', {
      class: 'swatch', style: { background: c }, 'aria-pressed': String(av[k] === i), 'aria-label': labels ? labels[i] : `Couleur ${i + 1}`, 'data-silent': '',
      onclick: () => set(k, i),
    })));
    const block = (label, ...kids) => h('div', { class: 'opt-block' }, h('div', { class: 'label' }, label), ...kids);
    const slider = (k, left, right, label) => {
      const r = h('input', { class: 'range', type: 'range', min: '0', max: '100', step: '1', value: String(av[k]), 'aria-label': label });
      let last = av[k];
      r.addEventListener('input', () => {
        av = { ...av, [k]: Number(r.value) };
        paint(false);
        if (Math.abs(av[k] - last) >= 10) { last = av[k]; haptic('light'); }
      });
      r.addEventListener('change', () => sfx('pop'));
      return h('div', null, r, h('div', { class: 'range-ends' }, h('span', null, left), h('span', null, right)));
    };
    const tiles = (k, items, preview) => h('div', { class: 'tiles' }, items.map(([v, l]) => {
      const t = h('button', { class: 'tile', 'aria-pressed': String(av[k] === v), 'aria-label': l, 'data-silent': '', onclick: () => set(k, v) });
      if (preview) {
        t.innerHTML = avatarSvg({ ...av, [k]: v }, { mode: 'bust', belt, stripes });
        t.append(h('span', { class: 'lbl' }, l));
      } else t.textContent = l;
      return t;
    }));

    const drawPanel = () => {
      fill(tabsEl, ...TABS.map(([id, l]) => h('button', {
        role: 'tab', 'aria-pressed': String(tab === id), 'data-silent': '',
        onclick: () => { tab = id; sfx('tab'); drawPanel(); },
      }, l)));
      if (tab === 'corps') {
        fill(panel,
          block('Sexe', seg([['m', 'Homme'], ['f', 'Femme']], av.sex, (v) => {
            av = { ...av, sex: v, beard: v === 'f' ? 'none' : av.beard };
            paint(true); drawPanel();
          })),
          block('Couleur de peau', swatches('skin', SKIN)),
          block('Corpulence', slider('build', 'Mince', 'Fort', 'Corpulence')),
          block('Muscles', slider('muscle', 'Fin', 'Très musclé', 'Muscles')),
        );
      } else if (tab === 'visage') {
        fill(panel,
          block('Yeux', swatches('eyes', EYES.map((e) => e[1]), EYES.map((e) => e[0]))),
          av.sex === 'm' ? block('Barbe', tiles('beard', BEARD, true)) : null,
          block('Oreilles', seg([['normal', 'Normales'], ['chou', 'En chou-fleur']], av.ears, (v) => set('ears', v))),
        );
      } else if (tab === 'cheveux') {
        fill(panel,
          block('Couleur', swatches('hairColor', HAIRC)),
          block('Coupe', tiles('hair', HAIR, true)),
        );
      } else if (tab === 'tenue') {
        const kind = av.outfit === 'gi' ? 'gi' : 'rash';
        fill(panel,
          block('Tenue', seg([['gi', 'Kimono'], ['rash', 'Rashguard et short']], kind, (v) => set('outfit', v))),
          kind === 'gi'
            ? block('Couleur du kimono', swatches('gi', GI.map((g) => g[1]), GI.map((g) => g[0])))
            : [
              block('Couleur du rashguard', swatches('rash', CLOTH)),
              block('Manches', seg([['long', 'Longues'], ['short', 'Courtes']], av.sleeve, (v) => set('sleeve', v))),
              block('Couleur du short', swatches('shorts', CLOTH)),
            ],
          h('p', { class: 'hint' }, 'La ceinture de ton kimono suit ta vraie ceinture.'),
        );
      } else {
        fill(panel,
          block('Patch sur la poitrine', tiles('patchChest', PATCHES, false)),
          block('Patch sur la jambe', tiles('patchLeg', PATCHES, false)),
          h('div', { class: 'group noicon' },
            h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'Doigts strappés')), toggle(av.tape, (v) => set('tape', v, { quiet: true, redraw: false }), 'Doigts strappés')),
          ),
        );
      }
    };

    page.setRight(h('button', {
      class: 'iconbtn', 'aria-label': 'Au hasard', html: ICON.dice, onclick: () => {
        av = { ...randomAv(av.sex), sex: av.sex };
        paint(true); drawPanel(); sfx('levelup'); haptic('medium');
      },
    }));
    paint(false);
    drawPanel();
    return h('div', null,
      h('h1', { class: 'page-title' }, title),
      stage, tabsEl, panel,
      h('div', { class: 'q-foot' }, h('button', {
        class: 'btn primary lg block', id: 'av-save', onclick: () => {
          sfx('success'); haptic('medium');
          page.close({ silent: true });
          onSave && onSave(av);
        },
      }, 'Enregistrer mon avatar')),
    );
  }, { title, modal: true });
}
