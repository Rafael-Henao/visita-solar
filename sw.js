<<<<<<< HEAD
const CACHE_NAME = 'visita-solar-v26';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/xlsx.full.min.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/logo-solix.png'
=======
const CACHE_NAME = 'visita-solar-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json'
>>>>>>> 5d7a901 (Modificaciones: kilovatios contratados, tipos de cliente, baterías y horas de respaldo)
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
<<<<<<< HEAD
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Network-first: intenta la red, si falla usa caché
    event.respondWith(
        fetch(event.request).then(response => {
            if (response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => {
            return caches.match(event.request).then(cached => {
                if (cached) return cached;
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
=======
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
>>>>>>> 5d7a901 (Modificaciones: kilovatios contratados, tipos de cliente, baterías y horas de respaldo)
        })
    );
});
