// ============================================================
// Service Worker — HPM Bijih Nikel Calculator PWA
//
// Strategi: NETWORK-FIRST untuk semua file milik situs ini.
// Selalu ambil versi terbaru dari server; cache hanya dipakai saat offline.
// Install tidak pernah gagal: tiap file di-cache sendiri-sendiri, dan file
// pihak ketiga (mis. Google Fonts) tidak ikut, sehingga satu file yang
// diblokir jaringan tidak menghalangi pembaruan aplikasi.
// ============================================================

const CACHE_NAME = 'hpm-nikel-v6';
const CORE = [
    './',
    './index.html',
    './styles.css',
    './calculator.js',
    './hma.json',
    './manifest.json',
    './logo.png',
    './icon-192.png',
    './icon-512.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.allSettled(
                CORE.map(url => cache.add(new Request(url, { cache: 'reload' })))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Hanya tangani file milik situs ini; permintaan ke domain lain
    // (Google Fonts, CDN, proxy) dibiarkan berjalan normal.
    if (new URL(req.url).origin !== self.location.origin) return;

    // Revalidasi ke server (ETag) agar tidak tertahan cache HTTP 10 menit
    const netReq = req.mode === 'navigate'
        ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        : new Request(req, { cache: 'no-cache' });

    event.respondWith(
        fetch(netReq)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
                }
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(req, { ignoreSearch: true });
                if (cached) return cached;
                if (req.mode === 'navigate') {
                    const shell = await caches.match('./index.html');
                    if (shell) return shell;
                }
                return Response.error();
            })
    );
});
