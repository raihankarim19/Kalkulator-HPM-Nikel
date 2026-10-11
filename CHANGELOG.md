# Changelog

Semua perubahan penting pada kalkulator dicatat di sini.

## [2.1.0] — 2026-10-11

### Diperbaiki
- Tombol **Ambil HMA** selalu gagal karena situs minerba.esdm.go.id sedang perbaikan dan proxy CORS publik tidak andal. HMA kini dibaca dari `hma.json` di repo sendiri, jadi selesai dalam sekejap tanpa proxy.
- Halaman ESDM yang tidak berisi tabel HMA (mis. "sedang perbaikan") sebelumnya bisa terbaca sebagai "berhasil" dengan angka default. Sekarang hasil parse wajib lengkap dan lolos uji kewajaran.
- Proxy cadangan kini dicoba paralel (maks. ±10 detik), bukan berurutan (hingga 60 detik).

### Ditambahkan
- `hma.json` berisi HMA Periode I Oktober 2026 (Kepmen ESDM 384.K/MB.01/MEM.B/2026).
- GitHub Actions harian yang mengambil HMA dari ESDM di sisi server dan memperbarui `hma.json` otomatis.
- Periode, dasar hukum, dan sumber HMA ditampilkan di bawah isian HMA.
- HMA terbaru terisi otomatis saat aplikasi pertama kali dibuka.

## [2.0.0] — 2026-10-11

Pembaruan ke **Kepmen ESDM No. 363.K/MB.01/MEM.B/2026** (berlaku 15 September 2026).

### Berubah
- CF Ni kini dua rezim. Ni > 1,2% tetap 30% pada Ni 1,6%. Ni ≤ 1,2% menjadi 14% pada Ni 1,2% dan turun 1% per penurunan 0,1% Ni.
- CF Kobalt ikutan menjadi 17% bila Ni ≤ 1,2% (tetap 30% bila Ni > 1,2%).
- Bagian perbandingan kini membandingkan dengan rumus sebelumnya (Kepmen 144/2026), bukan Kepmen 268/2025.
- Default HMA diperbarui ke Periode I Oktober 2026.

### Ditambahkan
- Preset "Limonit LG" (Ni ≤ 1,2%).
- Badge rezim CF dan catatan otomatis untuk bijih kadar rendah.
- Tampilan rumus CF kedua rezim di bagian Corrective Factor.
- Unit test yang memvalidasi engine terhadap angka HPM publikasi SMM, dan CI GitHub Actions.
- Dokumentasi metodologi di [`docs/RUMUS.md`](docs/RUMUS.md).

### Diperbaiki
- Perbandingan batas kadar (Ni 1,2%, Fe 35%, Co 0,05%) kini tahan galat floating-point.
- Selisih negatif tampil sebagai "−$18.75", bukan "$-18.75".
- Cache service worker dinaikkan ke v4 agar pengguna PWA mendapat versi baru.

## [1.0.0]

Rilis awal berdasarkan Kepmen ESDM No. 144.K/MB.01/MEM.B/2026, dengan perbandingan terhadap Kepmen 268/2025.
