import { notFound } from "next/navigation";
import Link from "next/link";
import { getDetail } from "@/lib/api";
import type { Metadata } from "next";
import WatchButtons from "@/components/WatchButtons";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const drama = await getDetail(id);
    return {
      title: drama.title,
      description: drama.synopsis?.slice(0, 160),
      openGraph: { images: [drama.cover] },
    };
  } catch {
    return { title: "Drama Not Found" };
  }
}

export default async function DramaDetailPage({ params }: Props) {
  const { id } = await params;

  let drama;
  try {
    drama = await getDetail(id);
  } catch {
    notFound();
  }

  const episodes = drama.episodes || [];
  const firstEp = episodes[0]?.number || 1;

  return (
    <main>
      {/* ── Hero ── */}
      <div className="detail-hero">
        <div
          className="detail-hero-bg"
          style={{ backgroundImage: `url(${drama.cover})` }}
        />
        <div className="container">
          <div className="detail-hero-content">
            <div className="detail-poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={drama.cover} alt={drama.title} />
            </div>
            <div className="detail-info">
              <h1 className="detail-title">{drama.title}</h1>
              <div className="detail-badges">
                {drama.isCompleted ? (
                  <span className="badge badge-accent">Tamat</span>
                ) : (
                  <span className="badge badge-neutral">On Going</span>
                )}
                <span className="badge badge-neutral">{drama.totalEpisodes} Episode</span>
                {(drama.categories || drama.tags || []).slice(0, 3).map((c: string) => (
                  <span key={c} className="badge badge-neutral">{c}</span>
                ))}
              </div>
              <p className="detail-synopsis">{drama.synopsis}</p>
              {episodes.length > 0 && (
                <WatchButtons dramaId={id} firstEp={firstEp} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Episode List ── */}
      <div className="container" style={{ paddingBottom: 40 }}>
        {episodes.length > 0 ? (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Daftar Episode ({episodes.length})</h2>
            </div>
            <div className="episode-grid">
              {episodes.map((ep) => (
                <Link
                  key={ep.number}
                  href={`/watch/${id}/${ep.number}`}
                  className="ep-btn"
                >
                  {ep.number}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="state-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h3>Episode tidak tersedia</h3>
            <p>Data episode belum tersedia untuk drama ini.</p>
          </div>
        )}
      </div>
    </main>
  );
}
