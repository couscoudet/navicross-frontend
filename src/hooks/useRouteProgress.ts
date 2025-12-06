import { useState, useEffect, useMemo } from "react";
import * as turf from "@turf/turf";

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteProgress {
  distanceTraveled: number; // meters
  distanceRemaining: number; // meters
  totalDistance: number; // meters
  percentComplete: number; // 0-100
  snappedPosition: Coordinates; // Position snapped to route
  bearing: number; // Direction of travel in degrees
  isOnRoute: boolean;
  deviationDistance: number; // meters off route
}

const ROUTE_DEVIATION_THRESHOLD = 50; // meters

/**
 * Hook to calculate progress along a route
 * Provides accurate distance traveled, remaining, and percentage complete
 */
export const useRouteProgress = (
  currentPosition: Coordinates | null,
  route: GeoJSON.LineString | null
): RouteProgress | null => {
  const [progress, setProgress] = useState<RouteProgress | null>(null);

  // Convert route to Turf line for calculations
  const routeLine = useMemo(() => {
    if (!route) return null;
    try {
      return turf.lineString(route.coordinates as number[][]);
    } catch (error) {
      console.error("Error creating route line:", error);
      return null;
    }
  }, [route]);

  // Calculate total route distance
  const totalDistance = useMemo(() => {
    if (!routeLine) return 0;
    try {
      return turf.length(routeLine, { units: "meters" });
    } catch (error) {
      console.error("Error calculating total distance:", error);
      return 0;
    }
  }, [routeLine]);

  useEffect(() => {
    if (!currentPosition || !routeLine || !route) {
      setProgress(null);
      return;
    }

    try {
      const point = turf.point([currentPosition.lng, currentPosition.lat]);

      // Find nearest point on route
      const snapped = turf.nearestPointOnLine(routeLine, point);
      const snappedCoord = snapped.geometry.coordinates as number[];

      // Distance from current position to snapped position (deviation)
      const deviationDistance = snapped.properties.dist
        ? snapped.properties.dist * 1000 // Convert km to meters
        : 0;

      const isOnRoute = deviationDistance <= ROUTE_DEVIATION_THRESHOLD;

      // Calculate distance traveled (from start to snapped point)
      const distanceTraveled = snapped.properties.location
        ? snapped.properties.location * 1000 // Convert km to meters
        : 0;

      // Calculate remaining distance
      const distanceRemaining = totalDistance - distanceTraveled;

      // Calculate percentage
      const percentComplete =
        totalDistance > 0 ? (distanceTraveled / totalDistance) * 100 : 0;

      // Calculate bearing (direction of travel)
      const bearing = calculateBearing(
        snappedCoord,
        route.coordinates as number[][]
      );

      setProgress({
        distanceTraveled,
        distanceRemaining: Math.max(0, distanceRemaining),
        totalDistance,
        percentComplete: Math.min(100, Math.max(0, percentComplete)),
        snappedPosition: {
          lng: snappedCoord[0],
          lat: snappedCoord[1],
        },
        bearing,
        isOnRoute,
        deviationDistance,
      });
    } catch (error) {
      console.error("Error calculating route progress:", error);
      setProgress(null);
    }
  }, [currentPosition, routeLine, route, totalDistance]);

  return progress;
};

/**
 * Calculate bearing from a point on the route to the next point ahead
 */
function calculateBearing(
  snappedCoord: number[],
  routeCoords: number[][]
): number {
  try {
    // Find closest point index
    let closestIndex = 0;
    let minDist = Infinity;

    routeCoords.forEach((coord, i) => {
      const dist = Math.sqrt(
        Math.pow(coord[0] - snappedCoord[0], 2) +
          Math.pow(coord[1] - snappedCoord[1], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    });

    // Look ahead to get direction
    const lookAheadIndex = Math.min(closestIndex + 3, routeCoords.length - 1);
    const targetCoord = routeCoords[lookAheadIndex];

    // Calculate bearing using Turf
    const from = turf.point(snappedCoord);
    const to = turf.point(targetCoord);
    const bearing = turf.bearing(from, to);

    // Normalize to 0-360
    return (bearing + 360) % 360;
  } catch (error) {
    console.error("Error calculating bearing:", error);
    return 0;
  }
}
