const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Catatan: route /search harus ditulis SEBELUM /:id
// agar kata "search" tidak dianggap sebagai ID.
router.get('/', reportController.getAllReports);               // GET semua data
router.get('/search', reportController.getReportsByTitle);     // GET berdasarkan judul (?title=...)
router.get('/:id', reportController.getReportById);            // GET berdasarkan ID
router.post('/', reportController.createReport);               // POST data baru
router.put('/:id', reportController.updateReport);             // PUT perbarui data
router.delete('/:id', reportController.deleteReport);          // DELETE hapus data

module.exports = router;
