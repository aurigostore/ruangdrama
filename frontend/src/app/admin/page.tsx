"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface KeyRow {
  id: number;
  key: string;
  duration_days: number;
  created_at: string;
  expires_at: string;
  is_active: number;
  is_expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  note: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [keys, setKeys] = useState<KeyRow[]>([]);

  // Generate
  const [genDays, setGenDays] = useState(7);
  const [genCustomDays, setGenCustomDays] = useState("");
  const [genNote, setGenNote] = useState("");
  const [newKey, setNewKey] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom key
  const [customKeyName, setCustomKeyName] = useState("");
  const [customDays, setCustomDays] = useState(7);
  const [customNote, setCustomNote] = useState("");
  const [customResult, setCustomResult] = useState<{key?: string; error?: string} | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customCopied, setCustomCopied] = useState(false);

  // Extend
  const [extendTarget, setExtendTarget] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendMsg, setExtendMsg] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/api/auth/admin/keys`, {
      headers: { "x-admin-password": password },
    });
    const json = await res.json();
    if (json.success) {
      setAuthed(true);
      setKeys(json.keys);
    } else {
      setAuthError("Password salah");
    }
  }

  async function loadKeys() {
    const res = await fetch(`${API}/api/auth/admin/keys`, {
      headers: { "x-admin-password": password },
    });
    const json = await res.json();
    if (json.success) setKeys(json.keys);
  }

  async function generateKey() {
    setGenLoading(true); setNewKey("");
    const days = genDays === -1 ? parseInt(genCustomDays) : genDays;
    const res = await fetch(`${API}/api/auth/admin/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ durationDays: days, note: genNote }),
    });
    const json = await res.json();
    setGenLoading(false);
    if (json.success) { setNewKey(json.key); setGenNote(""); loadKeys(); }
  }

  async function generateCustomKey() {
    setCustomLoading(true); setCustomResult(null);
    const res = await fetch(`${API}/api/auth/admin/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ durationDays: customDays, note: customNote, customKey: customKeyName }),
    });
    const json = await res.json();
    setCustomLoading(false);
    if (json.success) {
      setCustomResult({ key: json.key });
      setCustomKeyName(""); setCustomNote("");
      loadKeys();
    } else {
      setCustomResult({ error: json.reason || json.error || "Gagal membuat key" });
    }
  }

  async function extendKey(keyStr: string) {
    setExtendLoading(true); setExtendMsg("");
    const res = await fetch(`${API}/api/auth/admin/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ key: keyStr, days: extendDays }),
    });
    const json = await res.json();
    setExtendLoading(false);
    if (json.success) {
      setExtendMsg("✓ Berhasil diperpanjang!");
      setExtendTarget(null);
      loadKeys();
    } else {
      setExtendMsg(json.reason || "Gagal perpanjang");
    }
  }

  async function deactivate(key: string) {
    if (!confirm(`Nonaktifkan key ${key}?`)) return;
    await fetch(`${API}/api/auth/admin/keys/${key}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    loadKeys();
  }

  function copyKey(k: string, setCopy: (v: boolean) => void) {
    navigator.clipboard.writeText(k);
    setCopy(true);
    setTimeout(() => setCopy(false), 2000);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatSisa(k: KeyRow) {
    if (k.is_expired) return "Expired";
    if (k.daysLeft >= 1) return `${k.daysLeft} hari`;
    return `${k.hoursLeft} jam`;
  }

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>⚙️ Admin Panel</h1>
          <p>Ruang Drama — Key Management</p>
          <form onSubmit={login}>
            <input
              type="password" placeholder="Admin password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
              className="admin-input" autoFocus
            />
            <button type="submit" className="admin-btn-primary">Masuk</button>
          </form>
          {authError && <p className="admin-error">{authError}</p>}
        </div>
      </div>
    );
  }

  const activeKeys = keys.filter((k) => k.is_active && !k.is_expired);
  const inactiveKeys = keys.filter((k) => !k.is_active || k.is_expired);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ Admin Panel</h1>
        <span className="admin-logout" onClick={() => setAuthed(false)}>Keluar</span>
      </div>

      {/* ── Generate Key Acak ── */}
      <div className="admin-section">
        <h2>🔑 Generate Key Acak</h2>
        <div className="admin-gen-col">
          <div className="admin-gen-row">
            <select className="admin-input" value={genDays} onChange={(e) => setGenDays(Number(e.target.value))}>
              <option value={1}>1 Hari — Rp 1.000</option>
              <option value={7}>7 Hari — Rp 6.500</option>
              <option value={30}>30 Hari — Rp 29.000</option>
              <option value={90}>90 Hari (custom)</option>
              <option value={-1}>Durasi lain...</option>
            </select>
            {genDays === -1 && (
              <input type="number" className="admin-input" placeholder="Jumlah hari" min={1}
                value={genCustomDays} onChange={(e) => setGenCustomDays(e.target.value)} style={{width:100}} />
            )}
            <input type="text" className="admin-input" placeholder="Catatan (nama pembeli) — opsional"
              value={genNote} onChange={(e) => setGenNote(e.target.value)} />
            <button className="admin-btn-primary" onClick={generateKey} disabled={genLoading}>
              {genLoading ? "Generating..." : "Generate"}
            </button>
          </div>
          {newKey && (
            <div className="admin-new-key">
              <span className="admin-key-text">{newKey}</span>
              <button className="admin-copy-btn" onClick={() => copyKey(newKey, setCopied)}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Key Custom / Promo ── */}
      <div className="admin-section">
        <h2>🎁 Key Custom / Promo</h2>
        <p style={{fontSize:13, color:"var(--text-3)", marginBottom:12}}>
          Buat key dengan nama khusus, misal: JUMATBERKAH, INDONESIAMERDEKA
        </p>
        <div className="admin-gen-col">
          <div className="admin-gen-row">
            <input type="text" className="admin-input admin-key-text"
              placeholder="Nama key (A-Z, 0-9, strip)"
              value={customKeyName}
              onChange={(e) => setCustomKeyName(e.target.value.toUpperCase())}
              maxLength={20} style={{letterSpacing:"1px"}}
            />
            <select className="admin-input" value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))}>
              <option value={1}>1 Hari</option>
              <option value={7}>7 Hari</option>
              <option value={30}>30 Hari</option>
              <option value={90}>90 Hari</option>
            </select>
            <input type="text" className="admin-input" placeholder="Catatan — opsional"
              value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
            <button className="admin-btn-primary" onClick={generateCustomKey} disabled={customLoading || !customKeyName}>
              {customLoading ? "Membuat..." : "Buat Key"}
            </button>
          </div>
          {customResult?.key && (
            <div className="admin-new-key">
              <span className="admin-key-text">{customResult.key}</span>
              <button className="admin-copy-btn" onClick={() => { copyKey(customResult!.key!, setCustomCopied); }}>
                {customCopied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          )}
          {customResult?.error && <p className="admin-error">{customResult.error}</p>}
        </div>
      </div>

      {/* ── Key Aktif ── */}
      <div className="admin-section">
        <h2>✅ Key Aktif ({activeKeys.length})</h2>
        {activeKeys.length === 0 ? (
          <p style={{color:"var(--text-3)", fontSize:14}}>Belum ada key aktif</p>
        ) : (
          <div className="admin-key-cards">
            {activeKeys.map((k) => (
              <div key={k.key} className={`admin-key-card ${k.daysLeft <= 1 ? "admin-key-card--warn" : ""}`}>
                <div className="admin-key-card-top">
                  <code className="admin-key-cell">{k.key}</code>
                  <span className={`admin-days ${k.daysLeft <= 1 ? "admin-days--warn" : ""}`}>
                    ⏱ {formatSisa(k)}
                  </span>
                </div>
                <div className="admin-key-card-meta">
                  <span>📅 Exp: {formatDate(k.expires_at)}</span>
                  {k.note && <span>👤 {k.note}</span>}
                  <span>🗓 {k.duration_days} hari total</span>
                </div>
                <div className="admin-key-card-actions">
                  {/* Perpanjang */}
                  {extendTarget === k.key ? (
                    <div className="admin-extend-row">
                      <select className="admin-input admin-input--sm" value={extendDays}
                        onChange={(e) => setExtendDays(Number(e.target.value))}>
                        <option value={1}>+1 Hari</option>
                        <option value={7}>+7 Hari</option>
                        <option value={30}>+30 Hari</option>
                      </select>
                      <button className="admin-btn-primary admin-btn--sm"
                        onClick={() => extendKey(k.key)} disabled={extendLoading}>
                        {extendLoading ? "..." : "Perpanjang"}
                      </button>
                      <button className="admin-btn-ghost admin-btn--sm"
                        onClick={() => { setExtendTarget(null); setExtendMsg(""); }}>
                        Batal
                      </button>
                      {extendMsg && <span style={{fontSize:12, color: extendMsg.startsWith("✓") ? "#4ade80" : "#ff6b7a"}}>{extendMsg}</span>}
                    </div>
                  ) : (
                    <button className="admin-btn-ghost admin-btn--sm"
                      onClick={() => { setExtendTarget(k.key); setExtendMsg(""); }}>
                      ⏫ Perpanjang
                    </button>
                  )}
                  <button className="admin-btn-danger admin-btn--sm" onClick={() => deactivate(k.key)}>
                    🚫 Nonaktifkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Key Expired/Nonaktif ── */}
      {inactiveKeys.length > 0 && (
        <div className="admin-section">
          <h2>❌ Expired / Nonaktif ({inactiveKeys.length})</h2>
          <div className="admin-key-cards admin-key-cards--dim">
            {inactiveKeys.map((k) => (
              <div key={k.key} className="admin-key-card admin-key-card--dim">
                <div className="admin-key-card-top">
                  <code className="admin-key-cell">{k.key}</code>
                  <span className="admin-tag-inactive">{k.is_expired ? "Expired" : "Dinonaktifkan"}</span>
                </div>
                <div className="admin-key-card-meta">
                  <span>📅 Exp: {formatDate(k.expires_at)}</span>
                  {k.note && <span>👤 {k.note}</span>}
                </div>
                {/* Bisa reaktifkan dengan perpanjang */}
                <div className="admin-key-card-actions">
                  {extendTarget === k.key ? (
                    <div className="admin-extend-row">
                      <select className="admin-input admin-input--sm" value={extendDays}
                        onChange={(e) => setExtendDays(Number(e.target.value))}>
                        <option value={1}>+1 Hari</option>
                        <option value={7}>+7 Hari</option>
                        <option value={30}>+30 Hari</option>
                      </select>
                      <button className="admin-btn-primary admin-btn--sm"
                        onClick={() => extendKey(k.key)} disabled={extendLoading}>
                        {extendLoading ? "..." : "Aktifkan & Perpanjang"}
                      </button>
                      <button className="admin-btn-ghost admin-btn--sm"
                        onClick={() => { setExtendTarget(null); setExtendMsg(""); }}>Batal</button>
                      {extendMsg && <span style={{fontSize:12}}>{extendMsg}</span>}
                    </div>
                  ) : (
                    <button className="admin-btn-ghost admin-btn--sm"
                      onClick={() => { setExtendTarget(k.key); setExtendMsg(""); }}>
                      ♻️ Aktifkan Kembali
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
