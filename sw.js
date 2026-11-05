/* Offline cache. Bump VERSION whenever any cached file changes. */
const VERSION = 'v9';
const CACHE_PREFIX = `crewmate-command-${new URL(self.registration.scope).pathname}-`;
const CACHE_NAME = CACHE_PREFIX + VERSION;
const SHELL = [
  './', './index.html', './style.css', './manifest.json',
  './js/data.js', './js/art.js', './js/audio.js', './js/juice.js', './js/scene.js', './js/engine.js', './js/ui.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('crewmate-') && k !== CACHE_NAME && (k.startsWith(CACHE_PREFIX) || k.startsWith('crewmate-defense-'))).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || !u.href.startsWith(self.registration.scope)) return;
  e.respondWith(caches.open(CACHE_NAME).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    if (r.mode === 'navigate') return (await c.match('./index.html')) || fetch(r);
    return fetch(r);
  }));
});
