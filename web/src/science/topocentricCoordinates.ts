/**
 * Topocentric Astrometry & Ground Observer Coordinates.
 * 
 * Computes real-time horizontal coordinates (Altitude and Azimuth) from any
 * observer location on Earth for the Sun, Moon, and bright visible planets.
 * Combines Astronomy Engine (high-precision astrometry) and SunCalc (solar times).
 */

import * as Astronomy from 'astronomy-engine';
import * as SunCalc from 'suncalc';

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

export interface GeoLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  flagEmoji: string;
  latitude: number;   // -90 to +90 degrees (North positive)
  longitude: number;  // -180 to +180 degrees (East positive)
  elevationMeters?: number;
  description: string;
}

export type SkyLightingPhase =
  | 'day'
  | 'golden_hour'
  | 'sunset_dusk'
  | 'civil_twilight'
  | 'nautical_twilight'
  | 'astronomical_twilight'
  | 'night';

export interface TopocentricPosition {
  altitudeDeg: number;       // -90° to +90° relative to horizon
  azimuthDeg: number;        // 0° to 360° (0=North, 90=East, 180=South, 270=West)
  compassDirection: string;  // 16-wind compass abbreviation (e.g. "SW", "NNE")
  isAboveHorizon: boolean;   // altitudeDeg > 0
  cartesian: [number, number, number]; // [x, y, z] on sky dome
}

export interface LocalCelestialBody extends TopocentricPosition {
  id: string;
  name: string;
  emoji: string;
  colorHex: string;
  visualMagnitude: number;
  isVisibleNow: boolean; // Above horizon and dark enough to see
  viewingTip: string;
}

export interface SkyAtmosphereState {
  phase: SkyLightingPhase;
  phaseLabel: string;
  sunAltitudeDeg: number;
  sunAzimuthDeg: number;
  zenithColor: string;
  horizonColor: string;
  groundColor: string;
  sunGlareColor: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  starsOpacity: number;
}

export interface LocalSunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date | null;
  dawn: Date | null;
  dusk: Date | null;
  goldenHour: Date | null;
}

// ---------------------------------------------------------------------------
// 2. Curated Global Observer Presets
// ---------------------------------------------------------------------------

export const PRESET_LOCATIONS: GeoLocation[] = [
  {
    id: 'nyc',
    name: 'New York City',
    region: 'New York',
    country: 'United States',
    flagEmoji: '🇺🇸',
    latitude: 40.7128,
    longitude: -74.006,
    elevationMeters: 10,
    description: 'Mid-latitude Northern Hemisphere urban sky',
  },
  {
    id: 'london',
    name: 'London',
    region: 'England',
    country: 'United Kingdom',
    flagEmoji: '🇬🇧',
    latitude: 51.5074,
    longitude: -0.1278,
    elevationMeters: 15,
    description: 'Historical home of Greenwich Mean Time & Prime Meridian',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    region: 'Kantō',
    country: 'Japan',
    flagEmoji: '🇯🇵',
    latitude: 35.6762,
    longitude: 139.6503,
    elevationMeters: 40,
    description: 'Eastern Asia metropolis night sky',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    region: 'New South Wales',
    country: 'Australia',
    flagEmoji: '🇦🇺',
    latitude: -33.8688,
    longitude: 151.2093,
    elevationMeters: 25,
    description: 'Iconic Southern Hemisphere sky showcasing Southern Cross & Magellanic Clouds',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    region: 'Giza',
    country: 'Egypt',
    flagEmoji: '🇪🇬',
    latitude: 30.0444,
    longitude: 31.2357,
    elevationMeters: 75,
    description: 'Ancient cradle of solar & stellar alignment astronomy',
  },
  {
    id: 'honolulu',
    name: 'Honolulu',
    region: 'Hawaii',
    country: 'United States',
    flagEmoji: '🌺',
    latitude: 21.3069,
    longitude: -157.8583,
    elevationMeters: 6,
    description: 'Tropical Polynesian wayfinding sky with zenith star passes',
  },
  {
    id: 'tromso',
    name: 'Tromsø',
    region: 'Troms',
    country: 'Norway',
    flagEmoji: '🇳🇴',
    latitude: 69.6492,
    longitude: 18.9553,
    elevationMeters: 30,
    description: 'Arctic Circle experiencing Midnight Sun in June and Polar Night in December',
  },
  {
    id: 'atacama',
    name: 'Atacama Desert',
    region: 'Antofagasta',
    country: 'Chile',
    flagEmoji: '🇨🇱',
    latitude: -23.8634,
    longitude: -69.1328,
    elevationMeters: 2400,
    description: 'World’s premier ultra-clear high-altitude astronomical observatory site',
  },
];

