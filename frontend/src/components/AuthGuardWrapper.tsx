"use client";
import dynamic from "next/dynamic";

// AuthGuard di-load client-only (ssr: false) untuk menghindari hydration mismatch
// karena bergantung pada localStorage dan usePathname
const AuthGuardClient = dynamic(() => import("./AuthGuard"), { ssr: false });

export default function AuthGuardWrapper({ children }: { children: React.ReactNode }) {
  return <AuthGuardClient>{children}</AuthGuardClient>;
}
