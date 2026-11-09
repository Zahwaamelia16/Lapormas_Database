-- Data contoh untuk pengujian REST API reports di Postman.
-- Jalankan SETELAH database/lapormas.sql.
-- Tabel reports membutuhkan users dan areas (foreign key), jadi keduanya diisi dahulu.

INSERT INTO areas (village_name, district_name, regency_name) VALUES
    ('Ketintang', 'Gayungan', 'Kota Surabaya'),
    ('Lidah Wetan', 'Lakarsantri', 'Kota Surabaya')
ON CONFLICT (village_name, district_name, regency_name) DO NOTHING;

-- password_hash hanya contoh (bukan password asli)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Budi Santoso', 'budi@example.com', '$2b$10$contohhashpasswordwarga', 'warga'),
    ('Siti Petugas', 'siti@example.com', '$2b$10$contohhashpasswordpetugas', 'petugas')
ON CONFLICT DO NOTHING;

INSERT INTO reports (user_id, category_id, status_id, area_id, title, description, location, latitude, longitude)
SELECT u.user_id, c.category_id, s.status_id, a.area_id,
       v.title, v.description, v.location, v.latitude, v.longitude
FROM (VALUES
    ('budi@example.com', 'Jalan Rusak', 'Menunggu', 'Ketintang',
     'Jalan berlubang di depan sekolah', 'Lubang cukup dalam dan membahayakan pengendara motor.',
     'Jl. Ketintang No. 10', -7.3116000, 112.7270000),
    ('budi@example.com', 'Lampu Jalan Mati', 'Diproses', 'Lidah Wetan',
     'Lampu jalan mati di gang 3', 'Sudah seminggu lampu jalan tidak menyala sehingga gang gelap.',
     'Gang 3 Lidah Wetan', NULL, NULL)
) AS v(email, category_name, status_name, village_name, title, description, location, latitude, longitude)
JOIN users u ON LOWER(u.email) = v.email
JOIN report_categories c ON c.category_name = v.category_name
JOIN report_statuses s ON s.status_name = v.status_name
JOIN areas a ON a.village_name = v.village_name
WHERE NOT EXISTS (SELECT 1 FROM reports r WHERE r.title = v.title);
