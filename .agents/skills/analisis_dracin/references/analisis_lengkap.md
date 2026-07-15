# Analisis Lengkap Aplikasi DRACIN (Ruang Drama)

> **Terakhir dianalisis:** 2026-07-15  
> **Versi backend:** 2.0.0  
> **Versi Next.js:** 15.3.5 | React: 19  

---

## 🏗️ Arsitektur Sistem

```
User (Browser)
    │
    ▼
Frontend — Next.js 15 + React 19 + TypeScript
    Port: 3500
    PWA: Service Worker + manifest.json
    │
    ▼
Backend — Express.js (ESM)
    Port: 4000
    ├── /api/dramabox/*   ← Scraper aiodrama.vip
    └── /api/auth/*       ← Key VIP + Admin
    │
    ├──► SQLite (data/keys.db)
    │    ├── keys          ← VIP keys
    │    ├── key_usage_logs
    │    ├── notifications
    │    └── counters
    │
    └──► External API
         ├── https://aiodrama.vip/api/drama/
         └── https://api.aiodrama.vip
```

---

## 📁 Peta File Penting

| File | Keterangan |
|---|---|
| `backend/src/index.js` | Entry point Express, route registrasi |
| `backend/src/db.js` | SQLite CRUD, migrasi schema otomatis |
| `backend/src/routes/auth.js` | Key VIP + admin + notifikasi endpoints |
| `backend/src/routes/dramabox.js` | Proxy ke scraper |
| `backend/src/scrapers/dramabox.js` | Logika scraping + 6-endpoint fallback video |
| `frontend/src/app/layout.tsx` | Root layout, AuthGuard, Navbar, BottomNav |
| `frontend/src/app/page.tsx` | Homepage — infinite scroll drama grid |
| `frontend/src/app/drama/[id]/page.tsx` | Detail drama + episode list (SSR) |
| `frontend/src/app/watch/[id]/[ep]/page.tsx` | Video player (HLS + MP4 + subtitle) |
| `frontend/src/app/admin/page.tsx` | Admin panel (keys, notif, stats) |
| `frontend/src/components/AuthGuard.tsx` | Proteksi halaman via key VIP |
| `frontend/src/components/HeroBanner.tsx` | Auto-slide banner 7 drama |
| `frontend/src/components/Navbar.tsx` | Navbar + search + bell notifikasi |
| `frontend/src/lib/api.ts` | Typed fetch helpers ke backend |
| `frontend/src/lib/progress.ts` | Continue Watching (localStorage, max 20) |
| `frontend/src/lib/watchlist.ts` | Favorit drama (localStorage) |
| `frontend/src/app/globals.css` | Semua CSS — 80KB, satu file |
| `data/keys.db` | SQLite database (jangan commit!) |

---

## ✅ Fitur yang Sudah Ada

### Sistem Key VIP
- Generate key acak format `RD-XXXXXXXXXXXX` (cryptographically random)
- Custom key (regex validasi `A-Z0-9-`, 3-20 karakter)
- Extend key (tambah jam ke expiry)
- Deactivate key
- Log penggunaan per key (timestamp + IP real)
- Support durasi: hari + jam digabung (max 3650 hari)
- Validasi di frontend: localStorage expiry check → backend re-validate

### Video Player
- HLS `.m3u8` via HLS.js (Android/Desktop)
- Native HLS untuk iOS Safari
- Fallback MP4 langsung
- 6-endpoint fallback scraper untuk ambil video URL
- Auto play next episode (countdown 1.5 detik)
- Fullscreen persistent saat ganti episode (soft nav via `history.pushState`)
- Keyboard shortcuts: Space (play/pause), ←/→ (skip 10s), F (fullscreen), M (mute)
- Subtitle VTT: fetch URL + parse timed cues + overlay display
- Autoplay policy handling: fallback muted jika blocked browser

### UX / UI
- Hero Banner slider (auto-slide 6 detik, 7 slides tersebar)
- Continue Watching section (dari localStorage)
- Watchlist / Favorit (toggle per card)
- Skeleton loading animation
- Infinite scroll di homepage
- Navigation progress bar (global)
- PWA: installable, service worker cache
- Notifikasi broadcast dari admin (poll 2 menit)
- Responsive mobile: BottomNav khusus mobile
- Bell icon + unread badge (key warning + broadcast)
- Admin panel: stats dashboard, key management, CRUD notifikasi

---

## 🔴 Bug & Masalah KRITIS

### 1. Kredensial Terbuka di `backend/.env`
```
AIO_JWT_TOKEN=eyJ0eXAiOiJKV1Q...   ← JWT token API eksternal
ADMIN_PASSWORD=Xhider@123           ← Password admin plaintext
```
- Pastikan `.env` masuk ke `.gitignore`
- **SEGERA rotate** jika repo pernah public/di-push ke remote

### 2. Baris Sampah di `.env`
```
13: fg   ← baris tidak valid di akhir file
```
Hapus baris ini — bisa menyebabkan parsing error.

### 3. AuthGuard Bypass saat Backend Down
```tsx
// AuthGuard.tsx line 65
.catch(() => setAuthorized(true));
```
Jika backend tidak bisa diakses (network error), user **otomatis lolos auth**.
**Fix:** ganti jadi `.catch(() => router.replace('/login'))` atau tampilkan error page.

