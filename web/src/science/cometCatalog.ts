/**
 * High-Precision Keplerian Ephemeris Engine for Comets.
 * 
 * Accurately models orbits of famous historical comets (e.g. 1P/Halley, NEOWISE, Hale-Bopp)
 * with extreme orbital eccentricity (e > 0.85 to 0.999), 3D orbital inclinations,
 * velocity vectors, and tail orientations.
 */

import type { Vector3D } from './ephemeris';

export type CometId = 'halley' | 'neowise' | 'hale_bopp' | 'encke';

export interface CometOrbitalElements {
  /** Semi-major axis in AU */
  a: number;
  /** Orbital eccentricity (0 <= e < 1) */
  e: number;
  /** Orbital inclination in degrees */
  I: number;
  /** Longitude of Ascending Node (Omega) in degrees */
  Omega: number;
  /** Argument of Perihelion (omega) in degrees */
  omega: number;
  /** Epoch of perihelion passage in Julian Ephemeris Date (JDE) */
  Tp: number;
  /** Orbital period in days */
  periodDays: number;
}

export interface CometMetadata {
  id: CometId;
  name: string;
  shortName: string;
  elements: CometOrbitalElements;
  periodYears: number;
  perihelionAu: number;
  aphelionAu: number;
  lastPerihelion: string;
  nextPerihelion: string;
  colorHex: string;
  tailColorIon: string;
  tailColorDust: string;
  iconEmoji: string;
  description: string;
  funFacts: string[];
}

const DEG_TO_RAD = Math.PI / 180.0;
// Gaussian gravitational constant k in AU^(1.5) / day
const GAUSSIAN_K = 0.01720209895;
// AU in kilometers
const AU_KM = 149597870.7;

export const COMET_CATALOG: Record<CometId, CometMetadata> = {
  halley: {
    id: 'halley',
    name: "1P/Halley (Halley's Comet)",
    shortName: 'Halley',
    elements: {
      a: 17.834,
      e: 0.96714,
      I: 162.26, // Retrograde orbit!
      Omega: 58.42,
      omega: 111.33,
      Tp: 2446470.96, // 1986-Feb-09.46
      periodDays: 75.32 * 365.256898,
    },
    periodYears: 75.3,
    perihelionAu: 0.586,
    aphelionAu: 35.08,
    lastPerihelion: 'February 9, 1986',
    nextPerihelion: 'July 28, 2061',
    colorHex: '#38bdf8',
    tailColorIon: '#60a5fa',
    tailColorDust: '#f8fafc',
    iconEmoji: '☄️',
    description: 'The most famous periodic comet in human history, returning every 75-76 years in a backwards (retrograde) orbit inclined 162° to the planets.',
    funFacts: [
      "Halley's Comet is the only known periodic comet that is regularly visible to the naked eye from Earth, recorded by skywatchers since at least 240 BC.",
      'In 1986, an international armada of 5 spacecraft (including the ESA Giotto probe) flew right past its icy nucleus, revealing a dark peanut-shaped potato of dust and ice!',
      'When Earth crosses the orbital trail of dust shed by Halley twice a year, it creates the Eta Aquariids (May) and Orionids (October) meteor showers.',
      'Halley will reach its closest point to the Sun next on July 28, 2061, when it will shine brightly in the northern dawn skies!',
    ],
  },
  neowise: {
    id: 'neowise',
    name: 'C/2020 F3 (NEOWISE)',
    shortName: 'NEOWISE',
    elements: {
      a: 360.0,
      e: 0.99918,
      I: 128.94,
      Omega: 61.01,
      omega: 37.28,
      Tp: 2459034.24, // 2020-Jul-03.24
      periodDays: 6800 * 365.256898,
    },
    periodYears: 6800,
    perihelionAu: 0.295,
    aphelionAu: 720.0,
    lastPerihelion: 'July 3, 2020',
    nextPerihelion: 'Year ~8820',
    colorHex: '#f59e0b',
    tailColorIon: '#38bdf8',
    tailColorDust: '#fef08a',
    iconEmoji: '☄️',
    description: 'The spectacular naked-eye comet of Summer 2020 that developed stunning dual blue-ion and curving golden-dust tails after brushing inside Mercury’s orbit.',
    funFacts: [
      'Discovered on March 27, 2020, by the NEOWISE space infrared telescope, it survived its scorching pass just 44 million km from the Sun.',
      'During July 2020, it became bright enough to be easily seen with the naked eye even near light-polluted cities throughout the Northern Hemisphere.',
      'Its orbit was changed significantly by the gravitational pull of the giant planets: its orbital period was shortened from ~4,500 years to ~6,800 years!',
    ],
  },
  hale_bopp: {
    id: 'hale_bopp',
    name: 'C/1995 O1 (Hale-Bopp)',
    shortName: 'Hale-Bopp',
    elements: {
      a: 186.0,
      e: 0.995086,
      I: 89.43, // Perpendicular to ecliptic!
      Omega: 282.47,
      omega: 130.59,
      Tp: 2450539.64, // 1997-Apr-01.14
      periodDays: 2530 * 365.256898,
    },
    periodYears: 2530,
    perihelionAu: 0.914,
    aphelionAu: 370.8,
    lastPerihelion: 'April 1, 1997',
    nextPerihelion: 'Year ~4530',
    colorHex: '#ec4899',
    tailColorIon: '#818cf8',
    tailColorDust: '#fbcfe8',
    iconEmoji: '☄️',
    description: 'The "Great Comet of 1997", possessing an unusually massive nucleus (60 km wide) that remained visible to the naked eye for a record-breaking 18 months.',
    funFacts: [
      'Hale-Bopp was discovered independently in July 1995 by Alan Hale and Thomas Bopp when it was still past Jupiter’s orbit—unusually early for a comet!',
      'Its nucleus is estimated to be roughly 60 kilometers across, about six times larger than Halley’s Comet.',
      'Its orbit plunges almost vertically through the planetary plane at an inclination of 89.4°, meaning it will never collide with the inner planets.',
    ],
  },
  encke: {
    id: 'encke',
    name: '2P/Encke',
    shortName: 'Encke',
    elements: {
      a: 2.215,
      e: 0.84827,
      I: 11.78,
      Omega: 334.57,
      omega: 186.55,
      Tp: 2460239.95, // 2023-Oct-22.95
      periodDays: 3.30 * 365.256898,
    },
    periodYears: 3.3,
    perihelionAu: 0.336,
    aphelionAu: 4.09,
    lastPerihelion: 'October 22, 2023',
    nextPerihelion: 'February 9, 2027',
    colorHex: '#34d399',
    tailColorIon: '#6ee7b7',
    tailColorDust: '#e2e8f0',
    iconEmoji: '☄️',
    description: 'The shortest-period comet known in the solar system, completing an orbit around the Sun every 3.3 years between Mercury and Jupiter.',
    funFacts: [
      'Encke was only the second periodic comet discovered in history after Halley, with its recurring orbit calculated by Johann Franz Encke in 1819.',
      'Because it passes so close to the Sun every 3.3 years, it has made thousands of revolutions, leaving behind the Taurid meteor stream responsible for Halloween fireballs!',
      'Encke has lost most of its volatile surface ices and is on its way to eventually becoming a dark, dormant asteroid-like body.',
    ],
  },
};

