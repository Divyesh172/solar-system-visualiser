import { useEffect, useRef, type FC } from 'react';
import type { CameraControls } from '@react-three/drei';
import { useGroundObserverStore } from '../../state/useGroundObserverStore';

interface GroundCameraControllerProps {
  controlsRef: React.RefObject<CameraControls | null>;
}

/**
 * GroundCameraController: Manages smooth camera transitions between
 * interplanetary space orbit view and backyard ground observer view.
 * 
 * In Ground Mode:
 * - Position is anchored at observer eye level (y = 1.8m above ground platform).
 * - Distance is locked (0.01) so mouse/touch drag rotates heading and pitch in-place.
 * - Pitch is constrained from horizon (~84°) up to zenith (~177°), preventing looking underground.
 * - Smoothly swoops back to macro solar system overview (0, 80, 160) upon return to space.
 */
export const GroundCameraController: FC<GroundCameraControllerProps> = ({ controlsRef }) => {
  const viewMode = useGroundObserverStore((state) => state.viewMode);
  const prevModeRef = useRef(viewMode);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (viewMode === 'ground' && prevModeRef.current !== 'ground') {
      // 1. Enter Ground Mode: swoop down to observer eye level
      const origSmooth = controls.smoothTime;
      controls.smoothTime = 0.85;

      // Position eye slightly offset from target (0, 1.8, 0)
      controls
        .setLookAt(0, 1.8, 0.04, 0, 1.8, 0, true)
        .catch(() => {})
        .finally(() => {
          controls.smoothTime = origSmooth;
          // Lock distance so dragging rotates camera around observer head
          controls.minDistance = 0.01;
          controls.maxDistance = 0.01;
          // Constrain pitch to look from horizon up to zenith
          controls.minPolarAngle = Math.PI / 2 - 0.12;
          controls.maxPolarAngle = Math.PI - 0.05;
          controls.azimuthRotateSpeed = 1.0;
          controls.polarRotateSpeed = 1.0;
        });
    } else if (viewMode === 'space' && prevModeRef.current === 'ground') {
      // 2. Exit Ground Mode: restore standard orbital constraints and return to space
      controls.minDistance = 0.8;
      controls.maxDistance = 650;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      const origSmooth = controls.smoothTime;
      controls.smoothTime = 0.85;
      controls
        .setLookAt(0, 80, 160, 0, 0, 0, true)
        .catch(() => {})
        .finally(() => {
          controls.smoothTime = origSmooth;
        });
    }

    prevModeRef.current = viewMode;
  }, [viewMode, controlsRef]);

  return null;
};