### 4. JWT Token API Eksternal Mungkin Expired
```
exp: 1783931215  →  Unix timestamp: ~2026-07-14
```
Jika scraper tiba-tiba tidak bekerja, token perlu diperbarui dari akun aiodrama.

---

## 🟡 Bug Sedang

### 5. Duplicate Route Stats
`/api/stats/visitor` dan `/api/stats/counters` didefinisikan **dua kali**:
```js
// index.js line 41-52 — DUPLIKAT
app.post("/api/stats/visitor", ...);
app.get("/api/stats/counters", ...);

// auth.js line 143-154 — yang benar
router.post("/stats/visitor", ...);
router.get("/stats/counters", ...);
```
**Fix:** hapus blok di `index.js`, cukup dari router `auth.js`.

### 6. `bellRef` Shared antara Desktop & Mobile
```tsx
// Navbar.tsx — satu ref untuk dua elemen
<div className="nb-icon-wrap" ref={bellRef}>  // desktop
...
<div className="nb-icon-wrap" ref={bellRef}>  // mobile
```
`bellRef` hanya menunjuk ke elemen terakhir (mobile). Klik di luar desktop bell tidak akan menutup dropdown.
**Fix:** buat `bellRefDesktop` dan `bellRefMobile` terpisah.

### 7. `tabcontent` Endpoint Abaikan Parameter
```js
// routes/dramabox.js line 49-54
router.post("/tabcontent", async (req, res) => {
  const { pageInfo } = req.body;  // tabKey, positionIndex, type DIABAIKAN
  const result = await getForYou(2, pageInfo || null);
```
Frontend mengirim `tabKey` dan `type`, tapi backend selalu panggil `getForYou`.

### 8. Placeholder Image Tidak Ada
```tsx
// DramaCard.tsx
onError={(e) => {
  (e.target as HTMLImageElement).src = "/placeholder.jpg";  // file ini tidak ada!
}}
```
Jika cover drama gagal load, akan terjadi error loop.
**Fix:** tambahkan `/public/placeholder.jpg` atau ganti dengan data URI inline.

---

## 🟢 Minor / Improvement

### 9. Tidak Ada Rate Limiting
`POST /api/auth/validate` bisa dibrute-force. Tambahkan `express-rate-limit`.

### 10. Double Fetch `foryou`
HeroBanner dan HomePage masing-masing fetch `/api/dramabox/foryou?page=1` saat mount. Data yang sama di-fetch dua kali.

### 11. Watch Page: Double Fetch Detail
```tsx
Promise.all([
  fetch(`.../stream/${id}/${ep}`),
  fetch(`.../detail/${id}`),  // juga sudah di-fetch di halaman drama sebelumnya
])
```

### 12. `globals.css` 80KB dalam Satu File
Sulit di-maintain, memperlambat parse. Pecah per komponen atau halaman.

### 13. Service Worker Cache Terlalu Agresif
```js
// sw.js — cache SEMUA request termasuk API dinamis
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request)...);
});
```
Data drama bisa stale. Whitelist hanya asset statis.

### 14. Tidak Ada Cache di Backend
Setiap request ke `/api/dramabox/*` selalu hit API eksternal. Tidak ada TTL/in-memory cache.

### 15. Admin Panel Tidak Ada Session
Auth admin hanya via password per-request, tanpa session/token. Tidak ada logout atau token expiry.

---

## 📊 Skor Kondisi Kodebase

| Kategori | Nilai | Catatan |
|---|---|---|
| Arsitektur | ⭐⭐⭐⭐ | Full-stack terstruktur, PWA ready |
| Fitur | ⭐⭐⭐⭐⭐ | Lengkap: HLS, subtitle, watchlist, progress |
| Keamanan | ⭐⭐ | Auth bypass, kredensial terbuka, no rate limit |
| Performa | ⭐⭐⭐ | Double fetch, CSS besar, no backend cache |
| Kualitas Kode | ⭐⭐⭐ | Ada duplikasi route & ref sharing bug |
| UX/UI | ⭐⭐⭐⭐ | Responsive, animasi, dark mode |

---

## 🛠️ Urutan Perbaikan yang Disarankan

### Segera (Kritis)
1. Amankan `.env` — masuk `.gitignore`, hapus baris `fg`
2. Perbaiki `AuthGuard.tsx` catch → redirect ke `/login`
3. Tambahkan `/public/placeholder.jpg`
4. Perbarui `AIO_JWT_TOKEN` jika scraper tidak berfungsi

### Jangka Pendek
5. Hapus duplicate routes stats di `index.js`
6. Pisah `bellRef` jadi dua ref (desktop & mobile) di `Navbar.tsx`
7. Tambah `express-rate-limit` di endpoint validate
8. Fix `tabcontent` endpoint agar pakai parameter dari body

### Jangka Menengah
9. Tambah in-memory cache di backend untuk data drama (TTL 5 menit)
10. Pecah `globals.css` menjadi per-komponen
11. Perbaiki Service Worker agar hanya cache asset statis
12. Lift state `foryou` ke parent — hilangkan double fetch

---

## 📝 Catatan Update

Saat melakukan analisis baru, perbarui bagian ini:

| Tanggal | Yang Diubah | Status |
|---|---|---|
| 2026-07-15 | Analisis awal dibuat | ✅ |
