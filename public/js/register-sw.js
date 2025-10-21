// Registrar el Service Worker en todas las pantallas
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
            // Si hay SW anteriores con diferente versión, elimínalos
            if (!reg.active || reg.active.scriptURL.includes("?v=")) {
            await reg.unregister();
            console.log("[SW] Anterior desregistrado:", reg.scope);
            }
        }

        // Registrar la nueva versión (usa número de versión como query)
        const reg = await navigator.serviceWorker.register(`/sw.js?v=5`, { scope: "/" });
        console.log("[SW] Registrado con éxito:", reg.scope);
        } catch (err) {
        console.error("[SW] Error al registrar:", err);
        }
    });
}