/**
 * Solves Kepler's Equation M = E - e*sin(E) for high eccentricity (e > 0.8 up to 0.999).
 * Employs cubic Halley root-finding with Barker-like initial guesses for fast convergence.
 */
export function solveKeplerHighEccentricity(M: number, e: number): number {
  let m = M % (2.0 * Math.PI);
  if (m > Math.PI) m -= 2.0 * Math.PI;
  if (m < -Math.PI) m += 2.0 * Math.PI;

  // Initial estimate: Barker-like cubic root near perihelion for high e
  let E: number;
  if (e > 0.8 && Math.abs(m) < 0.25) {
    E = Math.cbrt((6.0 * m) / (1.0 - e + 0.1 * e));
  } else {
    E = m + e * Math.sin(m);
  }

  // Halley's 3rd-order root finding
  for (let iter = 0; iter < 12; iter++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - e * sinE - m;
    if (Math.abs(f) < 1e-13) break;

    const fPrime = 1.0 - e * cosE;
    const fDoublePrime = e * sinE;

    // Halley correction: delta = f / (f' - (f * f'') / (2 * f'))
    const delta = f / (fPrime - (f * fDoublePrime) / (2.0 * fPrime));
    E -= delta;
    if (Math.abs(delta) < 1e-13) break;
  }

  return E;
}

export interface CometState {
  /** 3D position in astronomical J2000 heliocentric ecliptic frame (AU) */
  position: Vector3D;
  /** Instantaneous orbital velocity vector in AU/day */
  velocity: Vector3D;
  /** Heliocentric distance in AU */
  distanceAu: number;
  /** Instantaneous orbital speed in km/s */
  speedKmS: number;
  /** Normalized unit vector pointing directly away from the Sun (direction of blue ion tail) */
  antiSolarDir: [number, number, number];
  /** Normalized unit vector along the comet's velocity (influencing the curved dust tail) */
  velocityDir: [number, number, number];
  /** True anomaly in radians */
  trueAnomalyRad: number;
  /** Eccentric anomaly in radians */
  eccentricAnomalyRad: number;
}

/**
 * Computes high-precision heliocentric 3D position, velocity, and tail directions for a comet.
 */
