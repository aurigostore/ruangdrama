import axios from "axios";
import { config } from "dotenv";
config();

// ── Konfigurasi dari .env ──────────────────────────────────
const PLATFORM = process.env.AIO_PLATFORM || "dramabox";
const LANG = process.env.AIO_LANG || "id";
const QUALITY = parseInt(process.env.AIO_QUALITY || "720");
const JWT_TOKEN = process.env.AIO_JWT_TOKEN || "";

// Base URL — aiodrama.vip (web API)
const BASE = "https://aiodrama.vip/api/drama";
// Base URL — api.aiodrama.vip (mobile/app API, lebih lengkap untuk subscriber)
const BASE_API = "https://api.aiodrama.vip";

console.log("[Scraper] JWT Token:", JWT_TOKEN ? `${JWT_TOKEN.slice(0, 20)}...` : "TIDAK ADA!");

const headers = {
  "Authorization": `Bearer ${JWT_TOKEN}`,
  "Content-Type": "application/json",
  "Accept": "*/*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "Referer": "https://aiodrama.vip/",
  "Origin": "https://aiodrama.vip",
};

// ── Decode base64 video URL ────────────────────────────────
// aiodrama mengembalikan URL video ter-encode base64 di endpoint aliplay
// Format: https://api.aiodrama.vip/aliplay/video/<BASE64_URL>
function decodeVideoUrl(rawUrl) {
  if (!rawUrl) return null;
  // Jika sudah berupa URL langsung (http/https), kembalikan langsung
  if (rawUrl.startsWith("http")) return rawUrl;
  // Jika base64 encoded
  try {
    const decoded = Buffer.from(rawUrl, "base64").toString("utf-8");
    if (decoded.startsWith("http")) return decoded;
  } catch {}
  return rawUrl;
}

