import { Router } from "express";
import {
  createKey, validateKey, getAllKeys, deactivateKey, extendKey, createCustomKey,
  logKeyUsage, getKeyUsageLogs,
  createNotification, getActiveNotifications, getAllNotifications, deleteNotification, toggleNotification,
  incrementCounter, getCounters, getActiveVipCount, getOnlineWatchersCount,
} from "../db.js";

const router = Router();

// ── Middleware cek admin password ──────────────────────────
function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ success: false, error: "ADMIN_PASSWORD belum diset di .env" });
  }
  const provided = req.headers["x-admin-password"] || req.body?.adminPassword;
  if (provided !== adminPassword) {
    return res.status(401).json({ success: false, error: "Password admin salah" });
  }
  next();
}

// ── POST /api/auth/validate ────────────────────────────────
router.post("/validate", (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== "string") {
    return res.status(400).json({ success: false, error: "Key tidak boleh kosong" });
  }
  const result = validateKey(key.trim().toUpperCase());
  if (result.valid) {
    // Log penggunaan dan increment counter login
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";
    logKeyUsage(key.trim().toUpperCase(), ip);
    incrementCounter("logins");
  }
  return res.json({ success: true, ...result });
});

// ── POST /api/auth/admin/generate ─────────────────────────
router.post("/admin/generate", requireAdmin, (req, res) => {
  const { durationDays, durationHours: extraHours, note, customKey } = req.body;

  // Support format baru (days + hours) maupun lama (durationDays saja)
  const totalHours = (parseInt(durationDays) || 0) * 24 + (parseInt(extraHours) || 0);
  if (!totalHours || totalHours < 1) {
    return res.status(400).json({ success: false, error: "Durasi minimal 1 jam" });
  }
  if (totalHours > 3650 * 24) {
    return res.status(400).json({ success: false, error: "Durasi terlalu panjang (max 3650 hari)" });
  }

  if (customKey) {
    const result = createCustomKey(customKey, totalHours, note || "");
    if (!result.success) return res.status(400).json(result);
    return res.json({ success: true, ...result });
  }
  const result = createKey(totalHours, note || "");
  return res.json({ success: true, ...result });
});

// ── POST /api/auth/admin/extend ───────────────────────────
router.post("/admin/extend", requireAdmin, (req, res) => {
  const { key, days, hours } = req.body;
  if (!key) return res.status(400).json({ success: false, error: "Key wajib diisi" });
  const totalHours = (parseInt(days) || 0) * 24 + (parseInt(hours) || 0);
  if (!totalHours || totalHours < 1) {
    return res.status(400).json({ success: false, error: "Durasi minimal 1 jam" });
  }
  const result = extendKey(key.trim().toUpperCase(), totalHours);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

// ── GET /api/auth/admin/keys ───────────────────────────────
router.get("/admin/keys", requireAdmin, (req, res) => {
  const keys = getAllKeys();
  const now = new Date();
  const enriched = keys.map((k) => {
    const expires = new Date(k.expires_at);
    const msLeft = expires - now;
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    return {
      ...k,
      is_expired: now > expires,
      daysLeft,
      hoursLeft,
    };
  });
  return res.json({ success: true, keys: enriched });
});

// ── GET /api/auth/admin/keys/:key/logs ────────────────────
router.get("/admin/keys/:key/logs", requireAdmin, (req, res) => {
  const logs = getKeyUsageLogs(req.params.key.toUpperCase());
  return res.json({ success: true, logs });
});

// ── DELETE /api/auth/admin/keys/:key ──────────────────────
router.delete("/admin/keys/:key", requireAdmin, (req, res) => {
  const ok = deactivateKey(req.params.key);
  if (!ok) return res.status(404).json({ success: false, error: "Key tidak ditemukan" });
  return res.json({ success: true, message: "Key berhasil dinonaktifkan" });
});

// ── Notifications (Public) ─────────────────────────────────
// GET /api/notifications — ambil notif aktif (tidak perlu auth)
router.get("/notifications", (req, res) => {
  const notifs = getActiveNotifications();
  return res.json({ success: true, notifications: notifs });
});

// ── Notifications (Admin) ──────────────────────────────────
router.get("/admin/notifications", requireAdmin, (req, res) => {
  const notifs = getAllNotifications();
  return res.json({ success: true, notifications: notifs });
});

router.post("/admin/notifications", requireAdmin, (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ success: false, error: "title dan body wajib diisi" });
  }
  createNotification(title, body);
  return res.json({ success: true });
});

router.delete("/admin/notifications/:id", requireAdmin, (req, res) => {
  const ok = deleteNotification(parseInt(req.params.id));
  if (!ok) return res.status(404).json({ success: false, error: "Notifikasi tidak ditemukan" });
  return res.json({ success: true });
});

router.patch("/admin/notifications/:id/toggle", requireAdmin, (req, res) => {
  const ok = toggleNotification(parseInt(req.params.id));
  if (!ok) return res.status(404).json({ success: false, error: "Notifikasi tidak ditemukan" });
  return res.json({ success: true });
});

// ── Stats / Counters ───────────────────────────────────────
// POST /api/stats/visitor — dipanggil saat home dimuat
router.post("/stats/visitor", (req, res) => {
  incrementCounter("visitors");
  return res.json({ success: true });
});

// GET /api/stats/counters — public, return angka
router.get("/stats/counters", (req, res) => {
  const counters = getCounters();
  const activeVip = getActiveVipCount();
  const onlineWatchers = getOnlineWatchersCount();
  return res.json({ success: true, counters, activeVip, onlineWatchers });
});

export default router;
