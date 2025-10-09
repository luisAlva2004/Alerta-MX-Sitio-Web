require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const { authenticateToken } = require("./middleware/authMiddleware");
require("./config/firebaseAdmin");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    credentials: true
}));

//Servir archivos estaticos
app.use(express.static("public"));

// Rutas
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home2.html"));
});

//Ruta Home protegida
app.get("/logIn", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

//Ruta Home protegida
app.get("/dashboard", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).redirect('/');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Corriendo en http://localhost:${PORT}`);
});
