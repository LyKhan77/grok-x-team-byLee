---
name: checkpoint
description: "Simpan checkpoint CooperxMemory setelah satu ToDo/milestone selesai. Memperbarui sessions/<dev-id>.md dan session_state.md dengan bagian wajib, lalu mencetak baris konfirmasi."
---

# CooperxMemory Checkpoint

Skill ini adalah **Lapis 2** penegakan kepatuhan di [`.agents/rules/05-cooperx-memory.md`](../../rules/05-cooperx-memory.md) — menurunkan friksi agar checkpoint benar-benar dilakukan, bukan sekadar diwajibkan.

## Kapan dijalankan

Segera setelah **salah satu** kondisi berikut, tanpa menunggu diminta:

1. Satu item `## Milestone / ToDo` berubah menjadi selesai ← **pemicu utama**
2. File dibuat/diubah/dihapus **dan** sudah diverifikasi (test atau lint lulus)
3. Keputusan arsitektural diambil
4. Blocker ditemukan atau teratasi
5. Context mencapai 88% (151.388 token)
6. Sebelum `git commit`

Atau saat developer mengetik `/checkpoint`.

## Langkah eksekusi

1. **Tentukan `<dev-id>`** dari identitas gateway (`dev-tuf`, `vincent`, …). Bila tidak diketahui, tanyakan sekali lalu ingat untuk sesi ini.

2. **Perbarui `.agents/memory/sessions/<dev-id>.md`.** Salin kerangka dari [`_template.md`](../../memory/sessions/_template.md) bila file belum ada. Isi **seluruh** bagian wajib — bagian yang tidak relevan ditandai `(tidak ada)` secara eksplisit, tidak boleh dihilangkan:

   `## Session Intent` · `## Files Modified` · `## Key Decisions` · `## Milestone / ToDo` · `## Active Task` · `## Next Steps` · `## Blockers`

3. **`## Files Modified` wajib path lengkap.** Riset compaction 2026 menunjukkan semua metode summarization hanya mencetak 2,19–2,45 dari 5,0 dalam melacak file yang dimodifikasi. Format:
   ```
   - `path/lengkap/dari/root.py`  — dibuat|diubah|dihapus  — test: PASS|FAIL|BELUM
   ```

4. **Naikkan yang bersifat arsitektural ke project ledger** `.agents/memory/session_state.md`: milestone terverifikasi, keputusan lintas-sesi, blocker yang memengaruhi developer lain. Detail sesi harian tetap di `sessions/<dev-id>.md`.

5. **Cetak baris konfirmasi** — inilah yang membuat kelalaian terlihat developer:
   ```
   ✓ CooperxMemory: <nama-item-todo> → sessions/<dev-id>.md  (Files Modified: N entri)
   ```

## Jangan lakukan

- Jangan menulis ringkasan bebas. Bagian terstruktur berfungsi sebagai checklist yang memaksa kompresor mengisi atau menandai kosong — itu yang mencegah kehilangan informasi diam-diam.
- Jangan menyimpan data episodic (build log, traceback lama, pembacaan file berulang). Lihat §7 rule.
- Jangan menunda checkpoint sampai context mendekati penuh. Pola *write-before-compaction* mengharuskan fakta ditulis **saat terjadi**, bukan saat kompresi.