// ---------------------------------------------------------------------------
// 3. Coordinate Transformation Math
// ---------------------------------------------------------------------------

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

/**
 * Converts an azimuth angle (0..360°) into a 16-wind compass abbreviation.
 */
export function getCompassDirection(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_POINTS[index];
}

/**
 * Maps topocentric spherical coordinates (Altitude, Azimuth) to 3D Cartesian scene coordinates.
 * 
 * Orientation convention:
 * - Up (+Y): Zenith (straight up, altitude = +90°)
 * - Down (-Y): Nadir (ground center, altitude = -90°)
 * - Forward (-Z): North (azimuth = 0°)
 * - Right (+X): East (azimuth = 90°, where celestial bodies rise)
 * - Back (+Z): South (azimuth = 180°)
 * - Left (-X): West (azimuth = 270°, where celestial bodies set)
 */
export function topocentricToCartesian(
  altitudeDeg: number,
  azimuthDeg: number,
  radius: number = 80.0
): [number, number, number] {
  const altRad = (altitudeDeg * Math.PI) / 180.0;
  const azRad = (azimuthDeg * Math.PI) / 180.0;

  const y = radius * Math.sin(altRad);
  const rHoriz = radius * Math.cos(altRad);

  const x = rHoriz * Math.sin(azRad);
  const z = -rHoriz * Math.cos(azRad);

  return [x, y, z];
}

// ---------------------------------------------------------------------------
// 4. Dynamic Sky Atmosphere & Lighting based on Sun Altitude
// ---------------------------------------------------------------------------

/**
 * Computes the lighting phase and color palette of the local sky based on
 * the instantaneous altitude of the Sun.
 */
export function getSkyAtmosphereState(date: Date, location: GeoLocation): SkyAtmosphereState {
  const sunPos = SunCalc.getPosition(date, location.latitude, location.longitude);
  const sunAlt = sunPos.altitude;
  const sunAz = sunPos.azimuth;

  let phase: SkyLightingPhase;
  let phaseLabel: string;
  let zenithColor: string;
  let horizonColor: string;
  let groundColor: string;
  let sunGlareColor: string;
  let ambientLightIntensity: number;
  let directionalLightIntensity: number;
  let starsOpacity: number;

  if (sunAlt > 6.0) {
    // ☀️ Full Daylight
    phase = 'day';
    phaseLabel = 'Daylight';
    zenithColor = '#1d4ed8'; // Crisp royal sky blue
    horizonColor = '#93c5fd'; // Soft horizon haze
    groundColor = '#1e3a1e'; // Grass green tone
    sunGlareColor = '#fef08a';
    ambientLightIntensity = 1.0;
    directionalLightIntensity = 1.2;
    starsOpacity = 0.0;
  } else if (sunAlt >= 0.0 && sunAlt <= 6.0) {
    // 🌅 Golden Hour (Sun right above horizon)
    phase = 'golden_hour';
    phaseLabel = 'Golden Hour';
    zenithColor = '#2563eb';
    horizonColor = '#f59e0b'; // Warm amber gold
    groundColor = '#3b2512';
    sunGlareColor = '#fef08a';
    ambientLightIntensity = 0.75;
    directionalLightIntensity = 0.95;
    starsOpacity = 0.08;
  } else if (sunAlt >= -4.0 && sunAlt < 0.0) {
    // 🌇 Sunset / Dusk
    phase = 'sunset_dusk';
    phaseLabel = 'Sunset / Dusk';
    zenithColor = '#312e81'; // Twilight indigo
    horizonColor = '#ea580c'; // Radiant orange-crimson
    groundColor = '#1c1917';
    sunGlareColor = '#f97316';
    ambientLightIntensity = 0.45;
    directionalLightIntensity = 0.55;
    starsOpacity = 0.25;
  } else if (sunAlt >= -6.0 && sunAlt < -4.0) {
    // 🌆 Civil Twilight (horizon clearly defined, streetlights turn on)
    phase = 'civil_twilight';
    phaseLabel = 'Civil Twilight';
    zenithColor = '#1e1b4b'; // Deep navy
    horizonColor = '#a855f7'; // Purple-magenta glow
    groundColor = '#0f172a';
    sunGlareColor = '#d946ef';
    ambientLightIntensity = 0.25;
    directionalLightIntensity = 0.25;
    starsOpacity = 0.55;
  } else if (sunAlt >= -12.0 && sunAlt < -6.0) {
    // 🌌 Nautical Twilight (brightest stars and sea horizon visible)
    phase = 'nautical_twilight';
    phaseLabel = 'Nautical Twilight';
    zenithColor = '#0f172a';
    horizonColor = '#3b0764'; // Deep twilight violet
    groundColor = '#090d16';
    sunGlareColor = '#818cf8';
    ambientLightIntensity = 0.12;
    directionalLightIntensity = 0.1;
    starsOpacity = 0.85;
  } else if (sunAlt >= -18.0 && sunAlt < -12.0) {
    // 🔭 Astronomical Twilight (faintest stars emerging, sky almost fully dark)
    phase = 'astronomical_twilight';
    phaseLabel = 'Astronomical Twilight';
    zenithColor = '#020617';
    horizonColor = '#1e1b4b';
    groundColor = '#030712';
    sunGlareColor = '#6366f1';
    ambientLightIntensity = 0.05;
    directionalLightIntensity = 0.04;
    starsOpacity = 0.95;
  } else {
    // 🌠 Dark Night (pure cosmic observation)
    phase = 'night';
    phaseLabel = 'Night';
    zenithColor = '#010409';
    horizonColor = '#030712';
    groundColor = '#020408';
    sunGlareColor = '#38bdf8';
    ambientLightIntensity = 0.03;
    directionalLightIntensity = 0.02;
    starsOpacity = 1.0;
  }

  return {
    phase,
    phaseLabel,
    sunAltitudeDeg: sunAlt,
    sunAzimuthDeg: sunAz,
    zenithColor,
    horizonColor,
    groundColor,
    sunGlareColor,
    ambientLightIntensity,
    directionalLightIntensity,
    starsOpacity,
  };
}

