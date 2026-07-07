"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Drama } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SLIDE_INTERVAL = 6000;
const TOTAL_SLIDES = 7;

export default function HeroBanner() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef(false);

  // Ambil campuran drama: dari foryou agar lebih variatif
  useEffect(() => {
    fetch(`${API}/api/dramabox/foryou?page=1`)
      .then((r) => r.json())
      .then((json) => {
        const all: Drama[] = json.items || json.data || [];
        if (all.length === 0) throw new Error("empty");
        // Pilih 7 drama tersebar (bukan hanya 7 pertama)
        const step = Math.floor(all.length / TOTAL_SLIDES);
        const picks: Drama[] = [];
        for (let i = 0; i < TOTAL_SLIDES && i * step < all.length; i++) {
          picks.push(all[i * step]);
        }
        // Fallback jika kurang
        if (picks.length < 3) picks.push(...all.slice(0, TOTAL_SLIDES));
        setDramas(picks.slice(0, TOTAL_SLIDES));
        setLoaded(true);
      })
      .catch(() => {
        // fallback ke trending
        fetch(`${API}/api/dramabox/trending`)
          .then((r) => r.json())
          .then((json) => {
            const data: Drama[] = json.data || [];
            if (data.length > 0) { setDramas(data.slice(0, TOTAL_SLIDES)); setLoaded(true); }
          })
          .catch(() => {});
      });
  }, []);

  const goTo = useCallback((index: number, dir: "next" | "prev" = "next") => {
    if (animRef.current || index === current) return;
    animRef.current = true;
    setDirection(dir);
    setPrev(current);
    setCurrent(index);
    setTimeout(() => {
      setPrev(null);
      animRef.current = false;
    }, 500);
  }, [current]);

  const next = useCallback(() => {
    goTo((current + 1) % dramas.length, "next");
  }, [current, dramas.length, goTo]);

  const goBack = useCallback(() => {
    goTo((current - 1 + dramas.length) % dramas.length, "prev");
  }, [current, dramas.length, goTo]);

  // Auto-slide
  useEffect(() => {
    if (!loaded || dramas.length === 0) return;
    timerRef.current = setTimeout(next, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loaded, current, dramas.length, next]);

  if (!loaded || dramas.length === 0) {
    return <div className="spotlight-banner spotlight-banner--skeleton" />;
  }

  const drama = dramas[current];

  return (
    <div className="spotlight-banner">

      {/* ── Background layers ── */}
      {dramas.map((d, i) => (
        <div
          key={d.id}
          className="spotlight-bg"
          style={{
            backgroundImage: `url(${d.cover})`,
            opacity: i === current ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        />
      ))}

      {/* Overlay gradients */}
      <div className="spotlight-overlay" />

      {/* ── Content ── */}
      <div className="spotlight-content">

        {/* Left — Info */}
        <div className={`spotlight-info${prev !== null ? (direction === "next" ? " spotlight-info--enter" : " spotlight-info--enter-rev") : ""}`} key={current}>
          {/* Slide counter */}
          <div className="spotlight-counter">
            <span className="spotlight-counter__current">{String(current + 1).padStart(2, "0")}</span>
            <span className="spotlight-counter__sep"> / </span>
            <span className="spotlight-counter__total">{String(dramas.length).padStart(2, "0")}</span>
          </div>

          {/* Badges */}
          <div className="spotlight-badges">
            <span className={`spotlight-badge ${drama.isCompleted ? "spotlight-badge--done" : "spotlight-badge--ongoing"}`}>
              {drama.isCompleted ? "✓ Tamat" : "● Ongoing"}
            </span>
            <span className="spotlight-badge spotlight-badge--eps">{drama.totalEpisodes} Episode</span>
            {(drama.tags ?? []).slice(0, 2).map((t) => (
              <span key={t} className="spotlight-badge spotlight-badge--genre">{t}</span>
            ))}
          </div>

          {/* Title */}
          <h2 className="spotlight-title">{drama.title}</h2>

          {/* Synopsis */}
          {drama.synopsis && (
            <p className="spotlight-synopsis">{drama.synopsis}</p>
          )}

          {/* Actions */}
          <div className="spotlight-actions">
            <Link href={`/watch/${drama.id}/1`} className="spotlight-btn spotlight-btn--play">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Tonton Sekarang
            </Link>
            <Link href={`/drama/${drama.id}`} className="spotlight-btn spotlight-btn--info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Info
            </Link>
          </div>

          {/* Arrow Controls */}
          <div className="spotlight-controls">
            <button className="spotlight-arrow" onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); goBack(); }} aria-label="Sebelumnya">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {/* Dots */}
            <div className="spotlight-dots">
              {dramas.map((_, i) => (
                <button
                  key={i}
                  className={`spotlight-dot${i === current ? " spotlight-dot--active" : ""}`}
                  onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); goTo(i); }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <button className="spotlight-arrow" onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); next(); }} aria-label="Berikutnya">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right — Poster */}
        <div className="spotlight-poster-area" key={`poster-${current}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={drama.cover}
            alt={drama.title}
            className="spotlight-poster"
          />
          <div className="spotlight-poster-glow" style={{ background: `radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)` }} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="spotlight-progress">
        <div key={current} className="spotlight-progress-bar" style={{ animationDuration: `${SLIDE_INTERVAL}ms` }} />
      </div>
    </div>
  );
}
