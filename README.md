# LAPORMAS – Database dan Koneksi PostgreSQL

Bagian ini berisi schema PostgreSQL dan contoh konfigurasi koneksi database untuk backend Express.js.

## 1. Membuat database

Buat database bernama `lapormas_db` melalui pgAdmin atau psql. Setelah itu buka Query Tool pada database tersebut dan jalankan seluruh isi file `database/lapormas.sql`.

## 2. Memasang package

Di folder project Express.js, jalankan:

```bash
npm install pg dotenv
```

Jika project belum memiliki `package.json`, inisialisasi dahulu dengan `npm init -y`.

## 3. Mengatur environment

Salin `.env.example` menjadi `.env`, lalu sesuaikan `DB_USER` dan `DB_PASSWORD` dengan konfigurasi PostgreSQL di komputer masing-masing. Jangan mengunggah file `.env` ke GitHub.

Pastikan `.gitignore` memuat:

```gitignore
node_modules
.env
```

## 4. Memakai koneksi di Express.js

Pada file utama aplikasi (misalnya `app.js` atau `server.js`), panggil dotenv sebelum mengimpor konfigurasi database:

```js
require('dotenv').config();
const express = require('express');
const pool = require('./src/config/db');

const app = express();
app.use(express.json());

app.get('/api/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.status(200).json({
      message: 'Koneksi PostgreSQL berhasil',
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error('Database connection error:', error.message);
    res.status(500).json({ message: 'Koneksi PostgreSQL gagal' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan pada http://localhost:${PORT}`);
});
```

Sesuaikan path `require('./src/config/db')` dengan lokasi file konfigurasi database di project utama.

## 5. Struktur relasi

- `users` 1–1 `user_profiles` melalui `user_profiles.user_id`.
- `areas` 1–N `user_profiles`, `reports`, dan `responsible_units`.
- `users` 1–N `reports` dan `report_updates`.
- `report_categories` 1–N `reports`.
- `report_statuses` 1–N `reports` dan `report_updates`.
- `reports` 1–N `report_images` dan `report_updates`.
- `reports` N–N `responsible_units` melalui `report_assignments`.

Catatan: API enam endpoint untuk tabel `reports` merupakan bagian route/controller. File ini menyiapkan database dan koneksi, bukan keseluruhan implementasi endpoint.
