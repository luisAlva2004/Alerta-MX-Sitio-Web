// routes/reportesRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { admin } = require("../config/firebaseAdmin");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const db = admin.firestore();
const upload = multer({ storage: multer.memoryStorage() });

// --------- Apartado de Usuario ----------------

/* Crear reporte con evidencia */
router.post(
    "/crear",
    authenticateToken,
    requireRole([2]),
    upload.single("evidencia"),
    async (req, res) => {
        try {
        let evidenciaUrl = null;
        let evidenciaPublicId = null;

        // Si el usuario sube evidencia
        if (req.file) {
            const uploadOptions = {
            resource_type: "auto",
            folder: `reportes/${req.user.uid}`,
            };

            const streamUpload = () =>
            new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error) return reject(error);
                resolve(result);
                });
                stream.end(req.file.buffer);
            });

            const uploadResult = await streamUpload();
            evidenciaUrl = uploadResult.secure_url;
            evidenciaPublicId = uploadResult.public_id;
        }

        // Crear documento en Firestore
        const nuevoReporte = {
            usuarioUid: req.user.uid,
            nombre: req.user.name,
            email: req.user.email,
            direccion: req.body.direccion || "",
            descripcion: req.body.descripcion || "",
            departamento: req.body.departamento || "",
            evidenciaUrl,
            evidenciaPublicId,
            estatus: "En proceso",
            lat: parseFloat(req.body.lat) || null,
            lng: parseFloat(req.body.lng) || null,
            creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection("reportes").add(nuevoReporte);
        res.status(201).json({ success: true, id: docRef.id, reporte: nuevoReporte });
        } catch (err) {
        console.error("Error al crear reporte:", err);
        res.status(500).json({ success: false, message: "Error al crear reporte" });
        }
    }
);

/* Obtener todos los reportes del usuario */
router.get(
    "/mis-reportes",
    authenticateToken,
    requireRole([2]),
    async (req, res) => {
        try {
        const snapshot = await db
            .collection("reportes")
            .where("usuarioUid", "==", req.user.uid)
            .orderBy("creadoEn", "desc")
            .get();

        const reportes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json({ success: true, reportes });
        } catch (err) {
        console.error("Error obteniendo reportes:", err);
        res.status(500).json({ success: false, message: "Error obteniendo reportes" });
        }
    }
);

//------------ Apartado de Gobernador --------------

/* Obtener todos los reportes (Solo admin y gobernador) */
router.get(
    "/todos",
    authenticateToken,
    requireRole([1, 3]),
    async (req, res) => {
        try {
        const snapshot = await db
            .collection("reportes")
            .orderBy("creadoEn", "desc")
            .get();

        const reportes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json({ success: true, reportes });
        } catch (err) {
        console.error("Error obteniendo reportes:", err);
        res.status(500).json({ success: false, message: "Error obteniendo reportes" });
        }
    }
);

/* Actualizar estatus de reporte */
router.patch(
    "/:id/estatus",
    authenticateToken,
    requireRole([1, 3]),
    async (req, res) => {
        try {
        const { estatus } = req.body;
        const docRef = db.collection("reportes").doc(req.params.id);

        await docRef.update({ estatus });
        res.json({ success: true });
        } catch (err) {
        console.error("Error actualizando estatus:", err);
        res.status(500).json({ success: false, message: "Error al actualizar estatus" });
        }
    }
);

/* Guardar reporte de impacto social */
router.post(
    "/impacto",
    authenticateToken,
    requireRole([3]),
    async (req, res) => {
        try {
        await db.collection("impacto_social").add({
            descripcion: req.body.descripcion,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            gobernador: req.user.name,
        });
        res.json({ success: true });
        } catch (err) {
        console.error("Error guardando impacto social:", err);
        res.status(500).json({ success: false, message: "Error guardando impacto social" });
        }
    }
);

/* Eliminar reporte */
router.delete(
    "/:id/eliminar",
    authenticateToken,
    requireRole([1, 3]),
    async (req, res) => {
        try {
            const id = req.params.id;
            const ref = db.collection("reportes").doc(id);

            // Verificar si existe
            const doc = await ref.get();
            if (!doc.exists)
                return res.status(404).json({ success: false, message: "Reporte no encontrado" });

            // Eliminar evidencia de Cloudinary si corresponde
            const data = doc.data();
            if (data.evidenciaPublicId) {
                try { 
                    await cloudinary.uploader.destroy(data.evidenciaPublicId); 
                } catch (err) {
                    console.warn("No se pudo borrar la evidencia de Cloudinary:", err);
                }
            }

            await ref.delete();
            res.json({ success: true });
        } catch (err) {
            console.error("Error eliminando reporte:", err);
            res.status(500).json({ success: false, message: "Error al eliminar reporte" });
        }
    }
);


//--------------- Apartado del admin -----------------------

router.get('/impacto/todos', async (req, res) => {
    try {
        const snapshot = await db.collection('impacto_social').get();
        const impacto = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(impacto);
    } catch (error) {
        console.error('Error al obtener impacto_social:', error);
        res.status(500).json({ error: 'Error al obtener impacto social' });
    }
});

module.exports = router;
