//Animación
const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener('click', ()=>{
    container.classList.add("active");
});

loginBtn.addEventListener('click', ()=>{
    container.classList.remove("active");
});


//Registro
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        nombre: document.getElementById("nombre").value,
        correo: document.getElementById("correoRegistro").value,
        contraseña: document.getElementById("contraseñaRegistro").value
    };

    //Validacion de nombre
    function esNombreValido(nombre) {
        const prohibidos = ["camelo", "joe", "mama", "hola", "mundo", "tonto", "quito", "cr7"];

        const contieneProhibido = prohibidos.some(palabra =>
        nombre.toLowerCase().includes(palabra)
        );
        if (contieneProhibido) return false;

        // Formato general de nombre completo
        const regexNombre = /^(?=[A-Za-zÀ-ÖØ-öø-ÿ ]*$)(?=.*([A-Za-zÀ-ÖØ-öø-ÿ]).*\1)[A-Z][a-zà-öø-ÿ]+(?: [A-Z][a-zà-öø-ÿ]+)+$/;
        if (!regexNombre.test(nombre)) return false;

        // Evitar letras repetidas consecutivas 3 o más veces
        const nombreSinEspacios = nombre.replace(/\s+/g, ""); // Ignora espacios
        const regexRepetidas = /([a-zA-Z])\1{2,}/;
        if (regexRepetidas.test(nombreSinEspacios)) return false;

            return true
        }

    //Validacion de contraseña
    function esContrasenaCoherente(contraseña) {
        const comunes = ["contraseña", "12345678", "qwerty", "admin", "dejame_entrar", "hola"];
        const contienePatronRepetido = /(.)\1{2,}/;
        const soloUnaLetraRepetida = /^([a-zA-Z])\1{4,}/;

        const esComun = comunes.some((word) =>
            contraseña.toLowerCase().includes(word)
        );

        return !esComun && !contienePatronRepetido.test(contraseña) && !soloUnaLetraRepetida.test(contraseña);
    }

    //Validacion de email
    function esEmailValido(email) {
        const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]{5,}\.(com|mx)$/;
        return regexEmail.test(email);
    }   

    if(!esContrasenaCoherente(data.contraseña)){
        alert("La contraseña no cumple con los requisitos de seguridad \n(Palabras comúnes o letras repetidas)")
    }else{
        if(!esNombreValido(data.nombre)){
            alert("El nombre que intentas ingresar no es válido\n(Letras repetidas, nombres obscenos, etc.)")
        }else{
            if(!esEmailValido(data.correo)){
                alert("El correo que intentas ingresar no es válido\n(Terminacion incorrecta o dominio inexistente)")
            }else{
                try {
                    const res = await fetch("/api/auth/registro", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                        credentials: "include"
                    });

                    await Swal.fire({
                        icon: "success",
                        title: "Bienvenid@",
                        text: "Registro exitoso.",
                        timer: 2000,
                        showConfirmButton: false,
                        scrollbarPadding: false, 
                        heightAuto: false 
                    });

                    if (res.ok) {
                        container.classList.remove("active"); // vuelve al login despues de registrar el usuario
                    }
                } catch (err) {
                    console.error(err);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Hubo un error al registrar su usuario, espere unos momentos.",
                        confirmButtonColor: "#d33",
                        scrollbarPadding: false, 
                        heightAuto: false 
                    });
                }
            }
        }
    }
});

// Log In
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        correo: document.getElementById("correoLogin").value,
        contraseña: document.getElementById("contraseñaLogin").value
    };

    try {
        const res = await fetch("/api/auth/logIn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            credentials: "include"
        });

        const result = await res.json();

        if (!res.ok) {
            return Swal.fire({
                icon: "error",
                title: "Error de inicio de sesión",
                text: result.message || "Credenciales incorrectas.",
                confirmButtonColor: "#d33",
                scrollbarPadding: false, 
                heightAuto: false 
            });
        }

        await Swal.fire({
            icon: "success",
            title: "Bienvenid@",
            text: "Inicio de sesión exitoso.",
            timer: 2000,
            showConfirmButton: false,
            scrollbarPadding: false, 
            heightAuto: false 
        });

        // Redirigir por rol
        if (result.role === 1) window.location.href = "/dashboard-admin";
        else if (result.role === 2) window.location.href = "/dashboard-usuario";
        else if (result.role === 3) window.location.href = "/dashboard-gobernador";
        else window.location.href = "/";
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No se pudo contactar con el servidor.",
            confirmButtonColor: "#d33",
            scrollbarPadding: false, 
            heightAuto: false 
        });
    }
});