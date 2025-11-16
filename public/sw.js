const CACHE_VERSION = 'v30'
const CACHE_NAME = `alerta-mx-${CACHE_VERSION}`;
const appShell = [
    //Assets
    "/assets/logo.png",
    "/assets/logo-512.png",
    "/assets/logo-192.png",
    "/assets/equipo.png",
    //JS
    "/js/home.js",
    "/js/login.js",
    "/js/dashboard-usuario.js",
    "/js/dashboard-gobernador.js",
    "/js/dashboard-admin.js",
    "/js/indexeddb.js",
    //styles
    "/styles/home.css",
    "/styles/login.css",
    "/styles/404.css",
    "/styles/dashboard-admin.css",
    "/styles/dashboard-gobernador.css",
    "/styles/dashboard-usuario.css",
    //Pantallas
    "/home.html",
    "/",
    "/404.html",
    "/login.html",
    "/dashboard-admin.html",
    "/dashboard-gobernador.html",
    "/dashboard-usuario.html",
    //Scripts y Librerias
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
    "https://cdn.jsdelivr.net/npm/sweetalert2@11"
];

// Instalación del service worker
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(appShell);
        })
    );
});

// Activar y eliminar cachés viejos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
        return Promise.all(
            keys.map((key) => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
            })
        );
        }).then(() => self.clients.claim())
    );
});

// Interceptar peticiones
self.addEventListener("fetch", (event) => {   
    event.respondWith(
        fetch(event.request)
        .then((networkResponse) => {
            // Guarda la respuesta más reciente
            return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
            });
        })
        .catch(() => {
            // Si no hay red, devuelve desde el caché
            return caches.match(event.request);
        })
    );
});

