"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";

function NavigationProgressInner() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathname = useRef(pathname);

  // Reset & start progress bar saat pathname berubah
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Pathname baru = navigasi selesai
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      prevPathname.current = pathname;
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Expose fungsi start ke window agar bisa dipanggil dari DramaCard
  useEffect(() => {
    (window as any).__navStart = () => {
      setVisible(true);
      setProgress(15);

      let p = 15;
      timerRef.current = setInterval(() => {
        // Simulasi progress yang melambat mendekati 85%
        const increment = p < 40 ? 12 : p < 60 ? 6 : p < 75 ? 3 : 1;
        p = Math.min(85, p + increment);
        setProgress(p);
      }, 200);
    };

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Cleanup timer saat progress selesai
  useEffect(() => {
    if (progress === 100 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [progress]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #e63946, #ff6b7a)",
          borderRadius: "0 2px 2px 0",
          transition: progress === 100
            ? "width 0.15s ease, opacity 0.3s ease"
            : "width 0.2s ease",
          opacity: progress === 100 ? 0 : 1,
          boxShadow: "0 0 10px rgba(230,57,70,0.6)",
        }}
      />
    </div>
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
