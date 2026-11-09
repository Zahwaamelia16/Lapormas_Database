require('dotenv').config();

const { Pool, types } = require('pg');

// BIGINT (20) dan NUMERIC (1700) dikembalikan pg sebagai string secara default.
// Diubah menjadi angka agar respons JSON lebih rapi (report_id: 1, bukan "1").
types.setTypeParser(20, (value) => parseInt(value, 10));
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
});

pool.on('error', (error) => {
    console.error('Koneksi PostgreSQL error:', error.message);
});

module.exports = pool;