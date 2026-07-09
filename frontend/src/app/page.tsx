"use client";
import { useState, useEffect, useRef } from "react";
import DramaCard from "@/components/DramaCard";
import HeroBanner from "@/components/HeroBanner";
import ContinueWatching from "@/components/ContinueWatching";
import type { Drama } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

interface PageInfo {
  has_more: boolean;
  pageNo: number;
  pageSize: number;
  tabKey?: string;
  positionIndex?: number;
}

export default function HomePage() {
  const [items, setItems] = useState<Drama[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const stateRef = useRef({ loading: false, pageInfo: null as PageInfo | null, done: false });

  async function load(pi: PageInfo | null) {
    if (stateRef.current.loading || stateRef.current.done) return;
    stateRef.current.loading = true;
    setLoading(true);

    try {
      let res: Response;

      if (!pi) {
        res = await fetch(`${API}/api/dramabox/foryou?page=1`);
      } else {
        res = await fetch(`${API}/api/dramabox/tabcontent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabKey: pi.tabKey ?? "",
            positionIndex: pi.positionIndex ?? 0,
            type: "region",
            pageInfo: pi,
          }),
        });
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const newItems: Drama[] = json.items || [];
      const newPageInfo: PageInfo | null = json.pageInfo ?? null;

      setItems((prev) => {
        const seen = new Set(prev.map((d) => d.id));
        return [...prev, ...newItems.filter((d) => !seen.has(d.id))];
      });

      const isMore = newPageInfo?.has_more === true;
      setPageInfo(newPageInfo);
      setDone(!isMore);
      stateRef.current.pageInfo = newPageInfo;
      stateRef.current.done = !isMore;

    } catch (err) {
      console.error(err);
    } finally {
      stateRef.current.loading = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => { load(null); }, []);

  // ── Visitor counter trigger ────────────────────────────────
  useEffect(() => {
    // Throttle: hanya sekali per browser session
    if (!sessionStorage.getItem("rd_visited")) {
      sessionStorage.setItem("rd_visited", "1");
      fetch(`${API}/api/stats/visitor`, { method: "POST" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY + window.innerHeight;
      const height = document.documentElement.scrollHeight;
      if (scrollY >= height - 600) {
        load(stateRef.current.pageInfo);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>

      <HeroBanner />


      <ContinueWatching />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-0)", margin: 0 }}>
          Semua Drama
        </h1>
      </div>

      {/* Skeleton */}
      {initialLoading && (
        <div className="drama-grid">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 10, width: "100%" }} />
              <div className="skeleton" style={{ height: 13, marginTop: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 11, marginTop: 5, width: "55%", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )}

      {/* Grid utama */}
      {!initialLoading && (
        <div className="drama-grid">
          {items.map((drama) => (
            <DramaCard key={drama.id} drama={drama} />
          ))}
        </div>
      )}

      {/* Loading spinner */}
      {loading && !initialLoading && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "32px 0" }}>
          <div style={{
            width: 20, height: 20,
            border: "3px solid var(--accent)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
          <span style={{ color: "var(--text-3)", fontSize: 13 }}>
            Memuat halaman {(pageInfo?.pageNo ?? 0) + 1}...
          </span>
        </div>
      )}

      {/* Selesai */}
      {done && items.length > 0 && (
        <p style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13, padding: "24px 0" }}>
          ✓ {items.length} drama sudah ditampilkan semua
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
