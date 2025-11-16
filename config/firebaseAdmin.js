// config/firebaseAdmin.js
const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./config/serviceAccountKey.json";

admin.initializeApp({
    credential: admin.credential.cert(require(path.resolve(serviceAccountPath))),
});

const db = admin.firestore();
module.exports = { admin, db };
