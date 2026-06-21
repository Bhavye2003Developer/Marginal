import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-[#F9F8F6] text-[#1A1A1A] min-h-screen antialiased">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E6E1]">
          <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/library" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <span className="text-[#5B5BD6] text-base">◈</span>
              <span>Marginal</span>
            </Link>
            <div className="flex items-center gap-1">
              <NavLink href="/library">Library</NavLink>
              <NavLink href="/highlights">Highlights</NavLink>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F0EFE9] transition-all font-medium"
    >
      {children}
    </Link>
  );
}
