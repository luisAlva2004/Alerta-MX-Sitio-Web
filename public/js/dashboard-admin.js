// Al cargar la página, verificar autenticación
document.addEventListener('DOMContentLoaded', async () => {
    cargarUsuarios();
    cargarEstadisticasReportes();
    try {
        const res = await fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById('userName').textContent = `Usuario: ${data.user.name}`;
            document.getElementById('userEmail').textContent = `Cuenta: ${data.user.email}`;
        } else {
            alert("Inicia sesión antes de ingresar");
            window.location.href = '/';
        }
    } catch (err) {
        console.error('Error verificando autenticación:', err);
        window.location.href = '/';
    }
});

// Obtener y mostrar usuarios
async function cargarUsuarios() {
    try {
        const res = await fetch("/api/users", {
            method: "GET",
            credentials: "include"
        });
        if (!res.ok) throw new Error("Error al obtener usuarios");

        const users = await res.json();
        const tbody = document.querySelector("#usersTable tbody");
        tbody.innerHTML = "";

        users.forEach(user => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${user.name || "Sin nombre"}</td>
                <td>${user.email}</td>
                <td>${user.uid}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editarUsuario('${user.uid}')">Editar</button>
                    <button class="action-btn delete-btn" onclick="eliminarUsuario('${user.uid}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

// Editar usuario
async function editarUsuario(uid) {
    try {
    const res = await fetch(`/api/users/${uid}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const user = await res.json();

    // Rellena el formulario con los datos
    document.getElementById("editName").value = user.name || "";
    document.getElementById("editEmail").value = user.email || "";
    document.getElementById("editRole").value = user.role || 1;
    document.getElementById("editPassword").value = "";

    currentEditingUserId = uid;
    document.getElementById("editPopup").style.display = "block";
    } catch (err) {
        console.error("Error al obtener usuario:", err);
    }
}

async function guardarCambiosUsuario() {
    const uid = currentEditingUserId;
    const name = document.getElementById("editName").value;
    const email = document.getElementById("editEmail").value;
    const password = document.getElementById("editPassword").value;
    const role = parseInt(document.getElementById("editRole").value);

    try {
        const res = await fetch(`/api/users/${uid}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name, email, password, role }),
        });

        const data = await res.json();
        if (res.ok) {
        await Swal.fire({
            icon: "success",
            title: "Actualización exitosa",
            text: "Usuario actualizado correctamente",
            timer: 2000,
            showConfirmButton: false,
            scrollbarPadding: false,
            heightAuto: false
        });
        document.getElementById("editPopup").style.display = "none";
        location.reload();
        } else {
            Swal.fire({
                icon: "error",
                title: "Error al actualizar",
                text: data.message || "No se pudo actualizar el usuario.",
                confirmButtonColor: "#d33",
                scrollbarPadding: false,
                heightAuto: false
            });
        }
    } catch (err) {
        console.error("Error al actualizar usuario:", err);
    }
}


// Eliminar usuario
async function eliminarUsuario(uid) {
    if (!confirm("¿Seguro que quieres eliminar este usuario?")) return;

    try {
        const res = await fetch(`/api/users/${uid}`, {
            method: "DELETE",
            credentials: "include"
        });
        if (!res.ok) throw new Error("Error al eliminar usuario");

        await Swal.fire({
            icon: "success",
            title: "Eliminado",
            text: "Usuario eliminado correctamente.",
            timer: 2000,
            showConfirmButton: false,
            scrollbarPadding: false, 
            heightAuto: false 
        });
        cargarUsuarios();
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Error al eliminar usuario.",
            confirmButtonColor: "#d33",
            scrollbarPadding: false, 
            heightAuto: false 
        });
    }
}

// Función para cerrar el popup
function cerrarPopup() {
    document.getElementById("editPopup").style.display = "none";
}


// Cerrar sesión
async function logout() {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
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
            window.location.href = '/';
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
    } catch (err) {
        console.error('Error en logout:', err);
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

// Toggle del menú lateral
const toggleButton = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

toggleButton.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

async function cargarEstadisticasReportes() {
    try {
        const res = await fetch('/api/reportes/impacto/todos', {
        method: 'GET',
        credentials: 'include'
    });

    if (!res.ok) throw new Error('Error al obtener datos de impacto social');

    const data = await res.json();
    const impacto = Array.isArray(data) ? data : data.impacto || data.data || [];

    if (!Array.isArray(impacto)) {
        console.error('Formato inesperado en impacto_social:', data);
        return;
    }

    // Contar reportes por día (según campo fecha)
    const conteoPorDia = {};
    impacto.forEach(doc => {
        if (doc.fecha) {
            const fecha = doc.fecha._seconds
            ? new Date(doc.fecha._seconds * 1000)
            : new Date(doc.fecha);
            const dia = fecha.getDate();
            conteoPorDia[dia] = (conteoPorDia[dia] || 0) + 1;
        }
    });

    // Preparar datos para la gráfica
    const dias = Object.keys(conteoPorDia).map(Number).sort((a, b) => a - b);
    const valores = dias.map(d => conteoPorDia[d]);

    // Renderizar la gráfica
    const ctx = document.getElementById('reportesChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dias.map(d => `Día ${d}`),
            datasets: [{
            label: 'Reportes de Impacto Social',
            data: valores,
            borderColor: '#d12a13ff',
            backgroundColor: 'rgba(111, 117, 123, 0.2)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: '#fffefcff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
            legend: { display: true },
            title: {
                display: true,
                text: 'Reportes de Impacto Social por Día'
            }
            },
            scales: {
            x: { title: { display: true, text: 'Día del mes' } },
            y: { title: { display: true, text: 'Cantidad de reportes' }, beginAtZero: true }
            }
        }
        });

    } catch (err) {
        console.error('Error al generar gráfica de impacto social:', err);
    }
}
