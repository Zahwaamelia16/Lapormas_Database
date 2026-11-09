const pool = require('./src/config/db');

async function testConnection() {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database'
        );

        console.log('Koneksi PostgreSQL berhasil!');
        console.log('Database aktif:', result.rows[0].database);

    } catch (error) {
        console.error('Koneksi PostgreSQL gagal:', error.message);

    } finally {
        await pool.end();
    }
}

testConnection();