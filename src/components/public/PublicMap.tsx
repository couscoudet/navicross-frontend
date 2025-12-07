import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Closure } from "@/types";

interface Coordinates {
  lng: number;
  lat: number;
}

interface RouteProgress {
  distanceTraveled: number;
  distanceRemaining: number;
  totalDistance: number;
  percentComplete: number;
  snappedPosition: Coordinates;
  bearing: number;
  isOnRoute: boolean;
  deviationDistance: number;
}

export type SelectionMode = "none" | "origin" | "destination";

interface PublicMapProps {
  closures: Closure[];
  route?: GeoJSON.LineString;
  origin?: Coordinates | null;
  destination?: Coordinates | null;
  currentPosition?: Coordinates | null;
  navigating?: boolean;
  routeProgress?: RouteProgress | null;
  selectionMode: SelectionMode;
  onOriginSelect?: (coords: Coordinates) => void;
  onDestinationSelect?: (coords: Coordinates) => void;
}

export const PublicMap: React.FC<PublicMapProps> = ({
  closures,
  route,
  origin,
  destination,
  currentPosition,
  navigating,
  routeProgress,
  selectionMode,
  onOriginSelect,
  onDestinationSelect,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const currentPosMarkerRef = useRef<maplibregl.Marker | null>(null);
  const cameraAnimationRef = useRef<number | null>(null);
  const lastBearingRef = useRef<number>(0);

  // ✅ FIX DÉCALAGE: Observer les changements de taille
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const resizeObserver = new ResizeObserver(() => {
      if (map.current) {
        map.current.resize();
      }
    });

    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    const handleWindowResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [mapLoaded]);

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [2.3522, 48.8566],
      zoom: 12,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
      // ✅ Resize après chargement
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Gérer les clics sur la carte pour placer les marqueurs
  useEffect(() => {
    if (!map.current || !mapLoaded || navigating) return;
    if (!onOriginSelect && !onDestinationSelect) return;

    const handleMapClick = (
      e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent
    ) => {
      if (navigating || selectionMode === "none") return;

      const coords = { lng: e.lngLat.lng, lat: e.lngLat.lat };

      if (selectionMode === "origin" && onOriginSelect) {
        onOriginSelect(coords);
      } else if (selectionMode === "destination" && onDestinationSelect) {
        onDestinationSelect(coords);
      }
    };

    map.current.on("click", handleMapClick);

    return () => {
      map.current?.off("click", handleMapClick);
    };
  }, [
    mapLoaded,
    navigating,
    selectionMode,
    onOriginSelect,
    onDestinationSelect,
  ]);

  // Closures
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const layersToRemove = [
      "closures-fill",
      "closures-borders",
      "closures-barriers",
      "closures-segments",
      "closures-zones",
    ];
    layersToRemove.forEach((id) => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    if (map.current.getSource("closures")) map.current.removeSource("closures");
    if (closures.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: closures
        .filter((closure) => {
          try {
            const coords = closure.polygon?.coordinates;
            if (!coords || !Array.isArray(coords)) return false;
            const hasInvalidCoords = coords[0]?.some(
              (point: number[]) =>
                !Array.isArray(point) || point.some((n) => !Number.isFinite(n))
            );
            return !hasInvalidCoords;
          } catch (e) {
            console.error("Invalid closure polygon:", closure.id, e);
            return false;
          }
        })
        .map((closure) => ({
          type: "Feature",
          id: Number(closure.id),
          properties: {
            id: Number(closure.id),
            name: String(closure.name || ""),
            type: String(closure.type),
          },
          geometry: closure.polygon,
        })),
    };

    map.current.addSource("closures", { type: "geojson", data: geojson });
    map.current.addLayer({
      id: "closures-zones",
      type: "fill",
      source: "closures",
      paint: { "fill-color": "#EF4444", "fill-opacity": 0.3 },
    });
    map.current.addLayer({
      id: "closures-borders",
      type: "line",
      source: "closures",
      paint: { "line-color": "#DC2626", "line-width": 2 },
    });

    const bounds = new maplibregl.LngLatBounds();
    closures.forEach((closure) => {
      closure.polygon.coordinates[0].forEach(([lng, lat]) =>
        bounds.extend([lng, lat])
      );
    });
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, { padding: 50 });
  }, [closures, mapLoaded]);

  // Route
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (map.current.getLayer("route")) map.current.removeLayer("route");
    if (map.current.getSource("route")) map.current.removeSource("route");

    if (route && route.coordinates.length > 0) {
      map.current.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: route },
      });
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": "#2563EB", "line-width": 5 },
      });

      if (!navigating) {
        const bounds = new maplibregl.LngLatBounds();
        route.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        map.current.fitBounds(bounds, { padding: 100 });
      }
    }
  }, [route, mapLoaded, navigating]);

  // ✅ MARQUEURS - VERSION FINALE
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // ORIGINE
    if (origin) {
      if (originMarkerRef.current) {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      } else {
        const el = document.createElement("div");
        el.className = "origin-marker";
        el.innerHTML = `
          <div style="
            width: 32px; height: 32px;
            background-color: #22c55e;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="12" r="8"/>
            </svg>
          </div>
        `;
        originMarkerRef.current = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map.current);
      }
    } else {
      originMarkerRef.current?.remove();
      originMarkerRef.current = null;
    }

    // DESTINATION
    if (destination) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      } else {
        const el = document.createElement("div");
        el.className = "destination-marker";
        el.innerHTML = `
          <div style="
            width: 32px; height: 32px;
            background-color: #ef4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
            </svg>
          </div>
        `;
        destMarkerRef.current = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map.current);
      }
    } else {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
    }

    // ✅ Resize après ajout
    setTimeout(() => map.current?.resize(), 150);
  }, [origin, destination, mapLoaded]);

  // Centrage
  useEffect(() => {
    if (!map.current || !mapLoaded || !origin || navigating) return;
    map.current.flyTo({
      center: [origin.lng, origin.lat],
      zoom: 14,
      duration: 1000,
    });
  }, [origin, mapLoaded, navigating]);

  // Navigation
  useEffect(() => {
    if (!map.current) return;
    if (!navigating) {
      currentPosMarkerRef.current?.remove();
      currentPosMarkerRef.current = null;
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current);
        cameraAnimationRef.current = null;
      }
      if (mapLoaded)
        map.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      return;
    }

    if (currentPosition && route) {
      let bearing = 0;
      let displayPosition = currentPosition;
      if (routeProgress && routeProgress.isOnRoute) {
        bearing = routeProgress.bearing;
        displayPosition = routeProgress.snappedPosition;
      } else {
        bearing = calculateBearing(currentPosition, route.coordinates);
      }

      let bearingDiff = bearing - lastBearingRef.current;
      if (bearingDiff > 180) bearingDiff -= 360;
      if (bearingDiff < -180) bearingDiff += 360;
      const smoothBearing = lastBearingRef.current + bearingDiff * 0.3;
      lastBearingRef.current = smoothBearing;

      if (currentPosMarkerRef.current) {
        currentPosMarkerRef.current.setLngLat([
          displayPosition.lng,
          displayPosition.lat,
        ]);
        const el = currentPosMarkerRef.current.getElement();
        const arrow = el.querySelector(".navigation-arrow") as HTMLElement;
        if (arrow) {
          arrow.style.transition = "transform 0.5s ease-out";
          arrow.style.transform = `rotate(${bearing}deg)`;
        }
      } else {
        const el = document.createElement("div");
        el.className = "navigation-marker";
        el.innerHTML = `
          <div class="relative">
            <div class="absolute inset-0 w-12 h-12 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div class="relative w-12 h-12 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center">
              <div class="navigation-arrow" style="transition: transform 0.5s ease-out; transform: rotate(${bearing}deg)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                  <path d="M12 2L12 22M12 2L6 8M12 2L18 8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        `;
        currentPosMarkerRef.current = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([displayPosition.lng, displayPosition.lat])
          .addTo(map.current);
      }

      const smoothCameraFollow = () => {
        if (!map.current || !navigating) return;
        const currentCenter = map.current.getCenter();
        const currentZoom = map.current.getZoom();
        const currentPitch = map.current.getPitch();
        const lngDiff = displayPosition.lng - currentCenter.lng;
        const latDiff = displayPosition.lat - currentCenter.lat;

        if (Math.abs(lngDiff) > 0.00001 || Math.abs(latDiff) > 0.00001) {
          map.current.easeTo({
            center: [
              currentCenter.lng + lngDiff * 0.2,
              currentCenter.lat + latDiff * 0.2,
            ],
            zoom: currentZoom < 16 ? 17 : currentZoom,
            pitch: currentPitch < 50 ? 55 : currentPitch,
            bearing: smoothBearing,
            duration: 300,
            essential: true,
          });
        }
        cameraAnimationRef.current = requestAnimationFrame(smoothCameraFollow);
      };

      if (cameraAnimationRef.current)
        cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = requestAnimationFrame(smoothCameraFollow);
    }
  }, [currentPosition, navigating, route, mapLoaded, routeProgress]);

  const calculateBearing = (
    from: Coordinates,
    routeCoords: number[][]
  ): number => {
    let closestIndex = 0;
    let minDist = Infinity;
    routeCoords.forEach((coord, i) => {
      const dist = Math.sqrt(
        Math.pow(coord[0] - from.lng, 2) + Math.pow(coord[1] - from.lat, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    });

    const nextIndex = Math.min(closestIndex + 3, routeCoords.length - 1);
    const to = {
      lng: routeCoords[nextIndex][0],
      lat: routeCoords[nextIndex][1],
    };
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  return (
    <div
      ref={mapContainer}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        cursor: selectionMode !== "none" ? "crosshair" : "grab",
      }}
    />
  );
};
