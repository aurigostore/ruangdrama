import { Router } from "express";
import { createKey, validateKey, getAllKeys, deactivateKey, extendKey, createCustomKey } from "../db.js";

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
  return res.json({ success: true, ...result });
});

// ── POST /api/auth/admin/generate ─────────────────────────
// Generate key acak (atau custom jika ada customKey)
router.post("/admin/generate", requireAdmin, (req, res) => {
  const { durationDays, note, customKey } = req.body;
  const days = parseInt(durationDays);
  if (!days || days < 1 || days > 3650) {
    return res.status(400).json({ success: false, error: "durationDays harus antara 1-3650" });
  }
  if (customKey) {
    // Key custom (nama promo)
    const result = createCustomKey(customKey, days, note || "");
    if (!result.success) return res.status(400).json(result);
    return res.json({ success: true, ...result });
  }
  // Key acak biasa
  const result = createKey(days, note || "");
  return res.json({ success: true, ...result });
});

// ── POST /api/auth/admin/extend ───────────────────────────
// Perpanjang masa aktif key
router.post("/admin/extend", requireAdmin, (req, res) => {
  const { key, days } = req.body;
  if (!key) return res.status(400).json({ success: false, error: "Key wajib diisi" });
  const d = parseInt(days);
  if (!d || d < 1 || d > 3650) {
    return res.status(400).json({ success: false, error: "days harus antara 1-3650" });
  }
  const result = extendKey(key.trim().toUpperCase(), d);
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

// ── DELETE /api/auth/admin/keys/:key ──────────────────────
router.delete("/admin/keys/:key", requireAdmin, (req, res) => {
  const ok = deactivateKey(req.params.key);
  if (!ok) return res.status(404).json({ success: false, error: "Key tidak ditemukan" });
  return res.json({ success: true, message: "Key berhasil dinonaktifkan" });
});

export default router;
