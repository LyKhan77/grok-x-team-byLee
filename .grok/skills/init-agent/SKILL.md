---
name: init-agent
description: Analisa repository lalu tulis atau perbarui AGENTS.md dari template delapan bagian. Pakai saat memulai proyek baru, saat AGENTS.md belum ada, atau saat isinya sudah tidak cocok dengan keadaan repo.
---

# init-agent

Menghasilkan `AGENTS.md` — satu-satunya berkas yang Grok baca otomatis dan
tempelkan ke system prompt setiap sesi. Isinya karena itu bukan dokumentasi
untuk manusia, melainkan **instruksi kerja untuk agent**.

**Umumkan di awal:** "Saya memakai skill init-agent untuk menganalisa repo dan menyusun AGENTS.md."

## Prinsip

1. **Analisa dulu, tulis kemudian.** Jangan menyalin template lalu mengisi tebakan.
   Setiap angka dan nama perintah harus berasal dari repo, bukan dari ingatan.
2. **Verifikasi setiap klaim.** Perintah yang dicantumkan harus benar-benar ada.
   Bila tidak bisa diverifikasi, tulis "belum diverifikasi", jangan hilangkan.
3. **Hemat token.** Berkas ini masuk ke SETIAP prompt. Target < 4.000 token.
   Detail panjang dipindahkan ke `docs/` dan dirujuk, bukan disalin.
4. **Jangan hapus yang sudah ada.** Bila `AGENTS.md` sudah ada, tunjukkan diff dan
   minta persetujuan sebelum menimpa.

## Langkah

### 1. Kumpulkan fakta

```bash
ls -la                                  # struktur tingkat atas
cat README.md 2>/dev/null | head -60
cat package.json Cargo.toml pyproject.toml go.mod 2>/dev/null
git log --oneline -15
git branch --show-current
ls .github/workflows/ 2>/dev/null
```

Untuk perintah proyek, baca sumber yang otoritatif — `scripts` di `package.json`,
target di `Makefile`, `[tool.poetry.scripts]`, bukan menebak dari nama folder.

### 2. Tulis delapan bagian

```markdown
# <Nama Proyek>

## 1. Project Overview
Apa yang proyek ini lakukan dan untuk siapa. Dua sampai empat kalimat.
Sertakan hal yang tidak jelas dari struktur folder.

## 2. Tech Stack
Bahasa, framework, dan versinya. Ambil dari berkas manifest, bukan asumsi.

## 3. Key Features
Kemampuan utama yang sudah berjalan. Tandai yang masih dalam pengerjaan
dengan status eksplisit.

## 4. Project Structure
Pohon direktori dengan komentar SATU baris per entri. Hanya yang penting
bagi agent; jangan salin seluruh isi repo.

## 5. Project Commands
| Perintah | Fungsi | Kapan dipakai |
Hanya perintah yang terverifikasi ada. Tandai yang butuh sudo atau merusak.

## 6. Coding Conventions
Aturan yang benar-benar ditegakkan di repo ini — format commit, penamaan,
gaya test. Turunkan dari `git log` dan berkas linter, bukan dari selera umum.

## 7. Workflow
Alur kerja sesi: apa yang dibaca di awal, kapan checkpoint ditulis,
kapan handover. Rujuk berkas memory bila proyek memakainya.

## 8. Current State
Yang sedang dikerjakan, yang menghalangi, dan langkah berikutnya.
Bagian ini paling cepat basi — beri tanggal.
```

### 3. Laporkan yang tidak bisa diverifikasi

Setelah menulis, sebutkan secara eksplisit bagian mana yang berasal dari
inferensi dan perlu dikonfirmasi manusia. Menuliskan tebakan sebagai fakta
di berkas yang masuk ke setiap prompt akan menyebarkan kesalahan ke semua sesi.

## Jangan

- Menulis perintah yang belum diuji ada
- Menyalin isi `docs/` ke dalam AGENTS.md — rujuk saja
- Membiarkan bagian 8 tanpa tanggal
- Menimpa AGENTS.md yang ada tanpa menunjukkan diff
