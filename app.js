require('dotenv').config();

const express = require('express');
const pool = require('./src/config/db');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'LAPORMAS REST API berjalan',
        endpoints: {
            getAll: 'GET /api/reports',
            getById: 'GET /api/reports/:id',
            getByTitle: 'GET /api/reports/search?title=...',
            create: 'POST /api/reports',
            update: 'PUT /api/reports/:id',
            delete: 'DELETE /api/reports/:id',
            dbCheck: 'GET /api/db-check',
        },
    });
});

// Cek koneksi database
app.get('/api/db-check', async (req, res) => {
    try {
        const result = await pool.query('SELECT current_database() AS database, NOW() AS server_time');
        res.status(200).json({
            message: 'Koneksi PostgreSQL berhasil',
            database: result.rows[0].database,
            serverTime: result.rows[0].server_time,
        });
    } catch (error) {
        console.error('Database connection error:', error.message);
        res.status(500).json({ message: 'Koneksi PostgreSQL gagal', error: error.message });
    }
});

app.use('/api/reports', reportRoutes);

// Route tidak ditemukan
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} tidak ditemukan` });
});

// Error handler (misal body JSON tidak valid di Postman)
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Format JSON pada body tidak valid' });
    }
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server berjalan pada http://localhost:${PORT}`);
    });
}

module.exports = app;
