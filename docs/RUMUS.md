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

## Sensitivitas kadar Ni

Bagian 6 kalkulator menghitung ulang HPM untuk setiap langkah **0,01% Ni** di sekitar kadar input (rentang ±0,05%, ±0,10%, atau ±0,20%). Pada mode **Ikut pola geologi**, kadar Fe, Co, Cr, dan MC ikut berubah mengikuti pola profil laterit. Pada mode **Kadar lain tetap**, kadar tersebut dikunci (ceteris paribus).

### Dasar geologis

Profil laterit nikel di Sulawesi dan Halmahera tersusun dari atas ke bawah: tanah penutup → limonit → zona transisi → saprolit → batuan dasar (peridotit/harzburgit terserpentinisasi). Pola yang konsisten dilaporkan:

- **Fe, Cr, dan Al** terkonsentrasi di limonit (goethit/hematit) dan turun ke bawah. **MgO dan SiO₂** naik ke bawah (Irfan dkk. 2021; Ilyas dkk. 2022; Hasria dkk. 2024; Safah dkk. 2026).
- **Ni memuncak di saprolit** (terikat di serpentin/garnierit), lebih rendah di limonit. Hasria dkk. (2024) mencatat Ni limonit 0,8–1,2% dan saprolit 1,3–2,4%. Ariend dkk. (2026) mendapati **hubungan terbalik Fe–Ni**: limonit Fe 48,8–50,2% dengan Ni 0,70–1,15%, saprolit Fe 21–29% dengan Ni 1,45–2,05%.
- **Co** terkaya di limonit, terutama di **dasar limonit**, karena berasosiasi dengan oksida Mn (asbolan) dan goethit (Ito dkk. 2021; Safah dkk. 2026). Di zona limonit, Ni berkorelasi positif dengan Co dan Fe–Co berkorelasi kuat (Ilyas dkk. 2022).
- **Kadar air** limonit (lempung goethitik) umumnya lebih tinggi daripada saprolit.
- **Ni tidak monoton terhadap kedalaman**: di bawah puncak saprolit, Ni turun lagi ke arah batuan dasar dengan Fe tetap rendah. Lithologi dan derajat serpentinisasi batuan dasar sangat memengaruhi kadar (Irfan dkk. 2021; Ito dkk. 2021).

### Model

Karena Ni tidak monoton, model memakai **dua jalur profil**. Masing-masing berupa tabel kadar tipikal yang diinterpolasi linear terhadap Ni:

**Profil atas** (limonit → transisi → saprolit atas; Ni naik ke bawah)

| Zona | Ni | Fe | Co | Cr | MC |
|---|---|---|---|---|---|
| Tanah penutup / limonit merah | 0,50 | 50,0 | 0,040 | 3,00 | 38,0 |
| Limonit merah | 0,80 | 48,0 | 0,070 | 2,80 | 38,0 |
| Limonit kuning | 1,20 | 45,0 | 0,120 | 2,40 | 37,0 |
| Dasar limonit (puncak Co) | 1,40 | 40,0 | 0,150 | 2,10 | 36,5 |
| Transisi | 1,55 | 28,0 | 0,100 | 1,50 | 35,0 |
| Saprolit atas | 1,80 | 16,0 | 0,050 | 0,90 | 33,0 |
| Puncak saprolit | 2,20 | 11,0 | 0,030 | 0,60 | 31,0 |
| | 2,60 | 9,0 | 0,025 | 0,50 | 30,0 |

**Profil bawah** (batuan dasar → saprolit; Ni naik ke atas)

| Zona | Ni | Fe | Co | Cr | MC |
|---|---|---|---|---|---|
| Batuan dasar | 0,30 | 6,0 | 0,012 | 0,30 | 15,0 |
| Saprolit berbatu | 0,80 | 7,0 | 0,018 | 0,35 | 22,0 |
| | 1,20 | 8,0 | 0,022 | 0,42 | 26,0 |
| Saprolit | 1,60 | 9,5 | 0,026 | 0,50 | 29,0 |
| Puncak saprolit | 2,20 | 11,0 | 0,030 | 0,60 | 31,0 |
| | 2,60 | 9,0 | 0,025 | 0,50 | 30,0 |

Semua angka dalam %. Tabel ini dikalibrasi agar melewati dua preset nyata di aplikasi: limonit (Ni 1,35 / Fe 40,5 / Co 0,15 / Cr 2,24 / MC 36,69) dan saprolit (Ni 1,81 / Fe 11,79 / Co 0,03 / Cr 0,77 / MC 35).

**Pemilihan jalur.** Jalur otomatis adalah jalur yang kadar Fe tipikalnya paling dekat dengan Fe input pada kadar Ni yang sama. Contoh pada Ni 1,30%: Fe input ~43% → profil atas (limonit); Fe input ~9% → profil bawah (saprolit). Pengguna dapat memilih jalur secara manual.

**Penjangkaran ke input.** Tabel hanya menyumbang **laju perubahan**, bukan nilai absolut:

