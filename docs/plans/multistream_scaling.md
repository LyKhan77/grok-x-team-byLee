# Ketidakstabilan Multi-Stream — Analisis Akar Masalah

Tanggal: 2026-08-21. Basis: 8.520 baris journal (309 request selesai).
Status: analisis, belum dieksekusi.

## 1. Tokenization BUKAN masalahnya

```
prefill : 1.212.577 token @ 670,6 t/s  -> 17,6% waktu server
decode  :   194.689 token @  23,0 t/s  -> 82,4% waktu server
```

Prefill sudah cepat dan hanya seperenam waktu server. Yang runtuh adalah decode
saat konkurensi naik. Prioritas = arsitektur serving, bukan tokenization.

## 2. Skala konkurensi, dikontrol terhadap panjang context

TPS median per user (n = jumlah sampel `tg`):

| slot aktif | <32K | 32-128K | >128K |
|---:|---:|---:|---:|
| 1 | 39,0 (n=60) | 40,4 (n=885) | 34,4 (n=214) |
| 2 | 9,9 (n=213) | 22,5 (n=397) | 22,4 (n=119) |
| 3 | 10,5 (n=14) | 16,2 (n=45) | **1,5 (n=38)** |
| 4 | 3,8 (n=40) | - | - |

Agregat (TPS x jumlah slot):

| slot | <32K | 32-128K | >128K |
|---:|---:|---:|---:|
| 1 | 39,0 | 40,4 | 34,4 |
| 2 | 19,9 | 45,0 | 44,8 |
| 3 | 31,4 | 48,8 | **4,5** |
| 4 | 15,3 | - | - |

Koefisien variasi TPS naik monoton: 0,33 (1 slot) -> 0,59 -> 0,79 -> 0,90.
Itulah "metrics unstable" yang dilaporkan.

Bacaan jujur:
- Batching bekerja, tapi **lemah**: agregat hanya +11% dari 1 ke 2 slot, +21%
  dari 1 ke 3 slot, sementara TPS per user turun 44%.
- Sel yang benar-benar runtuh: **3 slot dengan context >128K -> 1,5 TPS**.
- Sel 4 slot hanya tersampel pada context <32K dan sudah 3,8 TPS.
- Sel 3-4 slot pada context panjang under-sampled; degradasinya nyata tetapi
  besarannya belum presisi.

## 3. Mekanisme yang teridentifikasi di source

`common/common.h:386` — untuk DFLASH, `need_n_rs_seq()` mengembalikan
`draft.n_max`. Jadi `n_rs_seq = --spec-draft-n-max` (sekarang 7).

`src/llama-kv-cache-dsv4.cpp:912` — cache recurrent-state mengalokasikan
`n_planes = n_stream * (1 + n_rs_seq)` bidang state.

`src/llama-kv-cache-dsv4.cpp:815` — snapshot per langkah berskala
`n_rs_seq * state_size * n_seqs_unq`.

State SSM per sequence = 49 layer x 6144 (d_inner) x 128 (d_state) x 4 B
= **147 MiB**. Dengan parallel 4 dan n-max 7: 4 x 8 = 32 bidang = **4,6 GiB**,
dan lalu lintas snapshot per langkah berskala n_rs_seq x jumlah slot aktif.

**Prediksi yang bisa diuji:** menurunkan n-max memperbaiki stabilitas multi-slot
secara tidak proporsional, karena memangkas VRAM state DAN lalu lintas snapshot
per langkah. Ini berlawanan dengan intuisi "n-max besar lebih baik" dan sejalan
dengan usul riset Perplexity (n-max 5, bahkan lebih rendah).

## 4. Ruang solusi VRAM

Overhead 21,0 GiB terurai jadi 4,6 GiB bidang SSM + 16,4 GiB non-SSM
(drafter, drafter-KV f16, compute buffer).

| skenario | VRAM | % | ctx/user |
|---|---:|---:|---:|
| par4 n7 Q8_0 q4_0 (sekarang) | 59,9 | 83,2% | 172.032 |
| par3 n7 Q8_0 q4_0 | 55,8 | 77,5% | 172.032 |
| **par2 n7 Q8_0 q8_0** | **56,9** | **79,1%** | 172.032 |
| par2 n4 Q8_0 q8_0 | 56,1 | 77,9% | 172.032 |
| **par3 n4 Q6_K q8_0** | **55,8** | **77,5%** | 172.032 |
| par3 n4 Q8_0 q8_0 | 62,4 | 86,6% | 172.032 |

Menurunkan `--parallel` membebaskan KV secara proporsional, dan pembebasan itu
cukup untuk membeli KV q8_0 **tanpa menurunkan kualitas bobot sama sekali**.
Ini membalik kesimpulan memo kuantisasi: jika jumlah slot turun, Q8_0 + q8_0
menjadi mungkin pada 168K per user.

## 5. Rekomendasi

1. **`--parallel 2`, antrean di gateway untuk sisanya.** Berdasarkan data sendiri,
   2 slot memberi agregat terbaik yang stabil (45,0 pada 32-128K; 44,8 pada
   >128K) dengan TPS per user 22,5 — bukan 1,5-3,8 seperti di 3-4 slot.
2. **Belanjakan VRAM yang bebas untuk KV q8_0** (par2 n7 Q8_0 q8_0 = 79,1%).
   Bobot tetap Q8_0, KV naik dari 4-bit ke 8-bit, context tetap 168K.
