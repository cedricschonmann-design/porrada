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
  'js/screens/settings.js',
  'js/screens/onboarding.js',
  'js/screens/chat.js',
  'js/screens/palmares.js',
  'js/people.js',
  'js/data/refbrain.js',
  'js/data/questionnaire.js',
  'js/data/submissions.js',
  'js/data/referees.js',
  'icons/bjj-192.png',
  'icons/bjj-512.png',
  'icons/bjj-maskable-512.png',
  'icons/bjj-touch-180.png',
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

// Réseau d'abord (pour avoir toujours la dernière version), et la copie enregistrée si pas de réseau.
function fromNetwork(req, timeout) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('lent')), timeout);
    fetch(req, { cache: 'no-cache' }).then((res) => { clearTimeout(t); resolve(res); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  event.respondWith(
    fromNetwork(req, nav ? 3500 : 5000).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(nav ? 'index.html' : req, copy));
      }
      return res;
    }).catch(() => caches.match(nav ? 'index.html' : req, { ignoreSearch: true }).then((r) => r || caches.match(req, { ignoreSearch: true })).then((r) => r || Response.error())),
  );
});
