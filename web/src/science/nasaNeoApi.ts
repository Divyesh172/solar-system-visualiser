/**
 * NASA Near-Earth Object Web Service (NeoWs) API Client & Ephemeris Engine.
 * 
 * Fetches, normalizes, and caches real-time asteroid flybys from api.nasa.gov.
 * Includes a curated fallback catalog of iconic historical close-approach asteroids
 * (Apophis, 2024 MK, 2023 DZ2, Bennu, Didymos/Dimorphos, 2020 QG) for offline & sandbox reliability.
 */

export interface NearEarthAsteroid {
  id: string;
  name: string;
  diameterMeters: {
    min: number;
    max: number;
    avg: number;
  };
  isPotentiallyHazardous: boolean;
  absoluteMagnitudeH?: number;
  closeApproachDate: string; // YYYY-MM-DD
  closeApproachDateFull: string;
  epochDateCloseApproach: number; // Unix timestamp ms
  relativeVelocityKmS: number;
  missDistanceKm: number;
  missDistanceLunar: number; // 1 Lunar Distance = 384,400 km
  missDistanceAu: number;
  orbitingBody: string;
  jplUrl?: string;
  isCuratedFallback?: boolean;
  funFact?: string;
}

const LUNAR_DISTANCE_KM = 384400.0;
const AU_KM = 149597870.7;

// ---------------------------------------------------------------------------
// 1. Curated Offline Fallback Catalog of Famous Close-Approach Asteroids
// ---------------------------------------------------------------------------

