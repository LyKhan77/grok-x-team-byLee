# <Judul Task>

Dibuat: <YYYY-MM-DD> · Pemilik: <dev-id> · Status: `aktif` | `selesai` | `ditinggalkan`

## Tujuan

<Satu paragraf. Apa yang dianggap "selesai" dan bagaimana membuktikannya.>

## Batasan

<Yang TIDAK boleh berubah: API publik, skema data, jendela maintenance, anggaran.
Batasan lebih penting daripada tujuan — tujuan bisa dinegosiasi, batasan tidak.>

## Keadaan Awal

<Apa yang sudah ada sebelum task ini dimulai. Sesi kelima perlu tahu ini untuk
membedakan "sudah begitu dari dulu" dengan "berubah karena kita".>

## Langkah

Satu langkah = satu unit yang bisa diverifikasi sendiri. Bukan "perbaiki auth",
melainkan "tambahkan refresh token ke `auth/session.ts`, dibuktikan oleh
`npm test auth` yang lulus".

- [ ] **1. <langkah>**
  - Verifikasi: `<perintah persis yang membuktikan langkah ini selesai>`
  - Bukti: _(diisi setelah dikerjakan — keluaran nyata, bukan klaim)_
- [ ] **2. <langkah>**
  - Verifikasi: `<perintah>`
  - Bukti: _(kosong)_

Status: `[ ]` belum · `[~]` sedang jalan · `[x]` selesai + terbukti · `[!]` gagal/diblokir

## Keputusan

| Tanggal | Keputusan | Alasan | Yang ditolak |
| :--- | :--- | :--- | :--- |

Kolom "yang ditolak" mencegah sesi berikutnya mengusulkan ulang jalan yang sudah
dipertimbangkan dan dibuang.

## Blocker

(tidak ada)

## Posisi Sekarang

Langkah aktif: <nomor>
Sesi terakhir: <YYYY-MM-DD-x>
Aksi berikutnya: <satu kalimat, bisa dieksekusi tanpa konteks tambahan>
