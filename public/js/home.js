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

// Cerrar sesión
async function logout() {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (res.ok) {
            alert('Sesión cerrada correctamente');
            window.location.href = '/';
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
