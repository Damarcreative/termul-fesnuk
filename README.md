# FB TERMUL Extension

FB TERMUL Extension adalah ekstensi peramban (browser extension) berbasis Chromium yang dirancang untuk menandai dan melabeli pengguna Facebook tertentu secara dinamis. Ekstensi ini mengintegrasikan tombol aksi (action button) secara langsung ke dalam antarmuka pengguna Facebook (UI/UX) dan menggunakan backend lokal berbasis Node.js dan SQLite untuk manajemen data.

## Arsitektur Proyek

Proyek ini terbagi menjadi dua komponen utama:
1. **Client (Ekstensi Chrome):** Skrip klien yang berjalan di background dan di atas DOM Facebook. Bertugas untuk memindai node artikel, mengekstrak identitas pengguna (ID atau Username), dan menyuntikkan elemen UI (badge dan tombol toggle).
2. **Server (Backend API):** Layanan REST API sederhana berbasis Express.js yang terkoneksi dengan database SQLite. Berfungsi sebagai pusat data untuk menyimpan profil yang dilabeli.

## Fitur Utama

- **Integrasi UI Asli:** Tombol label terintegrasi tanpa merusak layout Facebook. Tombol teks disisipkan pada barisan aksi komentar (sebelah "Balas"), dan tombol ikon disisipkan pada menu opsi postingan.
- **Dukungan Dark Mode:** Memanfaatkan CSS variables bawaan Facebook (seperti `var(--secondary-text)`) sehingga antarmuka ekstensi beradaptasi secara otomatis dengan tema gelap maupun terang.
- **Ekstraksi Identitas Presisi:** Mengutamakan ID Facebook numerik (berasal dari atribut `data-hovercard` atau parameter URL) dibandingkan username untuk mencegah duplikasi atau kesalahan identifikasi.
- **Batch Processing & Caching:** Mengirim permintaan validasi secara massal (`/check-batch`) untuk meminimalkan beban jaringan. Memori cache diterapkan di klien untuk menghindari permintaan berulang pada data yang sama selama sesi berjalan.
- **Dashboard Popup:** Konfigurasi alamat server API, pengecekan status (Ping), dan tabel mini yang dilengkapi dengan fitur pencarian data lokal secara real-time.

## Struktur Direktori

```text
fb-termul-extension/
├── .gitignore
├── background.js          # Skrip background ekstensi (Service Worker)
├── content.js             # Skrip utama DOM manipulator (Observer & Fetcher)
├── manifest.json          # Konfigurasi ekstensi Chrome (V3)
├── popup.html             # Antarmuka dashboard mini
├── popup.css              # Styling dashboard
├── popup.js               # Skrip interaksi dashboard & penyimpanan lokal
├── icons/                 # Direktori ikon ekstensi
└── server/
    ├── app.js             # Entry point REST API (Express)
    ├── database.js        # Konfigurasi SQLite
    ├── package.json       # Konfigurasi dependensi Node.js
    └── data.db            # Berkas database SQLite (Otomatis dibuat)
```

## Prasyarat Lingkungan

- Browser berbasis Chromium (Google Chrome, Microsoft Edge, Brave, dll.)
- Node.js (Versi 14.x atau lebih baru disarankan)
- NPM atau Yarn

## Instalasi & Penggunaan

### 1. Menjalankan Server Backend

Aplikasi ekstensi membutuhkan backend yang berjalan agar dapat memverifikasi dan menyimpan data pengguna.

```bash
# Pindah ke direktori server
cd server

# Instalasi dependensi (Express, SQLite3, CORS)
npm install

# Jalankan server
npm start
```
Secara default, server akan berjalan di `http://localhost:3000`. Jika server berjalan dengan normal, konsol akan menampilkan pesan: `Server running at http://localhost:3000`.

### 2. Memasang Ekstensi di Browser

1. Buka browser Chrome dan akses halaman `chrome://extensions/`.
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik tombol **Load unpacked**.
4. Pilih folder utama proyek ini (`fb-termul-extension`).

### 3. Konfigurasi Awal Ekstensi

1. Buka Facebook di tab baru.
2. Klik ikon ekstensi FB TERMUL di bar navigasi browser.
3. Pada antarmuka popup, pastikan URL server menunjuk ke alamat yang benar (standarnya `http://localhost:3000`).
4. Klik **Save & Ping**. Pastikan status berubah menjadi **Connected** dengan warna hijau.
5. Muat ulang (refresh) halaman Facebook untuk menerapkan konfigurasi.

## Rincian API (Endpoints)

Base URL: `http://localhost:3000`

- `GET /ping`
  Mengecek ketersediaan server.
- `GET /all`
  Mengambil semua data label yang tersimpan dalam format array JSON.
- `GET /check/:type/:value`
  Mengecek eksistensi identitas tunggal. `:type` dapat berupa `id` atau `username`.
- `POST /check-batch`
  Memverifikasi sekumpulan identitas sekaligus. Membutuhkan body JSON `{ "identities": [{ "type": "id", "value": "123" }] }`.
- `POST /save`
  Menyimpan profil baru ke dalam database.
- `DELETE /remove/:type/:value`
  Menghapus label dari pengguna yang dispesifikasikan.

## Panduan Kontribusi / Modifikasi

- **Pengubahan URL API:** Jika Anda meng-hosting server di perangkat/jaringan berbeda, ubah URL API melalui popup ekstensi, jangan mengubahnya secara hardcode di `content.js`.
- **Logika Ekstraksi Identitas:** Logika pengenalan URL berada pada fungsi `extractIdentity` di dalam `content.js`. Jika Facebook mengubah struktur URL mereka, perbarui parser RegEx dan URL API objek di fungsi tersebut.
- **Modifikasi Database:** Skema tabel SQLite dapat dilihat dan dimodifikasi melalui fungsi inisialisasi di `server/database.js`. Jika Anda menambah kolom baru, pastikan rute `/save` di `server/app.js` juga diperbarui untuk memproses data baru tersebut.
