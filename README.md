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

## 6. REST API tabel `reports`

### Struktur project

```
app.js                              # entry point Express.js
src/config/db.js                    # koneksi PostgreSQL (pg Pool)
src/routes/reportRoutes.js          # daftar 6 route /api/reports
src/controllers/reportController.js # logika query ke database
database/lapormas.sql               # schema + data kategori & status
database/seed.sql                   # data contoh users, areas, reports
LAPORMAS_Reports_API.postman_collection.json
```

### Menjalankan

```bash
npm install
# jalankan database/lapormas.sql lalu database/seed.sql di database PostgreSQL
npm run test-db   # cek koneksi database
npm start         # server di http://localhost:3000
```

Nama database harus sama dengan `DB_NAME` di file `.env`.

### Daftar endpoint

| No | Method | URL | Fungsi |
|----|--------|-----|--------|
| 1 | GET | `/api/reports` | Mendapatkan semua laporan |
| 2 | GET | `/api/reports/:id` | Mendapatkan laporan berdasarkan ID |
| 3 | GET | `/api/reports/search?title=jalan` | Mencari laporan berdasarkan judul (sebagian kata, tidak membedakan huruf besar/kecil) |
| 4 | POST | `/api/reports` | Membuat laporan baru |
| 5 | PUT | `/api/reports/:id` | Memperbarui laporan (cukup kirim kolom yang ingin diubah) |
| 6 | DELETE | `/api/reports/:id` | Menghapus laporan |

Tambahan: `GET /api/db-check` untuk mengecek koneksi database.

Contoh body POST (Postman → Body → raw → JSON):

```json
{
  "user_id": 1,
  "category_id": 1,
  "status_id": 1,
  "area_id": 1,
  "title": "Sampah menumpuk di pasar",
  "description": "Sampah belum diangkut selama 3 hari dan mulai berbau.",
  "location": "Pasar Ketintang, Surabaya",
  "latitude": -7.312,
  "longitude": 112.728
}
```

Kolom wajib: `user_id`, `category_id`, `status_id`, `area_id`, `title`, `description`, `location`. `latitude` dan `longitude` opsional, tetapi harus diisi berpasangan. ID yang dipakai harus sudah ada di tabel terkait (karena itu jalankan `seed.sql` terlebih dahulu).

Contoh body PUT:

```json
{ "status_id": 3, "title": "Sampah menumpuk di pasar (sedang diangkut)" }
```

Kode respons: `200` berhasil, `201` data dibuat, `400` input tidak valid / foreign key tidak ditemukan, `404` data tidak ditemukan, `500` error server.

### Pengujian di Postman

Import file `LAPORMAS_Reports_API.postman_collection.json` ke Postman (Import → pilih file). Urutan request sudah disesuaikan dengan urutan screenshot pada laporan: POST → GET semua → GET by ID → PUT → DELETE → GET by judul. Pastikan ID pada PUT/DELETE adalah ID laporan yang dibuat oleh POST.
