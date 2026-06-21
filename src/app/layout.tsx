import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Static hardcoded script — no user input, safe from XSS */}
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
            background: "rgba(var(--bg-card-rgb, 255,255,255), 0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
            transition: "background 0.2s ease",
          }}
        >
          <nav
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
              <span style={{ color: "var(--accent)", fontSize: 16, lineHeight: 1 }}>◈</span>
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
