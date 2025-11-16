const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { admin, db } = require("../config/firebaseAdmin");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const JWT_SECRET = process.env.JWT_SECRET || "proyecto@integrador_3";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Registro de usuario
async function register(req, res) {
    const { nombre, correo, contraseña, rol } = req.body;

    try {
    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
        email: correo,
        password: contraseña,
        displayName: nombre
    });

    //Hashear contraseña para guardarla en Firestore
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Guardar usuario en Firestore
    const userData = {
        uid: userRecord.uid,
        name: nombre,
        email: correo,
        passwordHash: hashedPassword,
        role: rol || 2, // 1 = admin, 2 = usuario
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("usuarios").doc(userRecord.uid).set(userData);

    // Generar tu propio JWT
    const tokenPayload = { uid: userRecord.uid, email: correo, role: userData.role, name: nombre};
    const Token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "15m" });

    // Guardar cookie
    res.cookie("token", Token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 día
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
    });

    res.status(201).json({
        success: true,
        message: "Usuario registrado correctamente",
        user: { uid: userRecord.uid, email: correo, role: userData.role, name: nombre }
    });
    } catch (err) {
        console.error("Error en registro:", err);
        res.status(500).json({ success: false, message: "Error en el registro", error: err.message });
    }
}

// Login de usuario
async function login(req, res) {
    const { correo, contraseña } = req.body;

    try {
    // Llamar a Firebase Auth REST API
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: correo,
            password: contraseña,
            returnSecureToken: true })
    });

    const data = await response.json();
    if (data.error) {
        console.log(data.error.message);
    return res.status(401).json({ 
            success: false,
            message: "Su contraseña o correo son invalidos\nRevise bien sus datos",
            error: data.error.message });
    }

    const { localId: uid, idToken } = data;

    // Verificar el ID token con Firebase Admin
    await admin.auth().verifyIdToken(idToken);

    // Obtener datos del usuario desde Firestore
    const userSnap = await db.collection("usuarios").doc(uid).get();
    if (!userSnap.exists) {
        return res.status(401).json({
            success: false, 
            message: "Usuario no encontrado en Firestore" });
    }
    const userData = userSnap.data();

    // Generar tu propio JWT
    const tokenPayload = { uid, email: correo, role: userData.role, name: userData.name };
    const Token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "15m" });

    // Guardar cookie
    res.cookie("token", Token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, 
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
    });

    res.json({
        success: true,
        message: "Login exitoso",
        nombre: userData.name,
        role: userData.role
    });
    } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ success: false, message: "Error en el login", error: err.message });
    }
    }

    // Logout
    async function logout(req, res) {
    res.clearCookie("token");
    res.json({ success: true, message: "Sesión cerrada correctamente" });
    }

    // Verificar token
    async function verifyToken(req, res) {
    try {
    const token = req.cookies["token"] || req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ success: false, message: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
        success: true,
        user: {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
        }
    });
    } catch (err) {
    console.error("Error verificando token:", err);
    res.status(401).json({ success: false, message: "Token inválido" });
    }
}

module.exports = { register, login, logout, verifyToken };