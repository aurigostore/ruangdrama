"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { Drama } from "@/lib/api";
import { isFavorite, toggleFavorite } from "@/lib/watchlist";

interface Props {
  drama: Drama;
}

export default function DramaCard({ drama }: Props) {
  const [fav, setFav] = useState(false);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    setFav(isFavorite(drama.id));
  }, [drama.id]);

  function handleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite(drama);
    setFav(added);
  }

  function handleClick() {
    setClicking(true);
    // Trigger progress bar global
    if (typeof window !== "undefined" && (window as any).__navStart) {
      (window as any).__navStart();
    }
  }

  return (
    <Link href={`/drama/${drama.id}`} className="drama-card" onClick={handleClick}>
      <div className="drama-card-poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={drama.cover}
          alt={drama.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.jpg";
          }}
        />

        {/* Loading overlay saat diklik */}
        {clicking && (
          <div className="drama-card-loading">
            <div className="drama-card-spinner" />
          </div>
        )}

        {drama.isCompleted && (
          <span className="drama-card-badge">Tamat</span>
        )}
        <span className="drama-card-eps">{drama.totalEpisodes} Eps</span>

        {/* Tombol Favorit */}
        <button
          className={`drama-card-fav${fav ? " drama-card-fav--active" : ""}`}
          onClick={handleFav}
          title={fav ? "Hapus dari Watchlist" : "Tambah ke Watchlist"}
          aria-label={fav ? "Hapus dari Watchlist" : "Tambah ke Watchlist"}
        >
          {fav ? "❤️" : "🤍"}
        </button>
      </div>
      <div className="drama-card-info">
        <div className="drama-card-title">{drama.title}</div>
        <div className="drama-card-meta">
          {(drama.categories ?? drama.tags ?? []).slice(0, 2).join(" · ") || "Drama"}
        </div>
      </div>
    </Link>
  );
}
