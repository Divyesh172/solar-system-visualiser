import { forwardRef } from 'react';
import { CameraControls } from '@react-three/drei';

export interface NavigationControlsProps {
  minDistance?: number;
  maxDistance?: number;
  smoothTime?: number;
  dollySpeed?: number;
}

/**
 * NavigationControls: High-responsiveness astronomical camera navigation powered by Drei CameraControls.
 * 
 * Tuning highlights:
 * - maxDistance: 650 prevents getting lost in infinite outer space void
 * - dollySpeed: 2.4 gives fast, responsive zooming on mouse wheel and trackpad
 * - dollyToCursor: true zooms directly towards whatever planet or region the cursor is pointing at
 * - smoothTime: 0.15 gives crisp, immediate response without floaty lag
 */
export const NavigationControls = forwardRef<CameraControls, NavigationControlsProps>(
  ({ minDistance = 0.8, maxDistance = 650, smoothTime = 0.15, dollySpeed = 2.4 }, ref) => {
    return (
      <CameraControls
        ref={ref}
        makeDefault
        minDistance={minDistance}
        maxDistance={maxDistance}
        smoothTime={smoothTime}
        dollySpeed={dollySpeed}
        truckSpeed={1.0}
        azimuthRotateSpeed={1.0}
        polarRotateSpeed={1.0}
        dollyToCursor={true}
      />
    );
  }
);

NavigationControls.displayName = 'NavigationControls';
