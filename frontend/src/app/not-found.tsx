"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Glow background */}
      <div style={{
        position: "absolute", width: 500, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(230,57,70,0.12) 0%, transparent 70%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />

      <div style={{
        textAlign: "center",
        padding: "40px 24px",
        position: "relative", zIndex: 1,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        {/* Big 404 */}
        <div style={{
          fontSize: "clamp(80px, 20vw, 160px)",
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 900,
          lineHeight: 1,
          background: "linear-gradient(135deg, #e63946 0%, #ff6b7a 50%, #e63946 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 8,
          userSelect: "none",
        }}>
          404
        </div>

        {/* Film strip decoration */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginBottom: 28,
          opacity: 0.35,
        }}>
          {Array.from({length: 9}).map((_, i) => (
            <div key={i} style={{
              width: i === 4 ? 32 : 14,
              height: 8,
              background: i === 4 ? "#e63946" : "rgba(255,255,255,0.6)",
              borderRadius: 2,
              transition: "width 0.3s",
            }} />
          ))}
        </div>

        <h1 style={{
          fontSize: "clamp(18px, 4vw, 26px)",
          fontWeight: 700, color: "#fff",
          marginBottom: 12,
          fontFamily: "'Outfit', sans-serif",
        }}>
          Drama Tidak Ditemukan
        </h1>

        <p style={{
          fontSize: 15, color: "rgba(255,255,255,0.5)",
          marginBottom: 36, lineHeight: 1.7,
          maxWidth: 340, margin: "0 auto 36px",
        }}>
          Sepertinya drama atau halaman yang kamu cari<br />
          sudah tidak tersedia atau link-nya salah.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#e63946", color: "#fff",
            padding: "12px 28px", borderRadius: 8,
            fontWeight: 700, fontSize: 14,
            textDecoration: "none",
            transition: "all 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Ke Beranda
          </Link>
          <Link href="/search" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(255,255,255,0.15)",
            padding: "12px 24px", borderRadius: 8,
            fontWeight: 600, fontSize: 14,
            textDecoration: "none",
            transition: "all 0.2s",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Cari Drama
          </Link>
        </div>
      </div>
    </main>
  );
}
