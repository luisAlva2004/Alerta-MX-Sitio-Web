const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Obtener todos los usuarios (Auth + Firestore info si existe)
router.get("/", authenticateToken, requireRole([1]), async (req, res) => {
    try {
        // Lista desde Firebase Auth
        const listUsers = await admin.auth().listUsers(1000); // ajustar pageSize si hace falta
        // Intentamos anexar datos desde Firestore (colección "usuarios")
        const db = admin.firestore();

    const users = await Promise.all(
        listUsers.users.map(async (u) => {
            let firestoreData = null;
            try {
            const snap = await db.collection("usuarios").doc(u.uid).get();
            if (snap.exists) firestoreData = snap.data();
            } catch (err) {
            console.error("Error leyendo Firestore para uid:", u.uid, err.message);
            }

            return {
            uid: u.uid,
            email: u.email,
            name: u.displayName || (firestoreData && firestoreData.name) || "",
            role: firestoreData?.role ?? null
            };
        })
    );

    res.json(users);
    } catch (err) {
        console.error("Error obteniendo usuarios:", err);
        res.status(500).json({ error: "Error obteniendo usuarios" });
    }
});

// Obtener un usuario por UID
router.get("/:uid", authenticateToken, requireRole([1]), async (req, res) => {
    const { uid } = req.params;
    try {
        const userRecord = await admin.auth().getUser(uid);
        const userDoc = await admin.firestore().collection("usuarios").doc(uid).get();
        const firestoreData = userDoc.exists ? userDoc.data() : {};

            res.json({
            uid: userRecord.uid,
            email: userRecord.email,
            name: userRecord.displayName || firestoreData.name || "",
            role: firestoreData.role || null,
            });
        } catch (error) {
            console.error("Error al obtener usuario:", error);
            res.status(404).json({ message: "Usuario no encontrado" });
        }
});


// Editar usuario
router.put("/:uid", authenticateToken, requireRole([1]), async (req, res) => {
    const { uid } = req.params;
    const { name, email, password, role } = req.body;

    try {
        const updateData = {};

        // Si se envía un nuevo nombre
        if (name) updateData.displayName = name;

        // Si se envía un nuevo email
        if (email) updateData.email = email;

        // Si se envía una nueva contraseña
        if (password) updateData.password = password;

        //Actualiza en Authentication
        await admin.auth().updateUser(uid, updateData);

        // Actualiza en Firestore
        const userRef = admin.firestore().collection("usuarios").doc(uid);
        await userRef.update({
            name: name || admin.firestore.FieldValue.delete(),
            email: email || admin.firestore.FieldValue.delete(),
            role: role !== undefined ? role : admin.firestore.FieldValue.delete(),
            updatedAt: new Date()
        });

        res.status(200).json({ message: "Usuario actualizado correctamente" });
        } catch (error) {
            console.error("Error al actualizar usuario:", error);
            res.status(500).json({ message: "Error al actualizar usuario", error: error.message });
        }
});

// Eliminar usuario (Firestore + Auth)
router.delete("/:uid", authenticateToken, requireRole([1]), async (req, res) => {
    const { uid } = req.params;
    const db = admin.firestore();

    // Eliminar en Firestore primero, luego Authentication.
    try {
        let deletedFirestore = false;
        let deletedAuth = false;
        const docRef = db.collection("usuarios").doc(uid);

        // Intentar borrar documento Firestore
        try {
        const snap = await docRef.get();
        if (snap.exists) {
            await docRef.delete();
            deletedFirestore = true;
        } else {
            deletedFirestore = true;
        }
        } catch (err) {
            console.error("Error borrando documento Firestore:", err.message);
        }

        // Intentar borrar usuario en Firebase Auth
        try {
            await admin.auth().deleteUser(uid);
            deletedAuth = true;
        } catch (err) {
            console.error("Error borrando usuario en Auth:", err.message);
        }

        // Responder según resultado
        if (deletedFirestore && deletedAuth) {
            return res.json({ success: true, message: "Usuario eliminado de Firestore y Auth" });
        } else if (deletedFirestore && !deletedAuth) {
            return res.status(207).json({
                success: false,
                message: "Documento Firestore eliminado pero fallo al eliminar en Auth",
                deletedFirestore,
                deletedAuth
        });
        } else if (!deletedFirestore && deletedAuth) {
            return res.status(207).json({
                success: false,
                message: "Usuario eliminado en Auth pero fallo al eliminar documento en Firestore",
                deletedFirestore,
                deletedAuth
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Fallo al eliminar usuario en Auth y Firestore",
                deletedFirestore,
                deletedAuth
            });
        }
    } catch (err) {
        console.error("Error en delete route:", err);
        return res.status(500).json({ success: false, message: "Error interno al eliminar usuario" });
    }
});

module.exports = router;