import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

export const metadata: Metadata = {
  title: { default: "Cyberus Challenges", template: "%s · Cyberus" },
  description: "Cyberus Orientation Day beginner mini-CTF",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: { url: "/cyberus-icon.png", type: "image/png" },
    apple: "/cyberus-icon.png",
  },
};
export const viewport: Viewport = {
  themeColor: "#238f95",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorker />
        <header
          className="shell no-print site-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 0",
          }}
        >
          <Link
            href="/"
            className="site-brand"
            aria-label="Cyberus Challenges home"
          >
            <Image
              src="/cyberus-logo.png"
              width={1774}
              height={887}
              className="site-logo"
              alt="Cyberus Stud — SeeCurity Encapsulated"
              priority
            />
          </Link>
          <Link href="/leaderboard" className="eyebrow header-board">
            Breach board
          </Link>
        </header>
        {children}
        <footer
          className="shell"
          style={{
            padding: "44px 0 28px",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          Cyberus Orientation Day · Safe simulated challenges
        </footer>
      </body>
    </html>
  );
}
