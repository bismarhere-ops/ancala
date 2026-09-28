/**
 * Card photos, verified to show the named mountain.
 *
 * Priority: the mountain's own gallery (e.g. Bromo, from the organiser's
 * deck) > a verified photo listed here > the drawn outline. The design
 * spec's Unsplash photos were removed on 2026-09-28: they could not be
 * verified and several showed other mountains.
 *
 * To add one: save the file under web/public/mountains/<slug>/ (or use a
 * stable URL on an allowed host) and record where it came from, so the
 * credit is shown on the card.
 */
export interface VerifiedPhoto {
  src: string;
  /** Shown on the card, e.g. "Photo: Jane Doe / Wikimedia Commons, CC BY-SA 4.0". */
  credit: string;
  /** Page the photo came from, for auditing. */
  source: string;
}

export const VERIFIED_PHOTOS: Record<string, VerifiedPhoto> = {};

export function coverFor(slug: string, ownCover: string | null): { src: string; credit: string | null } | null {
  if (ownCover) return { src: ownCover, credit: null };
  const v = VERIFIED_PHOTOS[slug];
  return v ? { src: v.src, credit: v.credit } : null;
}
