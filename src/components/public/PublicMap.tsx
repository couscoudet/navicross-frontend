import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
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

interface PublicMapProps {
  closures: Closure[];
  route?: GeoJSON.LineString;
  origin?: Coordinates | null;
  destination?: Coordinates | null;
  currentPosition?: Coordinates | null;
  navigating?: boolean;
  routeProgress?: RouteProgress | null;
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
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [2.3522, 48.8566], // Paris par défaut
      zoom: 12,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Gérer les appuis longs pour sélectionner origine/destination
  useEffect(() => {
    if (!map.current || !mapLoaded || navigating) return;
    if (!onOriginSelect && !onDestinationSelect) return;

    const handleLongPress = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      // Ne pas déclencher si on est en navigation
      if (navigating) return;

      const coords = {
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      };

      // Créer un marqueur temporaire pour montrer l'appui long
      const el = document.createElement("div");
      el.className = "long-press-indicator";
      el.innerHTML = `
        <div class="relative">
          <div class="w-16 h-16 bg-blue-500 rounded-full opacity-30 animate-pulse"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white"></div>
          </div>
        </div>
      `;

      longPressMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current!);

      // Démarrer le timer d'appui long (500ms)
      longPressTimerRef.current = setTimeout(() => {
        // Supprimer le marqueur temporaire
        longPressMarkerRef.current?.remove();
        longPressMarkerRef.current = null;

        // Déterminer si on sélectionne l'origine ou la destination
        if (!origin && onOriginSelect) {
          onOriginSelect(coords);
        } else if (origin && !destination && onDestinationSelect) {
          onDestinationSelect(coords);
        } else if (origin && destination) {
          // Si les deux sont définis, réinitialiser et commencer par l'origine
          if (onOriginSelect) {
            onOriginSelect(coords);
          }
        }
      }, 500);
    };

    const handlePressEnd = () => {
      // Annuler le timer si l'utilisateur relâche avant 500ms
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      // Supprimer le marqueur temporaire
      longPressMarkerRef.current?.remove();
      longPressMarkerRef.current = null;
    };

    // Ajouter les listeners pour mouse et touch
    map.current.on("mousedown", handleLongPress);
    map.current.on("mouseup", handlePressEnd);
    map.current.on("mousemove", handlePressEnd); // Annuler si on bouge
    map.current.on("touchstart", handleLongPress);
    map.current.on("touchend", handlePressEnd);
    map.current.on("touchmove", handlePressEnd); // Annuler si on bouge

    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      longPressMarkerRef.current?.remove();

