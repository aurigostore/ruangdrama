"use client";
import dynamic from "next/dynamic";

// Load ClientShell (dan semua komponen di dalamnya) client-only
// mencegah SSR error dari usePathname/useRouter/localStorage
const ClientShellDynamic = dynamic(() => import("./ClientShell"), { ssr: false });

export default function ClientShellWrapper({ children }: { children: React.ReactNode }) {
  return <ClientShellDynamic>{children}</ClientShellDynamic>;
}
