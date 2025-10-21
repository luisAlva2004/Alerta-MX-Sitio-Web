//Contenido a la hora de cargar la página
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
        const res = await fetch("/api/reportes/crear", {
            method: "POST",
            credentials: "include",
            body: formData,
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Error al crear reporte");

        alert("Reporte creado correctamente");
        form.reset();
        cargarReportes();
        } catch (err) {
        console.error(err);
        alert("Error al enviar reporte");
        }
    });
});

async function verificarUsuario() {
    try {
        const res = await fetch("/api/auth/verify", { method: "GET", credentials: "include" });
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
        const res = await fetch("/api/reportes/mis-reportes", {
        method: "GET",
        credentials: "include",
        });

        if (!res.ok) {
        throw new Error("Error al obtener los reportes");
        }

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
            //Verificar evidencia según tipo de archivo
            let evidenciaHTML = `<p class="sin-evidencia">Sin evidencia adjuntada</p>`;
            if (rep.evidenciaUrl && rep.evidenciaUrl.trim() !== "") {
            if (rep.evidenciaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                evidenciaHTML = `<img src="${rep.evidenciaUrl}" alt="Evidencia" class="media-evidencia">`;
            } else if (rep.evidenciaUrl.match(/\.(mp4|webm|ogg)$/i)) {
                evidenciaHTML = `
                <video controls class="media-evidencia">
                    <source src="${rep.evidenciaUrl}" type="video/mp4">
                    Tu navegador no soporta el video.
                </video>`;
            } else if (rep.evidenciaUrl.match(/\.(mp3|wav|m4a)$/i)) {
                evidenciaHTML = `
                <audio controls class="media-evidencia">
                    <source src="${rep.evidenciaUrl}" type="audio/mpeg">
                    Tu navegador no soporta el audio.
                </audio>`;
            }
            }

            //Tarjeta del reporte
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

        // Guardar reportes globalmente para el mapa
        window.reportesCargados = data.reportes || [];

        // Si el mapa ya está inicializado, muestra los marcadores
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
    mapa = L.map("map").setView([25.6866, -100.3161], 13); // Monterrey default

    // Cargar los tiles de OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
        '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(mapa);

    // Evento click en el mapa
    mapa.on("click", async (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Si ya hay marcador, eliminarlo
        if (marcador) {
        mapa.removeLayer(marcador);
        }

        // Crear marcador nuevo
        marcador = L.marker([lat, lng]).addTo(mapa);

        // Guardar coordenadas en dataset del formulario
        const form = document.getElementById("formReporte");
        form.dataset.lat = lat;
        form.dataset.lng = lng;

        // Buscar dirección (geocodificación inversa)
        try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );
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

     // Si ya existen reportes cargados, mostrarlos en el mapa
    if (window.reportesCargados && window.reportesCargados.length > 0) {
        mostrarReportesEnMapa(window.reportesCargados);
    }  
}

function mostrarReportesEnMapa(reportes) {
    if (!mapa) return;

    // Elimina marcadores previos si los hay
    if (window.marcadoresReportes) {
        window.marcadoresReportes.forEach((m) => mapa.removeLayer(m));
    }
    window.marcadoresReportes = [];

    const reportesConCoords = reportes.filter((r) => r.lat && r.lng);
    if (!reportesConCoords.length) return;

    // Agrega los nuevos marcadores
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

    // Centrar mapa en todos los puntos
    const bounds = L.latLngBounds(reportesConCoords.map(r => [r.lat, r.lng]));
    mapa.fitBounds(bounds, { padding: [30, 30] });
}


async function logout() {
    try {
        const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        if (res.ok) {
        alert("Sesión cerrada correctamente");
        window.location.href = "/logIn";
        } else {
        alert("Error al cerrar sesión");
        }
    } catch {
        alert("Error al cerrar sesión");
    }
}

//Animación
const toggleButton = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
toggleButton.addEventListener("click", () => sidebar.classList.toggle("active"));