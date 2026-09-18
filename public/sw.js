/**
 * SecureVault Progressive Web App (PWA) Service Worker
 * Enables standalone app mode, offline caching, and home-screen installation.
 */

const CACHE_NAME = 'securevault-pwa-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/css/style.css',
    '/css/dark-mode.css',
    '/js/main.js',
    '/js/pwa.js',
    '/images/cyber-bg.jpg',
    '/images/auth-bg.jpg',
    '/images/cyber-lock.jpg',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/apple-touch-icon.png',
    '/images/favicon-32x32.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

// Install Event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Pre-cache non-fatal warning:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network-first for pages/API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Bypass caching for POST/PUT/DELETE, file streaming downloads, or auth actions
    if (request.method !== 'GET' || url.pathname.startsWith('/files/download') || url.pathname.startsWith('/shared/download')) {
        return;
    }

    // HTML Navigation requests - Network-first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match(request).then((cached) => {
                    return cached || caches.match('/');
                });
            })
        );
        return;
    }

    // Static Assets - Cache-first with network fallback
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to update cache
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Offline fallback
                if (request.headers.get('accept')?.includes('image')) {
                    return caches.match('/images/icon-192.png');
                }
            });
        })
    );
});
