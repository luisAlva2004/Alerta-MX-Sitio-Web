import { openDB, saveReporteOffline, getReportesOffline, clearReportesOffline } from "./indexeddb.js";

// Sincronización OFFLINE → ONLINE 
window.addEventListener("online", async () => {
    const pendientes = await getReportesOffline();
    if (pendientes.length === 0) return;

    console.log(`Sincronizando ${pendientes.length} reporte(s) pendientes...`);
    const db = await indexedDB.open("reportesDB", 2);

    let sincronizados = 0;

    for (const rep of pendientes) {
        try {
        const formData = new FormData();
        formData.append("direccion", rep.direccion);
        formData.append("descripcion", rep.descripcion);
        formData.append("departamento", rep.departamento);
        formData.append("lat", rep.lat);
        formData.append("lng", rep.lng);

        if (rep.evidencia) {
            formData.append("evidencia", rep.evidencia, rep.evidencia.name || "archivo");
        }

        const res = await fetch("/api/reportes/crear", {
            method: "POST",
            credentials: "include",
            body: formData,
        });

        if (res.ok) {
            sincronizados++;
            console.log(`Reporte sincronizado correctamente:`, rep);

            // Eliminar solo este reporte del IndexedDB
            const dbConn = await openDB();
            const tx = dbConn.transaction("reportes", "readwrite");
            const store = tx.objectStore("reportes");
            store.delete(rep.id); // eliminar por su key autoincremental
        } else {
            console.warn("Error al sincronizar un reporte:", res.statusText);
        }
        } catch (err) {
        console.error("Error subiendo reporte pendiente:", err);
        }
    }

    if (sincronizados > 0) {
        Swal.fire({
        icon: "success",
        title: "Sincronización completada",
        text: `${sincronizados} reporte(s) fueron subidos correctamente.`,
        timer: 2500,
        showConfirmButton: false,
        });
    }
});

// Contenido al cargar la página 
document.addEventListener("DOMContentLoaded", async () => {
    await verificarUsuario();
    await cargarReportes();
    inicializarMapa();

    const form = document.getElementById("formReporte");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        formData.append("lat", form.dataset.lat || "");
        formData.append("lng", form.dataset.lng || "");

        try {
            if (!navigator.onLine) {
                // Guardar reporte offline
                const nuevoReporte = {
                    direccion: formData.get("direccion"),
                    descripcion: formData.get("descripcion"),
                    departamento: formData.get("departamento"),
                    lat: formData.get("lat"),
                    lng: formData.get("lng"),
                    evidencia: form.evidencia.files[0] || null,
                    fecha: new Date().toISOString(),
                };

                await saveReporteOffline(nuevoReporte);
                Swal.fire({
                    icon: "info",
                    title: "Sin conexión",
                    text: "Tu reporte fue guardado localmente y se enviará al reconectarte.",
                    confirmButtonColor: "#3085d6",
                });
                form.reset();
                return;
            }

            const res = await fetch("/api/reportes/crear", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Error al crear reporte");

            Swal.fire({
                icon: "success",
                title: "¡Gracias!",
                text: "Tu reporte ha sido creado correctamente.",
                timer: 2000,
                showConfirmButton: false,
                scrollbarPadding: false,
                heightAuto: false
            });

            form.reset();
            cargarReportes();
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error al enviar el reporte.",
                confirmButtonColor: "#d33",
                scrollbarPadding: false,
                heightAuto: false
            });
        }
    });
});

async function verificarUsuario() {
    try {
        const res = await fetch("/api/auth/verify", {
            method: "GET",
            credentials: "include"
        });
        if (!res.ok) throw new Error("No autenticado");
        const data = await res.json();

        document.getElementById("userName").textContent = `Usuario: ${data.user.name}`;
        document.getElementById("userEmail").textContent = `Cuenta: ${data.user.email}`;
    } catch (err) {
        console.error("Error verificando usuario:", err);
        window.location.href = "/";
    }
}

