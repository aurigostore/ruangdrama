# DRACIN — DramaBox Streaming App

Web streaming DramaBox dengan backend Node.js + Express dan frontend Next.js.

## Struktur Project

```
DRACIN/
├── backend/          ← Express.js API (port 4000)
│   ├── src/
│   │   ├── index.js          ← Server utama
│   │   ├── routes/
│   │   │   └── dramabox.js   ← API routes
│   │   └── scrapers/
│   │       └── dramabox.js   ← Data scraper
│   ├── .env
│   └── package.json
└── frontend/         ← Next.js App (port 3500)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx          ← Home
    │   │   ├── drama/[id]/       ← Detail drama
    │   │   ├── watch/[id]/[ep]/  ← Video player
    │   │   └── search/           ← Pencarian
    │   ├── components/
    │   └── lib/api.ts            ← API client
    └── package.json
```

## Cara Menjalankan

### 1. Install Backend
```bash
cd backend
npm install
node src/index.js
```
Backend berjalan di: http://localhost:4000

### 2. Install Frontend (terminal baru)
```bash
cd frontend
npm install
npm run dev
```
Frontend berjalan di: http://localhost:3500

## API Endpoints (Backend)

| Endpoint | Deskripsi |
|----------|-----------|
| GET /api/dramabox/trending | Drama trending |
| GET /api/dramabox/foryou?page=N | Rekomendasi (dengan pagination) |
| GET /api/dramabox/hotrank | Hot rank |
| GET /api/dramabox/search?query=... | Pencarian drama |
| GET /api/dramabox/detail/:id | Detail drama + daftar episode |
| GET /api/dramabox/stream/:id/:ep | URL stream video |

## Fitur

- ✅ Home page dengan Hero Banner
- ✅ Trending, Hot Rank, For You sections
- ✅ Pencarian drama
- ✅ Detail drama dengan daftar episode
- ✅ Video player (episode gratis)
- ✅ Dark mode premium
- ✅ Responsive design