// Ekstrak actual video URL dari aliplay proxy URL
function extractFromAliplay(aliplayUrl) {
  if (!aliplayUrl) return null;
  const match = aliplayUrl.match(/\/aliplay\/video\/([^?#]+)/);
  if (match) {
    try {
      const decoded = Buffer.from(match[1], "base64").toString("utf-8");
      if (decoded.startsWith("http")) return decoded;
    } catch {}
  }
  return aliplayUrl;
}

// ── HTTP Helpers ───────────────────────────────────────────

async function get(path, params = {}) {
  const url = `${BASE}/${PLATFORM}${path}`;
  const res = await axios.get(url, {
    headers,
    params: { lang: LANG, ...params },
    timeout: 15000,
  });
  if (!res.data?.success) throw new Error(res.data?.error?.message || "API error");
  return res.data;
}

async function post(path, body = {}, params = {}) {
  const url = `${BASE}/${PLATFORM}${path}`;
  const res = await axios.post(url, body, {
    headers,
    params: { lang: LANG, ...params },
    timeout: 15000,
  });
  if (!res.data?.success) throw new Error(res.data?.error?.message || "API error");
  return res.data;
}

// Request ke api.aiodrama.vip (mobile API)
async function apiGet(path, params = {}) {
  const url = `${BASE_API}${path}`;
  const res = await axios.get(url, {
    headers,
    params: { lang: LANG, quality: QUALITY, ...params },
    timeout: 15000,
  });
  return res.data;
}

async function apiPost(path, body = {}) {
  const url = `${BASE_API}${path}`;
  const res = await axios.post(url, body, {
    headers,
    params: { lang: LANG },
    timeout: 15000,
  });
  return res.data;
}

// ── Data Normalizer ────────────────────────────────────────

function normalizeBook(item) {
  return {
    id: String(item.id || item.bookId || ""),
    title: item.name || item.bookName || "",
    cover: item.cover || item.coverWap || "",
    totalEpisodes: item.chapterCount || 0,
    tags: item.tags || [],
    playCount: item.playCount || "0",
    isCompleted: item.isCompleted === true || item.isCompleted === 1,
  };
}

// ── Tab Cache ──────────────────────────────────────────────

let _tabCache = null;

async function getTabs() {
  if (_tabCache) return _tabCache;
  const res = await get("/tablist");
  _tabCache = res.data || [];
  setTimeout(() => { _tabCache = null; }, 10 * 60 * 1000);
  return _tabCache;
}

async function getTabData(tabKey, positionIndex, type, pageInfo = null) {
  if (pageInfo) {
    const res = await post("/tabfeed", { page_info: pageInfo });
    const books = res.data?.book || [];
    return {
      items: (Array.isArray(books) ? books : books?.list || []).map(normalizeBook),
      pageInfo: res.data?.page_info || null,
    };
  } else {
    const res = await post("/tabdata", {
      key: tabKey,
      positionIndex: String(positionIndex),
      type,
    });
    const bookData = res.data?.book;
    const list = Array.isArray(bookData) ? bookData : bookData?.list || [];
    return {
      items: list.map(normalizeBook),
      pageInfo: res.data?.page_info || null,
    };
  }
}

// ── Public API ─────────────────────────────────────────────

export async function getTrending() {
  // Ambil list dari tabdata sort terpopuler
  try {
    const res = await post("/tabdata", {
      key: "1",           // sort: Terpopuler
      positionIndex: "5",
      type: "sort by",
    });
    const bookData = res.data?.book;
    const list = Array.isArray(bookData) ? bookData : bookData?.list || [];
    return list.map(normalizeBook);
  } catch {
    return [];
  }
}

export async function getForYou(page = 1, pageInfo = null) {
  if (pageInfo) {
    // Pagination: kirim pageInfo LANGSUNG sebagai body (bukan dibungkus page_info)
    const res = await post("/tabfeed", pageInfo);
    const books = res.data?.book || [];
    const list = Array.isArray(books) ? books : books?.list || [];
    return {
      items: list.map(normalizeBook),
      pageInfo: res.data?.page_info || null,
    };
  }

  // Halaman pertama — sort Terbaru (tabKey:"2", positionIndex:5)
  const res = await post("/tabdata", {
    key: "2",
    positionIndex: "5",
    type: "sort by",
  });
  const bookData = res.data?.book;
  const list = Array.isArray(bookData) ? bookData : bookData?.list || [];
  // Simpan tabKey dan positionIndex di pageInfo supaya tabfeed tahu konteksnya
  const rawPageInfo = res.data?.page_info || null;
  if (rawPageInfo) {
    rawPageInfo.tabKey = rawPageInfo.tabKey ?? "2";
    rawPageInfo.positionIndex = rawPageInfo.positionIndex ?? 5;
  }
  return {
    items: list.map(normalizeBook),
    pageInfo: rawPageInfo,
  };
}

export async function getTabList() {
  return getTabs();
}

export async function getTabContent(tabKey, positionIndex, type, pageInfo = null) {
  return getTabData(tabKey, positionIndex, type, pageInfo);
}

export async function search(query) {
  const res = await post("/search", { keyword: query });
  const books = res.data?.book || [];
  return (Array.isArray(books) ? books : []).map(normalizeBook);
}

export async function getDetail(id) {
  const res = await get(`/series/${id}`, { quality: QUALITY });
  if (!res.data) throw new Error("Drama not found");

  const book = res.data.book || {};
  const chapters = res.data.chapters || [];

  return {
    id: String(book.id || id),
    title: book.name || book.bookName || "",
    cover: book.cover || book.coverWap || "",
    synopsis: book.introduction || book.description || "",
    totalEpisodes: book.chapterCount || chapters.length,
    isCompleted: book.isCompleted === true || book.isCompleted === 1,
    tags: book.tags || [],
    categories: book.tags || [],
    // Simpan raw chapter ID untuk digunakan di getEpisodeStream
    _rawChapters: chapters,
    episodes: chapters.map((ch) => ({
      number: (ch.index ?? 0) + 1,
      label: ch.eps || `EP-${ch.index + 1}`,
      title: ch.name || ch.eps || `Episode ${ch.index + 1}`,
      videoUrl: ch.videoPath || "",
      // Jangan anggap locked hanya karena videoPath kosong di /series
      // episode berbayar tetap bisa diakses jika user subscribe
      locked: ch.isLock === true,
      subtitles: ch.subtitle || [],
      _chapterId: ch.id || ch.chapterId || null,
      _chapterIndex: ch.index ?? 0,
    })),
  };
}

// Fetch video URL langsung untuk satu chapter (mendukung episode subscriber)
async function fetchChapterVideoUrl(chapterId) {
  console.log(`[fetchChapterVideoUrl] chapterId=${chapterId}`);

  // Helper: ekstrak URL dari berbagai bentuk response
  function extractUrl(d) {
    if (!d) return null;
    const candidates = [
      d.videoPath, d.video, d.videoUrl, d.url,
      d.playUrl, d.play_url, d.stream, d.streamUrl,
      d.data?.videoPath, d.data?.video, d.data?.url,
    ];
    for (const c of candidates) {
      if (!c) continue;
      // Decode aliplay base64 proxy
      const extracted = extractFromAliplay(c) || decodeVideoUrl(c);
      if (extracted && extracted.startsWith("http")) return extracted;
    }
    return null;
  }

  const tryCalls = [
    // 1. api.aiodrama.vip — GET /aliplay/chapter/:id  (pola yang terlihat di Network)
    async () => {
      const d = await apiGet(`/aliplay/chapter/${chapterId}`);
      console.log("[1] aliplay/chapter:", JSON.stringify(d).slice(0, 200));
      return extractUrl(d) || extractUrl(d?.data);
    },
    // 2. api.aiodrama.vip — GET /drama/dramabox/chapter/:id
    async () => {
      const d = await apiGet(`/drama/${PLATFORM}/chapter/${chapterId}`, { quality: QUALITY });
      console.log("[2] api drama/chapter:", JSON.stringify(d).slice(0, 200));
      return extractUrl(d) || extractUrl(d?.data);
    },
    // 3. api.aiodrama.vip — POST /drama/dramabox/play
    async () => {
      const d = await apiPost(`/drama/${PLATFORM}/play`, { chapterId, quality: QUALITY, lang: LANG });
      console.log("[3] api drama/play:", JSON.stringify(d).slice(0, 200));
      return extractUrl(d) || extractUrl(d?.data);
    },
    // 4. aiodrama.vip web — GET /chapter/:id
    async () => {
      const d = await get(`/chapter/${chapterId}`, { quality: QUALITY });
      console.log("[4] web chapter:", JSON.stringify(d).slice(0, 200));
      return extractUrl(d) || extractUrl(d?.data);
    },
    // 5. aiodrama.vip web — POST /play
    async () => {
      const d = await post("/play", { chapterId, quality: QUALITY });
      console.log("[5] web play:", JSON.stringify(d).slice(0, 200));
      return extractUrl(d) || extractUrl(d?.data);
    },
    // 6. api.aiodrama.vip — GET /aliplay/video path langsung
    async () => {
      const d = await apiGet(`/drama/${PLATFORM}/series/chapter`, { chapterId, quality: QUALITY });
      console.log("[6] series/chapter:", JSON.stringify(d).slice(0, 200));
      return extractUrl(d) || extractUrl(d?.data);
    },
  ];

  for (let i = 0; i < tryCalls.length; i++) {
    try {
      const url = await tryCalls[i]();
      if (url) {
        console.log(`[fetchChapterVideoUrl] ✓ Endpoint ${i + 1} berhasil: ${url.slice(0, 80)}...`);
        return url;
      }
    } catch (e) {
      console.log(`[fetchChapterVideoUrl] ✗ Endpoint ${i + 1} gagal:`, e.message?.slice(0, 80));
    }
  }

  console.log(`[fetchChapterVideoUrl] Semua endpoint gagal untuk chapterId=${chapterId}`);
  return null;
}

export async function getEpisodeStream(id, ep) {
  const detail = await getDetail(id);
  const episode = detail.episodes.find((e) => e.number === ep);

  if (!episode) throw new Error(`Episode ${ep} tidak ditemukan`);

  // Jika episode tidak locked tapi videoUrl kosong, fetch terpisah (episode subscriber)
  let videoUrl = episode.videoUrl || null;

  if (!videoUrl && !episode.locked && episode._chapterId) {
    console.log(`[Stream] Episode ${ep} belum punya URL, fetch via chapterId=${episode._chapterId}...`);
    videoUrl = await fetchChapterVideoUrl(episode._chapterId);
  }

  // Fallback: coba langsung dengan chapter index sebagai ID
  if (!videoUrl && !episode.locked) {
    const rawChapter = detail._rawChapters?.[episode._chapterIndex];
    if (rawChapter) {
      const altId = rawChapter.id || rawChapter.chapterId || rawChapter.chapter_id;
      if (altId && altId !== episode._chapterId) {
        console.log(`[Stream] Retry dengan altId=${altId}...`);
        videoUrl = await fetchChapterVideoUrl(altId);
      }
    }
  }

  return {
    episodeNumber: episode.number,
    locked: episode.locked,
    videoUrl,
    subtitles: episode.subtitles || [],
  };
}
