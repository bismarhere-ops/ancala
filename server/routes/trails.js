'use strict';

const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { HttpError } = require('../middleware/error');

const { splitList } = require('../lib/csv');
const { coords } = require('../lib/geo');
const { SEVERITY_RANK } = require('../lib/advisories');

const router = express.Router();

// --- Helpers --------------------------------------------------------------
function parseJson(col) {
  try { return col ? JSON.parse(col) : []; } catch { return []; }
}

function mapAdvisory(a) {
  return {
    id: a.id,
    type: a.type,
    severity: a.severity,
    headline: a.headline,
    detail: a.detail,
    source: a.source,
    effectiveFrom: a.effective_from,
    effectiveUntil: a.effective_until,
  };
}

/** The most severe level among a trail's active advisories, or null. */
function highestSeverity(advisories) {
  let level = null;
  let rank = 0;
  for (const a of advisories) {
    const r = SEVERITY_RANK[a.severity] || 0;
    if (r > rank) {
      rank = r;
      level = a.severity;
    }
  }
  return level;
}

/**
 * Shapes a mountain_profiles row into grouped sections. NULL in the database
 * means the source data was "Unknown" — it is passed through as null so the
 * UI can say so explicitly rather than rendering a blank.
 */
function mapProfile(p) {
  if (!p) return null;
  return {
    accessStatus: p.access_status,
    dataReliability: p.data_reliability,
    dataReliabilityTier: p.data_reliability_tier,
    sourceLastUpdated: p.source_last_updated,
    elevationM: p.elevation_m,
    nearestCity: p.nearest_city,
    basecamp: {
      name: p.basecamp_name,
      access: p.basecamp_access,
      coordinates: coords(p.basecamp_lat, p.basecamp_lng),
    },
    summitCoordinates: coords(p.summit_lat, p.summit_lng),
    route: {
      distanceOneWayKm: p.distance_one_way_km,
      distanceRoundTripKm: p.distance_round_trip_km,
      ascentTimeHours: p.ascent_time_hours,
      descentTimeHours: p.descent_time_hours,
      numPos: p.num_pos,
      posBreakdown: p.pos_breakdown,
      elevationGainSegments: p.elevation_gain_segments,
      trailType: splitList(p.trail_type),
    },
    assessment: {
      difficultyRaw: p.difficulty_raw,
      riskRaw: p.risk_raw,
      keyHazards: splitList(p.key_hazards),
      criticalPoints: p.critical_points,
    },
    logistics: {
      distanceFromSurabayaKm: p.distance_from_surabaya_km,
      travelTimeFromSurabayaHours: p.travel_time_from_surabaya_hours,
      recommendedTransport: p.recommended_transport,
      registrationMethod: p.registration_method,
      permitRequired: p.permit_required,
      entryFeeIdr: p.entry_fee_idr,
    },
    facilities: {
      waterSources: p.water_sources,
      campingArea: p.camping_area,
      emergencyShelter: p.emergency_shelter,
      signalCoverage: p.signal_coverage,
      toiletWarung: p.toilet_warung,
    },
    conservation: {
      environmentalCondition: p.environmental_condition,
      commonIssues: splitList(p.common_issues),
      reforestationActivity: p.reforestation_activity,
      csrPotential: p.csr_potential,
      recommendedConservation: splitList(p.recommended_conservation),
    },
    experience: {
      bestTimeMonths: p.best_time_months,
      sunriseSunsetRating: p.sunrise_sunset_rating,
      uniqueSellingPoint: p.unique_selling_point,
      crowdLevel: p.crowd_level,
    },
    safety: {
      minimumGear: splitList(p.minimum_gear),
      waterRequirementLiters: p.water_requirement_liters,
      emergencyContact: p.emergency_contact,
      commonAccidentTypes: splitList(p.common_accident_types),
    },
    offlineMapAvailable: p.offline_map_available,
  };
}

