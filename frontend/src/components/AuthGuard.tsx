"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Halaman yang tidak perlu auth
const PUBLIC_PATHS = ["/login", "/admin"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      setChecking(false);
      setAuthorized(true);
      return;
    }

    const storedKey = localStorage.getItem("rd_key");
    const storedExpires = localStorage.getItem("rd_expires");

    if (!storedKey) {
      router.replace("/login");
      return;
    }

    if (storedExpires) {
      const expires = new Date(storedExpires);
      if (new Date() > expires) {
        localStorage.removeItem("rd_key");
        localStorage.removeItem("rd_expires");
        localStorage.removeItem("rd_info");
        router.replace("/login");
        return;
      }
    }

    fetch(`${API}/api/auth/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storedKey }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.valid) {
          if (json.expiresAt) localStorage.setItem("rd_expires", json.expiresAt);
          // Simpan info lengkap untuk profil VIP
          localStorage.setItem("rd_info", JSON.stringify({
            note: json.note || "",
            createdAt: json.createdAt || "",
            expiresAt: json.expiresAt || storedExpires || "",
            daysLeft: json.daysLeft ?? null,
            hoursLeft: json.hoursLeft ?? null,
          }));
          setAuthorized(true);
        } else {
          localStorage.removeItem("rd_key");
          localStorage.removeItem("rd_expires");
          localStorage.removeItem("rd_info");
          router.replace("/login");
        }
      })
      .catch(() => { setAuthorized(true); })
      .finally(() => { setChecking(false); });
  }, [pathname, router]);

  if (checking) {
    return (
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#000", zIndex: 9999,
      }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid rgba(230,57,70,0.3)",
          borderTopColor: "#e63946",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