// ---------------------------------------------------------------------------
// 5. Local Sun Times (Sunrise, Sunset, Solar Noon)
// ---------------------------------------------------------------------------

export function getLocalSunTimes(date: Date, location: GeoLocation): LocalSunTimes {
  const times = SunCalc.getTimes(date, location.latitude, location.longitude);
  return {
    sunrise: times.sunrise && !isNaN(times.sunrise.getTime()) ? times.sunrise : null,
    sunset: times.sunset && !isNaN(times.sunset.getTime()) ? times.sunset : null,
    solarNoon: times.solarNoon && !isNaN(times.solarNoon.getTime()) ? times.solarNoon : null,
    dawn: times.dawn && !isNaN(times.dawn.getTime()) ? times.dawn : null,
    dusk: times.dusk && !isNaN(times.dusk.getTime()) ? times.dusk : null,
    goldenHour: times.goldenHour && !isNaN(times.goldenHour.getTime()) ? times.goldenHour : null,
  };
}

// ---------------------------------------------------------------------------
// 6. High-Precision Local Astrometry for Planets & Moon
// ---------------------------------------------------------------------------

interface PlanetConfig {
  id: string;
  name: string;
  body: Astronomy.Body;
  emoji: string;
  colorHex: string;
}

const TRACKED_PLANETS: PlanetConfig[] = [
  { id: 'mercury', name: 'Mercury', body: Astronomy.Body.Mercury, emoji: '☿️', colorHex: '#94a3b8' },
  { id: 'venus', name: 'Venus', body: Astronomy.Body.Venus, emoji: '♀️', colorHex: '#fef08a' },
  { id: 'mars', name: 'Mars', body: Astronomy.Body.Mars, emoji: '♂️', colorHex: '#ef4444' },
  { id: 'jupiter', name: 'Jupiter', body: Astronomy.Body.Jupiter, emoji: '♃', colorHex: '#f59e0b' },
  { id: 'saturn', name: 'Saturn', body: Astronomy.Body.Saturn, emoji: '♄', colorHex: '#eab308' },
];

function generateViewingTip(
  name: string,
  alt: number,
  az: number,
  compass: string,
  sunAlt: number
): string {
  if (alt <= 0) {
    return `${name} is currently below the horizon.`;
  }

  const isDusk = sunAlt >= -12 && sunAlt <= 2;
  const isDay = sunAlt > 2;

  if (isDay && name !== 'Venus') {
    return `${name} is in the daytime sky, obscured by bright sunlight.`;
  }

  if (alt >= 45) {
    return `High overhead in the ${compass} sky—optimal telescope seeing!`;
  }

  if (alt >= 15) {
    if (isDusk && (az > 200 && az < 330)) {
      return `Brilliant "Evening Star" setting in the western twilight.`;
    }
    if (isDusk && (az > 30 && az < 150)) {
      return `Rising in the eastern sky as twilight fades into darkness.`;
    }
    return `Clearly visible at ${Math.round(alt)}° elevation towards the ${compass}.`;
  }

  return `Low on the ${compass} horizon (${Math.round(alt)}°). Look for an unobstructed viewpoint.`;
}

