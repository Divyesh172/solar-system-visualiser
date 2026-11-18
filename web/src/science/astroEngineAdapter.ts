/**
 * High-Precision Astronomical Adapter based on Astronomy Engine (by Don Cross).
 * 
 * Bridges high-precision astronomical ephemerides with the KidStar 3D graphics
 * and simulation clock architecture.
 */

import * as Astronomy from 'astronomy-engine';
import { jdeToDate } from './time';

export type DateInput = Date | number;

/**
 * Resolves a date from either a standard JS Date or a Julian Ephemeris Date (JDE).
 */
export function resolveDate(input: DateInput): Date {
  return typeof input === 'number' ? jdeToDate(input) : input;
}

export interface RelativeVector3D {
  x: number;
  y: number;
  z: number;
  distanceAu: number;
  distanceKm: number;
  /** Normalized direction vector [x, y, z] in Three.js coordinates (X=Right, Y=Up, Z=Forward) */
  direction: [number, number, number];
}

export interface JupiterMoonsEphemeris {
  io: RelativeVector3D;
  europa: RelativeVector3D;
  ganymede: RelativeVector3D;
  callisto: RelativeVector3D;
}

export interface LunarEphemeris {
  /** Cartesian vector in Three.js scene space (AU, X=Right, Y=Up, Z=Forward) */
  positionAu: [number, number, number];
  /** Normalized direction vector [x, y, z] from Earth to Moon */
  direction: [number, number, number];
  eclipticLonDeg: number;
  eclipticLatDeg: number;
  distanceAu: number;
  distanceKm: number;
}

export interface LunarPhaseInfo {
  /** Phase angle in degrees (0..360, where 0=New, 90=First Quarter, 180=Full, 270=Third Quarter) */
  phaseDeg: number;
  /** Illuminated fraction (0.0 to 1.0) */
  fraction: number;
  /** Illuminated percentage (0 to 100) */
  percent: number;
  /** Kid-friendly phase name */
  phaseName: string;
  /** Unicode lunar phase emoji */
  emoji: string;
  /** Visual magnitude (e.g. -12.7 at full moon) */
  visualMagnitude: number;
}

export interface SeasonsInfo {
  marchEquinox: Date;
  juneSolstice: Date;
  septemberEquinox: Date;
  decemberSolstice: Date;
}

// Cached J2000 Equatorial to Ecliptic rotation matrix
const rotEQJtoECL = Astronomy.Rotation_EQJ_ECL();

/**
 * Calculates authentic Jovicentric positions for Jupiter's Galilean moons:
 * Io, Europa, Ganymede, and Callisto.
 * 
 * Converts coordinates from J2000 Earth Equatorial (EQJ) into J2000 Ecliptic
 * and projects them into Three.js scene coordinates (X-Z orbital plane, Y=Up).
 */
export function getJupiterMoons(dateInput: DateInput): JupiterMoonsEphemeris {
  const date = resolveDate(dateInput);
  const jup = Astronomy.JupiterMoons(date);

  function transformMoon(stateVec: Astronomy.StateVector): RelativeVector3D {
    // 1. Rotate from Equatorial J2000 to Ecliptic J2000
    const eclipticVec = Astronomy.RotateState(rotEQJtoECL, stateVec);

    // 2. Map Ecliptic to Three.js coordinates (X=x, Y=z, Z=y)
    const sceneX = eclipticVec.x;
    const sceneY = eclipticVec.z;
    const sceneZ = eclipticVec.y;

    const distAu = Math.hypot(sceneX, sceneY, sceneZ);
    const distKm = distAu * Astronomy.KM_PER_AU;
    const safeDist = distAu > 1e-12 ? distAu : 1.0;

    return {
      x: sceneX,
      y: sceneY,
      z: sceneZ,
      distanceAu: distAu,
      distanceKm: distKm,
      direction: [sceneX / safeDist, sceneY / safeDist, sceneZ / safeDist],
    };
  }

  return {
    io: transformMoon(jup.io),
    europa: transformMoon(jup.europa),
    ganymede: transformMoon(jup.ganymede),
    callisto: transformMoon(jup.callisto),
  };
}

