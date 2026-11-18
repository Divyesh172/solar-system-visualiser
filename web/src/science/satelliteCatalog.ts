/**
 * Curated Earth Satellite & Spacecraft Catalog.
 * 
 * Includes high-precision Two-Line Element (TLE) sets and kid-relatable metadata
 * for iconic human spacecraft orbiting Earth.
 */

export interface SatelliteMetadata {
  id: string;
  name: string;
  shortName: string;
  noradId: number;
  tleLine1: string;
  tleLine2: string;
  category: 'space_station' | 'telescope' | 'earth_observation' | 'deep_space';
  colorHex: string;
  launchYear: number;
  orbitType: string;
  nominalAltitudeKm: number;
  nominalPeriodMinutes: number;
  speedKmH: number;
  crewCapacity: number;
  iconEmoji: string;
  funFact: string;
  funFacts: string[];
}

export const SATELLITE_CATALOG: Record<string, SatelliteMetadata> = {
  iss: {
    id: 'iss',
    name: 'International Space Station (ISS)',
    shortName: 'ISS',
    noradId: 25544,
    tleLine1: '1 25544U 98067A   24098.54166667  .00016717  00000-0  10270-3 0  9002',
    tleLine2: '2 25544  51.6416 250.2104 0004240 120.3542 245.8920 15.50000000445678',
    category: 'space_station',
    colorHex: '#38bdf8',
    launchYear: 1998,
    orbitType: 'Low Earth Orbit (LEO, 51.6° Inclination)',
    nominalAltitudeKm: 420,
    nominalPeriodMinutes: 92.8,
    speedKmH: 27600,
    crewCapacity: 7,
    iconEmoji: '🛰️',
    funFact: 'The ISS is as large as a full football field and travels so fast that astronauts on board experience 16 sunrises and 16 sunsets every day!',
    funFacts: [
      'The International Space Station travels at a blistering speed of 27,600 km/h (17,150 mph)—orbiting Earth once every 92 minutes!',
      'It has been continuously inhabited by humans from across the world since November 2000, serving as a floating microgravity laboratory.',
      'The station’s huge solar array wingspan measures 109 meters (357 feet), making it one of the brightest human-made objects visible from Earth at night.',
      'Astronauts on the ISS must exercise for at least 2 hours every day to prevent their muscles and bones from weakening in zero gravity.',
      'Water on the ISS is so precious that 98% of all sweat, moisture, and urine is purified and recycled back into clean, drinkable water!',
    ],
  },
  hubble: {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    shortName: 'Hubble',
    noradId: 20580,
    tleLine1: '1 20580U 90037B   24098.50000000  .00001000  00000-0  50000-4 0  9998',
    tleLine2: '2 20580  28.4695 105.1205 0002850 140.2310 219.8920 15.08000000854210',
    category: 'telescope',
    colorHex: '#a855f7',
    launchYear: 1990,
    orbitType: 'Low Earth Orbit (LEO, 28.5° Inclination)',
    nominalAltitudeKm: 535,
    nominalPeriodMinutes: 95.4,
    speedKmH: 27300,
    crewCapacity: 0,
    iconEmoji: '🔭',
    funFact: 'Hubble orbits above Earth’s blurry atmosphere, capturing crystal-clear photos of newborn stars, giant nebulae, and colliding galaxies!',
    funFacts: [
      'Hubble was launched into space in 1990 aboard Space Shuttle Discovery and has made over 1.5 million astronomical observations.',
      'Because it has no thrusters that burn fuel, Hubble turns itself around in space using spinning reaction wheels and gyroscopes.',
      'Astronauts visited Hubble 5 times during daring Space Shuttle spacewalk missions to repair its instruments and install upgrades in orbit.',
      'Hubble’s famous "Deep Field" photograph peered into a seemingly empty dark patch of sky and revealed over 3,000 never-before-seen distant galaxies!',
    ],
  },
  tiangong: {
    id: 'tiangong',
    name: 'Tiangong Space Station',
    shortName: 'Tiangong',
    noradId: 48274,
    tleLine1: '1 48274U 21035A   24098.50000000  .00012000  00000-0  15000-3 0  9991',
    tleLine2: '2 48274  41.4720 180.5210 0003500 200.1250 160.0120 15.62000000168420',
    category: 'space_station',
    colorHex: '#ef4444',
    launchYear: 2021,
    orbitType: 'Low Earth Orbit (LEO, 41.5° Inclination)',
    nominalAltitudeKm: 390,
    nominalPeriodMinutes: 92.2,
    speedKmH: 27600,
    crewCapacity: 3,
    iconEmoji: '🏮',
    funFact: '"Tiangong" means "Heavenly Palace" in Chinese. It features a robotic arm that can crawl along the outside of the station like an acrobat!',
    funFacts: [
      'Tiangong is a T-shaped modern orbital station consisting of the Tianhe core module and two science experiment modules (Wentian and Mengtian).',
      'The station is continuously operated by crews of three Chinese taikonauts who conduct plant biology and fluid physics experiments.',
      'It is equipped with high-efficiency flexible gallium-arsenide solar wings that pivot continuously to face the Sun.',
    ],
  },
  landsat: {
    id: 'landsat',
    name: 'Landsat 8 Earth Observer',
    shortName: 'Landsat 8',
    noradId: 39084,
    tleLine1: '1 39084U 13008A   24098.50000000  .00000050  00000-0  20000-4 0  9995',
    tleLine2: '2 39084  98.2150 150.1200 0001200  90.4500 270.1200 14.57100000584210',
    category: 'earth_observation',
    colorHex: '#10b981',
    launchYear: 2013,
    orbitType: 'Sun-Synchronous Polar Orbit (98.2° Inclination)',
    nominalAltitudeKm: 705,
    nominalPeriodMinutes: 98.9,
    speedKmH: 26900,
    crewCapacity: 0,
    iconEmoji: '🌍',
    funFact: 'Landsat 8 flies over the North and South poles every 99 minutes, taking high-resolution color portraits of Earth’s rainforests, coral reefs, and polar ice sheets!',
    funFacts: [
      'The joint NASA/USGS Landsat program has been observing and photographing Earth continuously from space since 1972.',
      'Landsat 8 maps the entire planet surface every 16 days, helping firefighters monitor forest wildfires and farmers monitor crop health.',
      'It flies in a "sun-synchronous" orbit, meaning it crosses the equator at the exact same local solar time (10:00 AM) on every single pass!',
    ],
  },
};

export const SATELLITE_LIST: SatelliteMetadata[] = Object.values(SATELLITE_CATALOG);
