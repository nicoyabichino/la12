const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 

// Define tu clave secreta aquí
const CLAVE_SECRETA = 'josuelloron';

const app = express();
const port = 3000;
const server = http.createServer(app); 

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
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

// Esta línea le dice a Express que sirva los archivos de la carpeta 'public'
app.use(express.static('public'));

// Endpoint para validar la clave
app.post('/api/validar-clave', (req, res) => {
    const { password } = req.body;
    if (password === CLAVE_SECRETA) {
        res.status(200).json({ mensaje: 'Clave correcta', esValida: true });
    } else {
        res.status(403).json({ error: 'Clave incorrecta', esValida: false });
    }
});

// Endpoint para obtener a todos los jugadores
app.get('/api/jugadores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM jugadores');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Endpoint para actualizar un jugador
app.put('/api/jugadores/:id', async (req, res) => {
    const { id } = req.params;
    const { puntos, asistencias, nombre, password } = req.body;

    // Validación de la clave
    if (password !== CLAVE_SECRETA) {
        return res.status(403).json({ error: 'Clave incorrecta. Acceso denegado.' });
    }

    let query = 'UPDATE jugadores SET ';
    const params = [];
    let paramIndex = 1;

    // Construir la consulta de forma dinámica
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