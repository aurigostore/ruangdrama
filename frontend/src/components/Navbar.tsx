"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, Suspense, useCallback } from "react";

const WA = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

interface KeyInfo {
  note: string;
  createdAt: string;
  expiresAt: string;
  daysLeft: number | null;
  hoursLeft: number | null;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatSisa(info: KeyInfo): { text: string; urgent: boolean; warning: boolean } {
  const ms = new Date(info.expiresAt).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", urgent: true, warning: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000);
  if (days >= 1) return { text: `${days} hari lagi`, urgent: false, warning: days <= 1 };
  if (hours >= 1) return { text: `${hours} jam lagi`, urgent: hours < 6, warning: true };
  return { text: `${minutes} menit lagi`, urgent: true, warning: true };
}

function NavbarInner() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [broadcasts, setBroadcasts] = useState<{ id: number; title: string; body: string; created_at: string }[]>([]);
  const [lastReadTime, setLastReadTime] = useState<number>(0);

  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load key info dari localStorage
  useEffect(() => {
    function loadInfo() {
      try {
        const raw = localStorage.getItem("rd_info");
        if (raw) setKeyInfo(JSON.parse(raw));
      } catch {}
    }
    loadInfo();
    // Update setiap 60 detik
    const iv = setInterval(loadInfo, 60000);
    return () => clearInterval(iv);
  }, []);