export const CURATED_FAMOUS_ASTEROIDS: NearEarthAsteroid[] = [
  {
    id: '99942',
    name: '99942 Apophis',
    diameterMeters: { min: 340, max: 375, avg: 357 },
    isPotentiallyHazardous: true,
    absoluteMagnitudeH: 19.2,
    closeApproachDate: '2029-04-13',
    closeApproachDateFull: '2029-Apr-13 21:46',
    epochDateCloseApproach: 1870811160000,
    relativeVelocityKmS: 7.43,
    missDistanceKm: 31600,
    missDistanceLunar: 31600 / LUNAR_DISTANCE_KM, // 0.082 LD (inside geostationary ring!)
    missDistanceAu: 31600 / AU_KM,
    orbitingBody: 'Earth',
    jplUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=99942',
    isCuratedFallback: true,
    funFact: 'On Friday, April 13, 2029, the 370-meter Apophis will make a historic flyby closer to Earth than our own weather satellites, visible to 2 billion people with the naked eye!',
  },
  {
    id: '54464875',
    name: '2024 MK',
    diameterMeters: { min: 140, max: 280, avg: 210 },
    isPotentiallyHazardous: true,
    absoluteMagnitudeH: 21.6,
    closeApproachDate: '2024-06-29',
    closeApproachDateFull: '2024-Jun-29 13:41',
    epochDateCloseApproach: 1719668460000,
    relativeVelocityKmS: 9.37,
    missDistanceKm: 290150,
    missDistanceLunar: 290150 / LUNAR_DISTANCE_KM, // 0.75 LD (inside lunar orbit)
    missDistanceAu: 290150 / AU_KM,
    orbitingBody: 'Earth',
    jplUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54464875',
    isCuratedFallback: true,
    funFact: 'Discovered only 13 days before closest approach, skyscraper-sized 2024 MK safely passed within 75% of the distance to the Moon on June 29, 2024.',
  },
  {
    id: '54345244',
    name: '2023 DZ2',
    diameterMeters: { min: 45, max: 95, avg: 70 },
    isPotentiallyHazardous: false,
    absoluteMagnitudeH: 24.2,
    closeApproachDate: '2023-03-25',
    closeApproachDateFull: '2023-Mar-25 19:49',
    epochDateCloseApproach: 1679773740000,
    relativeVelocityKmS: 7.78,
    missDistanceKm: 174650,
    missDistanceLunar: 174650 / LUNAR_DISTANCE_KM, // 0.45 LD
    missDistanceAu: 174650 / AU_KM,
    orbitingBody: 'Earth',
    jplUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54345244',
    isCuratedFallback: true,
    funFact: 'This city-block-sized asteroid passed less than halfway to the Moon on March 25, 2023, bright enough to be seen with small amateur telescopes.',
  },
  {
    id: '101955',
    name: '101955 Bennu',
    diameterMeters: { min: 490, max: 512, avg: 501 },
    isPotentiallyHazardous: true,
    absoluteMagnitudeH: 20.9,
    closeApproachDate: '2135-09-25',
    closeApproachDateFull: '2135-Sep-25 12:00',
    epochDateCloseApproach: 5229988800000,
    relativeVelocityKmS: 6.25,
    missDistanceKm: 750000,
    missDistanceLunar: 750000 / LUNAR_DISTANCE_KM,
    missDistanceAu: 750000 / AU_KM,
    orbitingBody: 'Earth',
    jplUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=101955',
    isCuratedFallback: true,
    funFact: 'NASA’s OSIRIS-REx spacecraft touched down on Bennu’s surface in 2020, vacuumed up 250 grams of pristine cosmic gravel, and parachuted it safely back to Earth!',
  },
  {
    id: '65803',
    name: '65803 Didymos & Dimorphos',
    diameterMeters: { min: 160, max: 780, avg: 470 },
    isPotentiallyHazardous: true,
    absoluteMagnitudeH: 18.1,
    closeApproachDate: '2022-09-26',
    closeApproachDateFull: '2022-Sep-26 23:14',
    epochDateCloseApproach: 1664234040000,
    relativeVelocityKmS: 6.60,
    missDistanceKm: 10600000,
    missDistanceLunar: 10600000 / LUNAR_DISTANCE_KM,
    missDistanceAu: 10600000 / AU_KM,
    orbitingBody: 'Earth',
    jplUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=65803',
    isCuratedFallback: true,
    funFact: 'On September 26, 2022, NASA’s DART mission intentionally slammed a vending-machine-sized probe into Dimorphos at 22,500 km/h, proving humanity can deflect dangerous asteroids!',
  },
  {
    id: '54054450',
    name: '2020 QG',
    diameterMeters: { min: 3, max: 6, avg: 4.5 },
    isPotentiallyHazardous: false,
    absoluteMagnitudeH: 29.8,
    closeApproachDate: '2020-08-16',
    closeApproachDateFull: '2020-Aug-16 04:09',
    epochDateCloseApproach: 1597550940000,
    relativeVelocityKmS: 12.33,
    missDistanceKm: 9320,
    missDistanceLunar: 9320 / LUNAR_DISTANCE_KM, // 0.024 LD (~2,950 km above surface!)
    missDistanceAu: 9320 / AU_KM,
    orbitingBody: 'Earth',
    jplUrl: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=54054450',
    isCuratedFallback: true,
    funFact: 'Passed just 2,950 kilometers above the surface of the Indian Ocean—the closest recorded non-impacting asteroid flyby in astronomical history!',
  },
];

// ---------------------------------------------------------------------------
// 2. NASA NeoWs REST API Client with 24-Hour LocalStorage Cache
// ---------------------------------------------------------------------------

function formatDateIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface FetchNeoOptions {
  apiKey?: string;
  forceRefresh?: boolean;
  timeoutMs?: number;
}

/**
 * Fetches Near-Earth Asteroids approaching Earth within a 7-day window from `date`.
 * Gracefully falls back to curated historical asteroids if offline, rate-limited, or in sandbox.
 */
