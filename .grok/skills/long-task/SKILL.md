---
name: long-task
description: Mulai atau lanjutkan pekerjaan panjang yang melewati batas satu context. Pakai saat memulai task berhari-hari, saat melanjutkan setelah /new atau compaction, atau saat sebuah rencana harus bertahan lintas sesi.
---

# long-task

**Umumkan di awal:** "Saya memakai skill long-task."

## Prinsip

**Rencana hidup di berkas, bukan di context.** Context adalah buffer kerja yang
akan hilang — oleh `/new`, oleh compaction, oleh restart. Yang bertahan hanya
apa yang tertulis di disk dan ter-commit.

Sesi tidak "mengingat" rencana. Sesi **membaca** rencana, memajukan satu langkah,
menuliskan buktinya, lalu berakhir. Itulah sebabnya task berhari-hari bisa selesai
meski tidak ada satu pun sesi yang melihat keseluruhannya.

## Mengapa auto-compact tidak cukup

Auto-compact sekarang cepat (~1,4 menit pada throughput saat ini; dulu 15 menit
karena TPS runtuh, bukan karena compaction-nya). Tetapi ia tetap tidak layak
menjadi tulang punggung kelanjutan task:

- Terpicu oleh **ambang**, bukan oleh batas tugas — ia meringkas keadaan
  setengah jadi apa pun yang kebetulan tertangkap.
- Templatenya **internal dan tetap**; panjang maupun isinya tidak dapat diatur.
- Ia **lossy tanpa dapat diarahkan** — yang hilang bukan pilihan Anda.

Perlakukan auto-compact sebagai jaring pengaman. Kelanjutan task bersandar pada
berkas rencana.

## Memulai task baru

1. Salin `docs/plans/_TEMPLATE.md` ke `docs/plans/<slug>.md`.
2. Isi **Tujuan**, **Batasan**, dan **Keadaan Awal** sebelum menulis langkah.
   Batasan yang tidak tertulis akan dilanggar oleh sesi keempat yang tidak
   pernah mendengarnya.
3. Pecah menjadi langkah yang **bisa diverifikasi sendiri**. Aturannya: jika Anda
   tidak bisa menuliskan perintah yang membuktikan sebuah langkah selesai,
   langkah itu belum cukup terdefinisi.
4. Commit berkas rencana **sebelum** mulai bekerja. Rencana yang belum ter-commit
   akan hilang bersama sesinya.

## Melanjutkan (sesi baru setelah /new)

Jalankan urutan ini sebelum menyentuh kode apa pun:

```
1. Baca docs/plans/<slug>.md          -> rencana + posisi
2. Memory Grok otomatis terinjeksi giliran pertama -> konteks pribadi
3. git status && git log --oneline -5 -> keadaan NYATA repo
4. Jalankan perintah verifikasi langkah terakhir yang ditandai [x]
```

**Langkah 4 wajib, bukan formalitas.** Rencana mengklaim sesuatu selesai;
repository dan hasil test adalah kebenaran. Klaim yang tidak terbukti diturunkan
menjadi `[~]` dan dikerjakan ulang. Sesi yang mempercayai rencana tanpa
memverifikasi akan membangun di atas langkah yang sebetulnya gagal.

Lalu konfirmasi dalam tiga baris sebelum melanjutkan:

```
Langkah aktif : <nomor dan judul>
Terverifikasi : <apa yang barusan dibuktikan>
Aksi berikut  : <satu kalimat>
```

## Selama sesi

Kerjakan **satu langkah**, bukan seluruh rencana. Setelah langkah itu terbukti:

1. Tandai `[x]` dan **tempelkan bukti nyata** — keluaran perintah, bukan
   "test lulus". Bila belum diuji, tulis `BELUM DIUJI`; itu informasi.
2. Catat keputusan baru di tabel **Keputusan**, termasuk kolom "yang ditolak".
3. Perbarui **Posisi Sekarang**.
4. Commit berkas rencana bersama perubahan kodenya.
5. `/flush` — menulis ringkasan sesi ke memory Grok, dicari otomatis pada
   giliran pertama sesi berikutnya.
6. `/new`, lalu mulai sesi baru dari langkah "Melanjutkan" di atas.

**Jangan `--resume` untuk melanjutkan task.** Resume memuat ulang transkrip lama:
mahal di prefill, dan membawa serta kebingungan yang sudah diselesaikan. Mulai
bersih dari rencana.

## Kapan memecah sesi

Akhiri sesi pada batas tugas alami, berapa pun context saat itu:

- Sebuah langkah berpindah ke `[x]`
- Sebelum investigasi besar yang akan menyedot banyak berkas
- Setelah keputusan arsitektural diambil dan dicatat

Mengakhiri sesi di titik yang Anda pilih menghasilkan checkpoint yang bersih.
Membiarkan ambang yang memilihkan menghasilkan ringkasan tentang keadaan
setengah jadi — dan sesi berikutnya mewarisi kebingungan itu.

## Jangan

- Menyimpan rencana hanya di context
- Menandai `[x]` tanpa bukti yang dapat dijalankan ulang
- Mengerjakan beberapa langkah sekaligus lalu meringkasnya di akhir
- Mempercayai rencana tanpa memverifikasi terhadap repository
- Menghapus langkah `[!]` yang gagal — kegagalan adalah informasi bagi sesi berikutnya
