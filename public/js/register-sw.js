// Registrar el Service Worker en todas las pantallas
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        navigator.serviceWorker.register('/sw.js?v=30', { scope: '/' })
        .then(reg => console.log('[SW] Registrado:', reg.scope))
        .catch(err => console.error('[SW] Error:', err))
    })
}
