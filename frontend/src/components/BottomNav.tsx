"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface KeyInfo {
  expiresAt: string;
}

function formatSisaWarning(info: KeyInfo): boolean {
  const ms = new Date(info.expiresAt).getTime() - Date.now();
  return ms <= 0 || ms < 3 * 24 * 60 * 60 * 1000; // warning jika < 3 hari
}

function BottomNavInner() {
  const pathname = usePathname();
  const [hasWarning, setHasWarning] = useState(false);
  const [hasNotif, setHasNotif] = useState(false);

  useEffect(() => {
    // Cek warning durasi
    try {
      const raw = localStorage.getItem("rd_info");
      if (raw) {
        const info = JSON.parse(raw) as KeyInfo;
        setHasWarning(formatSisaWarning(info));
      }
    } catch {}

    // Cek notif broadcast yang belum dibaca
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const checkNotifs = () => {
      fetch(`${API}/api/notifications`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.notifications?.length) { setHasNotif(false); return; }
          const readIds: number[] = JSON.parse(localStorage.getItem("rd_read_notifs") || "[]");
          const hasUnread = data.notifications.some((n: { id: number }) => !readIds.includes(n.id));
          setHasNotif(hasUnread);
        })
        .catch(() => {});
    };
    checkNotifs();
    const iv = setInterval(checkNotifs, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const showBadge = hasWarning || hasNotif;

  const tabs = [
    {
      href: "/",
      label: "Home",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      active: pathname === "/",
    },
    {
      href: "/search",
      label: "Cari",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"/>
          <path d="m21 21-4.35-4.35" stroke="currentColor"/>
        </svg>
      ),
      active: pathname === "/search",
    },
    {
      href: "/watchlist",
      label: "Favorit",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      active: pathname === "/watchlist",
    },
    {
      href: "/profile",
      label: "Profil",
      badge: showBadge,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
      active: pathname === "/profile",
    },
  ];

  // Sembunyikan di halaman login/admin
  if (pathname === "/login" || pathname?.startsWith("/admin")) return null;

  return (
    <>
      <nav className="bottom-nav" aria-label="Navigasi utama">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-nav__item${tab.active ? " bottom-nav__item--active" : ""}`}
            aria-label={tab.label}
          >
            <span className="bottom-nav__icon" style={{ position: "relative" }}>
              {tab.icon(tab.active)}
              {tab.badge && <span className="bottom-nav__badge" />}
            </span>
            <span className="bottom-nav__label">{tab.label}</span>
          </Link>
        ))}
      </nav>
      {/* Spacer agar konten tidak tertutup bottom nav di mobile */}
      <div className="bottom-nav-spacer" />
    </>
  );
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}
