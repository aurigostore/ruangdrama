"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import DramaCard from "@/components/DramaCard";
import { getFavorites, removeFavorite } from "@/lib/watchlist";
import type { Drama } from "@/lib/api";

export default function WatchlistPage() {
  const [favorites, setFavorites] = useState<Drama[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-0)", margin: 0 }}>
            ❤️ Watchlist
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", marginTop: 6 }}>
            {favorites.length > 0 ? `${favorites.length} drama tersimpan` : "Belum ada drama yang disimpan"}
          </p>
        </div>
        {favorites.length > 0 && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
            onClick={() => {
              localStorage.removeItem("dracin_watchlist");
              setFavorites([]);
            }}
          >
            Hapus Semua
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="state-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <h3>Watchlist Kosong</h3>
          <p>Tekan ❤️ di card drama untuk menyimpannya di sini</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
            Jelajahi Drama
          </Link>
        </div>
      ) : (
        <div className="drama-grid">
          {favorites.map((drama) => (
            <DramaCard key={drama.id} drama={drama} />
          ))}
        </div>
      )}
    </main>
  );
}
