require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const { authenticateToken, requireRole } = require("./middleware/authMiddleware");
const redirectIfAuthenticated = require("./middleware/redirectIfAuthenticated");
const { db, admin } = require("./config/firebaseAdmin");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    credentials: true
}));

//Servir archivos estaticos para guardar el cache
app.use(express.static("public"));

// Rutas API
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const usersRoutes = require("./routes/usersRoutes");
app.use("/api/users", authenticateToken, requireRole([1]), usersRoutes);

const reportesRoutes = require("./routes/reportesRoutes");
app.use("/api/reportes", authenticateToken, reportesRoutes);


// Rutas publicas
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/logIn",  redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

//Ruta Dashboard protegidas por rol
app.get("/dashboard-admin", authenticateToken, requireRole([1]), (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard-admin.html"));
});

app.get("/dashboard-usuario", authenticateToken, requireRole([2]), (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard-usuario.html"));
});

app.get("/dashboard-gobernador", authenticateToken, requireRole([3]), (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard-gobernador.html"));
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

// Intervalo para eliminar reportes ya resueltos
setInterval(async () => {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() - 5 * 60 * 1000); // 5 min atrás

    const snapshot = await db
        .collection("reportes")
        .where("estatus", "==", "Resuelto")
        .where("creadoEn", "<=", limite)
        .get();

    if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`${snapshot.size} reporte(s) resueltos`);
    }
}, 60 * 1000 * 5); // cada 5 min

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en puerto: ${PORT}`);
});
