import { useEffect, useRef, type FC } from 'react';
import { useFrame } from '@react-three/fiber';
import type { CameraControls } from '@react-three/drei';
import * as THREE from 'three';
import { useFocusStore } from '../../state/useFocusStore';
import { useSpaceshipStore } from '../../state/useSpaceshipStore';
import { PLANETARY_METADATA } from '../../science/constants';
import type { PlanetKey } from '../../science/ephemeris';

interface CameraControllerProps {
  controlsRef: React.RefObject<CameraControls | null>;
  getTargetPosition: (id: string) => THREE.Vector3 | null;
}

/**
 * CameraController: Cinematic fly-to camera swoops and continuous moving-target tracking.
 * 
 * Features:
 * - NASA Eyes-style smooth 1.5s cubic camera fly-to transition when a planet is selected
 * - Proportional distance framing based on planet radius (close zoom for Mercury, wide zoom for Jupiter/Saturn)
 * - Continuous orbital tracking: Follows the moving world along its orbit while allowing user to freely spin/pan
 * - Double-click / clear-selection returns camera to Solar System macro overview
 */
export const CameraController: FC<CameraControllerProps> = ({ controlsRef, getTargetPosition }) => {
  const selectedId = useFocusStore((state) => state.selectedId);
  const activeTarget = useFocusStore((state) => state.activeTarget);

  const prevTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const isTransitioningRef = useRef(false);
  const lastSelectedIdRef = useRef<string | null | undefined>(undefined);
  const getTargetPositionRef = useRef(getTargetPosition);
  getTargetPositionRef.current = getTargetPosition;

  // Trigger smooth cinematic swoop ONLY when selected body actually changes
  useEffect(() => {
    // Avoid re-running when selectedId hasn't changed (prevents freezing camera angle)
    if (selectedId === lastSelectedIdRef.current) return;
    lastSelectedIdRef.current = selectedId;

    const controls = controlsRef.current;
    if (!controls) return;

    if (!selectedId || !activeTarget) {
      // Return smoothly to macro solar system overview once
      isTransitioningRef.current = true;
      controls
        .setLookAt(0, 80, 160, 0, 0, 0, true)
        .catch(() => {})
        .finally(() => {
          isTransitioningRef.current = false;
        });
      prevTargetPosRef.current = null;
      return;
    }

    const pos = getTargetPositionRef.current(selectedId);
    if (!pos) return;

    // Radius-scaled framing distance (or intimate close-up for spacecraft orbital rendezvous)
    let framingMultiplier = 3.6;
    if (selectedId === 'saturn') framingMultiplier = 4.8; // Give room for rings!
    if (selectedId === 'sun') framingMultiplier = 3.2;

    // Ensure camera is always safely outside planet geometry
    const minSafeDistance = activeTarget.radius * 1.5;
    const targetDistance = Math.max(
      activeTarget.type === 'satellite'
        ? 0.95
        : activeTarget.type === 'asteroid'
        ? 1.8
        : activeTarget.type === 'comet'
        ? 3.2
        : Math.max(activeTarget.radius * framingMultiplier, 4.0),
      minSafeDistance,
      0.5
    );

    // Calculate eye position: approach along current viewing vector
    const currentCameraPos = new THREE.Vector3();
    controls.getPosition(currentCameraPos);

    // IMPORTANT: check lengthSq BEFORE normalizing to catch degenerate (near-zero) vectors.
    // normalize() on a near-zero vector produces NaN which silently blacks out the renderer.
    const rawOffset = new THREE.Vector3().subVectors(currentCameraPos, pos);
    const offset = rawOffset.lengthSq() > 0.0001
      ? rawOffset.normalize()
      : new THREE.Vector3(0.6, 0.4, 0.8).normalize();

    // Add a slight upward tilt for a cinematic look, but clamp to prevent going underground
    const eyePos = new THREE.Vector3(
      pos.x + offset.x * targetDistance,
      pos.y + offset.y * targetDistance + targetDistance * 0.2,
      pos.z + offset.z * targetDistance
    );

    // Safety clamp: if eye somehow ended up inside the planet, push it out
    const eyeDistToTarget = eyePos.distanceTo(pos);
    if (eyeDistToTarget < minSafeDistance) {
      eyePos.sub(pos).normalize().multiplyScalar(minSafeDistance).add(pos);
    }

    const eyeX = eyePos.x;
    const eyeY = eyePos.y;
    const eyeZ = eyePos.z;

    // Trigger Spaceship flight animation and sound
    const destinationName = activeTarget.name;
    const destMeta = selectedId in PLANETARY_METADATA ? PLANETARY_METADATA[selectedId as PlanetKey] : null;
    const destinationColor = destMeta ? destMeta.colorHex : '#38bdf8';

    useSpaceshipStore.getState().startFlight(destinationName, destinationColor);

    const origSmoothTime = controls.smoothTime;
    const origMinDistance = controls.minDistance;
    controls.smoothTime = 0.85; // Cinematic space flight duration
    // Temporarily relax minDistance so the fly-to animation can reach its exact
    // destination without being clamped short — which would prevent the Promise
    // from resolving and leave isTransitioningRef permanently true (causing blackout).
    controls.minDistance = 0;

    isTransitioningRef.current = true;

    // Hard timeout fallback: if the setLookAt Promise never resolves (e.g. due
    // to camera-controls clamping), clear the transitioning flag after 3s so
    // orbit tracking resumes and the planet stays in view.
    const transitionTimeout = setTimeout(() => {
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false;
        controls.smoothTime = origSmoothTime;
        controls.minDistance = origMinDistance;
        useSpaceshipStore.getState().endFlight();
      }
    }, 3000);

    controls
      .setLookAt(eyeX, eyeY, eyeZ, pos.x, pos.y, pos.z, true)
      .catch(() => {})
      .finally(() => {
        clearTimeout(transitionTimeout);
        isTransitioningRef.current = false;
        controls.smoothTime = origSmoothTime;
        controls.minDistance = origMinDistance;
        useSpaceshipStore.getState().endFlight();
      });

    prevTargetPosRef.current = pos.clone();
  }, [selectedId, activeTarget, controlsRef]);

  // Maintain synchronous orbit tracking while the planet flies through space
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || !selectedId || isTransitioningRef.current) return;

    const currentPos = getTargetPositionRef.current(selectedId);
    if (!currentPos) return;

    if (prevTargetPosRef.current) {
      // Delta translation of the planet in this frame
      const deltaX = currentPos.x - prevTargetPosRef.current.x;
      const deltaY = currentPos.y - prevTargetPosRef.current.y;
      const deltaZ = currentPos.z - prevTargetPosRef.current.z;

      // Translate controls target and camera by exact planet orbital delta without resetting rotation
      if (Math.abs(deltaX) > 1e-6 || Math.abs(deltaY) > 1e-6 || Math.abs(deltaZ) > 1e-6) {
        controls.moveTo(currentPos.x, currentPos.y, currentPos.z, false);
      }
    }

    prevTargetPosRef.current = currentPos.clone();
  });

  return null;
};
