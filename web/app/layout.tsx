import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Forest Guardian — Hike. Protect. Restore.",
    template: "%s · Forest Guardian",
  },
  description:
    "A CSR program for hikers and forest communities: trails, safety, and measurable impact.",
  keywords: [
    "hiking", "trails", "reforestation", "CSR",
    "forest", "volunteer", "sustainability",
  ],
  openGraph: {
    title: "Forest Guardian",
    description: "Hike the wild. Guard the forest.",
    url: siteUrl,
    siteName: "Forest Guardian",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D5A3D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans">
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
