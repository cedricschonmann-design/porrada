// PORRADA — démarrage, navigation et profil.

import { state, save, createMe, onChange } from './store.js';
import { h, ICON, sheet, full, toast, seg, belt, avatar, BELTS, AGES, unlockAudio } from './ui.js';
import { startNet, onStatus, netStatus, deliver } from './net.js';
import { scan } from './qr.js';
import * as jeu from './screens/jeu.js';
import * as amis from './screens/amis.js';
import * as journal from './screens/journal.js';
import * as compet from './screens/compet.js';
import * as combat from './screens/combat.js';
import { openProfile } from './screens/profil.js';

const TABS = [
  { id: 'jeu', label: 'Mon jeu', icon: 'game', mod: jeu },
  { id: 'amis', label: 'Amis', icon: 'friends', mod: amis },
  { id: 'journal', label: 'Journal', icon: 'journal', mod: journal },
  { id: 'compet', label: 'Compét.', icon: 'compet', mod: compet },
];

const root = document.getElementById('app');
let current = null;

function tabFromHash() {
  const id = location.hash.replace('#', '');
  return TABS.find((t) => t.id === id) ? id : 'jeu';
}

export function header(title, extra) {
  const dot = netStatus() === 'online';
  return h('div', { class: 'top' },
    h('h1', { class: 'tape' }, title),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
      extra || null,
      avatar(state.me.name, { me: true, dot, onclick: openProfile }),
    ),
  );
}

export function render() {
  if (!state.me) return;
  const tab = TABS.find((t) => t.id === current) || TABS[0];
  const y = window.scrollY;
  const screen = h('main', { class: 'screen', id: 'screen-' + tab.id });
  screen.append(tab.mod.render());
  const nav = h('nav', { class: 'tabs', 'aria-label': 'Navigation' },
    TABS.map((t) => h('button', {
      type: 'button',
      'aria-current': t.id === tab.id ? 'page' : null,
      onclick: () => go(t.id),
    }, h('span', { class: 'ic', html: ICON[t.icon] }), t.label)),
  );
  root.replaceChildren(screen, nav);
  window.scrollTo(0, y);
}

export function go(id) {
  if (current === id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  current = id;
  history.replaceState(null, '', '#' + id);
  window.scrollTo(0, 0);
  render();
}

// Scanner universel : un code peut être une carte d'ami, une invitation, une réponse…
export async function scanAny(hint) {
  const msg = await scan({ hint });
  if (msg) deliver(msg, 'qr');
}

function onboarding() {
  let b = 'blanche';
  let age = 'adulte';
  const name = h('input', { class: 'input', placeholder: 'Ton prénom', maxlength: '24', autocomplete: 'given-name', 'aria-label': 'Ton prénom' });
  const close = full((closeIt) => h('div', { class: 'inner stack' },
    h('div', { style: { margin: '18px 0 8px' } }, h('h1', { class: 'tape accent', style: { fontSize: '44px' } }, 'PORRADA')),
    h('p', { class: 'muted' }, 'Ton jeu, tes combats, ton journal, et les règles des compétitions. Tout reste sur ton téléphone.'),
    h('label', { class: 'field' }, h('span', null, 'Comment tu t’appelles ?'), name),
    h('div', { class: 'field' }, h('span', null, 'Ta ceinture'),
      h('div', { class: 'list' }, (() => {
        const wrap = h('div', { class: 'chips' });
        const draw = () => wrap.replaceChildren(...BELTS.map(([v, l]) => h('button', {
          class: 'chip', type: 'button', 'aria-pressed': String(v === b), onclick: () => { b = v; draw(); },
        }, belt(v, 0), l)));
        draw();
        return wrap;
      })()),
    ),
    h('label', { class: 'field' }, h('span', null, 'Ta catégorie d’âge'),
      (() => {
        const sel = h('select', { class: 'input', onchange: (e) => { age = e.target.value; } }, AGES.map(([v, l]) => h('option', { value: v, selected: v === age }, l)));
        return sel;
      })(),
    ),
    h('p', { class: 'small muted' }, 'La ceinture et l’âge servent à te dire ce qui t’est interdit en compétition.'),
    h('button', {
      class: 'btn primary block big', onclick: () => {
        if (!name.value.trim()) { toast('Écris ton prénom.'); name.focus(); return; }
        createMe({ name: name.value, belt: b, stripes: 0, age });
        closeIt();
        boot();
      },
    }, 'C’est parti'),
  ), {});
  setTimeout(() => name.focus(), 300);
  return close;
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  window.__porradaMute = state.settings.sound === false;
}

function boot() {
  applyTheme();
  current = tabFromHash();
  render();
  startNet();
  combat.resume();
  journal.resume();
}

let pending = false;
onChange(() => {
  applyTheme();
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; render(); });
});
onStatus(() => render());
window.addEventListener('hashchange', () => { const t = tabFromHash(); if (t !== current) { current = t; render(); } });
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
document.addEventListener('click', unlockAudio, { once: true });

// Mise à jour automatique : le nouveau service worker prend la main, on recharge
// (sauf pendant un combat ou un cours, on attend la fin).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    const busy = () => combat.isBusy() || !!state.course || document.querySelector('.full, .sheet, .scanner, .board');
    const tryReload = () => {
      if (busy()) { setTimeout(tryReload, 5000); return; }
      reloading = true;
      location.reload();
    };
    tryReload();
  });
}

if (state.me) boot(); else onboarding();
window.__porrada = { state, save, deliver };
