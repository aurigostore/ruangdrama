"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StreamInfo, DramaDetail } from "@/lib/api";
import { saveProgress } from "@/lib/progress";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Subtitle {
  language: string;
  display_name: string;
  subtitle: string; // bisa URL .vtt atau teks langsung
}

interface ExtendedStreamInfo extends StreamInfo {
  subtitles?: Subtitle[];
}

interface Props {
  params: Promise<{ id: string; ep: string }>;
}

// ── Keyboard Shortcut Toast ───────────────────────────────
function ShortcutToast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="shortcut-toast">
      {message}
    </div>
  );
}

export default function WatchPage({ params }: Props) {
  const [id, setId] = useState("");
  const [ep, setEp] = useState(0);
  const [stream, setStream] = useState<ExtendedStreamInfo | null>(null);
  const [detail, setDetail] = useState<DramaDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSubLang, setActiveSubLang] = useState<string | null>(null);
  const [currentSubText, setCurrentSubText] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("rd_autoplay");
    return saved === null ? true : saved === "true";
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routerAutoPlay = useRouter();

  // ── Params ─────────────────────────────────────────────
  useEffect(() => {
    params.then(({ id: paramId, ep: paramEp }) => {
      setId(paramId);
      setEp(parseInt(paramEp));
    });
  }, [params]);

  // ── Fetch stream + detail ──────────────────────────────
  useEffect(() => {
    if (!id || !ep) return;
    setLoading(true);
    setError("");
    setStream(null);
    setCurrentSubText("");
    setActiveSubLang(null);

    Promise.all([
      fetch(`${API}/api/dramabox/stream/${id}/${ep}`).then((r) => r.json()),
      fetch(`${API}/api/dramabox/detail/${id}`).then((r) => r.json()),
    ])
      .then(([streamRes, detailRes]) => {
        if (streamRes.success) setStream(streamRes.data);
        else setError(streamRes.error || "Stream tidak tersedia");
        if (detailRes.success) setDetail(detailRes.data);
      })
      .catch(() => setError("Gagal memuat video"))
      .finally(() => setLoading(false));
  }, [id, ep]);

  // ── Setup HLS/MP4 player ──────────────────────────────
  useEffect(() => {
    if (!stream?.videoUrl || !videoRef.current) return;

    const video = videoRef.current;
    const url = stream.videoUrl;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    // Helper: play dengan fallback muted untuk mobile autoplay policy
    const tryPlay = () => {
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => {
          // Autoplay diblokir browser — coba muted dulu
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    const isHLS = url.includes(".m3u8");
    if (!isHLS) {
      video.src = url;
      video.load();
      tryPlay();
      return;
    }

    // iOS Safari — native HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.load();
      tryPlay();
      return;
    }

    // Android / Desktop — pakai HLS.js
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        setError("Browser tidak mendukung pemutaran video HLS. Coba Chrome versi terbaru.");
        return;
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.withCredentials = false;
        },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        tryPlay();
      });
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad(); // retry network error
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError("Gagal memuat video stream. Coba refresh halaman.");
              hls.destroy();
          }
        }
      });
      hlsRef.current = hls;
    });

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [stream]);

  // ── Save progress saat video mulai ───────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !id || !ep || !detail) return;
    const onPlay = () => {
      saveProgress(id, ep, detail.title, detail.cover);
    };
    video.addEventListener("play", onPlay);
    return () => video.removeEventListener("play", onPlay);
  }, [id, ep, detail, stream]);

  // ── Auto play next episode saat video ended ───────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      const nextEpNum = detail && ep < detail.totalEpisodes ? ep + 1 : null;
      if (!autoPlay || !nextEpNum) return;

      // Mulai countdown 5 detik
      setCountdown(5);
      let sisa = 5;
      countdownRef.current = setInterval(() => {
        sisa -= 1;
        if (sisa <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setCountdown(null);
          routerAutoPlay.push(`/watch/${id}/${nextEpNum}`);
        } else {
          setCountdown(sisa);
        }
      }, 1000);
    };

    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [id, ep, detail, autoPlay, routerAutoPlay]);

  function cancelAutoPlay() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setCountdown(null);
  }

  function toggleAutoPlay() {
    const newVal = !autoPlay;
    setAutoPlay(newVal);
    localStorage.setItem("rd_autoplay", String(newVal));
    if (!newVal) cancelAutoPlay();
  }

  // ── Fullscreen listener ───────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Toast helper ─────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 1200);
  }, []);

  // ── Keyboard Shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      // Jangan trigger saat user mengetik di input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (video.paused) { video.play(); showToast("▶ Play"); }
          else { video.pause(); showToast("⏸ Pause"); }
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          showToast("⏪ -10s");
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
          showToast("⏩ +10s");
          break;
        case "KeyF":
          e.preventDefault();
          if (!document.fullscreenElement) {
            playerWrapRef.current?.requestFullscreen();
            showToast("⛶ Fullscreen");
          } else {
            document.exitFullscreen();
            showToast("⊠ Exit Fullscreen");
          }
          break;
        case "KeyM":
          e.preventDefault();
          video.muted = !video.muted;
          showToast(video.muted ? "🔇 Mute" : "🔊 Unmute");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showToast]);

  // ── Subtitle: parse VTT-like timed text ──────────────
  useEffect(() => {
    if (!activeSubLang || !stream?.subtitles) { setCurrentSubText(""); return; }
    const sub = stream.subtitles.find((s) => s.language === activeSubLang);
    if (!sub) return;

    const subtitleUrl = sub.subtitle;
    if (!subtitleUrl) return;

    // Jika URL file .vtt — fetch dan parse
    if (subtitleUrl.startsWith("http")) {
      const video = videoRef.current;
      if (!video) return;

      fetch(subtitleUrl)
        .then((r) => r.text())
        .then((vttText) => {
          const cues = parseVTT(vttText);
          const onTimeUpdate = () => {
            const t = video.currentTime;
            const active = cues.find((c) => t >= c.start && t <= c.end);
            setCurrentSubText(active?.text ?? "");
          };
          video.addEventListener("timeupdate", onTimeUpdate);
          // Store cleanup
          (video as any)._subCleanup = () => video.removeEventListener("timeupdate", onTimeUpdate);
        })
        .catch(() => {});

      return () => {
        const video = videoRef.current;
        if (video && (video as any)._subCleanup) { (video as any)._subCleanup(); }
      };
    }
  }, [activeSubLang, stream]);

  const allEps = detail?.episodes || [];
  const freeEps = allEps.filter((e) => !e.locked);
  const prevEp = ep > 1 ? ep - 1 : null;
  const nextEp = detail && ep < detail.totalEpisodes ? ep + 1 : null;
  const hasSubtitles = (stream?.subtitles?.length ?? 0) > 0;

  return (
    <main className="container" style={{ paddingBottom: 40, paddingTop: 12 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 13, color: "var(--text-3)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "var(--text-2)", textDecoration: "none" }}>Beranda</Link>
        <span>/</span>
        {detail && <Link href={`/drama/${id}`} style={{ color: "var(--text-2)", textDecoration: "none" }}>{detail.title}</Link>}
        {detail && <span>/</span>}
        <span style={{ color: "var(--text-1)" }}>Episode {ep}</span>
      </div>

      {/* Player */}
      <div className="player-outer" ref={playerWrapRef}>
        <div className="player-wrap">
          {loading && (
            <div className="player-error">
              <div style={{ width: 40, height: 40, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span>Memuat video...</span>
            </div>
          )}

          {!loading && error && (
            <div className="player-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <h3>{error}</h3>
            </div>
          )}

          <video
            ref={videoRef}
            controls
            playsInline
            style={{ width: "100%", height: "100%", background: "#000", display: loading || error ? "none" : "block" }}
          />

          {/* Subtitle overlay */}
          {currentSubText && (
            <div className="subtitle-overlay">
              <span className="subtitle-text">{currentSubText}</span>
            </div>
          )}

          {/* Keyboard shortcut toast */}
          {toastMsg && <ShortcutToast message={toastMsg} />}

          {/* Auto play countdown overlay */}
          {countdown !== null && nextEp && (
            <div className="autoplay-overlay">
              <div className="autoplay-box">
                <div className="autoplay-countdown">{countdown}</div>
                <div className="autoplay-label">Episode {nextEp} akan diputar otomatis</div>
                <button className="autoplay-cancel" onClick={cancelAutoPlay}>Batal</button>
              </div>
            </div>
          )}
        </div>

        {/* Subtitle selector */}
        {hasSubtitles && (
          <div className="subtitle-bar">
            <span className="subtitle-bar__label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/>
              </svg>
              Subtitle:
            </span>
            <button
              className={`subtitle-btn${activeSubLang === null ? " subtitle-btn--active" : ""}`}
              onClick={() => { setActiveSubLang(null); setCurrentSubText(""); }}
            >
              Off
            </button>
            {stream!.subtitles!.map((s) => (
              <button
                key={s.language}
                className={`subtitle-btn${activeSubLang === s.language ? " subtitle-btn--active" : ""}`}
                onClick={() => setActiveSubLang(s.language)}
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
        {/* Toggle Auto Play */}
        <div className="autoplay-toggle-bar">
          <span className="autoplay-toggle-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Auto Play Episode Berikutnya
          </span>
          <button
            className={`autoplay-toggle${autoPlay ? " autoplay-toggle--on" : ""}`}
            onClick={toggleAutoPlay}
            aria-label={autoPlay ? "Matikan auto play" : "Aktifkan auto play"}
          >
            <span className="autoplay-toggle-knob" />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Keyboard shortcuts hint */}
      <div className="shortcut-hints">
        <span>Space = Play/Pause</span>
        <span>← → = Skip 10s</span>
        <span>F = Fullscreen</span>
        <span>M = Mute</span>
      </div>

      {/* Nav Episode */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 12 }}>
        {prevEp ? (
          <Link href={`/watch/${id}/${prevEp}`} className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
            ← Episode {prevEp}
          </Link>
        ) : <div style={{ flex: 1 }} />}
        <Link href={`/drama/${id}`} className="btn btn-secondary" style={{ flexShrink: 0 }}>
          Daftar Episode
        </Link>
        {nextEp ? (
          <Link href={`/watch/${id}/${nextEp}`} className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
            Episode {nextEp} →
          </Link>
        ) : <div style={{ flex: 1 }} />}
      </div>

      {/* Drama Info */}
      {detail && (
        <div style={{ marginTop: 24, padding: 20, background: "var(--bg-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={detail.cover} alt={detail.title} style={{ width: 60, borderRadius: 8, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-0)", marginBottom: 4 }}>{detail.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>Episode {ep} dari {detail.totalEpisodes}</div>
            </div>
          </div>
        </div>
      )}

      {/* Episode Chips */}
      {freeEps.length > 0 && (
        <section className="section" style={{ marginTop: 24 }}>
          <div className="section-header">
            <h2 className="section-title">Semua Episode</h2>
          </div>
          <div className="episode-grid">
            {allEps.map((e) =>
              e.locked ? (
                <div key={e.number} className="ep-btn locked" title="Terkunci">
                  {e.number}
                  <span className="ep-lock">🔒</span>
                </div>
              ) : (
                <Link
                  key={e.number}
                  href={`/watch/${id}/${e.number}`}
                  className={`ep-btn${e.number === ep ? " active" : ""}`}
                >
                  {e.number}
                </Link>
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}

// ── VTT Parser ────────────────────────────────────────────
function parseVTT(vtt: string): { start: number; end: number; text: string }[] {
  const cues: { start: number; end: number; text: string }[] = [];
  const lines = vtt.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const [startStr, endStr] = line.split("-->").map((s) => s.trim().split(" ")[0]);
      const start = timeToSec(startStr);
      const end = timeToSec(endStr);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i].trim());
        i++;
      }
      if (textLines.length > 0) {
        cues.push({ start, end, text: textLines.join("\n") });
      }
    } else {
      i++;
    }
  }
  return cues;
}

function timeToSec(t: string): number {
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
