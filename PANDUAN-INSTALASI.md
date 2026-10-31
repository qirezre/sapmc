# Panduan Migrasi SAP-MC: Backend di GAS, Frontend di GitHub Pages

Ada 2 bagian: **A. Backend (Apps Script)** lalu **B. Frontend (GitHub Pages)**.
Data Sheets/Drive Anda **tidak berubah** — hanya cara menampilkannya yang pindah.

## A. Backend (± 5 menit)

1. Buka proyek Apps Script SAP-MC Anda.
2. Buka file **Code.gs** → hapus seluruh isinya → paste isi **Code.gs baru** (file terpisah dari chat).
   File `.gs` lain, `SlipTemplate.html`, dan `appsscript.json` **tidak berubah** (jangan diutak-atik).
3. (Opsional, disarankan) Hapus file `Index.html`, `Styles.html`, `Scripts.html`, `ScriptsPegawai.html`, `ScriptsFinance.html`, `ScriptsManajemen.html` — tampilan sudah pindah ke GitHub. **Jangan hapus `SlipTemplate.html`** (dipakai membuat PDF slip).
4. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.**
   URL `/exec` tetap sama. Pastikan: Execute as **Me**, Who has access **Anyone**.
5. Salin URL `/exec` (diperlukan di langkah B).
6. Tes: buka URL `/exec` di browser → harus tampil JSON `{"success":true,"data":{"app":"SAP-MC API","status":"ok",...}}`.
   Kalau tampil halaman login Google / HTML → akses deployment belum "Anyone".

## B. Frontend (GitHub Pages)

**Folder kerja = folder hasil ekstrak `sapmc-frontend.zip`** (yang di dalamnya langsung terlihat `index.html`, `css`, `js`). Di folder inilah `git init` dijalankan — jangan naik atau turun satu level.

1. Ekstrak ZIP, mis. ke `C:\Users\NAMA\Documents\sapmc-frontend`.
2. Buka `js\config.js` dengan Notepad → ganti `GANTI_DENGAN_ID_DEPLOYMENT/exec` dengan URL `/exec` Anda (seluruh URL, di dalam tanda kutip `'...'`). Simpan.
3. Install Git (https://git-scm.com/download/win, semua default), lalu buka PowerShell di folder tadi (File Explorer → klik address bar → ketik `powershell` → Enter).
   Cek: `git --version`
4. Setup identitas (sekali saja):
   ```
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@gmail.com"
   ```
5. Di github.com: **+ → New repository** → nama `sapmc` → **Public** → JANGAN centang README/.gitignore/license → Create.
6. Verifikasi folder: jalankan `dir` — harus terlihat `index.html`, `css`, `js` (bukan folder `frontend`/`backend`).
7. Push pertama (satu per satu):
   ```
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/sapmc.git
   git push -u origin main
   ```
   Saat diminta password, tempel **Personal Access Token** (github.com/settings/tokens → Generate new token (classic) → centang `repo`). Layar tidak menampilkan apa pun saat paste — itu normal.
8. Aktifkan Pages: repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch **main** / **(root)** → Save. Centang **Enforce HTTPS**.
9. Tunggu 1–2 menit → situs: `https://USERNAME.github.io/sapmc/`

## Update berikutnya
```
git add .
git commit -m "Perubahan"
git push
```
Lalu Ctrl+Shift+R di browser.

## Troubleshooting
| Gejala | Penyebab / solusi |
|---|---|
| 404 di GitHub Pages | `index.html` tidak di root repo (git init di folder salah). Cek isi repo di github.com |
| Halaman tanpa gaya (polos) | Folder `css/` / `js/` rata atau hilang — struktur harus utuh |
| Toast "Server tidak mengirim JSON…" | `GAS_URL` salah/belum diisi, atau deployment belum "Anyone", atau belum New version |
| "Koneksi bermasalah" | Cek internet; buka URL `/exec` di browser harus tampil JSON |
| Kamera tidak muncul | Wajib HTTPS (GitHub Pages sudah HTTPS) dan izinkan kamera di browser |
| Kode OTP tidak sampai | Sama seperti sebelumnya: cek spam & kuota email Apps Script |

Catatan: login berbasis OTP email + token seperti sebelumnya. Deteksi akun Google otomatis ("auth.auto") dihapus karena frontend kini di luar Google.