export async function fetchNearEarthAsteroids(
  simDate: Date,
  options: FetchNeoOptions = {}
): Promise<NearEarthAsteroid[]> {
  const { apiKey = 'DEMO_KEY', forceRefresh = false, timeoutMs = 3500 } = options;

  const startDateStr = formatDateIso(simDate);
  // NeoWs allows a maximum of 7 days in a single feed request
  const endDate = new Date(simDate.getTime() + 6 * 86400000);
  const endDateStr = formatDateIso(endDate);

  const cacheKey = `neows_feed_${startDateStr}_${endDateStr}`;

  // 1. Check local storage cache (24 hour TTL)
  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageMs = Date.now() - (parsed.timestamp || 0);
        if (ageMs < 24 * 3600 * 1000 && Array.isArray(parsed.data)) {
          return parsed.data as NearEarthAsteroid[];
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  // 2. Attempt live network fetch from NASA NeoWs
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDateStr}&end_date=${endDateStr}&api_key=${apiKey}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`NASA API HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawNeos = data.near_earth_objects || {};

    const normalizedNeos: NearEarthAsteroid[] = [];

    for (const dateKey of Object.keys(rawNeos)) {
      const dayList = rawNeos[dateKey];
      if (!Array.isArray(dayList)) continue;

      for (const neo of dayList) {
        const approach = neo.close_approach_data?.[0];
        if (!approach) continue;

        const dMin = neo.estimated_diameter?.meters?.estimated_diameter_min || 10;
        const dMax = neo.estimated_diameter?.meters?.estimated_diameter_max || 30;

        const missKm = parseFloat(approach.miss_distance?.kilometers || '1000000');
        const missLunar = parseFloat(approach.miss_distance?.lunar || '2.6');
        const missAu = parseFloat(approach.miss_distance?.astronomical || '0.006');
        const vKmS = parseFloat(approach.relative_velocity?.kilometers_per_second || '12.0');

        normalizedNeos.push({
          id: String(neo.id || neo.neo_reference_id),
          name: neo.name ? neo.name.replace(/[()]/g, '') : 'Asteroid',
          diameterMeters: {
            min: Math.round(dMin),
            max: Math.round(dMax),
            avg: Math.round((dMin + dMax) / 2),
          },
          isPotentiallyHazardous: !!neo.is_potentially_hazardous_asteroid,
          absoluteMagnitudeH: typeof neo.absolute_magnitude_h === 'number' ? neo.absolute_magnitude_h : undefined,
          closeApproachDate: approach.close_approach_date || dateKey,
          closeApproachDateFull: approach.close_approach_date_full || dateKey,
          epochDateCloseApproach: approach.epoch_date_close_approach || Date.parse(dateKey),
          relativeVelocityKmS: Math.round(vKmS * 10) / 10,
          missDistanceKm: Math.round(missKm),
          missDistanceLunar: Math.round(missLunar * 100) / 100,
          missDistanceAu: Math.round(missAu * 100000) / 100000,
          orbitingBody: approach.orbiting_body || 'Earth',
          jplUrl: neo.nasa_jpl_url,
          isCuratedFallback: false,
        });
      }
    }

    // Sort ascending by closest pass (lowest miss distance)
    normalizedNeos.sort((a, b) => a.missDistanceLunar - b.missDistanceLunar);

    // Save to cache
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: normalizedNeos }));
      } catch {
        // Storage quota full or disabled
      }
    }

    return normalizedNeos;
  } catch {
    // 3. Fallback to Curated Asteroids Dataset
    // Return all curated asteroids sorted by how close they pass to Earth
    const fallback = [...CURATED_FAMOUS_ASTEROIDS].sort(
      (a, b) => a.missDistanceLunar - b.missDistanceLunar
    );
    return fallback;
  }
}

/**
 * Returns a human-friendly string for miss distance.
 * e.g. "0.75 LD (290,150 km)"
 */
export function formatMissDistance(missLunar: number, missKm: number): string {
  if (missLunar < 1.0) {
    return `${missLunar.toFixed(2)} LD (${missKm.toLocaleString()} km - Inside Moon's Orbit!)`;
  }
  return `${missLunar.toFixed(1)} LD (${missKm.toLocaleString()} km)`;
}
