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
      el.className =
        "w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg";
      originMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map.current);
    }

    if (destination) {
      const el = document.createElement("div");
      el.className =
        "w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg";
      destMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map.current);
    }
  }, [origin, destination]);

  // Marker position actuelle (navigation)
  useEffect(() => {
    if (!map.current || !navigating) {
      currentPosMarkerRef.current?.remove();
      return;
    }

    if (currentPosition) {
      if (currentPosMarkerRef.current) {
        currentPosMarkerRef.current.setLngLat([
          currentPosition.lng,
          currentPosition.lat,
        ]);
      } else {
        const el = document.createElement("div");
        el.className =
          "w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse";
        currentPosMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([currentPosition.lng, currentPosition.lat])
          .addTo(map.current);
      }

      // Centrer la carte sur la position actuelle
      map.current.flyTo({
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 16,
        duration: 1000,
      });
    }
  }, [currentPosition, navigating]);

  return <div ref={mapContainer} className="absolute inset-0" />;
};
