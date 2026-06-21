import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200">
          <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/library" className="flex items-center gap-2 font-semibold text-stone-900">
              <span className="text-violet-600 text-lg">◈</span>
              <span>Marginal</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/library" className="text-stone-600 hover:text-violet-600 transition-colors font-medium">
                Library
              </Link>
              <Link href="/highlights" className="text-stone-600 hover:text-violet-600 transition-colors font-medium">
                Highlights
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
