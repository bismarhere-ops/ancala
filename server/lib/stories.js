'use strict';

/**
 * Mountain "stories": the friendly, visitor-facing layer on top of a trail's
 * safety record — a tagline, highlights, headline stats, a packing list with
 * reasons, a plain-language assessment, and a photo gallery.
 *
 * Content lives in config.stories.path, keyed by trail slug. It is either the
 * owner's own material (origin "owner") or web research (origin "research")
 * where every highlight carries a source. Nothing here is guessed: a section
 * that could not be verified is simply absent and named in `unknown`.
 */

const fs = require('fs');

const ORIGINS = new Set(['owner', 'research']);
const SECTIONS = ['highlights', 'stats', 'packing', 'assessment'];

// Max items per section and max string lengths, mirroring what the UI lays out.
const LIMITS = {
  tagline: 90,
  highlights: { max: 3, title: 40, body: 220 },
  stats: { max: 4, value: 20, label: 30, note: 70 },
  packing: { max: 4, item: 30, why: 120 },
  assessment: { max: 3, title: 40, body: 220 },
  gallery: { max: 12, caption: 60 },
};

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

/** Throws with a clear message if a story record is malformed. */
function validate(slug, s) {
  const bad = (msg) => {
    throw new Error(`story "${slug}": ${msg}`);
  };
  const str = (v, max, what) => {
    if (!isStr(v)) bad(`${what} must be a non-empty string`);
    if (v.length > max) bad(`${what} is ${v.length} chars (max ${max})`);
  };

  if (!s || typeof s !== 'object') bad('must be an object');
  if (!ORIGINS.has(s.origin)) bad(`origin must be one of ${[...ORIGINS].join(', ')}`);
  if (s.tagline != null) str(s.tagline, LIMITS.tagline, 'tagline');

  for (const section of [...SECTIONS, 'gallery']) {
    const items = s[section] ?? [];
    if (!Array.isArray(items)) bad(`${section} must be an array`);
    const lim = LIMITS[section];
    if (items.length > lim.max) bad(`${section} has ${items.length} items (max ${lim.max})`);
    items.forEach((item, i) => {
      for (const [field, max] of Object.entries(lim)) {
        if (field === 'max') continue;
        if (field === 'note' && item.note == null) continue;
        str(item[field], max, `${section}[${i}].${field}`);
      }
      if (section === 'gallery' && !/^\/mountains\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|webp|png)$/.test(item.src || '')) {
        bad(`gallery[${i}].src must be a /mountains/<slug>/<file> image path`);
      }
    });
  }

  // Researched highlights must say where they came from.
  if (s.origin === 'research') {
    (s.highlights ?? []).forEach((h, i) => {
      if (!/^https?:\/\//.test(h.source || '')) bad(`highlights[${i}] needs a source URL`);
    });
  }
  if (s.sources != null && !Array.isArray(s.sources)) bad('sources must be an array');
}

/** Reads and validates the stories file. Returns an empty Map if absent. */
function readStories(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    throw new Error(`stories file is not valid JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('stories file must contain an object keyed by trail slug');
  }
  const map = new Map();
  for (const [slug, story] of Object.entries(parsed)) {
    validate(slug, story);
    map.set(slug, story);
  }
  return map;
}

/** The public shape: only the fields clients render, with empty sections as []. */
function mapStory(s) {
  if (!s) return null;
  return {
    origin: s.origin,
    tagline: s.tagline ?? null,
    highlights: s.highlights ?? [],
    stats: s.stats ?? [],
    packing: s.packing ?? [],
    assessment: s.assessment ?? [],
    gallery: s.gallery ?? [],
    sources: s.sources ?? [],
    unknown: s.unknown ?? [],
    updated: s.updated ?? null,
  };
}

module.exports = { readStories, mapStory, validate, LIMITS };
