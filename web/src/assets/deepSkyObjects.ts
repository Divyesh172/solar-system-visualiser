/**
 * Curated Catalog of Iconic Messier Deep Sky Objects (DSOs).
 * 
 * Includes famous galaxies, star-forming nebulae, open/globular clusters,
 * supernova remnants, and planetary nebulae for the Planetarium dome.
 */

export type DsoCategory =
  | 'galaxy'
  | 'nebula'
  | 'open_cluster'
  | 'globular_cluster'
  | 'supernova_remnant'
  | 'planetary_nebula';

export interface DeepSkyObject {
  id: string;
  catalogNumber: string;
  commonName: string;
  category: DsoCategory;
  /** Right Ascension in decimal hours (0 to 24) */
  raHours: number;
  /** Declination in decimal degrees (-90 to +90) */
  decDeg: number;
  constellation: string;
  /** Apparent visual magnitude (lower is brighter) */
  visualMagnitude: number;
  /** Distance from Earth in light years */
  distanceLy: number;
  /** Primary accent color hex for 3D marker and label */
  colorHex: string;
  /** Category icon emoji */
  iconEmoji: string;
  /** Concise educational description for students */
  description: string;
}

export const CATEGORY_COLORS: Record<DsoCategory, string> = {
  galaxy: '#c084fc',          // Radiant purple
  nebula: '#f43f5e',          // Rose / emission pink
  open_cluster: '#38bdf8',    // Sky blue
  globular_cluster: '#fbbf24',// Warm amber gold
  supernova_remnant: '#f97316',// Electric orange
  planetary_nebula: '#2dd4bf', // Cyan / turquoise
};

