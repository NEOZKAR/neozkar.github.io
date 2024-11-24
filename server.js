const express = require('express');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Configuración de SQLite
const db = new sqlite3.Database('ventas.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY, datos TEXT)");
});

// Configuración de WebSocket
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const datosVenta = JSON.parse(message);
        db.run("INSERT INTO ventas (datos) VALUES (?)", [datosVenta.datos]);

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(datosVenta));
            }
        });
    });

    // Enviar ventas existentes al nuevo cliente
    db.all("SELECT * FROM ventas", [], (err, rows) => {
        if (err) {
            throw err;
        }
        rows.forEach((row) => {
            ws.send(JSON.stringify(row));
        });
    });
});

app.use(express.static('public'));

const server = app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