export function getCometHeliocentricPosition(
  cometOrId: CometMetadata | CometId,
  jde: number
): CometState {
  const meta = typeof cometOrId === 'string' ? COMET_CATALOG[cometOrId] : cometOrId;
  const el = meta.elements;

  // 1. Mean motion in radians per day: n = k / a^(1.5)
  const n = GAUSSIAN_K / Math.pow(el.a, 1.5);

  // 2. Days elapsed since reference perihelion passage
  const deltaDays = jde - el.Tp;

  // 3. Mean Anomaly M in radians
  const M = n * deltaDays;

  // 4. Solve Kepler's equation for Eccentric Anomaly E
  const E = solveKeplerHighEccentricity(M, el.e);

  // 5. In-plane coordinates (x', y') and distance r in AU
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sqrtOneMinusE2 = Math.sqrt(Math.max(0.0, 1.0 - el.e * el.e));

  const xPrime = el.a * (cosE - el.e);
  const yPrime = el.a * sqrtOneMinusE2 * sinE;
  const r = el.a * (1.0 - el.e * cosE);

  // In-plane velocity derivatives (AU/day)
  const vxPrime = (-el.a * el.a * n * sinE) / r;
  const vyPrime = (el.a * el.a * n * sqrtOneMinusE2 * cosE) / r;

  // 6. Rotate to J2000 Heliocentric Ecliptic Frame
  const I_rad = el.I * DEG_TO_RAD;
  const Omega_rad = el.Omega * DEG_TO_RAD;
  const omega_rad = el.omega * DEG_TO_RAD;

  const cosOmega = Math.cos(omega_rad);
  const sinOmega = Math.sin(omega_rad);
  const cosNode = Math.cos(Omega_rad);
  const sinNode = Math.sin(Omega_rad);
  const cosI = Math.cos(I_rad);
  const sinI = Math.sin(I_rad);

  const Px = cosOmega * cosNode - sinOmega * sinNode * cosI;
  const Py = cosOmega * sinNode + sinOmega * cosNode * cosI;
  const Pz = sinOmega * sinI;

  const Qx = -sinOmega * cosNode - cosOmega * sinNode * cosI;
  const Qy = -sinOmega * sinNode + cosOmega * cosNode * cosI;
  const Qz = cosOmega * sinI;

  const x = Px * xPrime + Qx * yPrime;
  const y = Py * xPrime + Qy * yPrime;
  const z = Pz * xPrime + Qz * yPrime;

  const vx = Px * vxPrime + Qx * vyPrime;
  const vy = Py * vxPrime + Qy * vyPrime;
  const vz = Pz * vxPrime + Qz * vyPrime;

  // Speed in km/s (1 AU/day = 149,597,870.7 km / 86,400 s = ~1,731.4568 km/s)
  const vMagAuDay = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const speedKmS = (vMagAuDay * AU_KM) / 86400.0;

  // Tail directions:
  // Anti-solar direction: unit vector pointing from Sun (origin) to comet
  const antiSolarDir: [number, number, number] = [x / r, y / r, z / r];
  // Velocity direction: unit vector along motion
  const velocityDir: [number, number, number] = [
    vx / vMagAuDay,
    vy / vMagAuDay,
    vz / vMagAuDay,
  ];

  // True anomaly nu
  const trueAnomalyRad = Math.atan2(sqrtOneMinusE2 * sinE, cosE - el.e);

  return {
    position: { x, y, z },
    velocity: { x: vx, y: vy, z: vz },
    distanceAu: r,
    speedKmS,
    antiSolarDir,
    velocityDir,
    trueAnomalyRad,
    eccentricAnomalyRad: E,
  };
}

/**
 * Precomputes 3D orbital trajectory points (in AU) for a comet.
 * Samples points uniformly in eccentric anomaly E to naturally provide dense resolution
 * near high-speed perihelion.
 */
export function generateCometOrbitPoints(
  cometOrId: CometMetadata | CometId,
  numPoints = 240
): Vector3D[] {
  const meta = typeof cometOrId === 'string' ? COMET_CATALOG[cometOrId] : cometOrId;
  const el = meta.elements;

  const I_rad = el.I * DEG_TO_RAD;
  const Omega_rad = el.Omega * DEG_TO_RAD;
  const omega_rad = el.omega * DEG_TO_RAD;

  const cosOmega = Math.cos(omega_rad);
  const sinOmega = Math.sin(omega_rad);
  const cosNode = Math.cos(Omega_rad);
  const sinNode = Math.sin(Omega_rad);
  const cosI = Math.cos(I_rad);
  const sinI = Math.sin(I_rad);

  const Px = cosOmega * cosNode - sinOmega * sinNode * cosI;
  const Py = cosOmega * sinNode + sinOmega * cosNode * cosI;
  const Pz = sinOmega * sinI;

  const Qx = -sinOmega * cosNode - cosOmega * sinNode * cosI;
  const Qy = -sinOmega * sinNode + cosOmega * cosNode * cosI;
  const Qz = cosOmega * sinI;

  const sqrtOneMinusE2 = Math.sqrt(Math.max(0.0, 1.0 - el.e * el.e));

  const points: Vector3D[] = [];

  for (let i = 0; i <= numPoints; i++) {
    // Eccentric anomaly E from -PI to +PI
    const E = -Math.PI + (2.0 * Math.PI * i) / numPoints;
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);

    const xPrime = el.a * (cosE - el.e);
    const yPrime = el.a * sqrtOneMinusE2 * sinE;

    const x = Px * xPrime + Qx * yPrime;
    const y = Py * xPrime + Qy * yPrime;
    const z = Pz * xPrime + Qz * yPrime;

    points.push({ x, y, z });
  }

  return points;
}