async function cargarReportes() {
    try {
        if (!navigator.onLine) {
        console.warn("Sin conexión: mostrando reportes locales.");

        const reportesOffline = await getReportesOffline();
        const listaReportes = document.getElementById("listaReportes");
        listaReportes.innerHTML = "";

        if (reportesOffline.length === 0) {
            listaReportes.innerHTML = `<div class="sin-reportes"><p>No hay reportes guardados localmente.</p></div>`;
        } else {
            reportesOffline.forEach((rep) => {
            const evidenciaHTML = rep.evidencia
                ? `<p class="sin-evidencia">Archivo local adjunto (${rep.evidencia.name})</p>`
                : `<p class="sin-evidencia">Sin evidencia adjuntada</p>`;

            const reporteHTML = `
                <div class="tarjeta-reporte">
                <p><strong>Dirección:</strong> ${rep.direccion}</p>
                <p><strong>Descripción:</strong> ${rep.descripcion}</p>
                <p><strong>Departamento:</strong> ${rep.departamento}</p>
                <p><strong>Estatus:</strong> <span class="estatus pendiente">Pendiente (offline)</span></p>
                <div class="bloque-evidencia">${evidenciaHTML}</div>
                </div>`;
            listaReportes.insertAdjacentHTML("beforeend", reporteHTML);
            });
        }
      return; // Evitar fetch al servidor
    }
        const res = await fetch("/api/reportes/mis-reportes", {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Error al obtener los reportes");

        const data = await res.json();
        const listaReportes = document.getElementById("listaReportes");
        listaReportes.innerHTML = "";

        if (!data || !data.reportes || data.reportes.length === 0) {
            listaReportes.innerHTML = `
                <div class="sin-reportes">
                    <p>No hay reportes aún.</p>
                </div>
            `;
        } else {
            data.reportes.forEach((rep) => {
                let evidenciaHTML = `<p class="sin-evidencia">Sin evidencia adjuntada</p>`;

                if (rep.evidenciaUrl && rep.evidenciaUrl.trim() !== "") {
                    if (rep.evidenciaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        evidenciaHTML = `<img src="${rep.evidenciaUrl}" alt="Evidencia" class="media-evidencia">`;
                    } else if (rep.evidenciaUrl.match(/\.(mp4|webm|ogg)$/i)) {
                        evidenciaHTML = `
                            <video controls class="media-evidencia">
                                <source src="${rep.evidenciaUrl}" type="video/mp4">
                                Tu navegador no soporta el video.
                            </video>
                        `;
                    } else if (rep.evidenciaUrl.match(/\.(mp3|wav|m4a)$/i)) {
                        evidenciaHTML = `
                            <audio controls class="media-evidencia">
                                <source src="${rep.evidenciaUrl}" type="audio/mpeg">
                                Tu navegador no soporta el audio.
                            </audio>
                        `;
                    }
                }

                const reporteHTML = `
                    <div class="tarjeta-reporte">
                        <p><strong>Dirección:</strong> ${rep.direccion}</p>
                        <p><strong>Descripción:</strong> ${rep.descripcion}</p>
                        <p><strong>Departamento:</strong> ${rep.departamento}</p>
                        <p><strong>Estatus:</strong> 
                            <span class="estatus ${rep.estatus === "Resuelto" ? "resuelto" : "pendiente"}">
                                ${rep.estatus}
                            </span>
                        </p>
                        <div class="bloque-evidencia">
                            ${evidenciaHTML}
                        </div>
                    </div>
                `;
                listaReportes.insertAdjacentHTML("beforeend", reporteHTML);
            });
        }

        window.reportesCargados = data.reportes || [];
        if (typeof mapa !== "undefined" && mapa) {
            mostrarReportesEnMapa(window.reportesCargados);
        }
    } catch (error) {
        console.error("Error obteniendo reportes:", error);
    }
}

let mapa;
let marcador;

// Inicializa el mapa
function inicializarMapa() {
    mapa = L.map("map").setView([25.6866, -100.3161], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(mapa);

    mapa.on("click", async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (marcador) {
            mapa.removeLayer(marcador);
        }

        marcador = L.marker([lat, lng]).addTo(mapa);

        const form = document.getElementById("formReporte");
        form.dataset.lat = lat;
        form.dataset.lng = lng;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data && data.display_name) {
                document.getElementById("direccion").value = data.display_name;
            } else {
                document.getElementById("direccion").value = "Dirección no disponible";
            }
        } catch (error) {
            console.error("Error obteniendo dirección:", error);
            document.getElementById("direccion").value = "Error obteniendo dirección";
        }
    });

    if (window.reportesCargados && window.reportesCargados.length > 0) {
        mostrarReportesEnMapa(window.reportesCargados);
    }
}

function mostrarReportesEnMapa(reportes) {
    if (!mapa) return;

    if (window.marcadoresReportes) {
        window.marcadoresReportes.forEach((m) => mapa.removeLayer(m));
    }

    window.marcadoresReportes = [];
    const reportesConCoords = reportes.filter((r) => r.lat && r.lng);
    if (!reportesConCoords.length) return;

    reportesConCoords.forEach((rep) => {
        const lat = parseFloat(rep.lat);
        const lng = parseFloat(rep.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = L.marker([lat, lng]).addTo(mapa);
        marker.bindPopup(`
            <b>${rep.departamento}</b><br>
            ${rep.descripcion}<br>
            <small>${rep.direccion}</small>
        `);
        window.marcadoresReportes.push(marker);
    });

    const bounds = L.latLngBounds(reportesConCoords.map(r => [r.lat, r.lng]));
    mapa.fitBounds(bounds, { padding: [30, 30] });
}

async function logout() {
    try {
        const res = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        if (res.ok) {
            await Swal.fire({
                icon: "success",
                title: "Sesión cerrada",
                text: "¡Vuelve pronto!",
                timer: 2000,
                showConfirmButton: false,
                scrollbarPadding: false,
                heightAuto: false
            });
            window.location.href = "/";
        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error al cerrar sesión.",
                confirmButtonColor: "#d33",
                scrollbarPadding: false,
                heightAuto: false
            });
        }
    } catch {
        Swal.fire({
            icon: "warning",
            title: "Error",
            text: "Error de conexión, revise su internet.",
            confirmButtonColor: "rgba(137, 114, 47, 1)",
            scrollbarPadding: false,
            heightAuto: false
        });
    }
}

// --- Animación sidebar ---
const toggleButton = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
toggleButton.addEventListener("click", () => sidebar.classList.toggle("active"));
window.logout = logout;