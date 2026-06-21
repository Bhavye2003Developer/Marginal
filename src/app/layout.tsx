import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="border-b border-gray-200 bg-white px-4 py-2 flex gap-4 text-sm">
          <Link href="/library" className="font-semibold hover:text-blue-600">Library</Link>
          <Link href="/highlights" className="hover:text-blue-600">Highlights</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
