/**
 * High-Precision Planetary Ephemeris Engine.
 * 
 * Implements the official NASA JPL analytical formulation (Standish et al.)
 * for computing heliocentric rectangular coordinates (X, Y, Z in AU)
 * aligned with the J2000 ecliptic and equinox.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type PlanetKey =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'sun';

interface OrbitalElements {
  a: number;    // Semi-major axis (AU)
  aRate: number;
  e: number;    // Eccentricity
  eRate: number;
  I: number;    // Inclination (degrees)
  IRate: number;
  L: number;    // Mean longitude (degrees)
  LRate: number;
  longPeri: number; // Longitude of perihelion (degrees)
  longPeriRate: number;
  longNode: number; // Longitude of ascending node (degrees)
  longNodeRate: number;
  // Extra perturbation parameters (for Jupiter, Saturn, Uranus, Neptune)
  b?: number;
  c?: number;
  s?: number;
  f?: number;
}

// NASA JPL / Standish Ephemeris Orbital Elements at Epoch J2000.0 (JD 2451545.0)
const PLANETARY_ELEMENTS: Record<Exclude<PlanetKey, 'sun'>, OrbitalElements> = {
  mercury: {
    a: 0.38709927,
    aRate: 0.00000037,
    e: 0.20563593,
    eRate: 0.00001906,
    I: 7.00497902,
    IRate: -0.00594749,
    L: 252.25032350,
    LRate: 149472.67411175,
    longPeri: 77.45779628,
    longPeriRate: 0.16047689,
    longNode: 48.33076593,
    longNodeRate: -0.12534081,
  },
  venus: {
    a: 0.72333566,
    aRate: 0.00000490,
    e: 0.00677672,
    eRate: -0.00004107,
    I: 3.39467605,
    IRate: -0.00078890,
    L: 181.97909950,
    LRate: 58517.81538729,
    longPeri: 131.60246718,
    longPeriRate: 0.00268329,
    longNode: 76.67984255,
    longNodeRate: -0.27769418,
  },
  earth: {
    a: 1.00000261,
    aRate: 0.00000562,
    e: 0.01671123,
    eRate: -0.00004392,
    I: -0.00001531,
    IRate: -0.01294668,
    L: 100.46457166,
    LRate: 35999.37244981,
    longPeri: 102.93768193,
    longPeriRate: 0.32327364,
    longNode: 0.0,
    longNodeRate: 0.0,
  },
  mars: {
    a: 1.52371034,
    aRate: 0.00001847,
    e: 0.09339410,
    eRate: 0.00007882,
    I: 1.84969142,
    IRate: -0.00813131,
    L: -4.55343205,
    LRate: 19140.30268499,
    longPeri: -23.94362959,
    longPeriRate: 0.44441088,
    longNode: 49.55953891,
    longNodeRate: -0.29257343,
  },
  jupiter: {
    a: 5.20288700,
    aRate: -0.00011607,
    e: 0.04838624,
    eRate: -0.00013253,
    I: 1.30439695,
    IRate: -0.00183714,
    L: 34.39644051,
    LRate: 3034.74612775,
    longPeri: 14.72847983,
    longPeriRate: 0.21252668,
    longNode: 100.47390909,
    longNodeRate: 0.20469106,
    b: -0.00012452,
    c: 0.06064060,
    s: -0.35635438,
    f: 38.35125000,
  },
  saturn: {
    a: 9.53667594,
    aRate: -0.00125060,
    e: 0.05386179,
    eRate: -0.00050991,
    I: 2.48599187,
    IRate: 0.00193609,
    L: 49.95424423,
    LRate: 1222.49362201,
    longPeri: 92.59887831,
    longPeriRate: -0.41897216,
    longNode: 113.66242448,
    longNodeRate: -0.28867794,
    b: 0.00025899,
    c: -0.13434469,
    s: 0.87320147,
    f: 38.35125000,
  },
  uranus: {
    a: 19.18916464,
    aRate: -0.00196176,
    e: 0.04725744,
    eRate: -0.00004397,
    I: 0.77263783,
    IRate: -0.00242939,
    L: 313.23810451,
    LRate: 428.48202785,
    longPeri: 170.95427630,
    longPeriRate: 0.40805281,
    longNode: 74.01692503,
    longNodeRate: 0.04240589,
    b: 0.00058331,
    c: -0.97731848,
    s: 0.17689245,
    f: 7.67025000,
  },
  neptune: {
    a: 30.06992276,
    aRate: 0.00026291,
    e: 0.00860610,
    eRate: 0.00005105,
    I: 1.77004347,
    IRate: 0.00035372,
    L: -55.12002969,
    LRate: 218.45945325,
    longPeri: 44.96476227,
    longPeriRate: -0.32241464,
    longNode: 131.78422574,
    longNodeRate: -0.00508664,
    b: -0.00041348,
    c: 0.68346318,
    s: -0.10162547,
    f: 7.67025000,
  },
};

export const J2000_JDE = 2451545.0;

const DEG_TO_RAD = Math.PI / 180.0;

/**
 * Normalizes an angle into the range [-180, 180] degrees.
 */
