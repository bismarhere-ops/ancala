import data from "@/content/instagram-posts.json";

export const INSTAGRAM_ACCOUNT: string = data.account;

/**
 * Turns a pasted Instagram link into a clean permalink, or null if it is not
 * a post/reel link. Query strings (utm_source, xtok, igsh…) are dropped so
 * tracking tokens never reach the page.
 */
export function cleanPermalink(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "www.instagram.com" && url.hostname !== "instagram.com") return null;
  const m = url.pathname.match(/^\/(?:[\w.]+\/)?(p|reel)\/([\w-]+)\/?$/);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/`;
}

export function instagramPosts(): string[] {
  const out: string[] = [];
  for (const raw of data.posts as string[]) {
    const clean = cleanPermalink(raw);
    if (clean && !out.includes(clean)) out.push(clean);
  }
  return out;
}
