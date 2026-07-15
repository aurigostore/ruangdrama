import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../data/keys.db");

// Buat folder data jika belum ada
import { mkdirSync } from "fs";
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// ── Migrasi & Inisialisasi Tabel ──────────────────────────
// Cek schema tabel keys saat ini
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='keys'").get();

if (tableExists) {
  let cols = db.pragma("table_info(keys)").map((c) => c.name);
  let hasDurationDays = cols.includes("duration_days");
  let hasDurationHours = cols.includes("duration_hours");

  if (hasDurationDays && !hasDurationHours) {
    // Kasus 1: tabel lama (hanya duration_days) → tambah duration_hours
    db.exec(`ALTER TABLE keys ADD COLUMN duration_hours INTEGER NOT NULL DEFAULT 24`);
    db.exec(`UPDATE keys SET duration_hours = duration_days * 24`);
    
    // Re-evaluate agar if block kedua langsung berjalan tanpa perlu restart kedua kali
    cols = db.pragma("table_info(keys)").map((c) => c.name);
    hasDurationDays = cols.includes("duration_days");
    hasDurationHours = cols.includes("duration_hours");
  }

  if (hasDurationDays && hasDurationHours) {
    // Kasus 2: tabel hybrid (kedua kolom ada) → rekonstruksi untuk hapus duration_days
    // SQLite tidak support DROP COLUMN NOT NULL, jadi pakai rename + recreate
    db.exec(`
      ALTER TABLE keys RENAME TO keys_old;

      CREATE TABLE keys (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        key            TEXT    UNIQUE NOT NULL,
        duration_hours INTEGER NOT NULL DEFAULT 24,
        created_at     TEXT NOT NULL,
        expires_at     TEXT NOT NULL,
        is_active      INTEGER NOT NULL DEFAULT 1,
        note           TEXT DEFAULT ''
      );

      INSERT INTO keys (id, key, duration_hours, created_at, expires_at, is_active, note)
        SELECT id, key, duration_hours, created_at, expires_at, is_active, note FROM keys_old;

      DROP TABLE keys_old;
    `);
  }
}