export const DEEP_SKY_OBJECTS: DeepSkyObject[] = [
  {
    id: 'm31',
    catalogNumber: 'M31 (NGC 224)',
    commonName: 'Andromeda Galaxy',
    category: 'galaxy',
    raHours: 0.7128,
    decDeg: 41.27,
    constellation: 'Andromeda',
    visualMagnitude: 3.44,
    distanceLy: 2537000,
    colorHex: CATEGORY_COLORS.galaxy,
    iconEmoji: '🌌',
    description: 'The nearest major spiral galaxy to the Milky Way, containing over one trillion stars and headed toward a colossal galactic merger with us in 4.5 billion years!',
  },
  {
    id: 'm42',
    catalogNumber: 'M42 (NGC 1976)',
    commonName: 'Great Orion Nebula',
    category: 'nebula',
    raHours: 5.5906,
    decDeg: -5.39,
    constellation: 'Orion',
    visualMagnitude: 4.0,
    distanceLy: 1344,
    colorHex: CATEGORY_COLORS.nebula,
    iconEmoji: '✨',
    description: 'A stellar nursery inside the Sword of Orion where infant stars are currently coalescing out of glowing turbulent hydrogen gas.',
  },
  {
    id: 'm45',
    catalogNumber: 'M45',
    commonName: 'Pleiades (Seven Sisters)',
    category: 'open_cluster',
    raHours: 3.79,
    decDeg: 24.11,
    constellation: 'Taurus',
    visualMagnitude: 1.6,
    distanceLy: 444,
    colorHex: CATEGORY_COLORS.open_cluster,
    iconEmoji: '💎',
    description: 'A dazzling cluster of brilliant blue luminous stars surrounded by faint reflection nebulosity, easily spotted with the naked eye.',
  },
  {
    id: 'm1',
    catalogNumber: 'M1 (NGC 1952)',
    commonName: 'Crab Nebula',
    category: 'supernova_remnant',
    raHours: 5.5756,
    decDeg: 22.01,
    constellation: 'Taurus',
    visualMagnitude: 8.4,
    distanceLy: 6500,
    colorHex: CATEGORY_COLORS.supernova_remnant,
    iconEmoji: '💥',
    description: 'The expanding filamentary debris of a supernova witnessed and recorded by astronomers on Earth in 1054 AD, powered by a rapidly pulsing central neutron star.',
  },
  {
    id: 'm13',
    catalogNumber: 'M13 (NGC 6205)',
    commonName: 'Great Globular Cluster in Hercules',
    category: 'globular_cluster',
    raHours: 16.695,
    decDeg: 36.46,
    constellation: 'Hercules',
    visualMagnitude: 5.8,
    distanceLy: 22200,
    colorHex: CATEGORY_COLORS.globular_cluster,
    iconEmoji: '⭐',
    description: 'A swarm of several hundred thousand ancient stars tightly bound into a cosmic sphere. The famous 1974 Arecibo radio message was beamed here!',
  },
  {
    id: 'm51',
    catalogNumber: 'M51 (NGC 5194)',
    commonName: 'Whirlpool Galaxy',
    category: 'galaxy',
    raHours: 13.498,
    decDeg: 47.20,
    constellation: 'Canes Venatici',
    visualMagnitude: 8.4,
    distanceLy: 23000000,
    colorHex: CATEGORY_COLORS.galaxy,
    iconEmoji: '🌀',
    description: 'A grand-design spiral galaxy with magnificent sweeping arms, interacting gravitationally with its yellow dwarf companion NGC 5195.',
  },
  {
    id: 'm57',
    catalogNumber: 'M57 (NGC 6720)',
    commonName: 'Ring Nebula',
    category: 'planetary_nebula',
    raHours: 18.893,
    decDeg: 33.03,
    constellation: 'Lyra',
    visualMagnitude: 8.8,
    distanceLy: 2570,
    colorHex: CATEGORY_COLORS.planetary_nebula,
    iconEmoji: '🪐',
    description: 'A glowing ring of expelled gases from a dying Sun-like star, previewing what will happen to our own Sun in about 5 billion years.',
  },
  {
    id: 'm8',
    catalogNumber: 'M8 (NGC 6523)',
    commonName: 'Lagoon Nebula',
    category: 'nebula',
    raHours: 18.06,
    decDeg: -24.38,
    constellation: 'Sagittarius',
    visualMagnitude: 6.0,
    distanceLy: 4100,
    colorHex: CATEGORY_COLORS.nebula,
    iconEmoji: '🌸',
    description: 'A giant interstellar cloud in Sagittarius classified as an emission nebula, featuring dark silhouettes of dense star-forming Bok globules.',
  },
  {
    id: 'm104',
    catalogNumber: 'M104 (NGC 4594)',
    commonName: 'Sombrero Galaxy',
    category: 'galaxy',
    raHours: 12.666,
    decDeg: -11.62,
    constellation: 'Virgo',
    visualMagnitude: 8.0,
    distanceLy: 29300000,
    colorHex: CATEGORY_COLORS.galaxy,
    iconEmoji: '🛸',
    description: 'An unbarred spiral galaxy viewed almost edge-on, distinguished by an extraordinarily large bright central bulge and a dramatic rim of dark dust.',
  },
  {
    id: 'm27',
    catalogNumber: 'M27 (NGC 6853)',
    commonName: 'Dumbbell Nebula',
    category: 'planetary_nebula',
    raHours: 19.993,
    decDeg: 22.72,
    constellation: 'Vulpecula',
    visualMagnitude: 7.5,
    distanceLy: 1360,
    colorHex: CATEGORY_COLORS.planetary_nebula,
    iconEmoji: '⏳',
    description: 'The very first planetary nebula ever discovered (by Charles Messier in 1764), exhibiting a distinctive hourglass shape.',
  },
  {
    id: 'm81',
    catalogNumber: 'M81 (NGC 3031)',
    commonName: "Bode's Galaxy",
    category: 'galaxy',
    raHours: 9.926,
    decDeg: 69.07,
    constellation: 'Ursa Major',
    visualMagnitude: 6.94,
    distanceLy: 12000000,
    colorHex: CATEGORY_COLORS.galaxy,
    iconEmoji: '🌌',
    description: 'A bright spiral galaxy in the northern constellation Ursa Major, featuring an active galactic nucleus with a supermassive black hole.',
  },
  {
    id: 'm82',
    catalogNumber: 'M82 (NGC 3034)',
    commonName: 'Cigar Galaxy',
    category: 'galaxy',
    raHours: 9.930,
    decDeg: 69.68,
    constellation: 'Ursa Major',
    visualMagnitude: 8.41,
    distanceLy: 12000000,
    colorHex: CATEGORY_COLORS.galaxy,
    iconEmoji: '🔥',
    description: 'A starburst galaxy forming stars at tenfold the rate of the Milky Way, venting vast glowing plumes of hydrogen into intergalactic space.',
  },
];

/**
 * Converts Right Ascension (hours 0..24) and Declination (degrees -90..+90)
 * into a 3D Cartesian position on a celestial sphere of given radius.
 */
export function dsoToCartesian(raHours: number, decDeg: number, radius: number): [number, number, number] {
  const alpha = (raHours / 24.0) * Math.PI * 2;
  const delta = (decDeg / 180.0) * Math.PI;

  const cosDelta = Math.cos(delta);
  const x = radius * cosDelta * Math.cos(alpha);
  const y = radius * Math.sin(delta);
  const z = radius * cosDelta * Math.sin(alpha);

  return [x, y, z];
}
