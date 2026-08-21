---
name: init-changelog
description: Buat atau perbarui CHANGELOG.md sebagai catatan checkpoint tiap perubahan. Pakai saat memulai changelog, saat menutup milestone, atau saat menulis entri untuk perubahan yang baru selesai.
---

# init-changelog

`CHANGELOG.md` adalah **catatan checkpoint yang terbagi lewat git**, berbeda dari
memory sesi Grok yang tersimpan lokal di tiap mesin. Ia menjawab satu pertanyaan:
*apa yang berubah, kapan, dan bukti apa yang mendukungnya.*

**Umumkan di awal:** "Saya memakai skill init-changelog untuk mencatat perubahan ini."

## Dua mode

### Mode A — inisialisasi (belum ada CHANGELOG.md)

Rekonstruksi dari riwayat git, jangan mengarang:

```bash
git log --oneline --no-merges -50
git tag --sort=-creatordate | head
```

Kelompokkan per tanggal atau per tag. Untuk commit yang tidak jelas dampaknya,
tulis apa adanya dan tandai `(perlu konfirmasi)` alih-alih menebak.

### Mode B — entri baru (sudah ada CHANGELOG.md)

Tambahkan di ATAS, di bawah `## [Unreleased]`.

## Format entri

```markdown
## [Unreleased]

### 2026-08-21 — <judul singkat perubahan>

**Konteks**  <mengapa ini dikerjakan, satu kalimat>

**Perubahan**
- `path/lengkap.ext` — apa yang berubah dan mengapa

**Bukti**
- Perintah yang dijalankan dan hasilnya, atau angka pengukuran
- Bila belum diuji, tulis "BELUM DIUJI" — jangan dikosongkan

**Dampak**  <yang berubah bagi pengguna/server, termasuk yang memburuk>

**Rollback**  <perintah persis untuk membatalkan, atau "tidak reversibel">
```

## Aturan yang membedakan ini dari changelog biasa

1. **Bukti wajib.** Entri tanpa bukti hanyalah niat. Bila sesuatu belum diuji,
   tulis "BELUM DIUJI" — itu informasi, bukan kekurangan.
2. **Catat yang memburuk.** Perubahan yang menaikkan satu metrik dan menurunkan
   metrik lain harus menyebut keduanya. Changelog yang hanya berisi kemenangan
   tidak bisa dipakai untuk mendiagnosis regresi.
3. **Rollback harus eksekutabel.** Bukan "kembalikan config", melainkan perintah
   persisnya.
4. **Path lengkap, bukan nama berkas.** `scripts/deploy.sh`, bukan "skrip deploy".
5. **Prediksi ditandai sebagai prediksi.** Bila angka berasal dari perhitungan
   dan belum diukur, katakan demikian.

## Hubungan dengan berkas lain

| Berkas | Isi | Terbagi? |
| :--- | :--- | :--- |
| `CHANGELOG.md` | apa yang berubah + bukti | ya, lewat git |
| `AGENTS.md` | instruksi kerja agent | ya, lewat git |
| `docs/plans/` | analisis dan alasan panjang | ya, lewat git |
| memory Grok | konteks kerja pribadi | tidak, lokal per mesin |

Bila sebuah keputusan butuh lebih dari satu paragraf alasan, tulis di
`docs/plans/` lalu rujuk dari changelog. Jangan menggemukkan changelog.