```
kadar_X(Ni) = kadar_X_input + [ profil_X(Ni) − profil_X(Ni_input) ]
```

Jadi kadar di titik input selalu sama persis dengan input pengguna, dan selisih antarendapan (misalnya Fe saprolit Halmahera yang lebih tinggi) tidak mengubah arah perubahan. Kadar dibatasi ≥ 0 dan MC ≤ 99%.

### Yang perlu diperhatikan

- **Dua "tebing" HPM.** Pertama, batas CF Ni 1,2% (Kepmen 363/2026): Ni 1,20% → 1,21% menaikkan CF Ni dari 14% ke 26,1%. Kedua, **Fe turun melewati 35%** di zona transisi (sekitar Ni 1,45% pada profil atas): komponen besi tiba-tiba ikut dihitung, dengan nilai sekitar USD 15/dmt pada HMA Okt-I 2026. Grafik menandai keduanya dengan garis oranye.
- **Model ini rata-rata regional.** Pola di satu blok tambang bisa berbeda (misalnya saprolit kaya Fe di Halmahera, atau limonit ber-Co rendah). Untuk keputusan komersial seperti penetapan kadar jual atau blending, gradien sebaiknya diganti dengan regresi dari data bor lokasi sendiri.
- **Gradien MC paling tidak pasti.** Kadar air dipengaruhi cuaca, penumpukan, dan penanganan, bukan hanya mineralogi.

### Referensi geologi

- Safah dkk. (2026). [Quantifying the Role of Chemical Weathering in Nickel and Cobalt Mobilization and Redistribution in Lateritic Profiles, Sulawesi, Indonesia](https://consensus.app/papers/details/f6cb029ebd8c5be5a9a3050b822e0a05/). *The Iraqi Geological Journal*.
- Ito dkk. (2021). [Geochemical constraints on the mobilization of Ni and critical metals in laterite deposits, Sulawesi, Indonesia: A mass-balance approach](https://consensus.app/papers/details/97c2fa2c83bf53189d58f03c858b28be/). *Resource Geology*.
- Irfan dkk. (2021). [Role of bedrock serpentinization on the development of nickel laterite deposit in Sorowako, Sulawesi, Indonesia](https://consensus.app/papers/details/57800409e25d59fb9b8985cddda52c5a/). *IOP Conf. Ser.: Earth Environ. Sci.*
- Ilyas dkk. (2022). [Analisis Karakteristik Mineralogi dan Geokimia Berdasarkan Zona Profil Endapan Nikel Laterit, Bahodopi, Morowali](https://consensus.app/papers/details/fbff5ba20f535b419130170e5c44cda9/). *Jurnal Geomine*.
- Hasria dkk. (2024). [Mineralogy and Geochemical Characteristics of Lateritic Nickel Deposit in Wiwirano District, North Konawe](https://consensus.app/papers/details/d28893f21b545ed1a21031aeb92f75ed/). *Iraqi Geological Journal*.
- Ariend dkk. (2026). [Analysis of the Role of Iron (Fe) Content on Nickel Distribution in Limonite and Saprolite Zones Using ED-XRF](https://consensus.app/papers/details/4707bcf0768351748323286d32e33227/). *Journal of Green Chemical and Environmental Engineering*.
- Qi dkk. (2024). [Nickel enrichment during lateritization of ophiolitic ultramafic rocks: Kelurahan Pondidrha, Sulawesi](https://consensus.app/papers/details/e3f10a32435550518d4a5b2c30ab9931/). *Ore Geology Reviews*.

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
- HMA diambil dari `hma.json`, yang diperbarui otomatis dari minerba.esdm.go.id oleh GitHub Actions. Bila struktur halaman ESDM berubah, pembaruan otomatis berhenti dengan aman (data lama dipertahankan) dan `hma.json` perlu diperbarui manual.

## Sumber

- [Kementerian ESDM Ubah Formula HPM Nikel — nikel.co.id](https://nikel.co.id/2026/09/16/kementerian-esdm-ubah-formula-hpm-nikel-fe-co-dan-cr-kini-jadi-komponen-penentu-harga/)
- [HPM Nikel Direvisi, APNI Soroti Valuasi Limonit — nikel.co.id](https://nikel.co.id/2026/09/16/hpm-nikel-direvisi-apni-soroti-valuasi-limonit-dan-penerimaan-negara/)
- [SMM: Indonesia revises nickel ore HPM formula](https://news.metal.com/newscontent/104117799-smm-nickel-flash-newsindonesia-revises-nickel-ore-hpm-formula-12-ni-hpm-falls-45)
- [SMM: HPM nickel second half of September 2026](https://news.metal.com/newscontent/104118082-smm-flash-news-indonesias-hpm-nickel-further-decreased-in-second-half-of-september)
- [SMM: HMA nickel first period of October 2026](https://news.metal.com/newscontent/104143238-smm-flash-newsindonesias-hma-nickel-further-decreased-in-first-period-of-october)
- [Harga Mineral Acuan — Ditjen Minerba ESDM](https://www.minerba.esdm.go.id/harga_acuan)
