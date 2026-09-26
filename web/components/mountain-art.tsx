/**
 * Decorative mountain silhouette for trail cards. The dataset has no photos
 * (and we don't invent them), so each card gets a drawn ridge instead: the
 * main peak's height follows the trail's real elevation gain, and the shape
 * of the side ridges is seeded from the slug so every mountain looks
 * different but stable between renders.
 */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

const W = 400;
const H = 144;

function ridge(rand: () => number, base: number, amp: number, peakX: number, peakH: number) {
  const pts: string[] = [`0,${H}`];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const x = (W / steps) * i;
    // Rise towards the main peak, with seeded jitter along the ridge.
    const closeness = 1 - Math.min(1, Math.abs(x - peakX) / (W * 0.55));
    const y = base - closeness * peakH - rand() * amp;
    pts.push(`${x.toFixed(0)},${Math.max(8, y).toFixed(0)}`);
  }
  pts.push(`${W},${H}`);
  return pts.join(" ");
}

export function MountainArt({ slug, elevationGainM }: { slug: string; elevationGainM: number }) {
  const rand = rng(hash(slug));
  // 0 m → gentle hill, ~2500 m+ → tall peak.
  const scale = Math.min(1, Math.max(0.15, (elevationGainM || 0) / 2500));
  const peakX = W * (0.45 + rand() * 0.35);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <polygon points={ridge(rand, H - 20, 14, W * rand(), 40)} fill="rgba(255,255,255,0.08)" />
      <polygon points={ridge(rand, H - 6, 10, peakX, 30 + scale * 90)} fill="rgba(255,255,255,0.12)" />
      <polygon points={ridge(rand, H + 4, 6, W - peakX, 20)} fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}
