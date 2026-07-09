"use client";
import { Suspense } from "react";
import Navbar from "./Navbar";
import NavigationProgress from "./NavigationProgress";
import BottomNav from "./BottomNav";
import AuthGuard from "./AuthGuard";

// Semua komponen yang pakai usePathname/useRouter dibungkus di sini
// di dalam Suspense agar tidak menyebabkan hydration mismatch
export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AuthGuard>
        <NavigationProgress />
        <Navbar />
        {children}
        <BottomNav />
      </AuthGuard>
    </Suspense>
  );
}
