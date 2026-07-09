import { config } from "dotenv";
config(); // Load .env SEBELUM apapun lainnya

import express from "express";
import cors from "cors";
import dramaboxRouter from "./routes/dramabox.js";
import authRouter from "./routes/auth.js";
import { incrementCounter, getCounters, getActiveNotifications, getActiveVipCount, getOnlineWatchersCount } from "./db.js";

// Inisialisasi database saat startup
import "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1); // Agar IP real user tercatat di balik reverse proxy
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "DELETE", "PATCH"],
}));

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Ruang Drama Backend", version: "2.0.0" });
});

// Routes
app.use("/api/dramabox", dramaboxRouter);
app.use("/api/auth", authRouter);

// ── Public routes (tanpa /api/auth prefix) ─────────────────
// GET /api/notifications
app.get("/api/notifications", (req, res) => {
  const notifs = getActiveNotifications();
  res.json({ success: true, notifications: notifs });
});

// POST /api/stats/visitor
app.post("/api/stats/visitor", (req, res) => {
  incrementCounter("visitors");
  res.json({ success: true });
});

// GET /api/stats/counters
app.get("/api/stats/counters", (req, res) => {
  const counters = getCounters();
  const activeVip = getActiveVipCount();
  const onlineWatchers = getOnlineWatchersCount();
  res.json({ success: true, counters, activeVip, onlineWatchers });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`DRACIN Backend running on http://localhost:${PORT}`);
  // Validasi JWT Token
  const key = process.env.AIO_JWT_TOKEN;
  if (!key) {
    console.error("[ERROR] AIO_JWT_TOKEN tidak ditemukan! Cek file .env");
  } else {
    console.log(`[OK] AIO_JWT_TOKEN loaded: ${key.slice(0, 20)}...`);
  }
});
