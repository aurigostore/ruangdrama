"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getProgress, removeProgress, type WatchProgress } from "@/lib/progress";

export default function ContinueWatching() {
  const [items, setItems] = useState<WatchProgress[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(getProgress());
  }, []);

  function scrollRow(dir: "left" | "right") {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  }

  if (items.length === 0) return null;

  return (
    <section className="continue-section">
      <div className="section-header">
        <h2 className="section-title">Lanjut Nonton</h2>
        {/* Scroll arrows — selalu tampil sebagai hint */}
        <div style={{ display: "flex", gap: 6 }}>
          <button className="continue-scroll-btn" onClick={() => scrollRow("left")} aria-label="Scroll kiri">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className="continue-scroll-btn" onClick={() => scrollRow("right")} aria-label="Scroll kanan">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="continue-row" ref={rowRef}>
        {items.map((p) => (
          <div key={p.id} className="continue-card">
            <Link href={`/watch/${p.id}/${p.episode}`} className="continue-card__link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.cover} alt={p.title} className="continue-card__img" />
              <div className="continue-card__overlay">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="continue-card__ep-badge">EP {p.episode}</div>
            </Link>
            <div className="continue-card__info">
              <div className="continue-card__title">{p.title}</div>
              <div className="continue-card__meta">
                <Link href={`/watch/${p.id}/${p.episode}`} className="continue-card__resume">
                  ▶ Lanjut EP {p.episode}
                </Link>
              </div>
            </div>
            <button
              className="continue-card__remove"
              onClick={() => {
                removeProgress(p.id);
                setItems(getProgress());
              }}
              title="Hapus dari riwayat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
