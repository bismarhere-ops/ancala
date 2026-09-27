/**
 * Card photos from the design spec (Unsplash). These are illustrative: they
 * are not verified to show the named mountain, so cards label them
 * "Illustrative photo". A mountain's own gallery (e.g. Bromo, from the
 * organiser's deck) always takes precedence.
 */
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const SPEC_PHOTOS: Record<string, string> = {
  rinjani: u("photo-1570789210967-2cac24afeb00"),
  bromo: u("photo-1588668214407-6ea9a6d8c272"),
  semeru: u("photo-1544735716-392fe2489ffa"),
  ijen: u("photo-1518457607834-6e8d80c183c5"),
  merapi: u("photo-1506744038136-46273834b3fb"),
  prau: u("photo-1464822759023-fed622ff2c3b"),
  papandayan: u("photo-1486870591958-9b9d0d1dda99"),
  lawu: u("photo-1519681393784-d120267933ba"),
  agung: u("photo-1537996194471-e657df975ab4"),
};

export function coverFor(slug: string, ownCover: string | null) {
  if (ownCover) return { src: ownCover, illustrative: false };
  const spec = SPEC_PHOTOS[slug];
  return spec ? { src: spec, illustrative: true } : null;
}
