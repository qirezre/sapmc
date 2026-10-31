# SAP-MC — Frontend (GitHub Pages)

Sistem Absensi & Payroll Multi-Company. Frontend statis (HTML/CSS/JS murni) yang berbicara dengan backend Google Apps Script lewat `fetch()`.

```
index.html
css/style.css
js/config.js     ← isi GAS_URL di sini
js/core.js  js/pegawai.js  js/finance.js  js/manajemen.js
```

Backend: Google Apps Script (Web App, akses "Anyone"). Semua permintaan: `POST {action, token, payload}` dengan `Content-Type: text/plain`.
