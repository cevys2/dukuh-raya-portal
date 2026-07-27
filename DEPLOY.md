# Deploy Portal ke Railway (manual)

Panduan ini untuk men-deploy `dukuh-raya-portal` ke Railway project
**"Dukuh raya infrastructure"**, berdampingan dengan service yang sudah ada
(`Postgres`, `shipyard-pricing`, `dukuhraya-shipyard-pricing frontend`,
`backup-service`).

Portal punya dua bagian (`backend/` dan `frontend/`), jadi butuh **2 service
Railway** — sama polanya seperti shipyard-pricing.

---

## Urutan penting

Ada saling-ketergantungan URL: Portal perlu tahu URL shipyard, dan shipyard
perlu tahu URL Portal. Karena itu urutannya **buat service dulu → generate
domain → baru isi environment variable → lalu redeploy**.

Variabel `VITE_*` itu **build-time**: nilainya ditanam saat build, bukan dibaca
saat runtime. Jadi setiap kali mengubah `VITE_*`, **wajib redeploy**, tidak cukup
restart.

---

## Langkah 1 — Merge branch Portal

Branch kerja: `claude/portal-owns-auth` di repo `cevys2/dukuh-raya-portal`.

Merge dulu ke `main` (atau arahkan Railway ke branch tersebut kalau mau coba
dulu sebelum merge).

## Langkah 2 — Buat service "portal-backend"

1. Di project **Dukuh raya infrastructure** → **New** → **GitHub Repo** →
   pilih `cevys2/dukuh-raya-portal`.
2. Buka **Settings** service itu:
   - **Service Name**: `portal-backend`
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. **Networking** → **Generate Domain**. Catat URL-nya, misal
   `https://portal-backend-production.up.railway.app`.

### Environment variables portal-backend

| Variable | Nilai |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `${{shipyard-pricing.JWT_SECRET}}` |
| `CORS_ORIGINS` | URL **portal-frontend** (diisi setelah Langkah 3) |
| `SHIPYARD_APP_URL` | URL **dukuhraya-shipyard-pricing frontend** |

> **`JWT_SECRET` harus persis sama dengan milik shipyard-pricing.** Itulah yang
> bikin "login sekali, semua app kebuka" jalan — Portal menerbitkan token,
> shipyard memverifikasinya dengan secret yang sama. Pakai sintaks referensi
> `${{shipyard-pricing.JWT_SECRET}}` supaya tidak perlu copy-paste dan tidak
> bisa salah ketik.

> ⚠️ **Isi `SHIPYARD_APP_URL` SEBELUM deploy pertama yang berhasil.** Saat
> pertama kali boot dan tabel `apps` masih kosong, backend otomatis membuat
> entri app "Docking Repair Pricing" memakai nilai ini. Kalau saat itu belum
> diisi, dia akan tersimpan sebagai `http://localhost:5173` dan **tidak akan
> ditimpa** di boot berikutnya (seeding cuma jalan sekali). Panel admin saat ini
> hanya bisa menambah app, belum bisa mengedit, jadi perbaikannya harus lewat
> SQL:
> ```sql
> UPDATE apps SET base_url = 'https://<url-shipyard-frontend>'
> WHERE key = 'shipyard-pricing';
> ```

## Langkah 3 — Buat service "portal-frontend"

1. **New** → **GitHub Repo** → `cevys2/dukuh-raya-portal` lagi (repo yang sama,
   service berbeda).
2. **Settings**:
   - **Service Name**: `portal-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx vite preview --host 0.0.0.0 --port $PORT`
3. **Generate Domain**. Catat URL-nya.

### Environment variables portal-frontend

| Variable | Nilai |
|---|---|
| `VITE_PORTAL_API_URL` | URL **portal-backend** dari Langkah 2 |
| `VITE_ALLOWED_APP_ORIGINS` | Origin **shipyard frontend**, contoh `https://xxx.up.railway.app` |

> `VITE_ALLOWED_APP_ORIGINS` adalah daftar origin (pisah koma) yang boleh
> menerima token lewat `?redirect=`. Ini pengaman supaya token tidak bisa
> dikirim ke domain sembarangan. **Kalau kosong, tombol app tetap jalan tapi
> alur "dilempar balik setelah login" akan diam-diam tidak berfungsi** —
> user akan berhenti di dashboard Portal. Jadi jangan lupa diisi.
>
> Isi **origin saja** (`https://host`), tanpa path.

## Langkah 4 — Lengkapi CORS backend

Balik ke **portal-backend** → set `CORS_ORIGINS` = URL portal-frontend
(Langkah 3). Kalau lebih dari satu, pisahkan dengan koma.

Redeploy portal-backend.

## Langkah 5 — Update service shipyard yang sudah ada

### 5a. shipyard frontend

Tambah variable baru:

| Variable | Nilai |
|---|---|
| `VITE_PORTAL_URL` | URL **portal-frontend** |

Lalu **redeploy** (wajib — ini variabel build-time).

### 5b. shipyard-pricing (backend)

Hapus variable **`SUPABASE_URL`**. Sudah tidak dibaca kode manapun sejak
diganti `DATABASE_URL`; cuma sisa yang bikin bingung.

Pastikan `JWT_SECRET` tidak berubah — Portal mereferensikannya.

---

## Verifikasi

1. Buka URL **portal-frontend** → muncul form login Portal.
2. Login pakai akun yang sudah ada (akun lama tetap jalan — tabel `users`
   dipakai bersama, tidak dibuat ulang).
3. Dashboard menampilkan kartu app "Docking Repair Pricing".
4. Klik kartu itu → masuk ke shipyard **tanpa diminta login lagi**.
5. Buka URL shipyard langsung di tab baru (incognito) → harus otomatis
   dilempar ke Portal, dan setelah login dilempar balik ke shipyard.
6. Sebagai admin, buka tab **Kelola Akses** → coba buat akun `user` biasa,
   beri akses ke satu app, lalu login sebagai akun itu dan pastikan dia
   **cuma** melihat app tersebut.

## Kalau ada masalah

| Gejala | Kemungkinan sebab |
|---|---|
| Backend gagal start, log `DATABASE_URL is not set` | `DATABASE_URL` belum diisi / salah nama |
| Login sukses tapi balik lagi ke halaman login | `JWT_SECRET` Portal ≠ shipyard |
| Login sukses tapi mentok di dashboard Portal, tidak dilempar balik | `VITE_ALLOWED_APP_ORIGINS` kosong / origin tidak cocok |
| Browser error CORS | `CORS_ORIGINS` di portal-backend belum memuat URL portal-frontend |
| Kartu app mengarah ke `localhost:5173` | `SHIPYARD_APP_URL` belum diisi saat seeding pertama — perbaiki via SQL di atas |