3. **Turunkan n-max** (7 -> 4) untuk menguji prediksi bagian 3. Ini juga
   memangkas 1,2 GiB bidang SSM.

Urutan: satu variabel per langkah, kriteria putusan ditetapkan sebelum mengukur.

## 6. Batas keyakinan

- Sel 3-4 slot under-sampled; angka 1,5 TPS berasal dari 38 sampel.
- Mekanisme n_rs_seq dibaca dari source, belum dibuktikan lewat eksperimen
  terkontrol di server ini.
- Klaim "q4_0 KV lebih lambat dari q8_0 pada context panjang" berasal dari
  laporan pihak ketiga dan belum diukur di sini.

---

# Adendum — parallel 3, n-max 5, dan strategi memory

## 7. Temuan yang mengubah rekomendasi

**a. q5_1 tidak tersedia.** `build-vfix` dikompilasi dengan
`GGML_CUDA_FA_ALL_QUANTS=OFF`, sehingga flash-attn hanya punya kombinasi
`f16/f16`, `q4_0/q4_0`, `q8_0/q8_0`, `bf16/bf16`
(`ggml/src/ggml-cuda/fattn.cu`, cabang `#else`). Pilihan KV nyata hanya q4_0
atau q8_0 — kecuali rebuild.

**b. Prompt cache mati, dan 2,2% request memakan 72% prefill.**
Distribusi prefill per request: median **238** token, p90 3.003, maks 151.712.
Reuse KV per slot bekerja sangat baik. Tetapi **8 request (2,2%) dengan prefill
>20K menyumbang 876.340 dari 1.212.577 token (72,3%)** — itu sesi yang kehilangan
slotnya dan harus prefill ulang dari nol. Satu kejadian 151K token = ~220 detik
GPU, dan selama itu decode semua slot lain ikut tersendat.

`--cache-ram 0` pada konfigurasi sekarang mematikan prompt cache, sehingga
konteks yang tergusur hilang total. Log konfirmasi:
`--cache-idle-slots requires --cache-ram, disabling`.

**Kopling penting:** turun ke 3 slot dengan 4 developer membuat penggusuran slot
LEBIH sering. Jadi `--cache-ram` wajib dinyalakan bersamaan, bukan opsional.
RAM tersedia 43 GiB; satu konteks 131K q8_0 = 4,25 GiB, jadi 16 GiB cukup untuk
menyimpan 3-4 sesi.

## 8. Konfigurasi yang direkomendasikan

```
--parallel 3
--ctx-size 393216            # 3 x 131.072
--spec-draft-n-max 5
--cache-type-k q8_0 --cache-type-v q8_0
--cache-ram 16384            # dari 0
```

VRAM 58,8 GiB = **81,7%** (dalam band 80-84%).

Mengapa 131.072 dan bukan 172.032: pada 3 slot, context >128K terukur **1,5 TPS**.
Membatasi di 131K bukan mengorbankan kapasitas — melainkan membuang rezim yang
memang tidak berfungsi. Anggaran yang dibebaskan dipakai menaikkan KV dari 4-bit
ke 8-bit, tanpa menurunkan kualitas bobot sama sekali (tetap Q8_0).

Alternatif konservatif bila 168K wajib dipertahankan:
`par3 n5 Q8_0 q4_0 @172.032` = 54,9 GiB (76,3%). KV tetap 4-bit, dan 17,5%
request tetap masuk rezim lambat.

## 9. Auto-compact: akar lambatnya

Aturan harness sekarang memicu handover di **88% = 151.388 token**. Itu tepat di
dalam zona 1,5 TPS. **Compaction lambat karena dipicu justru di titik server
paling lambat** — meringkas 151K token pada 1,5 TPS memakan waktu sangat lama dan
berujung timeout. Inilah "compaction failed" yang dilaporkan.

Ambang baru untuk n_ctx 131.072:

```
ambang x n_ctx + max_tokens <= n_ctx
80% : 104.858 + 12.288 = 117.146  (margin 13.926)  <- direkomendasikan
88% : 115.343 + 12.288 = 127.631  (margin  3.441)  terlalu mepet
```

Pada 105K dengan 3 slot aktif, server berada di rezim 16-40 TPS — compaction
berjalan 10-25x lebih cepat daripada di 151K.

Konsekuensi: `context_window` di config klien tiap dev harus turun 172.032 ->
131.072, jika tidak Grok tetap menghitung ambang dari plafon yang salah.

## 10. Strategi long-task

Dengan plafon 131K, tugas panjang tidak lagi diselesaikan dalam satu context.
Polanya bergeser ke checkpoint-and-resume, yang infrastrukturnya sudah ada:

1. Rencana dan buktinya ditulis ke `docs/plans/<slug>.md` **sebelum** compaction.
   State sesi pribadi ditangani memory native Grok (`/flush`), bukan berkas repo.
2. Anggaran context per sesi dibagi eksplisit, bukan dibiarkan tumbuh:
   system+rules 4-8K | ringkasan sesi 4-12K | file aktif 16-48K |
   percakapan kerja 16-64K. Total tetap di bawah 105K.
3. Arsip lama tidak ikut dikirim; diambil kembali lewat file bila perlu.
4. Sesi baru dimulai dengan membaca checkpoint, bukan dengan resume context lama —
   resume memaksa prefill 100K+ yang jadi penyebab 72% beban prefill.
