const CACHE_VERSION = 'v6'
const CACHE_NAME = `alerta-mx-${CACHE_VERSION}`;
const appShell = [
    "/home.html",
    "/styles/home.css",
    "/js/home.js",
    "/assets/logo.png",
    "/assets/logo-512.png",
    "/assets/logo-192.png",
    "/assets/equipo.png",
    "/",
    "/404.html",
    "/styles/404.css",
    "/login.html",
    "/styles/login.css",
    "/js/login.js"
];

// Instalación del service worker
self.addEventListener("install", (event) => {
    console.log('[ServiceWorker] Instalando...')
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Archivos cacheados');
        return cache.addAll(appShell);
        })
    );
});

// Activar y eliminar cachés viejos
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activado');
    event.waitUntil(
        caches.keys().then((keys) => {
        return Promise.all(
            keys.map((key) => {
            if (key !== CACHE_NAME) {
                console.log('[ServiceWorker] Eliminando caché antiguo:', key);
                return caches.delete(key);
            }
            })
        );
        })
    );
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
            // Solo guarda si la respuesta es válida
            if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
                });
            }
            return networkResponse;
            })
            .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
        })
    );
});

