import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import OfflineManager from "@/components/ui/OfflineManager";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Marginal",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#5B5BD6" />
        {/* Runs before React hydration to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body style={{ fontFamily: "var(--font-sans)", background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "color-mix(in srgb, var(--bg-card) 85%, transparent)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
            transition: "background 0.2s ease",
          }}
        >
          <nav
            className="header-inner"
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 24px",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Link
              href="/library"
              style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}
            >
              <span style={{ color: "var(--primary)", fontSize: 16, lineHeight: 1 }}>◈</span>
              Marginal
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <NavLink href="/library">Library</NavLink>
              <NavLink href="/highlights">Highlights</NavLink>
              <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 6px" }} />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        {children}
        <OfflineManager />
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="nav-link">
      {children}
    </Link>
  );
}