      map.current?.off("mousedown", handleLongPress);
      map.current?.off("mouseup", handlePressEnd);
      map.current?.off("mousemove", handlePressEnd);
      map.current?.off("touchstart", handleLongPress);
      map.current?.off("touchend", handlePressEnd);
      map.current?.off("touchmove", handlePressEnd);
    };
  }, [mapLoaded, navigating, origin, destination, onOriginSelect, onDestinationSelect]);

  // Afficher les closures
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Supprimer TOUTES les layers qui utilisent la source 'closures'
    const layersToRemove = [
      "closures-fill",
      "closures-borders",
      "closures-barriers",
      "closures-segments",
      "closures-zones",
    ];

    layersToRemove.forEach((id) => {
      if (map.current!.getLayer(id)) {
        map.current!.removeLayer(id);
      }
    });

    // Maintenant on peut supprimer la source
    if (map.current.getSource("closures")) {
      map.current.removeSource("closures");
    }

    if (closures.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: closures
        .filter((closure) => {
          // Valider le polygon
          try {
            const coords = closure.polygon?.coordinates;
            if (!coords || !Array.isArray(coords)) return false;
            // Vérifier qu'il n'y a pas de NaN ou Infinity
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

    map.current.addSource("closures", {
      type: "geojson",
      data: geojson,
    });

    // Toutes les closures en rouge
    map.current.addLayer({
      id: "closures-zones",
      type: "fill",
      source: "closures",
      paint: {
        "fill-color": "#EF4444",
        "fill-opacity": 0.3,
      },
    });

    map.current.addLayer({
      id: "closures-borders",
      type: "line",
      source: "closures",
      paint: {
        "line-color": "#DC2626",
        "line-width": 2,
      },
    });

    // Fit bounds pour voir toutes les closures
    const bounds = new maplibregl.LngLatBounds();
    closures.forEach((closure) => {
      closure.polygon.coordinates[0].forEach(([lng, lat]) => {
        bounds.extend([lng, lat]);
      });
    });
    map.current.fitBounds(bounds, { padding: 50 });
  }, [closures, mapLoaded]);

  // Afficher la route avec progression
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers
    ["route-traveled", "route-remaining", "route"].forEach((layerId) => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });

    // Remove existing sources
    ["route-traveled", "route-remaining", "route"].forEach((sourceId) => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    if (!route) return;

    // If navigating and we have progress, show traveled vs remaining
    if (navigating && routeProgress && routeProgress.percentComplete > 0) {
      const coords = route.coordinates;
      const totalPoints = coords.length;
      const traveledIndex = Math.floor(
        (routeProgress.percentComplete / 100) * totalPoints
      );

      // Traveled portion (green)
      if (traveledIndex > 0) {
        const traveledCoords = coords.slice(0, traveledIndex + 1);
        map.current.addSource("route-traveled", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: traveledCoords,
            },
          },
        });

        map.current.addLayer({
          id: "route-traveled",
          type: "line",
          source: "route-traveled",
          paint: {
            "line-color": "#22c55e",
            "line-width": 5,
            "line-opacity": 0.8,
          },
        });
      }

      // Remaining portion (blue)
      if (traveledIndex < totalPoints - 1) {
        const remainingCoords = coords.slice(traveledIndex);
        map.current.addSource("route-remaining", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: remainingCoords,
            },
          },
        });

        map.current.addLayer({
          id: "route-remaining",
          type: "line",
          source: "route-remaining",
          paint: {
            "line-color": "#2563EB",
            "line-width": 5,
          },
        });
      }
    } else {
      // Show full route in blue
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route,
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#2563EB",
          "line-width": 5,
        },
      });

      // Fit bounds pour voir la route (only when not navigating)
      if (!navigating) {
        const bounds = new maplibregl.LngLatBounds();
        route.coordinates.forEach(([lng, lat]) => {
          bounds.extend([lng, lat]);
        });
        map.current.fitBounds(bounds, { padding: 100 });
      }
    }
  }, [route, mapLoaded, navigating, routeProgress]);

  // Markers origine/destination
  useEffect(() => {
    if (!map.current) return;

    // Supprimer anciens markers
    originMarkerRef.current?.remove();
    destMarkerRef.current?.remove();

    if (origin) {
      const el = document.createElement("div");
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#22c55e";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.transform = "translate(-50%, -50%)";

      originMarkerRef.current = new maplibregl.Marker({
        element: el,
      })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map.current);
    }

    if (destination) {
      const el = document.createElement("div");
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#ef4444";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.transform = "translate(-50%, -50%)";

      destMarkerRef.current = new maplibregl.Marker({
        element: el,
      })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map.current);
    }
  }, [origin, destination]);

  // Centrer sur origine quand définie (géolocalisation)
  useEffect(() => {
    if (!map.current || !mapLoaded || !origin || navigating) return;

    map.current.flyTo({
      center: [origin.lng, origin.lat],
      zoom: 14,
      duration: 1000,
    });
  }, [origin, mapLoaded, navigating]);

  // Marker position actuelle (navigation) avec orientation fluide
  useEffect(() => {
    console.log("Navigation effect:", {
      navigating,
      currentPosition,
      hasRoute: !!route,
      routeProgress,
    });

    if (!map.current) return;

    if (!navigating) {
      currentPosMarkerRef.current?.remove();
      currentPosMarkerRef.current = null;

      // Cancel any ongoing animation
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current);
        cameraAnimationRef.current = null;
      }

      // Réinitialiser la caméra
      if (mapLoaded) {
        map.current.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 800,
        });
      }
      return;
    }

    if (currentPosition && route) {
      console.log("Updating navigation:", currentPosition);

      // Use bearing from routeProgress if available, otherwise calculate
      let bearing = 0;
      let displayPosition = currentPosition;

      if (routeProgress && routeProgress.isOnRoute) {
        bearing = routeProgress.bearing;
        // Use snapped position for smoother experience when on route
        displayPosition = routeProgress.snappedPosition;
      } else {
        bearing = calculateBearing(currentPosition, route.coordinates);
      }

      // Smooth bearing transition
      let bearingDiff = bearing - lastBearingRef.current;
      // Normalize to -180 to 180
      if (bearingDiff > 180) bearingDiff -= 360;
      if (bearingDiff < -180) bearingDiff += 360;

      const smoothBearing = lastBearingRef.current + bearingDiff * 0.3; // Smooth by 30%
      lastBearingRef.current = smoothBearing;

      console.log("Bearing:", bearing, "Smooth:", smoothBearing);

      if (currentPosMarkerRef.current) {
        // Update position with smooth transition
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
        // Créer marker avec flèche directionnelle améliorée
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

      // Smooth camera follow avec interpolation
      const smoothCameraFollow = () => {
        if (!map.current || !navigating) return;

        const currentCenter = map.current.getCenter();
        const currentZoom = map.current.getZoom();
        const currentPitch = map.current.getPitch();

        // Calculate smooth interpolation
        const lngDiff = displayPosition.lng - currentCenter.lng;
        const latDiff = displayPosition.lat - currentCenter.lat;

        // Only update if there's significant movement
        if (Math.abs(lngDiff) > 0.00001 || Math.abs(latDiff) > 0.00001) {
          map.current.easeTo({
            center: [
              currentCenter.lng + lngDiff * 0.2, // Smooth by 20%
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

      // Cancel previous animation and start new one
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current);
      }
      cameraAnimationRef.current = requestAnimationFrame(smoothCameraFollow);
    }
  }, [currentPosition, navigating, route, mapLoaded, routeProgress]);

  // Calculer le bearing entre position actuelle et prochain point de route
  const calculateBearing = (
    from: Coordinates,
    routeCoords: number[][]
  ): number => {
    // Trouver le point le plus proche sur la route
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

    // Prendre le point suivant (ou le dernier si on est au bout)
    const nextIndex = Math.min(closestIndex + 3, routeCoords.length - 1);
    const to = {
      lng: routeCoords[nextIndex][0],
      lat: routeCoords[nextIndex][1],
    };

    // Formule bearing
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

  return <div ref={mapContainer} className="absolute inset-0" />;
};
