/**
 * SGP4 / SDP4 High-Precision Satellite Propagator Engine.
 * 
 * Powered by satellite.js to calculate true Earth-Centered Inertial (ECI) coordinates,
 * geodetic latitude/longitude, altitude, speed, and 3D visual orbits.
 */

import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
  type SatRec,
} from 'satellite.js';
import type { SatelliteMetadata } from './satelliteCatalog';

const EARTH_RADIUS_KM = 6371.0;

export interface SatelliteTelemetry {
  id: string;
  name: string;
  /** 3D position in Three.js Earth-local space (X=Equatorial, Y=North Pole, Z=Equatorial) */
  positionScene: [number, number, number];
  /** Instantaneous speed in km/h */
  speedKmH: number;
  /** Instantaneous altitude above Earth sea level in km */
  altitudeKm: number;
  /** Geodetic sub-satellite latitude (-90° to +90°) */
  latitudeDeg: number;
  /** Geodetic sub-satellite longitude (-180° to +180°) */
  longitudeDeg: number;
  /** Normalized direction vector [x, y, z] from Earth center */
  direction: [number, number, number];
  /** Whether propagation succeeded */
  isValid: boolean;
}

// In-memory cache of parsed SatRec records
const satRecCache = new Map<string, SatRec>();

/**
 * Returns or creates the parsed SatRec record for a given satellite.
 */
export function getSatRec(metadata: SatelliteMetadata): SatRec {
  let record = satRecCache.get(metadata.id);
  if (!record) {
    record = twoline2satrec(metadata.tleLine1, metadata.tleLine2);
    satRecCache.set(metadata.id, record);
  }
  return record;
}

/**
 * Propagates satellite position and computes complete telemetry at a given date.
 */
export function propagateSatellite(
  metadata: SatelliteMetadata,
  date: Date,
  earthRadiusScene: number
): SatelliteTelemetry {
  const satrec = getSatRec(metadata);
  const pv = propagate(satrec, date);

  if (!pv || !pv.position || typeof pv.position !== 'object' || !('x' in pv.position)) {
    return {
      id: metadata.id,
      name: metadata.name,
      positionScene: [0, earthRadiusScene + 0.35, 0],
      speedKmH: metadata.speedKmH,
      altitudeKm: metadata.nominalAltitudeKm,
      latitudeDeg: 0,
      longitudeDeg: 0,
      direction: [0, 1, 0],
      isValid: false,
    };
  }

  const posX = pv.position.x as number;
  const posY = pv.position.y as number;
  const posZ = pv.position.z as number;

  const velX = (pv.velocity && typeof pv.velocity === 'object' && 'x' in pv.velocity ? pv.velocity.x : 0) as number;
  const velY = (pv.velocity && typeof pv.velocity === 'object' && 'y' in pv.velocity ? pv.velocity.y : 0) as number;
  const velZ = (pv.velocity && typeof pv.velocity === 'object' && 'z' in pv.velocity ? pv.velocity.z : 0) as number;

  const distKm = Math.hypot(posX, posY, posZ);
  const altitudeKm = Math.max(0, distKm - EARTH_RADIUS_KM);
  const speedKmH = Math.hypot(velX, velY, velZ) * 3600.0;

  // Compute geodetic sub-satellite point (latitude / longitude)
  const gmst = gstime(date);
  const geodetic = eciToGeodetic(pv.position, gmst);
  const latitudeDeg = degreesLat(geodetic.latitude);
  const longitudeDeg = degreesLong(geodetic.longitude);

  // Map from ECI TEME (Z=North Pole, X,Y=Equator) to Three.js (Y=North Pole, X,Z=Equator)
  const safeDistKm = distKm > 1e-6 ? distKm : 1.0;
  const dirX = posX / safeDistKm;
  const dirY = posZ / safeDistKm;  // ECI Z is Three.js Y (North-South polar axis)
  const dirZ = -posY / safeDistKm; // ECI Y is Three.js -Z (preserving right-handedness)

  // Scale altitude smoothly so satellites are clearly visible above Earth and easily clickable
  const visualAltitude = 0.30 + (altitudeKm / 1000.0) * 0.16;
  const sceneDist = earthRadiusScene + visualAltitude;

  const sceneX = dirX * sceneDist;
  const sceneY = dirY * sceneDist;
  const sceneZ = dirZ * sceneDist;

  return {
    id: metadata.id,
    name: metadata.name,
    positionScene: [sceneX, sceneY, sceneZ],
    speedKmH: Math.round(speedKmH),
    altitudeKm: Math.round(altitudeKm * 10) / 10,
    latitudeDeg: Math.round(latitudeDeg * 100) / 100,
    longitudeDeg: Math.round(longitudeDeg * 100) / 100,
    direction: [dirX, dirY, dirZ],
    isValid: true,
  };
}

/**
 * Generates an authentic closed 3D orbit loop for a satellite over one orbital period.
 */
export function getSatelliteOrbitLoop(
  metadata: SatelliteMetadata,
  centerDate: Date,
  earthRadiusScene: number,
  segments = 96
): [number, number, number][] {
  const satrec = getSatRec(metadata);
  // Mean motion in radians per minute; period = 2*PI / no in minutes
  const periodMinutes = satrec.no > 0 ? (2 * Math.PI) / satrec.no : metadata.nominalPeriodMinutes;
  const periodMs = periodMinutes * 60 * 1000;

  const points: [number, number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const fraction = i / segments;
    const sampleDate = new Date(centerDate.getTime() + (fraction - 0.5) * periodMs);
    const pv = propagate(satrec, sampleDate);

    if (pv && pv.position && typeof pv.position === 'object' && 'x' in pv.position) {
      const posX = pv.position.x as number;
      const posY = pv.position.y as number;
      const posZ = pv.position.z as number;

      const distKm = Math.hypot(posX, posY, posZ);
      const altitudeKm = Math.max(0, distKm - EARTH_RADIUS_KM);
      const safeDistKm = distKm > 1e-6 ? distKm : 1.0;

      const dirX = posX / safeDistKm;
      const dirY = posZ / safeDistKm;
      const dirZ = -posY / safeDistKm;

      const visualAltitude = 0.30 + (altitudeKm / 1000.0) * 0.16;
      const sceneDist = earthRadiusScene + visualAltitude;

      points.push([dirX * sceneDist, dirY * sceneDist, dirZ * sceneDist]);
    }
  }

  return points;
}
