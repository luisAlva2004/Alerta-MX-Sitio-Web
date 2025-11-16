const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "proyecto@integrador_3";

// Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
    try {
    // Obtener token de cookies o header Authorization
    const token = req.cookies["token"] || req.headers.authorization?.split(" ")[1];

    if (!token) {
        console.log("No se encontró el token, redirigiendo al login");
        return res.status(401).redirect("/logIn");
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Agregar información del usuario al request
    req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        role: Number(decoded.role)
    };

    next();
    } catch (error) {
        // Si el token es inválido o expiró, limpiar cookie y redirigir
        res.clearCookie("token");
        return res.status(401).redirect("/logIn");
        }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => (req, res, next) => {
    if (!req.user) return res.status(401).redirect("/");
    if (!roles.includes(Number(req.user.role))) {
        return res.status(401).redirect("/");
    }
    next();
};

module.exports = {
authenticateToken,
requireRole
};