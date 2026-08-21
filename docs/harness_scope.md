# Pemisahan Scope Harness — siapa memiliki apa

Tanggal: 2026-08-21. Diverifikasi terhadap `~/.grok/README.md` dan repo ini.

## Masalah yang dipecahkan dokumen ini

Ingatan sesi tiap developer tersimpan **lokal di mesin masing-masing**, bukan di
repo. Tanpa batas scope yang jelas, kita berisiko membangun sistem persistensi
kedua yang berjalan paralel dengan milik Grok — dua sumber kebenaran yang
saling bertentangan.

## Tiga lapis, tiga pemilik

### Lapis 1 — llama.cpp (server GPU)

Memiliki: tokenisasi, KV cache, inference, speculative decoding, slot paralel,
prompt cache, streaming, metrik.

**Tidak** memiliki: apa pun tentang tugas, berkas, atau rencana. Server tidak
tahu sedang mengerjakan apa, dan tidak boleh diberi tanggung jawab compaction.

Penyimpanan: VRAM (efemeral) + `--cache-ram 16384` di RAM sistem.

### Lapis 2 — Grok CLI (harness agent) — LOKAL PER MESIN

Memiliki: daftar pesan, tool call, edit berkas, eksekusi shell, siklus hidup
sesi, compaction, checkpoint, resume, plan mode, interaksi pengguna.

Penyimpanan — **semuanya di HOME, tidak di repo, tidak terbagi**:

```
~/.grok/sessions/<path-proyek-terenkode>/<uuid>/   transkrip sesi
~/.grok/memory/<project-slug>-<hash8>/MEMORY.md    memory workspace
~/.grok/memory/MEMORY.md                            memory global
```

Grok mencari memory otomatis pada giliran pertama tiap sesi dan setelah
compaction. Perintah: `/memory workspace <fakta>`, `grok memory edit`,
`grok memory stats`.

**Konsekuensi:** apa pun yang ditulis ke sini TIDAK sampai ke developer lain dan
TIDAK bertahan bila mesin diganti. Jangan simpan pengetahuan tim di sini.

### Lapis 3 — Repository (git) — TERBAGI

Memiliki: pengetahuan yang harus dilihat semua orang di semua mesin.

```
AGENTS.md                      instruksi kerja agent — DIBACA OTOMATIS oleh Grok
CHANGELOG.md                   catatan checkpoint tiap perubahan + bukti
docs/plans/                    analisis panjang dan alasan keputusan
.grok/skills/                  slash command proyek — DIBACA OTOMATIS oleh Grok
.agents/memory/session_state.md    ledger proyek bersama
.agents/memory/sessions/<dev-id>.md  state tugas per developer, terlihat tim
.agents/rules/                 aturan rinci (TIDAK dibaca otomatis, dirujuk AGENTS.md)
```

## Aturan penempatan

| Pertanyaan | Jawaban ya | Jawaban tidak |
| :--- | :--- | :--- |
| Perlu dilihat developer lain? | Lapis 3 (git) | Lapis 2 (lokal) |
| Perlu bertahan ganti mesin? | Lapis 3 | Lapis 2 |
| Preferensi pribadi cara bekerja? | Lapis 2 | — |
| Keputusan arsitektural + alasannya? | Lapis 3 (`docs/plans/`) | — |
| Konteks percakapan yang sedang jalan? | Lapis 2 | — |

## Yang HANYA dibaca otomatis

Hanya dua jalur yang masuk ke agent tanpa diminta:

1. `AGENTS.md` / `CLAUDE.md` — ditempelkan ke system prompt
2. Memory Grok — dicari otomatis pada giliran pertama dan setelah compaction

Berkas di `.agents/rules/` **tidak** dibaca otomatis. Karena itu `AGENTS.md`
harus memuat sendiri protokol sesi yang esensial, dan merujuk `.agents/rules/`
hanya untuk detail.

Skill di `.grok/skills/` ditemukan otomatis tetapi baru dimuat saat dipanggil.

## Compaction: milik Grok, bukan milik kita

Grok punya `auto_compact_threshold_percent` (default 85). Sebelumnya kita
menonaktifkannya dan membangun protokol handover sendiri — itu keliru arah:
hanya harness agent yang tahu semantik tugas, berkas yang diedit, dan status
rencana, sehingga compaction memang harus terjadi di sana.

Posisi sekarang:

```
auto_compact_threshold_percent = 85     # jaring pengaman NATIVE
handover di batas tugas                 # jalur utama, kualitas ringkasan lebih baik
```

Aritmetika untuk `context_window = 131.072`:

```
85% = 111.411 token + max_tokens 12.288 = 123.699   <= plafon slot 131.072   ✔
80% = 104.858 token + max_tokens 12.288 = 117.146   cadangan bila truncation muncul
```

85% dipilih dari batas margin, bukan angka bulat: margin harus menampung
pertumbuhan satu giliran (p90 = 6.421 token), dan pada n_ctx 131.072 ambang
maksimum yang memenuhinya adalah 85,7%. Truncation sudah terjadi 2x hari ini —
bukan risiko teoretis.

## Yang TIDAK kita bangun

- Agent loop kedua yang ikut memutuskan kapan tool dipanggil
- Sistem transcript tandingan di luar `~/.grok/sessions/`
- Compaction di sisi server llama.cpp

Lapis eksternal kita hanya melakukan empat hal: adapter llama.cpp,
observability, kontrol resource/fairness, dan project state yang terbagi.
