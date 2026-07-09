"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const WA = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface KeyInfo {
  note: string;
  createdAt: string;
  expiresAt: string;
  daysLeft: number | null;
  hoursLeft: number | null;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatSisa(info: KeyInfo): { text: string; urgent: boolean; warning: boolean; percent: number } {
  const ms = new Date(info.expiresAt).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", urgent: true, warning: true, percent: 0 };

  // Hitung total durasi dari createdAt ke expiresAt
  const total = new Date(info.expiresAt).getTime() - new Date(info.createdAt).getTime();
  const percent = Math.max(0, Math.min(100, (ms / total) * 100));

  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor(ms / 60000);

  if (days >= 1) {
    const text = hours > 0 ? `${days} hari ${hours} jam lagi` : `${days} hari lagi`;
    return { text, urgent: false, warning: days <= 3, percent };
  }
  if (hours >= 1) return { text: `${hours} jam lagi`, urgent: hours < 6, warning: true, percent };
  return { text: `${minutes} menit lagi`, urgent: true, warning: true, percent };
}

function maskKey(key: string) {
  if (!key) return "—";
  // Tampilkan 6 karakter pertama dan 4 terakhir
  if (key.length <= 10) return key;
  return key.slice(0, 6) + "****" + key.slice(-4);
}

export default function ProfilePage() {
  const router = useRouter();
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [keyStr, setKeyStr] = useState<string>("");
  const [showFullKey, setShowFullKey] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("rd_info");
    const key = localStorage.getItem("rd_key");
    if (!raw || !key) {
      router.push("/login");
      return;
    }
    try {
      setKeyInfo(JSON.parse(raw));
      setKeyStr(key);
    } catch {
      router.push("/login");
    }

    // Load notifikasi
    fetch(`${API}/api/notifications`)
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
      })
      .catch(() => {});

    // Load read IDs
    const ids = JSON.parse(localStorage.getItem("rd_read_notifs") || "[]");
    setReadIds(ids);
  }, [router]);

  function handleLogout() {
    if (!confirm("Keluar dari Ruang Drama? Key kamu masih aktif dan bisa dipakai lagi.")) return;
    localStorage.removeItem("rd_key");
    localStorage.removeItem("rd_expires");
    localStorage.removeItem("rd_info");
    router.push("/login");
  }

  function markAllRead() {
    const ids = notifications.map((n) => n.id);
    const merged = Array.from(new Set([...readIds, ...ids]));
    localStorage.setItem("rd_read_notifs", JSON.stringify(merged));
    setReadIds(merged);
  }

  function copyKey() {
    navigator.clipboard.writeText(keyStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!keyInfo) return null;

  const sisa = formatSisa(keyInfo);
  const waMsg = encodeURIComponent("Halo Admin, saya ingin perpanjang akses Ruang Drama 🙏");
  const unreadNotifs = notifications.filter((n) => !readIds.includes(n.id));

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 40, maxWidth: 560 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none", fontSize: 13 }}>← Kembali</Link>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-0)", margin: 0 }}>Profil</h1>
      </div>

      {/* VIP Card */}
      <div className="profile-card">
        <div className="profile-card__bg" />
        <div className="profile-card__inner">
          <div className="profile-card__avatar">
            <span style={{ fontSize: 36 }}>👑</span>
          </div>
          <div className="profile-card__info">
            <div className="profile-card__name">{keyInfo.note || "VIP Member"}</div>
            <div className="profile-card__badge">
              <span className={`profile-badge ${sisa.urgent ? "profile-badge--expired" : "profile-badge--active"}`}>
                {sisa.urgent ? "⚠ EXPIRED" : "✦ VIP AKTIF"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar durasi */}
        <div className="profile-card__progress-wrap">
          <div className="profile-card__progress-label">
            <span>Sisa akses</span>
            <span style={{ color: sisa.urgent ? "#e63946" : sisa.warning ? "#facc15" : "#4ade80", fontWeight: 700 }}>
              {sisa.text}
            </span>
          </div>
          <div className="profile-card__progress-bar">
            <div
              className="profile-card__progress-fill"
              style={{
                width: `${sisa.percent}%`,
                background: sisa.urgent ? "#e63946" : sisa.warning ? "#facc15" : "linear-gradient(90deg, #a855f7, #e63946)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Detail Info */}
      <div className="profile-section">
        <h2 className="profile-section__title">Detail Akun</h2>
        <div className="profile-rows">
          <div className="profile-row">
            <span className="profile-row__label">🔑 Key Akses</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <code className="profile-row__key">
                {showFullKey ? keyStr : maskKey(keyStr)}
              </code>
              <button
                className="profile-row__btn"
                onClick={() => setShowFullKey(!showFullKey)}
                title={showFullKey ? "Sembunyikan" : "Tampilkan"}
              >
                {showFullKey ? "🙈" : "👁"}
              </button>
              <button className="profile-row__btn" onClick={copyKey} title="Salin key">
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div>
          <div className="profile-row">
            <span className="profile-row__label">📅 Aktif sejak</span>
            <span className="profile-row__val">{formatDate(keyInfo.createdAt)}</span>
          </div>
          <div className="profile-row">
            <span className="profile-row__label">⏳ Expired pada</span>
            <span className="profile-row__val">{formatDate(keyInfo.expiresAt)}</span>
          </div>
          <div className="profile-row">
            <span className="profile-row__label">⏱ Sisa waktu</span>
            <span className="profile-row__val" style={{
              color: sisa.urgent ? "#e63946" : sisa.warning ? "#facc15" : "#4ade80",
              fontWeight: 700,
            }}>
              {sisa.text}
            </span>
          </div>
        </div>
      </div>

      {/* Notifikasi */}
      {notifications.length > 0 && (
        <div className="profile-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 className="profile-section__title" style={{ margin: 0 }}>
              🔔 Notifikasi
              {unreadNotifs.length > 0 && (
                <span className="profile-notif-badge">{unreadNotifs.length}</span>
              )}
            </h2>
            {unreadNotifs.length > 0 && (
              <button className="profile-row__btn" onClick={markAllRead} style={{ fontSize: 11, padding: "3px 8px" }}>
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`profile-notif-item${!readIds.includes(n.id) ? " profile-notif-item--unread" : ""}`}
                onClick={() => {
                  const merged = Array.from(new Set([...readIds, n.id]));
                  localStorage.setItem("rd_read_notifs", JSON.stringify(merged));
                  setReadIds(merged);
                }}
              >
                <div className="profile-notif-title">{n.title}</div>
                <div className="profile-notif-body">{n.body}</div>
                <div className="profile-notif-time">
                  {new Date(n.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <a
          href={`https://wa.me/${WA}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ justifyContent: "center", gap: 8 }}
        >
          🔄 Perpanjang Akses via WhatsApp
        </a>
        <button
          className="btn btn-secondary"
          onClick={handleLogout}
          style={{ justifyContent: "center", gap: 8, color: "#e63946", borderColor: "#e6394640" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Keluar
        </button>
      </div>
    </main>
  );
}
