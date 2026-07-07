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

// Inisialisasi tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS keys (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    key       TEXT    UNIQUE NOT NULL,
    duration_days INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    expires_at    TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    note          TEXT DEFAULT ''
  );
`);

// Generate key format: RD-XXXXXXXXXXXX (12 karakter random A-Z0-9)
function generateKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // hindari 0/O, 1/I yang mirip
  let result = "RD-";
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function createKey(durationDays, note = "") {
  const key = generateKey();
  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO keys (key, duration_days, created_at, expires_at, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(key, durationDays, now.toISOString(), expires.toISOString(), note);

  return { key, expiresAt: expires.toISOString(), durationDays };
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
    durationDays: row.duration_days,
    note: row.note || "",
  };
}

export function getAllKeys() {
  return db.prepare("SELECT * FROM keys ORDER BY created_at DESC").all();
}

export function deactivateKey(keyStr) {
  const info = db.prepare("UPDATE keys SET is_active = 0 WHERE key = ?").run(keyStr);
  return info.changes > 0;
}

// Perpanjang masa aktif key
export function extendKey(keyStr, additionalDays) {
  const row = db.prepare("SELECT * FROM keys WHERE key = ?").get(keyStr);
  if (!row) return { success: false, reason: "Key tidak ditemukan" };

  // Kalau sudah expired, perpanjang dari sekarang; kalau masih aktif, dari expires_at
  const base = new Date(row.expires_at) > new Date() ? new Date(row.expires_at) : new Date();
  const newExpires = new Date(base.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  db.prepare("UPDATE keys SET expires_at = ?, is_active = 1, duration_days = duration_days + ? WHERE key = ?")
    .run(newExpires.toISOString(), additionalDays, keyStr);

  return { success: true, newExpiresAt: newExpires.toISOString() };
}

// Buat key dengan nama custom (misal: JUMATBERKAH)
export function createCustomKey(customKey, durationDays, note = "") {
  const key = customKey.trim().toUpperCase();
  // Validasi: hanya huruf kapital, angka, dan strip
  if (!/^[A-Z0-9\-]{3,20}$/.test(key)) {
    return { success: false, reason: "Key hanya boleh huruf A-Z, angka, dan strip (-). 3-20 karakter." };
  }
  const existing = db.prepare("SELECT key FROM keys WHERE key = ?").get(key);
  if (existing) return { success: false, reason: "Key sudah digunakan" };

  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  db.prepare(`INSERT INTO keys (key, duration_days, created_at, expires_at, note) VALUES (?, ?, ?, ?, ?)`)
    .run(key, durationDays, now.toISOString(), expires.toISOString(), note);

  return { success: true, key, expiresAt: expires.toISOString() };
}

