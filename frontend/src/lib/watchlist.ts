import type { Drama } from "./api";

const KEY = "dracin_watchlist";

export function getFavorites(): Drama[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((d) => d.id === id);
}

export function toggleFavorite(drama: Drama): boolean {
  if (typeof window === "undefined") return false;
  const all = getFavorites();
  const exists = all.some((d) => d.id === drama.id);
  const next = exists ? all.filter((d) => d.id !== drama.id) : [drama, ...all];
  localStorage.setItem(KEY, JSON.stringify(next));
  return !exists; // true = baru ditambahkan
}

export function removeFavorite(id: string) {
  if (typeof window === "undefined") return;
  const next = getFavorites().filter((d) => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
