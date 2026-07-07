const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Drama {
  id: string;
  title: string;
  cover: string;
  totalEpisodes: number;
  synopsis?: string;
  isCompleted: boolean;
  categories?: string[];
  tags?: string[];
  language?: string;
  playCount?: string;
}

export interface Episode {
  number: number;
  label: string;
  title: string;
  videoUrl: string;
  locked: boolean;
  subtitles: { language: string; display_name: string; subtitle: string }[];
}

export interface DramaDetail extends Drama {
  episodes: Episode[];
}

export interface StreamInfo {
  episodeNumber: number;
  locked: boolean;
  videoUrl: string | null;
  subtitles?: { language: string; display_name: string; subtitle: string }[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Unknown error");
  return json;
}

export async function getTrending(): Promise<Drama[]> {
  const json = await get<{ success: boolean; data: Drama[] }>("/api/dramabox/trending");
  return json.data;
}

export async function getForYou(page = 1): Promise<{ items: Drama[]; hasMore: boolean }> {
  const json = await get<{ success: boolean; items: Drama[]; pageInfo: unknown }>(
    `/api/dramabox/foryou?page=${page}`
  );
  return { items: json.items || [], hasMore: !!json.pageInfo };
}

export async function getHotRank(): Promise<Drama[]> {
  // Gunakan tab ketiga dari aiodrama (index 2)
  try {
    const json = await get<{ success: boolean; items: Drama[] }>("/api/dramabox/foryou?page=1");
    return json.items?.slice(0, 12) || [];
  } catch {
    return [];
  }
}

export async function searchDramas(query: string): Promise<Drama[]> {
  const json = await get<{ success: boolean; data: Drama[] }>(
    `/api/dramabox/search?query=${encodeURIComponent(query)}`
  );
  return json.data;
}

export async function getDetail(id: string): Promise<DramaDetail> {
  const json = await get<{ success: boolean; data: DramaDetail }>(`/api/dramabox/detail/${id}`);
  return json.data;
}

export async function getStream(id: string, ep: number): Promise<StreamInfo> {
  const json = await get<{ success: boolean; data: StreamInfo }>(`/api/dramabox/stream/${id}/${ep}`);
  return json.data;
}
