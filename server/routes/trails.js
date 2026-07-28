'use strict';

const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { HttpError } = require('../middleware/error');

const router = express.Router();

// --- Helpers --------------------------------------------------------------
function parseJson(col) {
  try { return col ? JSON.parse(col) : []; } catch { return []; }
}

/** Semicolon-delimited source fields become arrays for the client. */
function splitList(value) {
  if (!value) return [];
  return String(value).split(';').map((s) => s.trim()).filter(Boolean);
}

function coords(lat, lng) {
  return lat != null && lng != null ? { lat, lng } : null;
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

function mapTrail(row, checkpoints = [], profile = null) {
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
    // profile payload. The list query supplies these via JOIN; the detail
    // query does not, so fall back to the profile row. Null only when the
    // trail has no imported profile at all.
    accessStatus: row.access_status ?? profile?.access_status ?? null,
    dataReliability: row.data_reliability ?? profile?.data_reliability ?? null,
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
  reliability: z.enum(['High', 'Medium', 'Low']).optional(),
  sort: z.enum(['popular', 'distance', 'elevation', 'time', 'name']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

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
    // Reliability is stored with occasional qualifiers ("High (well-monitored
    // by PVMBG)"), so match on prefix rather than equality.
    where.push('p.data_reliability LIKE @reliability');
    params.reliability = `${q.reliability}%`;
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

  const rows = db.prepare(`
    SELECT t.*, p.access_status, p.data_reliability
    ${from}
    ORDER BY ${orderBy}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(params).n;

  res.json({
    data: rows.map((r) => mapTrail(r)),
    pagination: { total, limit, offset },
  });
});

/** Loads a trail with its checkpoints and mountain profile, or 404s. */
function loadTrail(slug) {
  const row = db.prepare('SELECT * FROM trails WHERE slug = ?').get(slug);
  if (!row) throw new HttpError(404, `Trail not found: ${slug}`);

  const checkpoints = db
    .prepare('SELECT * FROM checkpoints WHERE trail_id = ? ORDER BY position ASC')
    .all(row.id);
  const profile = db
    .prepare('SELECT * FROM mountain_profiles WHERE trail_id = ?')
    .get(row.id);

  return { row, checkpoints, profile };
}

// GET /api/trails/:slug  — detail (with checkpoints + full profile)
router.get('/:slug', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const { row, checkpoints, profile } = loadTrail(slug);
  res.json({ data: mapTrail(row, checkpoints, profile) });
});

// GET /api/trails/:slug/guide  — downloadable/offline guide (plain JSON)
//
// This is what a hiker carries once they lose signal, so it embeds the
// safety-critical profile fields rather than linking back to the API.
router.get('/:slug/guide', (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const { row, checkpoints, profile } = loadTrail(slug);

  const trail = mapTrail(row, checkpoints, profile);
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

  if (p?.accessStatus === 'closed') {
    guide.warning = 'This mountain is CLOSED to hikers. Do not attempt.';
  } else if (p?.accessStatus === 'conditional') {
    guide.warning =
      'Access depends on the current volcanic alert level. Check PVMBG/BPPTKG status before departure.';
  }

  res.setHeader('Content-Disposition', `attachment; filename="${slug}-guide.json"`);
  res.json(guide);
});

module.exports = router;
