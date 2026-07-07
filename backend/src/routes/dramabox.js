import { Router } from "express";
import {
  getTrending,
  getForYou,
  getTabList,
  getTabContent,
  search,
  getDetail,
  getEpisodeStream,
} from "../scrapers/dramabox.js";

const router = Router();

// Helper: wrap async handlers
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ──────────────────────────────────────────────
// GET /api/dramabox/trending
// ──────────────────────────────────────────────
router.get("/trending", wrap(async (req, res) => {
  const data = await getTrending();
  res.json({ success: true, data });
}));

// ──────────────────────────────────────────────
// GET /api/dramabox/foryou?page=1&pageInfo=...
// ──────────────────────────────────────────────
router.get("/foryou", wrap(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageInfo = req.query.pageInfo ? JSON.parse(decodeURIComponent(req.query.pageInfo)) : null;
  const result = await getForYou(page, pageInfo);
  res.json({ success: true, ...result });
}));

// ──────────────────────────────────────────────
// GET /api/dramabox/tabs
// List semua tab/kategori yang tersedia
// ──────────────────────────────────────────────
router.get("/tabs", wrap(async (req, res) => {
  const data = await getTabList();
  res.json({ success: true, data });
}));

// ──────────────────────────────────────────────
// POST /api/dramabox/tabcontent
// Get konten dari tab tertentu
// ──────────────────────────────────────────────
router.post("/tabcontent", wrap(async (req, res) => {
  const { pageInfo } = req.body;
  // Untuk pagination: gunakan getForYou dengan pageInfo
  const result = await getForYou(2, pageInfo || null);
  res.json({ success: true, ...result });
}));

// ──────────────────────────────────────────────
// GET /api/dramabox/search?query=...
// ──────────────────────────────────────────────
router.get("/search", wrap(async (req, res) => {
  const query = req.query.query || req.query.q || "";
  if (!query.trim()) return res.json({ success: true, data: [] });
  const data = await search(query);
  res.json({ success: true, data });
}));

// ──────────────────────────────────────────────
// GET /api/dramabox/detail/:id
// ──────────────────────────────────────────────
router.get("/detail/:id", wrap(async (req, res) => {
  const data = await getDetail(req.params.id);
  res.json({ success: true, data });
}));

// ──────────────────────────────────────────────
// GET /api/dramabox/stream/:id/:ep
// ──────────────────────────────────────────────
router.get("/stream/:id/:ep", wrap(async (req, res) => {
  const { id, ep } = req.params;
  const data = await getEpisodeStream(id, parseInt(ep));

  if (data.locked) {
    return res.status(403).json({
      success: false,
      error: "Episode terkunci",
    });
  }

  if (!data.videoUrl) {
    return res.status(404).json({
      success: false,
      error: "Stream URL tidak tersedia",
    });
  }

  res.json({ success: true, data });
}));

// Error handler
router.use((err, req, res, next) => {
  const detail = err.response?.data || err.message;
  console.error("Route error:", JSON.stringify(detail));
  res.status(500).json({ success: false, error: err.message, detail });
});


export default router;
