# Mitologi Inspira · Link App (PWA)

Pengganti Linktree dan flyer cetak. Pengunjung scan QR, mengisi nama dan nomor WhatsApp, lalu bisa memasang app di layar utama dan menyimpan kontak Mitologi Inspira.

## Isi paket

| File | Fungsi |
|---|---|
| `index.html` | Halaman utama. Semua pengaturan ada di blok `CONFIG` di bagian bawah file |
| `manifest.webmanifest`, `sw.js` | Membuat halaman bisa dipasang sebagai app dan tetap terbuka saat offline |
| `icons/` | Ikon app (sementara). Ganti dengan logo resmi, ukuran dan nama file sama |
| `mitologi-inspira.vcf` | Kartu kontak untuk tombol "Simpan Kontak" |
| `apps-script.gs` | Penerima lead dan pendaftaran IOITE ke Google Sheet |
| `leads.js` | Pengirim data dengan antrean di HP: kalau sinyal putus, dikirim ulang otomatis |
| `booth.html` | Halaman QR booth IOITE, memilih kode voucher sesuai tanggal |
| `CNAME`, `.nojekyll` | Untuk GitHub Pages dengan subdomain |

## 1. Upload ke GitHub Pages

1. Buat repo baru di GitHub, misalnya `mitologi-link` (public).
2. Upload semua isi folder ini ke root repo (termasuk `CNAME` dan `.nojekyll`).
3. Settings → Pages → Source: `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Custom domain: isi `link.mitologiinspira.com`, simpan.

## 2. DNS di Cloudflare

1. DNS → Add record: Type `CNAME`, Name `link`, Target `<username-github>.github.io`.
2. **Proxy status: DNS only (awan abu-abu) dulu**, supaya GitHub bisa menerbitkan sertifikat HTTPS.
3. Setelah di GitHub Pages muncul centang dan opsi **Enforce HTTPS** bisa dicentang, centang itu. Setelah itu proxy Cloudflare boleh dinyalakan (awan oranye) dengan SSL/TLS mode `Full`.

HTTPS wajib. Tanpa HTTPS, fitur pasang app tidak jalan.

## 3. Sambungkan ke Google Sheet

1. Buat Google Sheet baru (atau pakai Sheet Client OS).
2. Extensions → Apps Script → hapus isi, tempel isi `apps-script.gs` → Save.
3. Deploy → New deployment → Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Salin URL Web App (berakhiran `/exec`), tempel ke `CONFIG.sheetEndpoint` di `index.html`, commit.

Setelah mengganti `apps-script.gs`, buka Deploy → Manage deployments → Edit → Version: New version → Deploy. URL `/exec` tetap sama.

Lead masuk ke tab `Leads QR` berisi waktu, nama, WhatsApp, jabatan, perusahaan, email, sumber QR, link WA siap klik, dan status.

Pendaftaran kelas, quest, dan coaching di halaman IOITE masuk ke tab:

- `Waiting List Utama IOITE`: yang sudah punya laporan Lakon.
- `Waiting List Cadangan IOITE`: yang belum.
- `Semua Pendaftaran IOITE`: gabungan keduanya. Filter kolom `Kegiatan` dan `Hari` untuk melihat satu kelas.

Kolom `Antrian` adalah urutan daftar di kegiatan dan hari yang sama, per tab. `Punya Lakon` berdasarkan pilihan pendaftar di form, belum diverifikasi ke sistem Lakon. Pendaftar yang sama untuk kegiatan yang sama tidak dicatat dua kali. Kalau pendaftar cadangan lalu mendaftar lagi sebagai utama, baris lamanya ditandai `Pindah ke Utama`.

Jika Anda sudah pernah membuat tab `Leads QR` dari versi lama, hapus tab itu sebelum mengetes lagi, supaya kolom barunya dibuat ulang.

## 4. Pengaturan cepat (`CONFIG` di `index.html`)

- `waNumber`: nomor tujuan WhatsApp, format `62...`
- `links`: URL website, Ansaka, Lakon, Instagram
- `promptDelayMs`: jeda sebelum form muncul. Form muncul di setiap kunjungan sampai pengunjung mengisinya
- `videoId`: ID video YouTube untuk bagian video

Popup data dikendalikan `popupAktif` di `CONFIG`. `true`: muncul otomatis dan tidak bisa ditutup sebelum nama dan nomor WhatsApp diisi. `false` (saat ini): tidak muncul otomatis, dan form yang dibuka lewat tombol "Simpan di HP" bisa ditutup. Perusahaan, jabatan, dan email opsional.

Isi halaman "Kenali Tipemu" (doa MBTI dan 24 Paraga Lakon) ada di `tipe.html`, pada array `MBTI` dan `PARAGA`. Judul Paraga diambil dari lakonprofile.com, penjelasan singkatnya ditulis dari arti Kelompok dan Watak.

Untuk menguji ulang form di HP Anda sendiri, buka `https://link.mitologiinspira.com/?reset=1`.

Setiap kali mengubah isi halaman, naikkan `VERSION` di `sw.js` (misalnya `mi-link-v2`) supaya HP yang sudah memasang app mengambil versi baru.

## 5. QR per acara

Parameter `?src=` tercatat di kolom "Sumber QR". Buat QR berbeda per flyer atau acara, misalnya:

- `https://link.mitologiinspira.com/?src=bni`
- `https://link.mitologiinspira.com/?src=expo-hr-2026`

## Batasan yang perlu diketahui

- **Android (Chrome, Samsung Internet):** tombol "Pasang di layar utama" memunculkan dialog instal asli.
- **iPhone:** Apple tidak mengizinkan dialog instal otomatis. Halaman menampilkan panduan 3 langkah (Share → Add to Home Screen) dan harus dibuka di Safari.
- **Browser dalam aplikasi** (Instagram, TikTok, Facebook) tidak bisa memasang app. Pengunjung diminta membuka di Chrome atau Safari. Scan dari kamera HP langsung membuka browser biasa, jadi aman.
- Dengan `popupAktif: true` (saat ini), form muncul otomatis dan wajib diisi. Dengan `false`, form hanya muncul lewat tombol "Simpan di HP" dan bisa ditutup tanpa diisi.