/**
 * Calculates high-precision Geocentric position of Earth's Moon
 * based on the ELP-2000/82 analytical lunar theory.
 */
export function getLunarEphemeris(dateInput: DateInput): LunarEphemeris {
  const date = resolveDate(dateInput);
  const ecl = Astronomy.EclipticGeoMoon(date);

  const latRad = (ecl.lat * Math.PI) / 180.0;
  const lonRad = (ecl.lon * Math.PI) / 180.0;
  const cosLat = Math.cos(latRad);

  // Ecliptic coordinates in AU
  const eclX = ecl.dist * cosLat * Math.cos(lonRad);
  const eclY = ecl.dist * cosLat * Math.sin(lonRad);
  const eclZ = ecl.dist * Math.sin(latRad);

  // Map to Three.js scene coordinates (X-Z is ecliptic plane, Y is normal/Up)
  const sceneX = eclX;
  const sceneY = eclZ;
  const sceneZ = eclY;

  const distAu = ecl.dist;
  const distKm = distAu * Astronomy.KM_PER_AU;
  const safeDist = distAu > 1e-12 ? distAu : 1.0;

  return {
    positionAu: [sceneX, sceneY, sceneZ],
    direction: [sceneX / safeDist, sceneY / safeDist, sceneZ / safeDist],
    eclipticLonDeg: ecl.lon,
    eclipticLatDeg: ecl.lat,
    distanceAu: distAu,
    distanceKm: distKm,
  };
}

/**
 * Calculates current Lunar Phase details including illuminated percentage,
 * phase angle, visual magnitude, and astronomical phase name.
 */
export function getLunarPhaseInfo(dateInput: DateInput): LunarPhaseInfo {
  const date = resolveDate(dateInput);

  // Phase angle 0..360 deg: 0=New, 90=First Qtr, 180=Full, 270=Third Qtr
  const phaseDeg = Astronomy.MoonPhase(date);
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);

  let phaseName = 'New Moon';
  let emoji = '🌑';

  if (phaseDeg >= 354 || phaseDeg < 6) {
    phaseName = 'New Moon';
    emoji = '🌑';
  } else if (phaseDeg < 84) {
    phaseName = 'Waxing Crescent';
    emoji = '🌒';
  } else if (phaseDeg < 96) {
    phaseName = 'First Quarter';
    emoji = '🌓';
  } else if (phaseDeg < 174) {
    phaseName = 'Waxing Gibbous';
    emoji = '🌔';
  } else if (phaseDeg < 186) {
    phaseName = 'Full Moon';
    emoji = '🌕';
  } else if (phaseDeg < 264) {
    phaseName = 'Waning Gibbous';
    emoji = '🌖';
  } else if (phaseDeg < 276) {
    phaseName = 'Third Quarter';
    emoji = '🌗';
  } else {
    phaseName = 'Waning Crescent';
    emoji = '🌘';
  }

  const fraction = Math.max(0, Math.min(1, illum.phase_fraction));
  const percent = Math.round(fraction * 1000) / 10; // e.g. 60.2%

  return {
    phaseDeg,
    fraction,
    percent,
    phaseName,
    emoji,
    visualMagnitude: illum.mag,
  };
}

/**
 * Calculates the exact UTC dates for equinoxes and solstices for a given year.
 */
export function getSeasons(year: number): SeasonsInfo {
  const seasons = Astronomy.Seasons(year);
  return {
    marchEquinox: seasons.mar_equinox.date,
    juneSolstice: seasons.jun_solstice.date,
    septemberEquinox: seasons.sep_equinox.date,
    decemberSolstice: seasons.dec_solstice.date,
  };
}
