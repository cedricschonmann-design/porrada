// PORRADA — démarrage, onglets, en-tête.

import { state, save, onChange, unreadTotal, keepStorage, isIOS, isStandalone } from './store.js';
import { h, ICON, fill, sfx, haptic, setPrefs, setTabTitle, openCount, unlockAudio, gradDefs } from './ui.js';
import { startNet, onStatus, netStatus, deliver } from './net.js';
import { scan } from './qr.js';
import { avatarOf } from './people.js';
import * as jeu from './screens/jeu.js';
import * as amis from './screens/amis.js';
import * as journal from './screens/journal.js';
import * as compet from './screens/compet.js';
import * as combat from './screens/combat.js';
import { openSettings, openMyProfile, transferAccount } from './screens/settings.js';
import { startOnboarding } from './screens/onboarding.js';

const TABS = [
  { id: 'jeu', label: 'Mon jeu', icon: 'game', mod: jeu },
  { id: 'amis', label: 'Amis', icon: 'friends', mod: amis },
  { id: 'journal', label: 'Journal', icon: 'journal', mod: journal },
  { id: 'compet', label: 'Compétition', icon: 'compet', mod: compet },
];

const root = document.getElementById('app');
let current = null;
let tabbar = null;
let screenEl = null;

function tabFromHash() {
  const id = location.hash.replace('#', '');
  return TABS.find((t) => t.id === id) ? id : 'jeu';
}

export function header(title, { extra = null } = {}) {
  return h('div', { class: 'top' },
    h('h1', null, title),
    h('div', { class: 'acts' },
      extra,
      h('button', { class: 'iconbtn', 'aria-label': 'Réglages', onclick: openSettings, html: ICON.gear }),
      avatarOf(state.me, { size: 42, ring: true, dot: netStatus() === 'online', onclick: openMyProfile, label: 'Mon profil' }),
    ),
  );
}

function buildTabbar() {
  tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Navigation' }, h('span', { class: 'ind' }),
    TABS.map((t) => h('button', { type: 'button', 'data-tab': t.id, onclick: () => go(t.id) }, h('span', { html: ICON[t.icon], style: { display: 'contents' } }), t.label)));
  document.body.append(tabbar);
}

function syncTabbar() {
  if (!tabbar) buildTabbar();
  const i = TABS.findIndex((t) => t.id === current);
  tabbar.style.setProperty('--i', i);
  tabbar.querySelectorAll('button').forEach((b) => {
    b.setAttribute('aria-current', b.dataset.tab === current ? 'page' : 'false');
    const old = b.querySelector('.badge');
    if (old) old.remove();
    if (b.dataset.tab === 'amis') {
      const n = unreadTotal();
      if (n) b.append(h('span', { class: 'badge' }, n > 9 ? '9+' : n));
    }
  });
}

export function render(anim = null) {
  if (!booted || !state.me || !state.me.onboarded) return;
  const tab = TABS.find((t) => t.id === current) || TABS[0];
  const y = window.scrollY;
  const screen = h('main', { class: 'screen' + (anim ? ' ' + anim : ''), id: 'screen-' + tab.id });
  screen.append(tab.mod.render());
  if (isIOS && !isStandalone) { const top = screen.querySelector('.top'); if (top) top.after(installBanner()); }
  fill(root, screen);
  screenEl = screen;
  document.body.dataset.tab = tab.id;
  setTabTitle(tab.label);
  syncTabbar();
  if (!anim) window.scrollTo(0, y);
}

// Dans Safari (pas installée) : on rappelle d'installer l'appli et de transférer le compte.
function installBanner() {
  return h('div', { class: 'card tint stack', style: { marginBottom: '14px' }, id: 'install-banner' },
    h('div', { class: 'hstack' }, h('span', { class: 'tipic', html: ICON.share }), h('div', { class: 'grow' }, h('h3', null, 'Installe l’appli'), h('div', { class: 'small muted' }, 'Ici, tu es dans Safari. Ton compte doit aller dans l’appli installée.'))),
    h('div', { class: 'small' }, '1. Touche « Transférer mon compte » pour copier ton code.  2. Partager › « Sur l’écran d’accueil ».  3. Ouvre l’icône, « J’ai déjà un compte », colle le code.'),
    h('button', { class: 'btn primary block', onclick: transferAccount }, 'Transférer mon compte'),
  );
}

export function go(id) {
  if (current === id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const from = TABS.findIndex((t) => t.id === current);
  const to = TABS.findIndex((t) => t.id === id);
  current = id;
  history.replaceState(null, '', '#' + id);
  sfx('tab');
  haptic('light');
  window.scrollTo(0, 0);
  render(from < 0 ? 'in-f' : to > from ? 'in-r' : 'in-l');
}

// Scanner universel : un code peut être une carte d'ami, une invitation, un résultat…
export async function scanAny(hint) {
  const msg = await scan({ hint });
  if (msg) deliver(msg, 'qr');
}

export function applyTheme() {
  const s = state.settings;
  const t = s.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  document.documentElement.classList.toggle('reduce-motion', !!s.reduceMotion);
  setPrefs({ sound: s.sound !== false, haptics: s.haptics !== false, timerSound: s.timerSound !== false });
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#000000' : '#f3f0f8'));
}

let booted = false;
function boot() {
  applyTheme();
  current = tabFromHash();
  const first = !booted;
  booted = true;
  render('in-f');
  if (!first) return;
  keepStorage();
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
window.addEventListener('hashchange', () => { const t = tabFromHash(); if (t !== current) go(t); });
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// Mise à jour automatique : le nouveau service worker prend la main, on recharge
// (sauf pendant un combat, un cours ou un écran ouvert : on attend).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    const busy = () => combat.isBusy() || !!state.course || openCount() > 0 || document.querySelector('.scanner, .onb');
    const tryReload = () => {
      if (busy()) { setTimeout(tryReload, 5000); return; }
      reloading = true;
      location.reload();
    };
    tryReload();
  });
}

document.body.prepend(gradDefs());
if (state.me && state.me.onboarded) boot();
else startOnboarding(() => boot());

window.__porrada = { state, save, deliver };
