// ============================================================
// Service Worker — HPM Bijih Nikel Calculator PWA
// ============================================================

const CACHE_NAME = 'hpm-nikel-v5';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './calculator.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Install: Cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: Cache-first for static, network-first for HMA
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Network-first for HMA data (hma.json & CORS proxy requests)
    if (url.includes('hma.json') || url.includes('allorigins') || url.includes('corsproxy') || url.includes('codetabs') || url.includes('minerba.esdm.go.id')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request)
                .then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
            )
    );
});
