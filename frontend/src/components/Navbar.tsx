"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
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

  // Tutup semua dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
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
      setMenuOpen(false);
    }
  }

  function handleLogout() {
    setMenuOpen(false);
    setProfileOpen(false);
    if (!confirm("Keluar dari Ruang Drama? Key kamu masih aktif dan bisa dipakai lagi.")) return;
    localStorage.removeItem("rd_key");
    localStorage.removeItem("rd_expires");
    localStorage.removeItem("rd_info");
    router.push("/login");
  }

  const sisa = keyInfo ? formatSisa(keyInfo) : null;
  const showBell = sisa?.warning ?? false;
  const waMsg = encodeURIComponent("Halo Admin, saya ingin perpanjang akses Ruang Drama 🙏");

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
            onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }}
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
              {sisa?.warning ? (
                <>
                  <div className="nb-bell-icon">{sisa.urgent ? "⚠️" : "🕐"}</div>
                  <div className="nb-bell-title">Akses hampir habis!</div>
                  <div className="nb-bell-text">
                    Key kamu habis dalam <strong style={{ color: sisa.urgent ? "#e63946" : "#facc15" }}>{sisa.text}</strong>
                  </div>
                  <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                    className="nb-bell-btn" onClick={() => setBellOpen(false)}>
                    Perpanjang via WA →
                  </a>
                </>
              ) : (
                <>
                  <div className="nb-bell-icon">✅</div>
                  <div className="nb-bell-title">Akses aktif</div>
                  <div className="nb-bell-text">Tidak ada notifikasi saat ini.</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 👑 Profil VIP */}
        <div className="nb-icon-wrap" ref={profileRef}>
          <button
            className={`nb-vip-btn${sisa?.warning ? " nb-vip-btn--warn" : ""}`}
            onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }}
            aria-label="Profil VIP"
          >
            <span className="nb-vip-crown">👑</span>
            <span className="nb-vip-label">VIP</span>
            {showBell && <span className="nb-bullet nb-bullet--vip" />}
          </button>
          {profileOpen && keyInfo && (
            <div className="nb-dropdown nb-profile-dropdown">
              <div className="nb-profile-header">
                <div className="nb-profile-crown">👑</div>
                <div>
                  <div className="nb-profile-name">{keyInfo.note || "VIP Member"}</div>
                  <div className="nb-profile-badge">VIP Member</div>
                </div>
              </div>
              <div className="nb-profile-divider" />
              <div className="nb-profile-rows">
                <div className="nb-profile-row">
                  <span className="nb-profile-row-label">📅 Aktif sejak</span>
                  <span className="nb-profile-row-val">{formatDate(keyInfo.createdAt)}</span>
                </div>
                <div className="nb-profile-row">
                  <span className="nb-profile-row-label">⏳ Expired</span>
                  <span className="nb-profile-row-val">{formatDate(keyInfo.expiresAt)}</span>
                </div>
                <div className="nb-profile-row">
                  <span className="nb-profile-row-label">⏱ Sisa</span>
                  <span className="nb-profile-row-val" style={{
                    color: sisa?.urgent ? "#e63946" : sisa?.warning ? "#facc15" : "#4ade80",
                    fontWeight: 700,
                  }}>
                    {sisa?.text ?? "—"}
                  </span>
                </div>
              </div>
              <div className="nb-profile-divider" />
              <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                className="nb-profile-extend" onClick={() => setProfileOpen(false)}>
                🔄 Perpanjang Akses
              </a>
              <button className="nb-profile-logout" onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: search + kebab */}
      <div className="navbar-mobile-actions">
        <button className="navbar-icon-btn" onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }} aria-label="Cari">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Mobile kebab (⋮) */}
        <div className="navbar-kebab-wrap" ref={menuRef}>
          <button className="navbar-icon-btn" style={{ position: "relative" }}
            onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            {showBell && <span className="nb-bullet" style={{ top: 2, right: 2 }} />}
          </button>

          {menuOpen && (
            <div className="navbar-dropdown">
              {/* Info VIP mini */}
              {keyInfo && (
                <div className="nb-mobile-vip">
                  <span className="nb-vip-crown">👑</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{keyInfo.note || "VIP Member"}</div>
                    <div style={{ fontSize: 11, color: sisa?.urgent ? "#e63946" : sisa?.warning ? "#facc15" : "#4ade80" }}>
                      Sisa {sisa?.text ?? "—"}
                    </div>
                  </div>
                </div>
              )}
              <div className="navbar-dropdown-divider" />
              <Link href="/watchlist" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                <span>❤️</span> Watchlist
              </Link>
              {keyInfo && (
                <a href={`https://wa.me/${WA}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                  className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                  <span>🔄</span> Perpanjang Akses
                </a>
              )}
              <div className="navbar-dropdown-divider" />
              <button className="navbar-dropdown-item navbar-dropdown-item--danger" onClick={handleLogout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Keluar
              </button>
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
