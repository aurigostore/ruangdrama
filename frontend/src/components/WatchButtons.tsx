"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLastEp } from "@/lib/progress";

interface Props {
  dramaId: string;
  firstEp: number;
}

export default function WatchButtons({ dramaId, firstEp }: Props) {
  const [lastEp, setLastEp] = useState<number | null>(null);

  useEffect(() => {
    const ep = getLastEp(dramaId);
    if (ep && ep >= firstEp) setLastEp(ep);
  }, [dramaId, firstEp]);

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
      {lastEp && lastEp > firstEp && (
        <Link
          href={`/watch/${dramaId}/${lastEp}`}
          className="btn btn-primary"
          style={{ width: "fit-content" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Lanjut Ep {lastEp}
        </Link>
      )}
      <Link
        href={`/watch/${dramaId}/${firstEp}`}
        className={lastEp && lastEp > firstEp ? "btn btn-secondary" : "btn btn-primary"}
        style={{ width: "fit-content" }}
      >
        {lastEp && lastEp > firstEp ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.32"/>
            </svg>
            Dari Awal
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Tonton Ep {firstEp}
          </>
        )}
      </Link>
    </div>
  );
}
