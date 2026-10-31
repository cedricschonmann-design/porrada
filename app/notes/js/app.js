// Notes — démarrage.

import { state, onChange, keepStorage } from './store.js';
import { fill, setPrefs, setTabTitle, openCount, unlockAudio, gradDefs } from './ui.js';
import * as home from './home.js';

const root = document.getElementById('app');

export function render(anim = null) {
  const y = window.scrollY;
  const screen = document.createElement('main');
  screen.className = 'screen' + (anim ? ' ' + anim : '');
  screen.id = 'screen-home';
  screen.append(home.render());
  fill(root, screen);
  setTabTitle('Notes');
  if (!anim) window.scrollTo(0, y);
}

export function applyTheme() {
  const s = state.settings;
  const t = s.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  setPrefs({ sound: s.sound !== false, haptics: s.haptics !== false, timerSound: false });
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#000000' : '#f3f0f8'));
}

let pending = false;
onChange(() => {
  applyTheme();
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; if (!home.isTyping()) render(); else { const once = () => { document.removeEventListener('focusout', once); setTimeout(() => { if (!home.isTyping()) render(); }, 200); }; document.addEventListener('focusout', once); } });
});
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// Mise à jour automatique (on attend qu'aucune note ne soit ouverte)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    const tryReload = () => { if (openCount() > 0 || home.isTyping()) { setTimeout(tryReload, 5000); return; } reloading = true; location.reload(); };
    tryReload();
  });
}

document.body.prepend(gradDefs());
applyTheme();
render('in-f');
keepStorage();
// Revenu sur l'appli un autre jour : la journée et les suivis se mettent à jour
let lastDay = new Date().toDateString();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && new Date().toDateString() !== lastDay) { lastDay = new Date().toDateString(); if (!openCount()) render(); } });

window.__notes = { state };
