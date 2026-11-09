const pool = require('../config/db');

// Kolom yang boleh diisi lewat POST / PUT
const REQUIRED_FIELDS = [
    'user_id',
    'category_id',
    'status_id',
    'area_id',
    'title',
    'description',
    'location',
];

// Query dasar: data laporan + nama kategori, status, wilayah, dan pelapor
const BASE_SELECT = `
    SELECT
        r.report_id,
        r.user_id,
        u.name AS reporter_name,
        r.category_id,
        c.category_name,
        r.status_id,
        s.status_name,
        r.area_id,
        a.village_name,
        r.title,
        r.description,
        r.location,
        r.latitude,
        r.longitude,
        r.created_at
    FROM reports r
    JOIN users u ON u.user_id = r.user_id
    JOIN report_categories c ON c.category_id = r.category_id
    JOIN report_statuses s ON s.status_id = r.status_id
    JOIN areas a ON a.area_id = r.area_id
`;

// ID harus bilangan bulat positif
function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Ubah error PostgreSQL menjadi respons yang mudah dipahami
function handleDbError(res, error) {
    // 23503 = foreign key tidak ditemukan
    if (error.code === '23503') {
        return res.status(400).json({
            message: 'user_id, category_id, status_id, atau area_id tidak ditemukan di database',
            detail: error.detail,
        });
    }
    // 23514 = melanggar CHECK constraint (misal latitude di luar rentang)
    if (error.code === '23514') {
        return res.status(400).json({
            message: 'Data tidak valid (cek latitude/longitude: keduanya diisi atau keduanya kosong, dalam rentang yang benar)',
            detail: error.constraint,
        });
    }
    // 22P02 / 22003 = format atau nilai angka tidak valid
    if (error.code === '22P02' || error.code === '22003') {
        return res.status(400).json({ message: 'Format data angka tidak valid' });
    }
    console.error('Database error:', error.message);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
}

// GET /api/reports  -> semua laporan
async function getAllReports(req, res) {
    try {
        const result = await pool.query(`${BASE_SELECT} ORDER BY r.report_id ASC`);
        res.status(200).json({
            message: 'Berhasil mengambil semua data laporan',
            total: result.rowCount,
            data: result.rows,
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

// GET /api/reports/:id  -> laporan berdasarkan ID
async function getReportById(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'ID laporan harus berupa angka positif' });
    }

    try {
        const result = await pool.query(`${BASE_SELECT} WHERE r.report_id = $1`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: `Laporan dengan ID ${id} tidak ditemukan` });
        }
        res.status(200).json({
            message: 'Berhasil mengambil data laporan',
            data: result.rows[0],
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

// GET /api/reports/search?title=...  -> laporan berdasarkan judul (tidak case-sensitive, sebagian kata)
async function getReportsByTitle(req, res) {
    const title = (req.query.title || '').trim();
    if (!title) {
        return res.status(400).json({ message: 'Query parameter "title" wajib diisi, contoh: /api/reports/search?title=jalan' });
    }

    try {
        const result = await pool.query(
            `${BASE_SELECT} WHERE r.title ILIKE $1 ORDER BY r.report_id ASC`,
            [`%${title}%`]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: `Laporan dengan judul "${title}" tidak ditemukan`, data: [] });
        }
        res.status(200).json({
            message: `Berhasil mencari laporan dengan judul "${title}"`,
            total: result.rowCount,
            data: result.rows,
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

// POST /api/reports  -> membuat laporan baru
async function createReport(req, res) {
    const body = req.body || {};
    const missing = REQUIRED_FIELDS.filter(
        (field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === ''
    );
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Data wajib belum lengkap', missing_fields: missing });
    }

    const {
        user_id, category_id, status_id, area_id,
        title, description, location,
        latitude = null, longitude = null,
    } = body;

    try {
        const insert = await pool.query(
            `INSERT INTO reports
                (user_id, category_id, status_id, area_id, title, description, location, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING report_id`,
            [user_id, category_id, status_id, area_id, title, description, location, latitude, longitude]
        );
        const created = await pool.query(`${BASE_SELECT} WHERE r.report_id = $1`, [insert.rows[0].report_id]);
        res.status(201).json({
            message: 'Laporan berhasil dibuat',
            data: created.rows[0],
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

// PUT /api/reports/:id  -> memperbarui laporan (kirim kolom yang ingin diubah saja)
async function updateReport(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'ID laporan harus berupa angka positif' });
    }

    const body = req.body || {};
    const allowed = [...REQUIRED_FIELDS, 'latitude', 'longitude'];
    const fields = allowed.filter((field) => body[field] !== undefined);

    if (fields.length === 0) {
        return res.status(400).json({ message: 'Tidak ada data yang dikirim untuk diperbarui', allowed_fields: allowed });
    }

    const emptyRequired = fields.filter(
        (field) => REQUIRED_FIELDS.includes(field) && (body[field] === null || String(body[field]).trim() === '')
    );
    if (emptyRequired.length > 0) {
        return res.status(400).json({ message: 'Kolom wajib tidak boleh kosong', empty_fields: emptyRequired });
    }

    // Susun "kolom = $n" secara dinamis, nama kolom diambil dari daftar allowed (aman dari SQL injection)
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = fields.map((field) => body[field]);
    values.push(id);

    try {
        const update = await pool.query(
            `UPDATE reports SET ${setClause} WHERE report_id = $${values.length} RETURNING report_id`,
            values
        );
        if (update.rowCount === 0) {
            return res.status(404).json({ message: `Laporan dengan ID ${id} tidak ditemukan` });
        }
        const updated = await pool.query(`${BASE_SELECT} WHERE r.report_id = $1`, [id]);
        res.status(200).json({
            message: 'Laporan berhasil diperbarui',
            data: updated.rows[0],
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

// DELETE /api/reports/:id  -> menghapus laporan
async function deleteReport(req, res) {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: 'ID laporan harus berupa angka positif' });
    }

    try {
        const result = await pool.query('DELETE FROM reports WHERE report_id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: `Laporan dengan ID ${id} tidak ditemukan` });
        }
        res.status(200).json({
            message: `Laporan dengan ID ${id} berhasil dihapus`,
            data: result.rows[0],
        });
    } catch (error) {
        handleDbError(res, error);
    }
}

module.exports = {
    getAllReports,
    getReportById,
    getReportsByTitle,
    createReport,
    updateReport,
    deleteReport,
};
