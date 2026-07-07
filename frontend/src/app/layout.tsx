import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NavigationProgress from "@/components/NavigationProgress";
import AuthGuard from "@/components/AuthGuard";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: { default: "Ruang Drama", template: "%s | Ruang Drama" },
  description: "Nonton drama China terbaru dan terpopuler di Ruang Drama. Tanpa iklan, kualitas HD, subtitle Indonesia.",
  keywords: ["drama china", "dramabox", "streaming", "nonton online", "ruang drama"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ruang Drama",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-180.png",
  },
  themeColor: "#e63946",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ruang Drama" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body suppressHydrationWarning>
        <PWARegister />
        <AuthGuard>
          <NavigationProgress />
          <Navbar />
          <div className="page" suppressHydrationWarning>
            {children}
          </div>
          <footer className="footer">
            Ruang Drama &copy; {new Date().getFullYear()} — Streaming Drama China
          </footer>
        </AuthGuard>
      </body>
    </html>
  );
}