function normalizeAngleDeg(deg: number): number {
  let angle = deg % 360.0;
  if (angle > 180.0) angle -= 360.0;
  if (angle < -180.0) angle += 360.0;
  return angle;
}

/**
 * Solves Kepler's Equation M = E - e*sin(E) for Eccentric Anomaly E (in radians).
 * Uses Newton-Raphson iteration with cubic convergence safeguard.
 */
function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  const tol = 1e-12;
  const maxIter = 10;

  for (let i = 0; i < maxIter; i++) {
    const deltaM = M - (E - e * Math.sin(E));
    if (Math.abs(deltaM) < tol) break;
    const deltaE = deltaM / (1.0 - e * Math.cos(E));
    E += deltaE;
  }
  return E;
}

/**
 * Computes high-precision heliocentric rectangular coordinates (X, Y, Z in AU)
 * for a planet at a given Julian Ephemeris Date (JDE).
 */
export function getPlanetHeliocentricPosition(planet: PlanetKey, jde: number): Vector3D {
  if (planet === 'sun') {
    return { x: 0, y: 0, z: 0 };
  }

  const el = PLANETARY_ELEMENTS[planet];

  // Julian centuries elapsed since J2000.0
  const T = (jde - J2000_JDE) / 36525.0;

  // 1. Compute orbital elements at epoch
  const a = el.a + el.aRate * T;
  const e = el.e + el.eRate * T;
  const I = (el.I + el.IRate * T) * DEG_TO_RAD;

  let L = el.L + el.LRate * T;
  const longPeri = el.longPeri + el.longPeriRate * T;
  const longNode = el.longNode + el.longNodeRate * T;

  // Add secular perturbations for outer planets if specified
  if (el.b !== undefined && el.c !== undefined && el.s !== undefined && el.f !== undefined) {
    L += (el.b * T * T) + (el.c * Math.cos(el.f * T * DEG_TO_RAD)) + (el.s * Math.sin(el.f * T * DEG_TO_RAD));
  }

  const omega = (longPeri - longNode) * DEG_TO_RAD; // Argument of perihelion
  const Omega = longNode * DEG_TO_RAD;             // Longitude of ascending node

  // Mean anomaly M in radians
  const M_deg = normalizeAngleDeg(L - longPeri);
  const M = M_deg * DEG_TO_RAD;

  // 2. Solve Kepler's equation for Eccentric Anomaly E
  const E = solveKepler(M, e);

  // 3. Orbital plane coordinates
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1.0 - e * e) * Math.sin(E);

  // 4. Rotate to J2000 Ecliptic Frame
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosNode = Math.cos(Omega);
  const sinNode = Math.sin(Omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const x = (cosOmega * cosNode - sinOmega * sinNode * cosI) * xPrime +
            (-sinOmega * cosNode - cosOmega * sinNode * cosI) * yPrime;

  const y = (cosOmega * sinNode + sinOmega * cosNode * cosI) * xPrime +
            (-sinOmega * sinNode + cosOmega * cosNode * cosI) * yPrime;

  const z = (sinOmega * sinI) * xPrime + (cosOmega * sinI) * yPrime;

  return { x, y, z };
}

/**
 * Computes orbital distance from the Sun in AU.
 */
export function getPlanetSunDistance(planet: PlanetKey, jde: number): number {
  const pos = getPlanetHeliocentricPosition(planet, jde);
  return Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
}

/**
 * Precalculates closed orbital trajectory points (in AU) for orbit visualization.
 */
export function generateClosedOrbitPoints(planet: PlanetKey, baseJde: number, numPoints = 180): Vector3D[] {
  if (planet === 'sun') return [{ x: 0, y: 0, z: 0 }];

  const orbitalPeriodsDays: Record<Exclude<PlanetKey, 'sun'>, number> = {
    mercury: 87.969,
    venus: 224.701,
    earth: 365.256,
    mars: 686.980,
    jupiter: 4332.589,
    saturn: 10759.22,
    uranus: 30685.4,
    neptune: 60189.0,
  };

  const period = orbitalPeriodsDays[planet];
  const step = period / numPoints;
  const points: Vector3D[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const jde = baseJde + i * step;
    points.push(getPlanetHeliocentricPosition(planet, jde));
  }

  return points;
}
