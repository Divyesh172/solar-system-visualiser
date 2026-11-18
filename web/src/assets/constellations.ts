import constellationsData from './constellations.json';

export interface ConstellationCentroid {
  ra: number;
  dec: number;
}

export interface ConstellationStar {
  name: string;
  ra: number;
  dec: number;
  mag: number;
  bv: number;
}

/** A single line segment between two celestial coordinates: [[ra1, dec1], [ra2, dec2]] */
export type ConstellationLine = [[number, number], [number, number]];

export interface Constellation {
  id: string;
  name: string;
  english: string;
  family: 'northern' | 'southern' | 'zodiac' | 'major';
  centroid: ConstellationCentroid;
  stars: ConstellationStar[];
  lines: ConstellationLine[];
}

export const CONSTELLATIONS: Constellation[] = constellationsData as Constellation[];
