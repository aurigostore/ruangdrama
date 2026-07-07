export interface WatchProgress {
  id: string;
  title: string;
  cover: string;
  episode: number;
  savedAt: number; // timestamp
}

const KEY = "dracin_progress";

export function saveProgress(id: string, episode: number, title: string, cover: string) {
  if (typeof window === "undefined") return;
  const all = getProgress();
  const updated: WatchProgress = { id, title, cover, episode, savedAt: Date.now() };
  // Overwrite jika sudah ada, tambah jika baru
  const others = all.filter((p) => p.id !== id);
  const next = [updated, ...others].slice(0, 20); // max 20
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getProgress(): WatchProgress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLastEp(id: string): number | null {
  const all = getProgress();
  return all.find((p) => p.id === id)?.episode ?? null;
}

export function removeProgress(id: string) {
  if (typeof window === "undefined") return;
  const next = getProgress().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
