const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 

// La clave secreta se lee desde una variable de entorno de Render
const CLAVE_SECRETA = process.env.CLAVE_SECRETA;

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app); 

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "PUT"]
    }
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(cors());
app.use(express.json());

app.use(express.static('public'));

app.get('/api/validar-clave', (req, res) => {
    const { password } = req.query; // Cambia .body por .query
    if (password === CLAVE_SECRETA) {
        res.status(200).json({ mensaje: 'Clave correcta', esValida: true });
    } else {
        res.status(403).json({ error: 'Clave incorrecta', esValida: false });
    }
});

app.get('/api/jugadores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM jugadores');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.put('/api/jugadores/:id', async (req, res) => {
    const { id } = req.params;
    const { puntos, asistencias, nombre, password } = req.body;

    if (password !== CLAVE_SECRETA) {
        return res.status(403).json({ error: 'Clave incorrecta. Acceso denegado.' });
    }

    let query = 'UPDATE jugadores SET ';
    const params = [];
    let paramIndex = 1;

    if (puntos !== undefined) {
        query += `puntos = $${paramIndex++}, `;
        params.push(puntos);
    }
    if (asistencias !== undefined) {
        query += `asistencias = $${paramIndex++}, `;
        params.push(asistencias);
    }
    if (nombre !== undefined) {
        query += `nombre = $${paramIndex++}, `;
        params.push(nombre);
    }

    if (params.length === 0) {
        return res.status(400).json({ error: 'No se encontraron campos para actualizar' });
    }

    query = query.slice(0, -2);
    
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    try {
        const result = await pool.query(query, params);
        if (result.rows.length > 0) {
            io.emit('actualizacion');
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Jugador no encontrado' });
        }
    } catch (err) {
        console.error('Error al actualizar:', err);
        res.status(500).json({ error: 'Error del servidor al actualizar' });
    }
});

server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});