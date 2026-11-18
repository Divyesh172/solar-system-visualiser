import type { Vector3D } from './ephemeris';

export type ScaleMode = 'explorer' | 'true_scale';

export interface CoordinateProjectorOptions {
  mode?: ScaleMode;
  auToWorld?: number;
  blend?: number; // 0.0 (Explorer) to 1.0 (True 1:1 Scale)
}

/**
 * CoordinateProjector: Converts astronomical heliocentric coordinates (AU)
 * into 3D graphics coordinates (where Y is Up, and X-Z is the ecliptic plane).
 */
export class CoordinateProjector {
  public mode: ScaleMode;
  public auToWorld: number;
  public blend: number;

  constructor(options: CoordinateProjectorOptions = {}) {
    this.mode = options.mode ?? 'explorer';
    this.auToWorld = options.auToWorld ?? 42.0;
    this.blend = options.blend ?? (this.mode === 'true_scale' ? 1.0 : 0.0);
  }

  /**
   * Projects a heliocentric AU vector into 3D scene space.
   */
  public projectPosition(astroPos: Vector3D): [number, number, number] {
    const distAu = Math.sqrt(
      astroPos.x * astroPos.x + astroPos.y * astroPos.y + astroPos.z * astroPos.z
    );

    if (distAu < 1e-6) {
      return [0, 0, 0];
    }

    const dirX = astroPos.x / distAu;
    const dirY = astroPos.y / distAu;
    const dirZ = astroPos.z / distAu;

    // Explorer Mode uses perceptual sub-linear curve (dist^0.55)
    const explorerDist = Math.pow(distAu, 0.55) * this.auToWorld;
    // True Scale preserves strict 1:1 linear distance
    const trueDist = distAu * this.auToWorld;

    const scaledDist = explorerDist + (trueDist - explorerDist) * this.blend;

    // In astronomical J2000 coordinates: X, Y are in ecliptic plane, Z is normal to ecliptic.
    // In Three.js: X is right, Y is Up, Z is out of screen (X-Z is horizontal orbital plane).
    const sceneX = dirX * scaledDist;
    const sceneY = dirZ * scaledDist; // Inclination out of ecliptic plane
    const sceneZ = dirY * scaledDist;

    return [sceneX, sceneY, sceneZ];
  }
}
