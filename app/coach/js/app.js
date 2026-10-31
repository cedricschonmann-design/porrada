// COACH — démarrage, onglets, en-tête.

import { state, onChange, keepStorage, isIOS, isStandalone } from './store.js';
import { h, ICON, fill, haptic, setPrefs, setTabTitle, openCount, unlockAudio, gradDefs } from './ui.js';
import * as notes from './notes.js';
import * as timer from './timer.js';
import { openSettings } from './settings.js';

const TABS = [
  { id: 'notes', label: 'Séances', icon: 'note', mod: notes },
  { id: 'timer', label: 'Timer', icon: 'timer', mod: timer },
];

const root = document.getElementById('app');
let current = null;
let tabbar = null;

function tabFromHash() {
  const id = location.hash.replace('#', '');
  return TABS.find((t) => t.id === id) ? id : 'notes';
}

export function header(title, { extra = null } = {}) {
  return h('div', { class: 'top' },
    h('h1', null, title),
    h('div', { class: 'acts' },
      extra,
      h('button', { class: 'iconbtn', 'aria-label': 'Réglages', onclick: openSettings, html: ICON.gear }),
    ),
  );
}

// Dans Safari (pas installée) : les notes resteraient dans Safari, on rappelle d'installer.
export function installBanner() {
  if (!isIOS || isStandalone) return null;
  return h('div', { class: 'card tint stack', style: { marginBottom: '14px' }, id: 'install-banner' },
    h('div', { class: 'hstack' }, h('span', { class: 'tipic', html: ICON.share }), h('div', { class: 'grow' }, h('h3', null, 'Installe l’appli'), h('div', { class: 'small muted' }, 'Partager › « Sur l’écran d’accueil ». Ouvre ensuite COACH depuis l’icône : tes notes y restent.'))),
  );
}

function syncTabbar() {
  if (!tabbar) {
    tabbar = h('nav', { class: 'tabbar two', 'aria-label': 'Navigation' }, h('span', { class: 'ind' }),
      TABS.map((t) => h('button', { type: 'button', 'data-tab': t.id, onclick: () => go(t.id) }, h('span', { html: ICON[t.icon], style: { display: 'contents' } }), t.label)));
    document.body.append(tabbar);
  }
  tabbar.style.setProperty('--i', TABS.findIndex((t) => t.id === current));
  tabbar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === current ? 'page' : 'false'));
}

export function render(anim = null) {
  const tab = TABS.find((t) => t.id === current) || TABS[0];
  const y = window.scrollY;
  const screen = h('main', { class: 'screen' + (anim ? ' ' + anim : ''), id: 'screen-' + tab.id });
  screen.append(tab.mod.render());
  fill(root, screen);
  document.body.dataset.tab = tab.id;
  setTabTitle(tab.label);
  syncTabbar();
  if (!anim) window.scrollTo(0, y);
  if (tab.mod.mounted) tab.mod.mounted(screen);
}

export function go(id) {
  if (current === id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const from = TABS.findIndex((t) => t.id === current);
  const to = TABS.findIndex((t) => t.id === id);
  current = id;
  history.replaceState(null, '', '#' + id);
  haptic('light');
  window.scrollTo(0, 0);
  render(from < 0 ? 'in-f' : to > from ? 'in-r' : 'in-l');
}

export function applyTheme() {
  const s = state.settings;
  const t = s.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  setPrefs({ sound: s.sound !== false, haptics: s.haptics !== false, timerSound: s.timerSound !== false });
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#000000' : '#f3f0f8'));
}

let pending = false;
onChange(() => {
  applyTheme();
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; if (!notes.isTyping()) render(); });
});
window.addEventListener('hashchange', () => { const t = tabFromHash(); if (t !== current) go(t); });
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// Mise à jour automatique : le nouveau service worker prend la main, on recharge
// (sauf pendant le minuteur ou une note ouverte : on attend).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    const tryReload = () => {
      if (timer.isRunning() || openCount() > 0) { setTimeout(tryReload, 5000); return; }
      reloading = true;
      location.reload();
    };
    tryReload();
  });
}

document.body.prepend(gradDefs());
applyTheme();
current = tabFromHash();
render('in-f');
keepStorage();

window.__coach = { state };
