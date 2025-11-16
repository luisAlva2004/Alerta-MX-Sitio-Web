async function verificarSesion() {
    try {
        const res = await fetch("/api/auth/verify", {
            method: "GET",
            credentials: "include"
        });
        const data = await res.json();
        return data.success; // true si hay sesión activa
    } catch (err) {
        console.error("Error verificando sesión:", err);
        return false;
    }
}

async function logIn() {
    try {
        const res = await fetch("/api/auth/verify", { method: "GET", credentials: "include" });
        if (res.ok) {
            const { user } = await res.json();
        if (user.role === 1) return (window.location.href = "/dashboard-admin");
        if (user.role === 2) return (window.location.href = "/dashboard-usuario");
        if (user.role === 3) return (window.location.href = "/dashboard-gobernador");
        }
        // si no hay sesión:
        window.location.href = "/logIn";
    } catch {
        window.location.href = "/logIn";
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    const loginBtn = document.querySelector(".login-btn");

    // Cambiar texto del botón según la sesión
    const sesionActiva = await verificarSesion();
    if (sesionActiva) {
        loginBtn.textContent = "Ir al Dashboard";
    } else {
        loginBtn.textContent = "Iniciar Sesión";
    }

    const percentageEl = document.getElementById("percentage");
    const textEl = document.getElementById("statText");
    const statCircle = document.querySelector(".stat-circle");

    const dataMap = {
        doctor: {
            percentage: 450,
            text: "Doctores y paramédicos dispuestos a ayudar a la ciudadania.",
        },
        firefight: {
            percentage: 150,
            text: "Bomberos listos para las tareas más complicadas y riesgosas.",
        },
        police: {
            percentage: 560,
            text: "Policias alertas ante cualquier altercado que atente con la seguridad pública.",
        },
    };

    let currentAnimation;

    const animatePercentage = (target) => {
        let count = 0;
        clearInterval(currentAnimation);

        currentAnimation = setInterval(() => {
            if (count <= target) {
            percentageEl.textContent = "+ de " + count;
            count++;
            } else {
            clearInterval(currentAnimation);
            }
        }, 1);
    };

    // Tabs interactivas
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-type");
            const { percentage, text } = dataMap[type];

            statCircle.classList.remove("pop");
            textEl.classList.remove("fade");

            void statCircle.offsetWidth;
            void textEl.offsetWidth;

            animatePercentage(percentage);
            textEl.textContent = text;

            statCircle.classList.add("pop");
            textEl.classList.add("fade");
        });
    });

    // Animación inicial
    animatePercentage(dataMap.doctor.percentage);

    // Preguntas frecuentes
    document.querySelectorAll(".faq-question").forEach((pregunta) => {
        pregunta.addEventListener("click", () => {
            pregunta.parentElement.classList.toggle("open");
        });
    });
});