/**
 * Computes real-time topocentric Altitude and Azimuth for the bright naked-eye planets.
 */
export function getLocalPlanets(
  date: Date,
  location: GeoLocation,
  domeRadius: number = 80.0
): LocalCelestialBody[] {
  const obs = new Astronomy.Observer(
    location.latitude,
    location.longitude,
    location.elevationMeters || 10
  );

  const sunPos = SunCalc.getPosition(date, location.latitude, location.longitude);
  const sunAlt = sunPos.altitude;

  return TRACKED_PLANETS.map((planet) => {
    // 1. Apparent geocentric/topocentric equator coordinates (RA & Dec)
    const equ = Astronomy.Equator(planet.body, date, obs, true, true);
    // 2. Local horizontal coordinates (Altitude & Azimuth)
    const hor = Astronomy.Horizon(date, obs, equ.ra, equ.dec, 'normal');

    const alt = hor.altitude;
    const az = hor.azimuth;
    const compass = getCompassDirection(az);
    const cartesian = topocentricToCartesian(alt, az, domeRadius);

    // 3. Visual magnitude
    let mag = 0;
    try {
      const illum = Astronomy.Illumination(planet.body, date);
      mag = Math.round(illum.mag * 10) / 10;
    } catch {
      mag = 1.0;
    }

    const isAboveHorizon = alt > 0;
    const isVisibleNow = isAboveHorizon && (sunAlt < 0 || (planet.id === 'venus' && mag < -4.0));

    return {
      id: planet.id,
      name: planet.name,
      emoji: planet.emoji,
      colorHex: planet.colorHex,
      altitudeDeg: Math.round(alt * 10) / 10,
      azimuthDeg: Math.round(az * 10) / 10,
      compassDirection: compass,
      isAboveHorizon,
      cartesian,
      visualMagnitude: mag,
      isVisibleNow,
      viewingTip: generateViewingTip(planet.name, alt, az, compass, sunAlt),
    };
  });
}

/**
 * Computes topocentric position for the Sun.
 */
export function getLocalSun(
  date: Date,
  location: GeoLocation,
  domeRadius: number = 80.0
): LocalCelestialBody {
  const sunPos = SunCalc.getPosition(date, location.latitude, location.longitude);
  const alt = Math.round(sunPos.altitude * 10) / 10;
  const az = Math.round(sunPos.azimuth * 10) / 10;
  const compass = getCompassDirection(az);
  const cartesian = topocentricToCartesian(alt, az, domeRadius);

  return {
    id: 'sun',
    name: 'Sun',
    emoji: '☀️',
    colorHex: '#fbbf24',
    altitudeDeg: alt,
    azimuthDeg: az,
    compassDirection: compass,
    isAboveHorizon: alt > 0,
    cartesian,
    visualMagnitude: -26.7,
    isVisibleNow: alt > 0,
    viewingTip: alt > 0
      ? `Sun is shining at ${alt}° above the ${compass} horizon.`
      : `Sun is currently ${Math.abs(alt)}° below the horizon.`,
  };
}

/**
 * Computes topocentric position for Earth's Moon.
 */
export function getLocalMoon(
  date: Date,
  location: GeoLocation,
  domeRadius: number = 80.0
): LocalCelestialBody {
  const obs = new Astronomy.Observer(
    location.latitude,
    location.longitude,
    location.elevationMeters || 10
  );

  const equ = Astronomy.Equator(Astronomy.Body.Moon, date, obs, true, true);
  const hor = Astronomy.Horizon(date, obs, equ.ra, equ.dec, 'normal');

  const alt = Math.round(hor.altitude * 10) / 10;
  const az = Math.round(hor.azimuth * 10) / 10;
  const compass = getCompassDirection(az);
  const cartesian = topocentricToCartesian(alt, az, domeRadius);

  let mag = -12.0;
  try {
    const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
    mag = Math.round(illum.mag * 10) / 10;
  } catch {
    mag = -12.0;
  }

  const isAboveHorizon = alt > 0;

  return {
    id: 'moon',
    name: 'Moon',
    emoji: '🌕',
    colorHex: '#e2e8f0',
    altitudeDeg: alt,
    azimuthDeg: az,
    compassDirection: compass,
    isAboveHorizon,
    cartesian,
    visualMagnitude: mag,
    isVisibleNow: isAboveHorizon,
    viewingTip: isAboveHorizon
      ? `Moon is shining brightly at ${alt}° elevation toward ${compass}.`
      : `Moon is currently below the local horizon.`,
  };
}
