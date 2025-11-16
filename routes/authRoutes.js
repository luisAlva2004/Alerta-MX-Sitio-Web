const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");


// Rutas de autenticación
router.post("/registro", authController.register);
router.post("/logIn", authController.login);
router.post("/logout", authController.logout);

// Ruta protegida para verificar token
router.get("/verify", authenticateToken, authController.verifyToken);

module.exports = router;
