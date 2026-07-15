# Arsitektur DRACIN

## Stack Teknologi

| Layer | Teknologi | Versi | Port |
|---|---|---|---|
| Frontend | Next.js + React + TypeScript | 15.3.5 / 19 | 3500 |
| Backend | Express.js (ESM) | 4.x | 4000 |
| Database | SQLite (better-sqlite3) | 12.x | — |
| Video | HLS.js | 1.5.x | — |
| HTTP Client | axios | 1.7.x | — |

## Alur Data Utama

### Autentikasi User
```
User input key
  → POST /api/auth/validate
    → db: cek key, expiry, is_active
    → log IP ke key_usage_logs
    → increment counter logins
  → localStorage: simpan key, expires, info
```

### Streaming Video
```
/watch/[id]/[ep]
  → GET /api/dramabox/stream/:id/:ep
    → getDetail(id)         ← GET /series/:id di aiodrama
    → cari episode by number
    → jika videoUrl kosong: fetchChapterVideoUrl(chapterId)
        → coba 6 endpoint berurutan sampai dapat URL
  → HLS.js load m3u8 / video.src = mp4
```

### Scraper Fallback Chain (6 endpoint)
```
1. GET api.aiodrama.vip/aliplay/chapter/:id
2. GET api.aiodrama.vip/drama/dramabox/chapter/:id
3. POST api.aiodrama.vip/drama/dramabox/play
4. GET aiodrama.vip/api/drama/dramabox/chapter/:id
5. POST aiodrama.vip/api/drama/dramabox/play
6. GET api.aiodrama.vip/drama/dramabox/series/chapter
```

## Skema Database (SQLite)

```sql
keys (
  id, key TEXT UNIQUE, duration_hours,
  created_at, expires_at, is_active, note
)

key_usage_logs (id, key, used_at, ip)

notifications (id, title, body, created_at, is_active)

counters (name TEXT PRIMARY KEY, value)
  → rows: "visitors", "logins"
```

## Environment Variables

| Var | Keterangan |
|---|---|
| `PORT` | Port backend (default: 4000) |
| `FRONTEND_URL` | CORS origin |
| `AIO_PLATFORM` | Platform scraper (default: dramabox) |
| `AIO_LANG` | Bahasa konten (default: id) |
| `AIO_QUALITY` | Kualitas video (default: 720) |
| `AIO_JWT_TOKEN` | JWT untuk API aiodrama.vip |
| `ADMIN_PASSWORD` | Password admin panel |
| `WA_NUMBER` | Nomor WA admin (62xxx) |
