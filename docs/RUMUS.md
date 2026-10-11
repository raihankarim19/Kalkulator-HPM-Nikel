# Metodologi Perhitungan HPM Bijih Nikel

Dokumen ini menjelaskan rumus yang dipakai kalkulator, dasar regulasinya, dan cara rumus divalidasi.

## Dasar regulasi

| Kepmen ESDM | Status | Keterangan |
|---|---|---|
| 268.K/MB.01/MEM.B/2025 | Induk | Pedoman Penetapan Harga Patokan untuk Penjualan Komoditas Mineral Logam dan Batubara |
| 144.K/MB.01/MEM.B/2026 | Perubahan pertama | Memasukkan Fe, Co, dan Cr sebagai mineral ikutan dalam HPM bijih nikel |
| **363.K/MB.01/MEM.B/2026** | **Perubahan kedua, berlaku 15 September 2026** | Menurunkan CF Ni dan CF Co untuk bijih kadar rendah (Ni ≤ 1,2%) |

## Rumus HPM

```
HPM (USD/wmt) = [ (%Ni × CF_Ni × HMA_Nikel)
                + (%Fe × CF_Fe × HMA_BijihBesi × 100)
                + (%Co × CF_Co × HMA_Kobalt)
                + (%Cr × CF_Cr × HMA_BijihKrom × 100) ] × (1 − MC)
```

- Semua kadar (%Ni, %Fe, %Co, %Cr) dan MC dalam bentuk desimal (1,2% → 0,012).
- HMA Nikel dan HMA Kobalt dalam USD/dmt logam. HMA Bijih Besi dan HMA Bijih Krom dalam USD per unit kadar, sehingga dikalikan 100.
- Hasil dalam kurung kurawal adalah nilai per dry metric ton. Pengali (1 − MC) mengubahnya ke wet metric ton.

## Corrective Factor (CF)

### CF Nikel — dua rezim

| Rezim | Kadar Ni | Rumus CF Ni |
|---|---|---|
| Normal | Ni > 1,2% | CF = 30% + ((Ni − 1,6%) ÷ 0,1%) × 1% |
| Kadar rendah | Ni ≤ 1,2% | CF = 14% + ((Ni − 1,2%) ÷ 0,1%) × 1% |

Contoh nilai:

| Ni | 1,0% | 1,1% | **1,2%** | **1,21%** | 1,3% | 1,4% | 1,5% | 1,6% | 1,8% |
|---|---|---|---|---|---|---|---|---|---|
| CF Ni (363/2026) | 12% | 13% | **14%** | **26,1%** | 27% | 28% | 29% | 30% | 32% |
| CF Ni (144/2026) | 24% | 25% | 26% | 26,1% | 27% | 28% | 29% | 30% | 32% |

Perhatikan lompatan sekitar 12 poin persentase di batas 1,2%. Bijih Ni 1,20% mendapat CF 14%, sedangkan Ni 1,21% mendapat 26,1%.

### CF mineral ikutan

| Mineral | CF | Syarat dihitung |
|---|---|---|
| Besi (Fe) | 30% | Fe ≤ 35% |
| Kobalt (Co) | 30% bila Ni > 1,2%; **17% bila Ni ≤ 1,2%** | Co ≥ 0,05% |
| Krom (Cr) | 10% | Selalu dihitung |

## Validasi

Engine divalidasi terhadap HPM yang dipublikasikan Shanghai Metals Market (SMM) per kadar Ni. Asumsi kualitas yang konsisten dengan angka SMM: Fe > 35% (tidak dihitung), Co 0,10%, Cr 2%, MC 35%.

| Periode HMA | Ni | HPM SMM | HPM kalkulator |
|---|---|---|---|
| September II 2026 | 1,2% | 24,89 | 24,89 |
| September II 2026 | 1,3% | 49,20 | 49,20 |
| Oktober I 2026 | 1,2% | 23,19 | 23,19 |
| Oktober I 2026 | 1,3% | 46,07 | 46,07 |

Angka 1,2% sekaligus mengonfirmasi dua perubahan (CF Ni 14% dan CF Co 17%). Dengan rumus 144/2026, Ni 1,2% periode September II menghasilkan USD 44,97/wmt, sama dengan angka "sebelum revisi" yang disebut SMM.

Validasi ini dijalankan otomatis lewat `npm test` (lihat [`tests/hpm.test.js`](../tests/hpm.test.js)).

## Batasan

- Rumus disusun dari pemberitaan dan rekonsiliasi dengan angka publikasi, bukan dari salinan resmi lampiran Kepmen. Untuk keperluan transaksi atau pelaporan, cocokkan dengan dokumen resmi Kementerian ESDM.
- Kalkulator hanya menghitung HPM **bijih** nikel. Kepmen 363/2026 juga mengatur CF produk olahan (MHP, MSP, feronikel, NPI, nickel matte, dan lainnya) yang belum dicakup di sini.
- Pengambilan HMA otomatis bergantung pada CORS proxy publik dan struktur halaman minerba.esdm.go.id. Bila gagal, isi HMA secara manual.

## Sumber

- [Kementerian ESDM Ubah Formula HPM Nikel — nikel.co.id](https://nikel.co.id/2026/09/16/kementerian-esdm-ubah-formula-hpm-nikel-fe-co-dan-cr-kini-jadi-komponen-penentu-harga/)
- [HPM Nikel Direvisi, APNI Soroti Valuasi Limonit — nikel.co.id](https://nikel.co.id/2026/09/16/hpm-nikel-direvisi-apni-soroti-valuasi-limonit-dan-penerimaan-negara/)
- [SMM: Indonesia revises nickel ore HPM formula](https://news.metal.com/newscontent/104117799-smm-nickel-flash-newsindonesia-revises-nickel-ore-hpm-formula-12-ni-hpm-falls-45)
- [SMM: HPM nickel second half of September 2026](https://news.metal.com/newscontent/104118082-smm-flash-news-indonesias-hpm-nickel-further-decreased-in-second-half-of-september)
- [SMM: HMA nickel first period of October 2026](https://news.metal.com/newscontent/104143238-smm-flash-newsindonesias-hma-nickel-further-decreased-in-first-period-of-october)
- [Harga Mineral Acuan — Ditjen Minerba ESDM](https://www.minerba.esdm.go.id/harga_acuan)
