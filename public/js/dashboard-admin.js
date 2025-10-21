// Al cargar la página, verificar autenticación
document.addEventListener('DOMContentLoaded', async () => {
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
        alert("Usuario actualizado correctamente");
        document.getElementById("editPopup").style.display = "none";
        location.reload();
        } else {
        alert(`Error: ${data.message}`);
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

        alert("Usuario eliminado correctamente");
        cargarUsuarios();
    } catch (err) {
        console.error(err);
        alert("Error al eliminar usuario");
    }
}

//Cargar usuarios al entrar
document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarios();
});

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
            alert('Sesión cerrada correctamente');
            window.location.href = '/logIn';
        } else {
            alert('Error al cerrar sesión');
        }
    } catch (err) {
        console.error('Error en logout:', err);
        alert('Error al cerrar sesión');
    }
}

// Toggle del menú lateral
const toggleButton = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

toggleButton.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});