  // Fetch broadcast notifications dari backend
  useEffect(() => {
    function loadBroadcasts() {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/notifications`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setBroadcasts(json.notifications || []);
        })
        .catch(() => {});
    }
    loadBroadcasts();
    // Poll broadcast baru setiap 2 menit
    const iv = setInterval(loadBroadcasts, 120000);
    return () => clearInterval(iv);
  }, []);

  // Load last read timestamp dari localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rd_last_read_time");
      if (saved) setLastReadTime(parseInt(saved));
    } catch {}
  }, []);

  const markAsRead = useCallback(() => {
    if (broadcasts.length === 0) return;
    const newestTime = Math.max(...broadcasts.map((b) => new Date(b.created_at).getTime()));
    if (newestTime > lastReadTime) {
      localStorage.setItem("rd_last_read_time", String(newestTime));
      setLastReadTime(newestTime);
    }
  }, [broadcasts, lastReadTime]);

  // Tutup bell dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
    }
  }

  function handleLogout() {
    if (!confirm("Keluar dari Ruang Drama? Key kamu masih aktif dan bisa dipakai lagi.")) return;
    localStorage.removeItem("rd_key");
    localStorage.removeItem("rd_expires");
    localStorage.removeItem("rd_info");
    router.push("/login");
  }

  const sisa = keyInfo ? formatSisa(keyInfo) : null;
  const hasUnreadBroadcast = broadcasts.some((b) => new Date(b.created_at).getTime() > lastReadTime);
  const showBell = (sisa?.warning ?? false) || hasUnreadBroadcast;
  const waMsg = encodeURIComponent("Halo Admin, saya ingin perpanjang akses Ruang Drama 🙏");

  // Helper untuk me-render isi dropdown lonceng notifikasi secara dinamis
  const renderBellDropdownContent = () => {
    const hasWarnings = sisa?.warning;
    const hasBroadcasts = broadcasts.length > 0;

    if (!hasWarnings && !hasBroadcasts) {
      return (
        <>
          <div className="nb-bell-icon">✅</div>
          <div className="nb-bell-title">Akses aktif</div>
          <div className="nb-bell-text">Tidak ada notifikasi saat ini.</div>
        </>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {/* Notifikasi Peringatan VIP */}
        {hasWarnings && (
          <div style={{ textAlign: "center", paddingBottom: 10, borderBottom: hasBroadcasts ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
            <div className="nb-bell-icon">{sisa.urgent ? "⚠️" : "🕐"}</div>
            <div className="nb-bell-title">Akses hampir habis!</div>
            <div className="nb-bell-text">
              Key kamu habis dalam <strong style={{ color: sisa.urgent ? "#e63946" : "#facc15" }}>{sisa.text}</strong>
            </div>
            <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
              className="nb-bell-btn" onClick={() => setBellOpen(false)}>
              Perpanjang via WA →
            </a>
          </div>
        )}

        {/* Notifikasi Broadcast Admin */}
        {hasBroadcasts && (
          <div className="nb-broadcast-list">
            <div className="nb-broadcast-header">Pengumuman</div>
            {broadcasts.map((b) => (
              <div key={b.id} className="nb-broadcast-item">
                <div className="nb-broadcast-title">{b.title}</div>
                <div className="nb-broadcast-body">{b.body}</div>
                <div className="nb-broadcast-date">
                  {new Date(b.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link href="/" className="navbar-logo">
        <Image
          src="/logo.png"
          alt="RUANG DRAMA"
          width={160} height={44}
          style={{ objectFit: "contain", objectPosition: "left" }}
          priority
        />
      </Link>

      {/* Desktop: search bar */}
      <form className="navbar-search navbar-search--desktop" onSubmit={handleSearch}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search" placeholder="Cari drama..."
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {/* Desktop: actions */}
      <div className="navbar-desktop-actions">
        <Link href="/watchlist" className="nav-link nav-link--heart" title="Watchlist">
          ❤️ <span>Watchlist</span>
        </Link>

        {/* 🔔 Bell */}
        <div className="nb-icon-wrap" ref={bellRef}>
          <button
            className="nb-icon-btn"
            onClick={() => { 
              const nextState = !bellOpen;
              setBellOpen(nextState);
              if (nextState) markAsRead();
            }}
            aria-label="Notifikasi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {showBell && <span className="nb-bullet" />}
          </button>
          {bellOpen && (
            <div className="nb-dropdown nb-bell-dropdown">
              {renderBellDropdownContent()}
            </div>
          )}
        </div>

        {/* 👑 Profil VIP */}
        <div className="nb-icon-wrap">
          <Link
            href="/profile"
            className={`nb-vip-btn${sisa?.warning ? " nb-vip-btn--warn" : ""}`}
            aria-label="Profil VIP"
          >
            <span className="nb-vip-crown">👑</span>
            <span className="nb-vip-label">VIP</span>
            {(sisa?.warning ?? false) && <span className="nb-bullet nb-bullet--vip" />}
          </Link>
        </div>
      </div>

      {/* Mobile: search icon saja — navigasi lain ada di BottomNav */}
      <div className="navbar-mobile-actions">
        <button className="navbar-icon-btn" onClick={() => { setSearchOpen(!searchOpen); }} aria-label="Cari">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Bell notifikasi di mobile */}
        <div className="nb-icon-wrap" ref={bellRef}>
          <button
            className="nb-icon-btn"
            onClick={() => { 
              const nextState = !bellOpen;
              setBellOpen(nextState); 
              if (nextState) markAsRead();
            }}
            aria-label="Notifikasi"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {showBell && <span className="nb-bullet" style={{ top: 2, right: 2 }} />}
          </button>
          {bellOpen && (
            <div className="nb-dropdown nb-bell-dropdown">
              {renderBellDropdownContent()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile search bar (expandable) */}
      {searchOpen && (
        <div className="navbar-search-mobile">
          <form onSubmit={handleSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              type="search" placeholder="Cari drama..."
              value={q} onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <button type="button" onClick={() => setSearchOpen(false)} className="navbar-search-close">✕</button>
          </form>
        </div>
      )}
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={
      <nav className="navbar">
        <Link href="/" className="navbar-logo">
          <Image src="/logo.png" alt="RUANG DRAMA" width={160} height={44} style={{ objectFit: "contain", objectPosition: "left" }} priority />
        </Link>
      </nav>
    }>
      <NavbarInner />
    </Suspense>
  );
}
