"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const WA = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

const PLANS = [
  {
    id: "daily", label: "Harian", days: 1,
    price: "Rp 1.000", perDay: "Rp 1.000/hari",
    desc: "Cocok untuk coba-coba", highlight: false,
  },
  {
    id: "weekly", label: "Mingguan", days: 7,
    price: "Rp 6.500", perDay: "Rp 929/hari",
    desc: "Paling populer", highlight: true,
    badge: "⭐ Terbaik", savings: "Hemat 7%",
  },
  {
    id: "monthly", label: "Bulanan", days: 30,
    price: "Rp 29.000", perDay: "Rp 967/hari",
    desc: "Nonton sepuasnya", highlight: false,
    savings: "Hemat 3%",
  },
];

const FEATURES = [
  { icon: "🎬", title: "1000+ Drama", desc: "Ribuan judul drama China terlengkap" },
  { icon: "📺", title: "Kualitas HD", desc: "Streaming jernih hingga 720p" },
  { icon: "🚫", title: "Tanpa Iklan", desc: "Nonton tanpa gangguan iklan apapun" },
  { icon: "📱", title: "Multi Device", desc: "Akses dari HP, tablet, atau laptop" },
  { icon: "⚡", title: "Update Cepat", desc: "Episode baru tersedia setiap hari" },
  { icon: "🔒", title: "Aman & Privat", desc: "Data kamu terlindungi penuh" },
];

const TESTIMONIALS = [
  { name: "Sari W.", avatar: "S", text: "Dramanya lengkap banget! Subtitle Indonesia juga enak dibaca. Udah langganan 2 bulan.", stars: 5 },
  { name: "Budi R.", avatar: "B", text: "Harganya murah tapi kualitasnya premium. Nonton drama favorit jadi makin seru!", stars: 5 },
  { name: "Dina M.", avatar: "D", text: "Akhirnya nemu streaming drama China yang gak ribet. Langsung bisa nonton tanpa daftar akun.", stars: 5 },
  { name: "Riko A.", avatar: "R", text: "Paket mingguannya worth it banget. HD quality dan fast loading. Recommended!", stars: 5 },
];

const FAQS = [
  { q: "Bagaimana cara membeli key?", a: "Pilih paket yang kamu inginkan, klik tombol 'Beli via WhatsApp', dan hubungi admin. Key akan dikirim setelah pembayaran dikonfirmasi." },
  { q: "Berapa lama key aktif?", a: "Sesuai paket yang dibeli: 1 hari, 7 hari, atau 30 hari. Dihitung sejak kamu mengaktifkan key." },
  { q: "Apakah bisa dipakai di banyak device?", a: "Ya! Satu key bisa digunakan di semua device kamu — HP, laptop, tablet, semuanya bisa." },
  { q: "Metode pembayaran apa yang tersedia?", a: "Transfer bank, DANA, OVO, GoPay, dan QRIS. Hubungi admin via WhatsApp untuk konfirmasi." },
  { q: "Bagaimana jika key tidak bisa dipakai?", a: "Hubungi admin via WhatsApp dan kami akan segera membantu menyelesaikan masalah kamu." },
];

function waLink(plan: typeof PLANS[number]) {
  const msg = encodeURIComponent(`Halo Admin, saya ingin membeli akses Ruang Drama paket *${plan.label}* (${plan.price}). Mohon info selanjutnya 🙏`);
  return `https://wa.me/${WA}?text=${msg}`;
}

const WaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  // Hero background slideshow
  const [heroBgs, setHeroBgs] = useState<string[]>([]);
  const [heroCurrent, setHeroCurrent] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/dramabox/trending`)
      .then(r => r.json())
      .then(json => {
        const items = json.data || [];
        const covers = items.slice(0, 6).map((d: any) => d.cover).filter(Boolean);
        if (covers.length > 0) setHeroBgs(covers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (heroBgs.length < 2) return;
    heroTimer.current = setTimeout(() => {
      setHeroCurrent(c => (c + 1) % heroBgs.length);
    }, 5000);
    return () => { if (heroTimer.current) clearTimeout(heroTimer.current); };
  }, [heroCurrent, heroBgs]);

  function scrollToPricing() {
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) { setError("Masukkan key terlebih dahulu"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${API}/api/auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });
      const json = await res.json();
      if (json.valid) {
        localStorage.setItem("rd_key", trimmed);
        localStorage.setItem("rd_expires", json.expiresAt);
        // Simpan info lengkap untuk profil VIP navbar
        localStorage.setItem("rd_info", JSON.stringify({
          note: json.note || "",
          createdAt: json.createdAt || "",
          expiresAt: json.expiresAt || "",
          daysLeft: json.daysLeft ?? null,
          hoursLeft: json.hoursLeft ?? null,
        }));
        const sisaText = json.daysLeft >= 1 ? `${json.daysLeft} hari` : `${json.hoursLeft} jam`;
        setSuccess(`✓ Key valid! Sisa ${sisaText}. Mengalihkan...`);
        setTimeout(() => router.push("/"), 1200);
      } else {
        setError(json.reason || "Key tidak valid");
      }
    } catch { setError("Gagal terhubung ke server. Coba lagi."); }
    finally { setLoading(false); }
  }

  return (
    <div className="lp-root">

      {/* ══ NAVBAR ══ */}
      <nav className="lp-nav">
        <Image src="/logo.png" alt="Ruang Drama" width={140} height={0} style={{ height: "auto" }} priority />
        <button onClick={scrollToPricing} className="lp-btn-red">Mulai Nonton</button>
      </nav>

      {/* ══ HERO ══ */}
      <section className="lp-hero">
        {/* Background poster slideshow */}
        {heroBgs.map((bg, i) => (
          <div
            key={bg}
            className="lp-hero-bg"
            style={{
              backgroundImage: `url(${bg})`,
              opacity: i === heroCurrent ? 1 : 0,
            }}
          />
        ))}
        {/* Overlay gradient */}
        <div className="lp-hero-overlay" />

        {/* Glow decorations (hanya terlihat jika tidak ada bg) */}
        {heroBgs.length === 0 && <>
          <div className="lp-hero-glow lp-hero-glow--1" />
          <div className="lp-hero-glow lp-hero-glow--2" />
        </>}

        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-hero-tag">🎉 Platform Drama China #1 di Indonesia</div>
            <h1 className="lp-hero-title">
              Nonton Drama China<br />
              <span className="lp-red">Tanpa Batas</span>,<br />
              Mulai <span className="lp-red">Rp 1.000</span> Saja
            </h1>
            <p className="lp-hero-sub">
              Akses ribuan judul drama China dengan subtitle Indonesia.<br className="lp-br" />
              Tanpa iklan. Tanpa buffering. Tanpa ribet.
            </p>
            <div className="lp-hero-btns">
              <button onClick={scrollToPricing} className="lp-btn-red lp-btn-lg">🎬 Mulai Nonton Sekarang</button>
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" className="lp-btn-ghost lp-btn-lg">
                <WaIcon /> Tanya Admin
              </a>
            </div>
            <div className="lp-hero-stats">
              {[["1000+","Judul Drama"],["HD","Kualitas Video"],["0","Iklan"],["Multi","Device"]].map(([val, label]) => (
                <div key={label} className="lp-stat">
                  <strong>{val}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Poster stack (desktop only) */}
          <div className="lp-hero-deco" aria-hidden>
            <div className="lp-poster lp-poster--3" style={heroBgs[2] ? { backgroundImage: `url(${heroBgs[2]})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
            <div className="lp-poster lp-poster--2" style={heroBgs[1] ? { backgroundImage: `url(${heroBgs[1]})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
            <div className="lp-poster lp-poster--1" style={heroBgs[0] ? { backgroundImage: `url(${heroBgs[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
              <div className="lp-poster-badge">▶ Sedang Trending</div>
              <div className="lp-poster-overlay">
                <div className="lp-poster-title">Drama Terbaru</div>
                <div className="lp-poster-ep">EP 12</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-eyebrow">Kenapa Ruang Drama?</div>
          <h2 className="lp-section-h2">Pengalaman Nonton yang <span className="lp-red">Berbeda dari yang Lain</span></h2>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="lp-section lp-testi-section">
        <div className="lp-container">
          <div className="lp-section-eyebrow">Kata Mereka</div>
          <h2 className="lp-section-h2">Ribuan Penonton Sudah <span className="lp-red">Percaya Ruang Drama</span></h2>
          <div className="lp-testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="lp-testi-card">
                <div className="lp-testi-stars">{"⭐".repeat(t.stars)}</div>
                <p className="lp-testi-text">&ldquo;{t.text}&rdquo;</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-avatar">{t.avatar}</div>
                  <span>{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section className="lp-section" ref={pricingRef} id="pricing">
        <div className="lp-container">
          <div className="lp-section-eyebrow">Harga</div>
          <h2 className="lp-section-h2">Pilih Paket <span className="lp-red">Sesuai Kebutuhanmu</span></h2>

          {/* Shared perks — ditampilkan sekali di atas */}
          <div className="lp-shared-perks">
            {["✓ Akses semua drama", "✓ Kualitas HD", "✓ Tanpa Iklan", "✓ Subtitle Indonesia", "✓ Multi Device"].map(p => (
              <span key={p} className="lp-shared-perk">{p}</span>
            ))}
          </div>

          {/* Compact plan rows */}
          <div className="lp-plans-compact">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`lp-plan-row${plan.highlight ? " lp-plan-row--pop" : ""}`}>
                {plan.badge && <div className="lp-plan-row-badge">{plan.badge}</div>}
                <div className="lp-plan-row-left">
                  <div className="lp-plan-row-label">{plan.label}</div>
                  <div className="lp-plan-row-perday">{plan.perDay}</div>
                </div>
                <div className="lp-plan-row-price">{plan.price}</div>
                <a href={waLink(plan)} target="_blank" rel="noopener noreferrer"
                  className={`lp-plan-row-btn${plan.highlight ? " lp-plan-row-btn--pop" : ""}`}>
                  <WaIcon /> Beli
                </a>
              </div>
            ))}
          </div>

          {/* Activate key */}
          <div className="lp-activate">
            <div className="lp-activate-title">Sudah Punya Key?</div>
            <p className="lp-activate-sub">Masukkan key dari admin untuk langsung mulai nonton</p>
            <form className="lp-act-form" onSubmit={handleActivate}>
              <input
                type="text" className="lp-act-input"
                placeholder="Contoh: RD-GH56RTGH5YRD"
                value={key}
                onChange={(e) => { setKey(e.target.value.toUpperCase()); setError(""); }}
                maxLength={15} spellCheck={false} autoComplete="off"
              />
              <button type="submit" className="lp-btn-red" disabled={loading}>
                {loading ? <span className="lp-spinner" /> : "Aktifkan →"}
              </button>
            </form>
            {error && <div className="lp-msg lp-msg--err">{error}</div>}
            {success && <div className="lp-msg lp-msg--ok">{success}</div>}
          </div>
        </div>
      </section>


      {/* ══ FAQ ══ */}
      <section className="lp-section lp-faq-section">
        <div className="lp-container lp-container--sm">
          <div className="lp-section-eyebrow">FAQ</div>
          <h2 className="lp-section-h2">Pertanyaan yang Sering <span className="lp-red">Ditanyakan</span></h2>
          <div className="lp-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`lp-faq-item${openFaq === i ? " open" : ""}`}>
                <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .3s" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div className="lp-faq-a-wrap">
                  <div className="lp-faq-a">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BOTTOM CTA ══ */}
      <section className="lp-cta-section">
        <div className="lp-cta-glow" />
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">Drama Favoritmu Menunggu</h2>
          <p className="lp-cta-sub">Bergabung dan nikmati ribuan drama China hanya dengan harga secangkir kopi</p>
          <button onClick={scrollToPricing} className="lp-btn-red lp-btn-lg">🎬 Lihat Paket Harga</button>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lp-footer">
        <Image src="/logo.png" alt="Ruang Drama" width={140} height={0} style={{ height: "auto" }} />
        <p>© {new Date().getFullYear()} Ruang Drama · Streaming Drama China</p>
        <p className="lp-footer-part">Part of <strong>Aurigo Store</strong> &amp; <strong>Ruang Digital</strong></p>
        <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" className="lp-footer-wa">
          💬 Hubungi Admin
        </a>
      </footer>

      {/* ══ STICKY BAR ══ */}
      <div className="lp-sticky">
        <span>Mulai nonton dari <strong>Rp 1.000</strong> saja!</span>
        <button onClick={scrollToPricing} className="lp-btn-red">Lihat Paket</button>
      </div>

    </div>
  );
}
