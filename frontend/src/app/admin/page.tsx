"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface KeyRow {
  id: number;
  key: string;
  duration_hours: number;
  created_at: string;
  expires_at: string;
  is_active: number;
  is_expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  note: string;
  login_count: number;
  last_used_at: string | null;
}

interface UsageLog {
  id: number;
  key: string;
  used_at: string;
  ip: string;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  created_at: string;
  is_active: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"keys" | "broadcast">("keys");

  const [keys, setKeys] = useState<KeyRow[]>([]);

  // Generate
  const [genDays, setGenDays] = useState(7);
  const [genHours, setGenHours] = useState(0);
  const [genNote, setGenNote] = useState("");
  const [newKey, setNewKey] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [copied, setCopied] = useState(false);

  // Custom key
  const [customKeyName, setCustomKeyName] = useState("");
  const [customDays, setCustomDays] = useState(7);
  const [customHours, setCustomHours] = useState(0);
  const [customNote, setCustomNote] = useState("");
  const [customResult, setCustomResult] = useState<{key?: string; error?: string} | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customCopied, setCustomCopied] = useState(false);

  // Extend
  const [extendTarget, setExtendTarget] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [extendHours, setExtendHours] = useState(0);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendMsg, setExtendMsg] = useState("");

  // Key usage logs
  const [openLogs, setOpenLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API}/api/auth/admin/keys`, {
      headers: { "x-admin-password": password },
    });
    const json = await res.json();
    if (json.success) {
      setAuthed(true);
      setKeys(json.keys);
      loadNotifications();
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

  async function loadNotifications() {
    const res = await fetch(`${API}/api/auth/admin/notifications`, {
      headers: { "x-admin-password": password },
    });
    const json = await res.json();
    if (json.success) setNotifications(json.notifications);
  }

  async function generateKey() {
    setGenLoading(true); setNewKey(""); setGenError("");
    try {
      const res = await fetch(`${API}/api/auth/admin/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ durationDays: genDays, durationHours: genHours, note: genNote }),
      });
      const json = await res.json();
      if (json.success) { setNewKey(json.key); setGenNote(""); loadKeys(); }
      else { setGenError(json.error || json.reason || "Gagal generate key"); }
    } catch (e) {
      setGenError("Tidak bisa terhubung ke backend");
    } finally {
      setGenLoading(false);
    }
  }

  async function generateCustomKey() {
    setCustomLoading(true); setCustomResult(null);
    const res = await fetch(`${API}/api/auth/admin/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ durationDays: customDays, durationHours: customHours, note: customNote, customKey: customKeyName }),
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
      body: JSON.stringify({ key: keyStr, days: extendDays, hours: extendHours }),
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

  async function openKeyLogs(key: string) {
    if (openLogs === key) { setOpenLogs(null); return; }
    setOpenLogs(key);
    setLogsLoading(true);
    const res = await fetch(`${API}/api/auth/admin/keys/${key}/logs`, {
      headers: { "x-admin-password": password },
    });
    const json = await res.json();
    setLogsLoading(false);
    if (json.success) setLogs(json.logs);
  }

  async function createNotification() {
    if (!notifTitle || !notifBody) return;
    setNotifLoading(true); setNotifMsg("");
    const res = await fetch(`${API}/api/auth/admin/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ title: notifTitle, body: notifBody }),
    });
    const json = await res.json();
    setNotifLoading(false);
    if (json.success) {
      setNotifTitle(""); setNotifBody("");
      setNotifMsg("✓ Notifikasi berhasil dikirim!");
      loadNotifications();
    } else {
      setNotifMsg("Gagal mengirim notifikasi");
    }
  }

  async function deleteNotification(id: number) {
    if (!confirm("Hapus notifikasi ini?")) return;
    await fetch(`${API}/api/auth/admin/notifications/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    loadNotifications();
  }

  async function toggleNotification(id: number) {
    await fetch(`${API}/api/auth/admin/notifications/${id}/toggle`, {
      method: "PATCH",
      headers: { "x-admin-password": password },
    });
    loadNotifications();
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

  function formatDurationHours(h: number) {
    const days = Math.floor(h / 24);
    const hrs = h % 24;
    if (days > 0 && hrs > 0) return `${days}h ${hrs}j`;
    if (days > 0) return `${days} hari`;
    return `${hrs} jam`;
  }

  // ── Duration input component ─────────────────────────────
  function DurationInput({
    days, hours, onDays, onHours,
  }: { days: number; hours: number; onDays: (d: number) => void; onHours: (h: number) => void }) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number" className="admin-input" min={0} max={3650}
            value={days} onChange={(e) => onDays(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ width: 72, flex: "none", minWidth: "auto" }}
          />
          <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>hari</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number" className="admin-input" min={0} max={23}
            value={hours} onChange={(e) => onHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
            style={{ width: 64, flex: "none", minWidth: "auto" }}
          />
          <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>jam</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          = {formatDurationHours(days * 24 + hours)}
        </span>
      </div>
    );
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

      {/* ── Sub-Menu Navigation Tab ── */}
      <div className="admin-nav">
        <button
          className={`admin-nav-btn${activeTab === "keys" ? " admin-nav-btn--active" : ""}`}
          onClick={() => setActiveTab("keys")}
        >
          🔑 Kelola Key VIP
        </button>
        <button
          className={`admin-nav-btn${activeTab === "broadcast" ? " admin-nav-btn--active" : ""}`}
          onClick={() => setActiveTab("broadcast")}
        >
          📢 Broadcast Notifikasi
        </button>
      </div>

      {activeTab === "keys" && (
        <>
          {/* ── Generate Key Acak ── */}
          <div className="admin-section">
            <h2>🔑 Generate Key Acak</h2>
            <div className="admin-gen-col">
              <div className="admin-gen-row" style={{ flexWrap: "wrap" }}>
                <DurationInput
                  days={genDays} hours={genHours}
                  onDays={setGenDays} onHours={setGenHours}
                />
                <input type="text" className="admin-input" placeholder="Catatan (nama pembeli) — opsional"
                  value={genNote} onChange={(e) => setGenNote(e.target.value)} />
                <button className="admin-btn-primary" onClick={generateKey} disabled={genLoading || (genDays === 0 && genHours === 0)}>
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
              {genError && (
                <p className="admin-error" style={{ marginTop: 8 }}>❌ {genError}</p>
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
              <div className="admin-gen-row" style={{ flexWrap: "wrap" }}>
                <input type="text" className="admin-input admin-key-text"
                  placeholder="Nama key (A-Z, 0-9, strip)"
                  value={customKeyName}
                  onChange={(e) => setCustomKeyName(e.target.value.toUpperCase())}
                  maxLength={20} style={{letterSpacing:"1px"}}
                />
                <DurationInput
                  days={customDays} hours={customHours}
                  onDays={setCustomDays} onHours={setCustomHours}
                />
                <input type="text" className="admin-input" placeholder="Catatan — opsional"
                  value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
                <button className="admin-btn-primary" onClick={generateCustomKey} disabled={customLoading || !customKeyName || (customDays === 0 && customHours === 0)}>
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
                      <span>🕒 {formatDurationHours(k.duration_hours)} total</span>
                      <span title="Jumlah login" style={{ color: k.login_count > 0 ? "#a78bfa" : "var(--text-3)" }}>
                        🔑 {k.login_count}× login
                        {k.last_used_at && ` · terakhir ${formatDate(k.last_used_at)}`}
                      </span>
                    </div>
                    <div className="admin-key-card-actions">
                      {/* Perpanjang */}
                      {extendTarget === k.key ? (
                        <div className="admin-extend-row" style={{ flexDirection: "column", gap: 8 }}>
                          <DurationInput
                            days={extendDays} hours={extendHours}
                            onDays={setExtendDays} onHours={setExtendHours}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="admin-btn-primary admin-btn--sm"
                              onClick={() => extendKey(k.key)} disabled={extendLoading || (extendDays === 0 && extendHours === 0)}>
                              {extendLoading ? "..." : "Perpanjang"}
                            </button>
                            <button className="admin-btn-ghost admin-btn--sm"
                              onClick={() => { setExtendTarget(null); setExtendMsg(""); }}>
                              Batal
                            </button>
                            {extendMsg && <span style={{fontSize:12, color: extendMsg.startsWith("✓") ? "#4ade80" : "#ff6b7a"}}>{extendMsg}</span>}
                          </div>
                        </div>
                      ) : (
                        <button className="admin-btn-ghost admin-btn--sm"
                          onClick={() => { setExtendTarget(k.key); setExtendMsg(""); }}>
                          ⏫ Perpanjang
                        </button>
                      )}
                      <button className="admin-btn-ghost admin-btn--sm" onClick={() => openKeyLogs(k.key)}>
                        🔍 {openLogs === k.key ? "Tutup Log" : `Log (${k.login_count})`}
                      </button>
                      <button className="admin-btn-danger admin-btn--sm" onClick={() => deactivate(k.key)}>
                        🚫 Nonaktifkan
                      </button>
                    </div>

                    {/* Log expandable */}
                    {openLogs === k.key && (
                      <div className="admin-key-logs">
                        {logsLoading ? (
                          <p style={{ fontSize: 12, color: "var(--text-3)" }}>Memuat log...</p>
                        ) : logs.length === 0 ? (
                          <p style={{ fontSize: 12, color: "var(--text-3)" }}>Belum ada log penggunaan.</p>
                        ) : (
                          <table className="admin-log-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Waktu</th>
                                <th>IP Address</th>
                              </tr>
                            </thead>
                            <tbody>
                              {logs.map((log, i) => (
                                <tr key={log.id}>
                                  <td>{i + 1}</td>
                                  <td>{formatDate(log.used_at)}</td>
                                  <td><code>{log.ip || "—"}</code></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
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
                      <span style={{ color: "var(--text-3)" }}>🔑 {k.login_count}× login</span>
                    </div>
                    <div className="admin-key-card-actions">
                      {extendTarget === k.key ? (
                        <div className="admin-extend-row" style={{ flexDirection: "column", gap: 8 }}>
                          <DurationInput
                            days={extendDays} hours={extendHours}
                            onDays={setExtendDays} onHours={setExtendHours}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="admin-btn-primary admin-btn--sm"
                              onClick={() => extendKey(k.key)} disabled={extendLoading || (extendDays === 0 && extendHours === 0)}>
                              {extendLoading ? "..." : "Aktifkan & Perpanjang"}
                            </button>
                            <button className="admin-btn-ghost admin-btn--sm"
                              onClick={() => { setExtendTarget(null); setExtendMsg(""); }}>Batal</button>
                            {extendMsg && <span style={{fontSize:12}}>{extendMsg}</span>}
                          </div>
                        </div>
                      ) : (
                        <button className="admin-btn-ghost admin-btn--sm"
                          onClick={() => { setExtendTarget(k.key); setExtendMsg(""); }}>
                          ♻️ Aktifkan Kembali
                        </button>
                      )}
                      <button className="admin-btn-ghost admin-btn--sm" onClick={() => openKeyLogs(k.key)}>
                        🔍 {openLogs === k.key ? "Tutup Log" : `Log (${k.login_count})`}
                      </button>
                    </div>

                    {/* Log expandable */}
                    {openLogs === k.key && (
                      <div className="admin-key-logs">
                        {logsLoading ? (
                          <p style={{ fontSize: 12, color: "var(--text-3)" }}>Memuat log...</p>
                        ) : logs.length === 0 ? (
                          <p style={{ fontSize: 12, color: "var(--text-3)" }}>Belum ada log penggunaan.</p>
                        ) : (
                          <table className="admin-log-table">
                            <thead>
                              <tr><th>#</th><th>Waktu</th><th>IP Address</th></tr>
                            </thead>
                            <tbody>
                              {logs.map((log, i) => (
                                <tr key={log.id}>
                                  <td>{i + 1}</td>
                                  <td>{formatDate(log.used_at)}</td>
                                  <td><code>{log.ip || "—"}</code></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "broadcast" && (
        <>
          {/* ── Broadcast Notifikasi ── */}
          <div className="admin-section">
            <h2>📢 Broadcast Notifikasi</h2>
            <p style={{fontSize:13, color:"var(--text-3)", marginBottom:12}}>
              Notifikasi akan tampil di halaman Profil semua user yang login.
            </p>
            <div className="admin-gen-col">
              <div className="admin-gen-row" style={{ flexDirection: "column", gap: 8 }}>
                <input type="text" className="admin-input" placeholder="Judul notifikasi"
                  value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} />
                <textarea className="admin-input" placeholder="Isi pesan..."
                  value={notifBody} onChange={(e) => setNotifBody(e.target.value)}
                  rows={3} style={{ resize: "vertical", minHeight: 72 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="admin-btn-primary" onClick={createNotification}
                    disabled={notifLoading || !notifTitle || !notifBody}>
                    {notifLoading ? "Mengirim..." : "📤 Kirim Broadcast"}
                  </button>
                  {notifMsg && <span style={{ fontSize: 12, color: notifMsg.startsWith("✓") ? "#4ade80" : "#ff6b7a" }}>{notifMsg}</span>}
                </div>
              </div>
            </div>

            {/* List notifikasi */}
            {notifications.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>Notifikasi Tersimpan ({notifications.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notifications.map((n) => (
                    <div key={n.id} className={`admin-notif-item${!n.is_active ? " admin-notif-item--off" : ""}`}>
                      <div className="admin-notif-content">
                        <div className="admin-notif-title">{n.title}</div>
                        <div className="admin-notif-body">{n.body}</div>
                        <div className="admin-notif-meta">{formatDate(n.created_at)} · {n.is_active ? "✅ Aktif" : "⏸ Nonaktif"}</div>
                      </div>
                      <div className="admin-notif-actions">
                        <button className="admin-btn-ghost admin-btn--sm" onClick={() => toggleNotification(n.id)}>
                          {n.is_active ? "⏸ Nonaktifkan" : "▶ Aktifkan"}
                        </button>
                        <button className="admin-btn-danger admin-btn--sm" onClick={() => deleteNotification(n.id)}>
                          🗑 Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
