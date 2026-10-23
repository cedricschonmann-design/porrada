// Fonctionnement hors ligne et mise à jour automatique.
// __BUILD__ est remplacé à chaque publication : un nouveau numéro = une nouvelle version installée.
const VERSION = 'porrada-__BUILD__';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/Archivo-var.woff',
  'vendor/qrcode.js',
  'vendor/jsQR.js',
  'js/app.js',
  'js/version.js',
  'js/store.js',
  'js/ui.js',
  'js/net.js',
  'js/qr.js',
  'js/screens/jeu.js',
  'js/screens/amis.js',
  'js/screens/combat.js',
  'js/screens/journal.js',
  'js/screens/compet.js',
  'js/screens/profil.js',
  'js/data/questionnaire.js',
  'js/data/submissions.js',
  'js/data/referees.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('porrada-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
