const admin = require("firebase-admin");
const { SerialPort } = require("serialport");

// Inicializar Firebase
const serviceAccount = require("./config/serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Configuración del puerto serial
const port = new SerialPort({
    path: "COM5", 
    baudRate: 9600,
});

port.on("open", () => console.log("Conectado al Arduino vía USB"));
port.on("error", (err) => console.error("Error serial:", err));

// Escuchar cambios en Firestore
db.collection("reportes").onSnapshot((snapshot) => {
    let tienePendientes = false;
    let algunoResuelto = false;

    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.estatus === "En proceso") tienePendientes = true;
        if (data.estatus === "Resuelto") algunoResuelto = true;
    });

    if (algunoResuelto) {
        console.log("Reporte resuelto detectado → LED verde");
        port.write("verde\n");
    } else if (tienePendientes) {
        console.log("Reporte en proceso → LED amarillo");
        port.write("amarillo\n");
    } else {
        console.log("Sin reportes activos → LED rojo");
        port.write("rojo\n");
    }
});