// Buat tabel jika belum ada (fresh install)
db.exec(`
  CREATE TABLE IF NOT EXISTS keys (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    key            TEXT    UNIQUE NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 24,
    created_at     TEXT NOT NULL,
    expires_at     TEXT NOT NULL,
    is_active      INTEGER NOT NULL DEFAULT 1,
    note           TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS key_usage_logs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    key     TEXT NOT NULL,
    used_at TEXT NOT NULL,
    ip      TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS counters (
    name  TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);


// Pastikan counter rows ada
db.prepare("INSERT OR IGNORE INTO counters (name, value) VALUES (?, 0)").run("visitors");
db.prepare("INSERT OR IGNORE INTO counters (name, value) VALUES (?, 0)").run("logins");

// ── Generate key format: RD-XXXXXXXXXXXX ─────────────────
function generateKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "RD-";
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

// ── Keys CRUD ─────────────────────────────────────────────
export function createKey(durationHours, note = "") {
  const key = generateKey();
  const now = new Date();
  const expires = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO keys (key, duration_hours, created_at, expires_at, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, durationHours, now.toISOString(), expires.toISOString(), note);

  return { key, expiresAt: expires.toISOString(), durationHours };
}

export function validateKey(keyStr) {
  const row = db.prepare("SELECT * FROM keys WHERE key = ?").get(keyStr);
  if (!row) return { valid: false, reason: "Key tidak ditemukan" };
  if (!row.is_active) return { valid: false, reason: "Key sudah dinonaktifkan" };

  const now = new Date();
  const expires = new Date(row.expires_at);
  if (now > expires) return { valid: false, reason: "Key sudah expired", expired: true };

  const msLeft = expires - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
  return {
    valid: true,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    daysLeft,
    hoursLeft,
    durationHours: row.duration_hours,
    note: row.note || "",
  };
}

export function getAllKeys() {
  const keys = db.prepare("SELECT * FROM keys ORDER BY created_at DESC").all();
  // Tambahkan login_count dan last_used_at dari logs
  return keys.map((k) => {
    const logs = db.prepare("SELECT COUNT(*) as cnt, MAX(used_at) as last FROM key_usage_logs WHERE key = ?").get(k.key);
    return {
      ...k,
      login_count: logs.cnt || 0,
      last_used_at: logs.last || null,
    };
  });
}

export function deactivateKey(keyStr) {
  const info = db.prepare("UPDATE keys SET is_active = 0 WHERE key = ?").run(keyStr);
  return info.changes > 0;
}

export function extendKey(keyStr, additionalHours) {
  const row = db.prepare("SELECT * FROM keys WHERE key = ?").get(keyStr);
  if (!row) return { success: false, reason: "Key tidak ditemukan" };

  const base = new Date(row.expires_at) > new Date() ? new Date(row.expires_at) : new Date();
  const newExpires = new Date(base.getTime() + additionalHours * 60 * 60 * 1000);

  db.prepare("UPDATE keys SET expires_at = ?, is_active = 1, duration_hours = duration_hours + ? WHERE key = ?")
    .run(newExpires.toISOString(), additionalHours, keyStr);

  return { success: true, newExpiresAt: newExpires.toISOString() };
}

export function createCustomKey(customKey, durationHours, note = "") {
  const key = customKey.trim().toUpperCase();
  if (!/^[A-Z0-9\-]{3,20}$/.test(key)) {
    return { success: false, reason: "Key hanya boleh huruf A-Z, angka, dan strip (-). 3-20 karakter." };
  }
  const existing = db.prepare("SELECT key FROM keys WHERE key = ?").get(key);
  if (existing) return { success: false, reason: "Key sudah digunakan" };

  const now = new Date();
  const expires = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  db.prepare(`INSERT INTO keys (key, duration_hours, created_at, expires_at, note) VALUES (?, ?, ?, ?, ?)`)
    .run(key, durationHours, now.toISOString(), expires.toISOString(), note);

  return { success: true, key, expiresAt: expires.toISOString() };
}

// ── Key Usage Logs ─────────────────────────────────────────
export function logKeyUsage(keyStr, ip = "") {
  db.prepare("INSERT INTO key_usage_logs (key, used_at, ip) VALUES (?, ?, ?)")
    .run(keyStr, new Date().toISOString(), ip || "");
}

export function getKeyUsageLogs(keyStr) {
  return db.prepare("SELECT * FROM key_usage_logs WHERE key = ? ORDER BY used_at DESC").all(keyStr);
}

// ── Notifications ──────────────────────────────────────────
export function createNotification(title, body) {
  db.prepare("INSERT INTO notifications (title, body, created_at) VALUES (?, ?, ?)")
    .run(title, body, new Date().toISOString());
  return { success: true };
}

export function getActiveNotifications() {
  return db.prepare("SELECT * FROM notifications WHERE is_active = 1 ORDER BY created_at DESC").all();
}

export function getAllNotifications() {
  return db.prepare("SELECT * FROM notifications ORDER BY created_at DESC").all();
}

export function deleteNotification(id) {
  const info = db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
  return info.changes > 0;
}

export function toggleNotification(id) {
  const row = db.prepare("SELECT is_active FROM notifications WHERE id = ?").get(id);
  if (!row) return false;
  db.prepare("UPDATE notifications SET is_active = ? WHERE id = ?").run(row.is_active ? 0 : 1, id);
  return true;
}

// ── Counters ───────────────────────────────────────────────
export function incrementCounter(name) {
  db.prepare("UPDATE counters SET value = value + 1 WHERE name = ?").run(name);
}

export function getCounters() {
  const rows = db.prepare("SELECT * FROM counters").all();
  const result = {};
  for (const r of rows) result[r.name] = r.value;
  return result;
}

export function getActiveVipCount() {
  const row = db.prepare("SELECT COUNT(*) as count FROM keys WHERE is_active = 1 AND expires_at > ?").get(new Date().toISOString());
  return row ? row.count : 0;
}

export function getOnlineWatchersCount() {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const row = db.prepare("SELECT COUNT(DISTINCT key) as count FROM key_usage_logs WHERE used_at > ?").get(fifteenMinsAgo);
  return row ? row.count : 0;
}

// ── Settings ───────────────────────────────────────────────
export function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

// ── JWT Token Management ───────────────────────────────────
export function getJwtToken() {
  // Prioritas: DB override → fallback .env
  return getSetting("jwt_token") || process.env.AIO_JWT_TOKEN || "";
}

export function setJwtToken(token) {
  setSetting("jwt_token", token);
}

export function getJwtStatus() {
  const dbToken = getSetting("jwt_token");
  const token = dbToken || process.env.AIO_JWT_TOKEN || "";
  const source = dbToken ? "database" : "env";

  if (!token) return { hasToken: false, source };

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { hasToken: true, error: "Format JWT tidak valid", source };

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > payload.exp;
    const secLeft = payload.exp - now;
    const daysLeft = Math.max(0, Math.floor(secLeft / 86400));
    const hoursLeft = Math.max(0, Math.floor(secLeft / 3600));

    return {
      hasToken: true,
      isExpired,
      role: payload.role || "UNKNOWN",
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      createdAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      daysLeft,
      hoursLeft,
      source,
    };
  } catch {
    return { hasToken: true, error: "Gagal decode JWT", source };
  }
}
