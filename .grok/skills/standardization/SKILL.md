---
name: standardization
description: "Interactive project questionnaire to adaptively configure and enforce team coding standards, commit conventions, testing policies, and linter settings for the current workspace."
---

# Adaptive Project Standardization

Gunakan skill ini untuk menjalankan wizard standarisasi adaptif proyek pada workspace saat ini.

## Kapan Menggunakan:
- Saat pertama kali membuka direktori proyek baru yang belum memiliki `.agents/rules/`.
- Saat developer mengetik perintah `/standardization` di chat coding agent.
- Saat ingin memperbarui aturan coding, framework pengujian, atau aturan commit tim.

## Eksekusi:
Jalankan script wizard berikut:
```bash
python3 scripts/standardize.py
```

Wizard akan mendeteksi stack proyek secara otomatis, mengajukan 5 pertanyaan singkat, dan menghasilkan file aturan di `.agents/rules/`.
