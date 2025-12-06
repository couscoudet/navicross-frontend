import { useState, useEffect, useRef, useCallback } from "react";

interface Coordinates {
  lng: number;
  lat: number;
}

interface InterpolationOptions {
  duration?: number; // ms to interpolate between positions
  easing?: (t: number) => number;
}

/**
 * Hook for smooth position interpolation between GPS updates
 * Provides smooth animations instead of jumpy position updates
 */
export const usePositionInterpolation = (
  targetPosition: Coordinates | null,
  options: InterpolationOptions = {}
) => {
  const { duration = 1000, easing = (t) => t } = options; // Linear easing by default

  const [interpolatedPosition, setInterpolatedPosition] =
    useState<Coordinates | null>(targetPosition);

  const animationFrameRef = useRef<number | null>(null);
  const startPositionRef = useRef<Coordinates | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const interpolate = useCallback(
    (start: Coordinates, end: Coordinates, progress: number): Coordinates => {
      const easedProgress = easing(progress);
      return {
        lng: start.lng + (end.lng - start.lng) * easedProgress,
        lat: start.lat + (end.lat - start.lat) * easedProgress,
      };
    },
    [easing]
  );

  useEffect(() => {
    if (!targetPosition) {
      setInterpolatedPosition(null);
      return;
    }

    // First position or no previous position - set immediately
    if (!interpolatedPosition) {
      setInterpolatedPosition(targetPosition);
      startPositionRef.current = targetPosition;
      return;
    }

    // Start interpolation
    startPositionRef.current = interpolatedPosition;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!startTimeRef.current || !startPositionRef.current) return;

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      const newPosition = interpolate(
        startPositionRef.current,
        targetPosition,
        progress
      );

      setInterpolatedPosition(newPosition);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetPosition, duration, interpolate]);

  return interpolatedPosition;
};

/**
 * Easing functions for smooth animations
 */
export const easingFunctions = {
  linear: (t: number) => t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => --t * t * t + 1,
};
