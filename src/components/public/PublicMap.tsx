import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Closure } from "@/types";

interface Coordinates {
  lng: number;
  lat: number;
}

interface PublicMapProps {
  closures: Closure[];
  route?: GeoJSON.LineString;
  origin?: Coordinates | null;
  destination?: Coordinates | null;
  currentPosition?: Coordinates | null;
  navigating?: boolean;
}

export const PublicMap: React.FC<PublicMapProps> = ({
  closures,
  route,
  origin,
  destination,
  currentPosition,
  navigating,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const currentPosMarkerRef = useRef<maplibregl.Marker | null>(null);

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

  // Afficher la route
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (map.current.getLayer("route")) map.current.removeLayer("route");
    if (map.current.getSource("route")) map.current.removeSource("route");

    if (!route) return;

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
        "line-width": 4,
      },
    });

    // Fit bounds pour voir la route
    const bounds = new maplibregl.LngLatBounds();
    route.coordinates.forEach(([lng, lat]) => {
      bounds.extend([lng, lat]);
    });
    map.current.fitBounds(bounds, { padding: 100 });
  }, [route, mapLoaded]);

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

  // Marker position actuelle (navigation) avec orientation
  useEffect(() => {
    console.log("Navigation effect:", {
      navigating,
      currentPosition,
      hasRoute: !!route,
    });

    if (!map.current) return;

    if (!navigating) {
      currentPosMarkerRef.current?.remove();
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

      // Calculer le bearing (direction) vers le prochain point de la route
      const routeCoords = route.coordinates;
      const bearing = calculateBearing(currentPosition, routeCoords);

      console.log("Bearing:", bearing);

      if (currentPosMarkerRef.current) {
        // Update position et rotation
        currentPosMarkerRef.current.setLngLat([
          currentPosition.lng,
          currentPosition.lat,
        ]);
        const el = currentPosMarkerRef.current.getElement();
        el.style.transform = `rotate(${bearing}deg)`;
      } else {
        // Créer marker avec flèche directionnelle
        const el = document.createElement("div");
        el.innerHTML = `
          <div class="relative">
            <div class="absolute inset-0 w-10 h-10 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
            <div class="relative w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L12 22M12 2L6 8M12 2L18 8"/>
              </svg>
            </div>
          </div>
        `;
        el.style.transform = `rotate(${bearing}deg)`;
        el.style.transformOrigin = "center";

        currentPosMarkerRef.current = new maplibregl.Marker({
          element: el,
          rotationAlignment: "map",
        })
          .setLngLat([currentPosition.lng, currentPosition.lat])
          .addTo(map.current);
      }

      // Caméra en mode navigation : zoom, pitch et bearing
      map.current.easeTo({
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 17,
        pitch: 60, // Inclinaison 3D
        bearing: bearing, // Orientation dans le sens de la route
        duration: 1000,
        essential: true,
      });
    }
  }, [currentPosition, navigating, route, mapLoaded]);

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
