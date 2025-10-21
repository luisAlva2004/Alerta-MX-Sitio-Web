document.addEventListener("DOMContentLoaded", async () => {
    await verificarUsuario();
    inicializarMapa();
    await cargarReportes();
    inicializarEventos();
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

async function cargarReportes(filtroDep = "", filtroZona = "") {
    try {
        const res = await fetch("/api/reportes/todos", { credentials: "include" });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Error al obtener reportes");

        let reportes = data.reportes;

        // Filtros
        if (filtroDep) reportes = reportes.filter(r => r.departamento === filtroDep);
        if (filtroZona) reportes = reportes.filter(r =>
        (r.direccion || "").toLowerCase().includes(filtroZona.toLowerCase())
        );

        mostrarReportesEnMapa(reportes);
        mostrarReportesEnTabla(reportes);
    } catch (error) {
        console.error("Error obteniendo reportes:", error);
    }
}

function mostrarReportesEnMapa(reportes) {
    if (!window.mapa) return;
    if (window.marcadoresReportes) {
        window.marcadoresReportes.forEach(m => window.mapa.removeLayer(m));
    }
    window.marcadoresReportes = [];

    const coords = [];
    reportes.forEach(rep => {
        if (rep.lat && rep.lng) {
        const lat = parseFloat(rep.lat);
        const lng = parseFloat(rep.lng);
        const marker = L.marker([lat, lng]).addTo(window.mapa);
        marker.bindPopup(`
            <b>${rep.nombre}</b><br>
            <b>${rep.departamento}</b><br>
            ${rep.descripcion}<br>
            <small>${rep.direccion}</small>
        `);
        window.marcadoresReportes.push(marker);
        coords.push([lat, lng]);
        }
    });

    if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        window.mapa.fitBounds(bounds, { padding: [30, 30] });
    }
}

function mostrarReportesEnTabla(reportes) {
    const tbody = document.querySelector("#tablaReportes tbody");
    tbody.innerHTML = "";

    if (reportes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No hay reportes disponibles</td></tr>`;
        return;
    }

    reportes.forEach(rep => {
        const fila = `
        <tr>
            <td>${rep.nombre}</td>
            <td>${rep.departamento}</td>
            <td>${rep.direccion}</td>
            <td>
            <select data-id="${rep.id}" class="select-estatus">
                <option value="En proceso" ${rep.estatus === "En proceso" ? "selected" : ""}>En proceso</option>
                <option value="Resuelto" ${rep.estatus === "Resuelto" ? "selected" : ""}>Resuelto</option>
            </select>
            </td>
            <td><button class="btn-actualizar" data-id="${rep.id}" data-dep="${rep.departamento}">Aplicar</button></td>
        </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", fila);
    });

    document.querySelectorAll(".btn-actualizar").forEach(btn => {
        btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const dep = btn.dataset.dep;
        const estatus = document.querySelector(`.select-estatus[data-id="${id}"]`).value;
        await actualizarEstatus(id, estatus, dep);
        });
    });
}

async function actualizarEstatus(id, estatus, departamento) {
    try {
        const res = await fetch(`/api/reportes/${id}/estatus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estatus }),
        });

        if (!res.ok) throw new Error("Error al actualizar estatus");

        if (estatus === "Resuelto") {
        const numeros = {
            Bomberos: "81 8342 0055",
            Policia: "089",
            Paramedicos: "911",
        };
        const numero = numeros[departamento] || "911";
        document.getElementById("mensajeLlamada").textContent = 
            `Llamando a ${numero} (${departamento}) para atender la situación...`;
        document.getElementById("popupLlamada").style.display = "flex";
        setTimeout(() => cerrarPopup(), 3000);
        }

        await cargarReportes();
    } catch (error) {
        console.error("Error actualizando estatus:", error);
    }
}

function cerrarPopup() {
    document.getElementById("popupLlamada").style.display = "none";
}

// Impacto social
document.getElementById("formImpacto").addEventListener("submit", async e => {
    e.preventDefault();
    const descripcion = document.getElementById("descripcionImpacto").value.trim();
    if (!descripcion) return alert("Describe el impacto antes de enviar.");

    const res = await fetch("/api/reportes/impacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ descripcion }),
    });

    if (res.ok) alert("Reporte de impacto social registrado con éxito.");
    else alert("Error al registrar impacto social.");

    e.target.reset();
});

// Mapa base
    function inicializarMapa() {
    window.mapa = L.map("map").setView([25.6866, -100.3161], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
    }).addTo(window.mapa);
}

// Filtros y eventos
function inicializarEventos() {
    const dep = document.getElementById("filtroDepartamento");
    const col = document.getElementById("filtroColonia");

    // Filtro automático
    dep.addEventListener("change", () => {
        cargarReportes(dep.value, col.value);
    });

    col.addEventListener("input", () => {
        cargarReportes(dep.value, col.value);
    });

    // Toggle sidebar
    const toggleButton = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    toggleButton.addEventListener("click", () => sidebar.classList.toggle("active"));
}

// Logout 
async function logout() {
    try {
        const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        if (res.ok) {
        alert("Sesión cerrada correctamente");
        window.location.href = "/logIn";
        } else alert("Error al cerrar sesión");
    } catch {
        alert("Error al cerrar sesión");
    }
}
