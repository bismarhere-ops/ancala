import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest by Next. Makes the app installable and gives
// it a standalone (app-like) window on mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forest Guardian — Hike. Protect. Restore.",
    short_name: "Forest Guardian",
    description:
      "Trails, safety and live conditions for hikers — works offline once a page has loaded.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f6",
    theme_color: "#2D5A3D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
