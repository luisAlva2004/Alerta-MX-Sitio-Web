const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "proyecto@integrador_3";

function redirectIfAuthenticated(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        // No hay token -> continuar y mostrar login
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const role = Number(decoded.role);
        if (role === 1) return res.redirect("/dashboard-admin");
        if (role === 2) return res.redirect("/dashboard-usuario");
        if (role === 3) return res.redirect("/dashboard-gobernador");
        return next();
    } catch (err) {
        // Token inválido o expirado -> NO borrar cookie aquí (evita eliminar por error)
        return next();
    }
}

module.exports = redirectIfAuthenticated;