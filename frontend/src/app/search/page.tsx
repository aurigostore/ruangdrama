"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import DramaCard from "@/components/DramaCard";
import type { Drama } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!initialQ) return;
    doSearch(initialQ);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API}/api/dramabox/search?query=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.success ? json.data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    doSearch(query);
  }

  return (
    <main className="container" style={{ paddingBottom: 40 }}>
      <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-0)", marginBottom: 20 }}>
        Pencarian
      </h1>

      <form className="search-bar" onSubmit={handleSubmit}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-3)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search"
          placeholder="Cari judul drama..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>
          Cari
        </button>
      </form>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 12 }} />
              <div className="skeleton skeleton-text" style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="state-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <h3>Tidak ditemukan</h3>
          <p>Tidak ada drama dengan judul &quot;{initialQ}&quot;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16 }}>
            {results.length} hasil untuk &quot;<strong style={{ color: "var(--text-0)" }}>{initialQ}</strong>&quot;
          </p>
          <div className="drama-grid">
            {results.map((d) => <DramaCard key={d.id} drama={d} />)}
          </div>
        </>
      )}

      {!searched && (
        <div className="state-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <h3>Mulai pencarian</h3>
          <p>Ketik judul drama yang ingin kamu tonton</p>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container"><div className="state-empty"><h3>Memuat...</h3></div></div>}>
      <SearchContent />
    </Suspense>
  );
}