function mapTrail(row, checkpoints = [], profile = null, advisories = []) {
  const active = advisories.map(mapAdvisory);
  // A live danger advisory (fire, flood, eruption) overrides the permanent
  // record and takes the trail out of planning until it is resolved.
  const hasDanger = active.some((a) => a.severity === 'danger');

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region,
    summary: row.summary,
    distanceKm: row.distance_km,
    elevationGainM: row.elevation_gain_m,
    estimatedMinutes: row.estimated_min,
    difficulty: row.difficulty,
    risk: row.risk,
    popularity: row.popularity,
    coordinates: coords(row.lat, row.lng),
    tags: parseJson(row.tags),
    hazards: parseJson(row.hazards),
    // Denormalised onto the trail so list views can badge without the full
    // profile payload. Both queries LEFT JOIN the profile, so there is one
    // input contract; null only when a trail has no profile at all.
    accessStatus: row.access_status ?? null,
    dataReliability: row.data_reliability ?? null,
    dataReliabilityTier: row.data_reliability_tier ?? null,
    // Live conditions, and the derived policy the clients render without
    // re-implementing the rules.
    advisories: active,
    advisoryLevel: highestSeverity(active),
    plannable: row.access_status !== 'closed' && !hasDanger,
    requiresAlertCheck: row.access_status === 'conditional',
    checkpoints: checkpoints.map((c) => ({
      position: c.position,
      name: c.name,
      km: c.km,
      elevationM: c.elevation_m,
      etaMin: c.eta_min,
      notes: c.notes,
    })),
    profile: mapProfile(profile),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Schemas --------------------------------------------------------------
const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  difficulty: z.enum(['easy', 'moderate', 'hard', 'expert']).optional(),
  region: z.string().trim().max(80).optional(),
  access: z.enum(['open', 'conditional', 'closed']).optional(),
  reliability: z.enum(['high', 'medium', 'low']).optional(),
  sort: z.enum(['popular', 'distance', 'elevation', 'time', 'name']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// --- Prepared statements ---------------------------------------------------
// better-sqlite3 does not cache compiled statements, so anything on a request
// path is prepared once here. The list query's SQL varies with the filter and
// sort combination, of which there is a small finite set, so it is memoised by
// its own text.
const SELECT_TRAIL_BY_SLUG = db.prepare(`
  SELECT t.*, p.access_status, p.data_reliability, p.data_reliability_tier
  FROM trails t
  LEFT JOIN mountain_profiles p ON p.trail_id = t.id
  WHERE t.slug = ?
`);
const SELECT_CHECKPOINTS = db.prepare(
  'SELECT * FROM checkpoints WHERE trail_id = ? ORDER BY position ASC'
);
const SELECT_PROFILE = db.prepare('SELECT * FROM mountain_profiles WHERE trail_id = ?');

// An advisory is showing when active and today is within its effective window.
// Ordered most-severe first so index 0 is the headline condition.
const ADVISORY_ACTIVE = `
  status = 'active'
  AND (effective_from IS NULL OR effective_from <= @today)
  AND (effective_until IS NULL OR effective_until >= @today)
`;
const ADVISORY_ORDER = `
  ORDER BY CASE severity WHEN 'danger' THEN 3 WHEN 'warning' THEN 2 ELSE 1 END DESC,
           updated_at DESC
`;
const SELECT_ACTIVE_ADVISORIES = db.prepare(
  `SELECT * FROM advisories WHERE ${ADVISORY_ACTIVE} ${ADVISORY_ORDER}`
);
const SELECT_ACTIVE_ADVISORIES_FOR_TRAIL = db.prepare(
  `SELECT * FROM advisories WHERE trail_id = @trail_id AND ${ADVISORY_ACTIVE} ${ADVISORY_ORDER}`
);

/** Today as YYYY-MM-DD, used to evaluate advisory effective windows. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

const statementCache = new Map();
function cachedPrepare(sql) {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

// --- Routes ---------------------------------------------------------------

// GET /api/trails  — list with search/filter/sort
router.get('/', (req, res) => {
  const q = listQuery.parse(req.query);
  const where = [];
  const params = {};

  if (q.q) {
    where.push('(t.name LIKE @q OR t.region LIKE @q OR t.summary LIKE @q)');
    params.q = `%${q.q}%`;
  }
  if (q.difficulty) {
    where.push('t.difficulty = @difficulty');
    params.difficulty = q.difficulty;
  }
  if (q.region) {
    where.push('t.region = @region');
    params.region = q.region;
  }
  if (q.access) {
    where.push('p.access_status = @access');
    params.access = q.access;
  }
  if (q.reliability) {
    where.push('p.data_reliability_tier = @reliability');
    params.reliability = q.reliability;
  }

  const sortMap = {
    popular:   't.popularity DESC, t.name ASC',
    distance:  't.distance_km ASC',
    elevation: 't.elevation_gain_m ASC',
    time:      't.estimated_min ASC',
    name:      't.name ASC',
  };
  const orderBy = sortMap[q.sort] || sortMap.popular;

  const limit = q.limit ?? 50;
  const offset = q.offset ?? 0;

  // LEFT JOIN so the original seed trails (which have no profile) still list.
  const from = `
    FROM trails t
    LEFT JOIN mountain_profiles p ON p.trail_id = t.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `;

  const rows = cachedPrepare(`
    SELECT t.*, p.access_status, p.data_reliability, p.data_reliability_tier
    ${from}
    ORDER BY ${orderBy}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  const total = cachedPrepare(`SELECT COUNT(*) AS n ${from}`).get(params).n;

  // One query for every active advisory, grouped in memory — the table is
  // small and this avoids a per-trail query on the list path.
  const byTrail = new Map();
  for (const a of SELECT_ACTIVE_ADVISORIES.all({ today: today() })) {
    const arr = byTrail.get(a.trail_id);
    if (arr) arr.push(a);
    else byTrail.set(a.trail_id, [a]);
  }

  res.json({
    data: rows.map((r) => mapTrail(r, [], null, byTrail.get(r.id) || [])),
    pagination: { total, limit, offset },
  });
});

/** Loads a trail with its checkpoints and mountain profile, or 404s. */
function loadTrail(slug) {
  const row = SELECT_TRAIL_BY_SLUG.get(slug);
  if (!row) throw new HttpError(404, `Trail not found: ${slug}`);

  return {
    row,
    checkpoints: SELECT_CHECKPOINTS.all(row.id),
    profile: SELECT_PROFILE.get(row.id),
    advisories: SELECT_ACTIVE_ADVISORIES_FOR_TRAIL.all({ trail_id: row.id, today: today() }),
  };
}

// GET /api/trails/:slug  — detail (with checkpoints + full profile)
router.get('/:slug', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const { row, checkpoints, profile, advisories } = loadTrail(slug);
  res.json({ data: mapTrail(row, checkpoints, profile, advisories) });
});

// GET /api/trails/:slug/guide  — downloadable/offline guide (plain JSON)
//
// This is what a hiker carries once they lose signal, so it embeds the
// safety-critical profile fields rather than linking back to the API.
router.get('/:slug/guide', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const { row, checkpoints, profile, advisories } = loadTrail(slug);

  const trail = mapTrail(row, checkpoints, profile, advisories);
  const p = trail.profile;

  const guide = {
    schema: 'forest-guardian.guide/v2',
    generatedAt: new Date().toISOString(),
    dataReliability: p?.dataReliability ?? null,
    sourceLastUpdated: p?.sourceLastUpdated ?? null,
    accessStatus: p?.accessStatus ?? null,
    trail: {
      name: trail.name,
      region: trail.region,
      nearestCity: p?.nearestCity ?? null,
      elevationM: p?.elevationM ?? null,
      difficulty: trail.difficulty,
      difficultyRaw: p?.assessment.difficultyRaw ?? null,
      risk: trail.risk,
      riskRaw: p?.assessment.riskRaw ?? null,
      summary: trail.summary,
      distanceKm: trail.distanceKm,
      elevationGainM: trail.elevationGainM,
      estimatedMinutes: trail.estimatedMinutes,
      coordinates: trail.coordinates,
      summitCoordinates: p?.summitCoordinates ?? null,
    },
    basecamp: p?.basecamp ?? null,
    route: p?.route ?? null,
    checkpoints: trail.checkpoints,
    hazards: trail.hazards,
    // Live conditions travel with the offline guide so a hiker who downloaded
    // it before losing signal still sees the fire/flood warning.
    advisories: trail.advisories,
    criticalPoints: p?.assessment.criticalPoints ?? null,
    facilities: p?.facilities ?? null,
    preparation: {
      minimumGear: p?.safety.minimumGear ?? [],
      waterRequirementLiters: p?.safety.waterRequirementLiters ?? null,
      commonAccidentTypes: p?.safety.commonAccidentTypes ?? [],
      bestTimeMonths: p?.experience.bestTimeMonths ?? null,
      registrationMethod: p?.logistics.registrationMethod ?? null,
      permitRequired: p?.logistics.permitRequired ?? null,
    },
    emergency: {
      // National emergency number for Indonesia.
      rescue: '112',
      // Mountain-specific contact from the dataset; null where the source
      // had none, in which case fall back to the national number.
      localContact: p?.safety.emergencyContact ?? null,
      signalCoverage: p?.facilities.signalCoverage ?? null,
      emergencyShelter: p?.facilities.emergencyShelter ?? null,
    },
    tips: [
      'Tell someone your plan and expected return time.',
      'Turn back if weather deteriorates — summit optional, return mandatory.',
      p?.facilities.waterSources
        ? `Water: ${p.facilities.waterSources}`
        : 'Carry all your water — no confirmed sources on this trail.',
    ],
  };

  // A live danger advisory is the most urgent thing to say, so it wins.
  const danger = trail.advisories.find((a) => a.severity === 'danger');
  if (danger) {
    guide.warning = `ACTIVE ${danger.type.toUpperCase()} ADVISORY — ${danger.headline}. Do not attempt.`;
  } else if (p?.accessStatus === 'closed') {
    guide.warning = 'This mountain is CLOSED to hikers. Do not attempt.';
  } else if (p?.accessStatus === 'conditional') {
    guide.warning =
      'Access depends on the current volcanic alert level. Check PVMBG/BPPTKG status before departure.';
  }

  res.setHeader('Content-Disposition', `attachment; filename="${slug}-guide.json"`);
  res.json(guide);
});

module.exports = router;
