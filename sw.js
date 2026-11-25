const cacheName = 'mera-v11';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([
    './', './index.html', './app.js', './app.webmanifest', './icon.svg', './style.css'
  ])));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('mera-') && key !== cacheName).map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => (
    await caches.match(event.request) || (event.request.mode === 'navigate' && await caches.match('./')) || Response.error()
  )));
});
