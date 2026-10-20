"use client";

import { useEffect } from "react";
import { Instagram } from "lucide-react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SRC = "https://www.instagram.com/embed.js";

/**
 * Hand-picked posts rendered with Instagram's own embed script. Each post
 * starts as a plain link, so it still works when the script is blocked or the
 * hiker is offline.
 */
export function InstagramFeed({ posts, account }: { posts: string[]; account: string }) {
  useEffect(() => {
    if (posts.length === 0) return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    if (document.querySelector(`script[src="${EMBED_SRC}"]`)) return;
    const s = document.createElement("script");
    s.src = EMBED_SRC;
    s.async = true;
    document.body.appendChild(s);
  }, [posts]);

  if (posts.length === 0) return null;

  return (
    <section className="container py-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <Instagram className="size-4" /> From the trail
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">@{account} on Instagram</h2>
        </div>
        <a
          href={`https://www.instagram.com/${account}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary"
        >
          Follow →
        </a>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((url) => (
          <blockquote
            key={url}
            className="instagram-media !m-0 !min-w-0 !max-w-full rounded-xl border bg-card p-6"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
          >
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary">
              View this post on Instagram →
            </a>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
