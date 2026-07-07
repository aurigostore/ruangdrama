"use client";
import { useState, useEffect, useRef } from "react";

// Genre populer sebagai fallback (dari data DramaBox umum)
const DEFAULT_GENRES = [
  "Semua", "Romantis", "Drama", "Aksi", "Komedi",
  "Thriller", "Misteri", "Keluarga", "Historis", "Fantasy",
];

interface Props {
  activeGenre: string;
  onChange: (genre: string) => void;
  items: { tags?: string[]; categories?: string[] }[];
}

export default function GenreTabs({ activeGenre, onChange, items }: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ekstrak genre unik dari items yang sudah di-load
    const found = new Set<string>();
    items.forEach((item) => {
      (item.tags ?? item.categories ?? []).forEach((t) => {
        if (t && t.length > 0) found.add(t);
      });
    });

    const fromItems = Array.from(found).slice(0, 15);
    const merged = fromItems.length >= 5
      ? ["Semua", ...fromItems]
      : DEFAULT_GENRES;
    setGenres(merged);
  }, [items]);

  return (
    <div className="genre-tabs-wrap">
      <div className="genre-tabs" ref={scrollRef}>
        {genres.map((g) => (
          <button
            key={g}
            className={`genre-tab${activeGenre === g ? " genre-tab--active" : ""}`}
            onClick={() => onChange(g)}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
