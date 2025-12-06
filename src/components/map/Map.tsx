import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Closure } from "@/types";

interface MapProps {
  closures: Closure[];
  onDrawCreate: (
    geometry: GeoJSON.Geometry,
    type: "barrier" | "segment" | "zone"
  ) => void;
  onClosureClick: (closure: Closure) => void;
  selectedType?: "barrier" | "segment" | "zone";
  onMapReady?: (mapInstance: maplibregl.Map) => void;
}

export const Map: React.FC<MapProps> = ({
  closures,
  onDrawCreate,
  onClosureClick,
  selectedType,
  onMapReady,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const selectedTypeRef = useRef(selectedType);

  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [2.3522, 48.8566],
      zoom: 14,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-right");

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      styles: [
        {
          id: "gl-draw-point",
          type: "circle",
          paint: {
            "circle-radius": 12,
            "circle-color": "#F59E0B",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        },
        {
          id: "gl-draw-line",
          type: "line",
          paint: {
            "line-color": "#8B5CF6",
            "line-width": 6,
          },
        },
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          paint: {
            "fill-color": "#EF4444",
            "fill-opacity": 0.4,
          },
        },
        {
          id: "gl-draw-polygon-stroke",
          type: "line",
          paint: {
            "line-color": "#EF4444",
            "line-width": 3,
          },
        },
        {
          id: "gl-draw-polygon-and-line-vertex-active",
          type: "circle",
          paint: {
            "circle-radius": 6,
            "circle-color": "#fff",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#2563EB",
          },
        },
      ],
    });

    map.current.addControl(draw.current as any);

    map.current.on("draw.create", (e) => {
      if (e.features && e.features[0] && selectedTypeRef.current) {
        const geometry = e.features[0].geometry as GeoJSON.Geometry;
        onDrawCreate(geometry, selectedTypeRef.current);
        draw.current?.deleteAll();
      }
    });

    map.current.on("load", () => {
      setMapLoaded(true);
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!draw.current || !mapLoaded) return;

    draw.current.deleteAll();
    draw.current.changeMode("simple_select");

    if (selectedType === "barrier") {
      draw.current.changeMode("draw_point");
    } else if (selectedType === "segment") {
      draw.current.changeMode("draw_line_string");
    } else if (selectedType === "zone") {
      draw.current.changeMode("draw_polygon");
    }
  }, [selectedType, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    [
      "closures-barriers",
      "closures-segments",
      "closures-zones-fill",
      "closures-zones-stroke",
    ].forEach((id) => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    if (map.current.getSource("closures")) map.current.removeSource("closures");

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
          id: Number(closure.id), // Convertir en number
          properties: {
            id: Number(closure.id), // Convertir en number
            name: String(closure.name || ""),
            type: String(closure.type),
          },
          geometry: closure.polygon, // Utiliser polygon au lieu de geometry
        })),
    };

    map.current.addSource("closures", {
      type: "geojson",
      data: geojson,
    });

    // Barriers - Orange fills
    map.current.addLayer({
      id: "closures-barriers",
      type: "fill",
      source: "closures",
      filter: ["==", ["get", "type"], "barrier"],
      paint: {
        "fill-color": "#F59E0B",
        "fill-opacity": 0.5,
        "fill-outline-color": "#EA580C",
      },
    });

    // Segments - Purple fills
    map.current.addLayer({
      id: "closures-segments",
      type: "fill",
      source: "closures",
      filter: ["==", ["get", "type"], "segment"],
      paint: {
        "fill-color": "#8B5CF6",
        "fill-opacity": 0.5,
        "fill-outline-color": "#7C3AED",
      },
    });

    // Zones - Red fills
    map.current.addLayer({
      id: "closures-zones-fill",
      type: "fill",
      source: "closures",
      filter: ["==", ["get", "type"], "zone"],
      paint: {
        "fill-color": "#EF4444",
        "fill-opacity": 0.4,
      },
    });

    map.current.addLayer({
      id: "closures-zones-stroke",
      type: "line",
      source: "closures",
      filter: ["==", ["get", "type"], "zone"],
      paint: {
        "line-color": "#DC2626",
        "line-width": 3,
        "line-dasharray": [4, 2],
      },
    });

    // Click handlers pour édition
    ["closures-barriers", "closures-segments", "closures-zones-fill"].forEach(
      (layerId) => {
        map.current!.on("click", layerId, (e) => {
          if (!e.features || e.features.length === 0) return;
          const closureId = Number(e.features[0].properties?.id);
          const closure = closures.find((c) => Number(c.id) === closureId);
          if (closure) {
            onClosureClick(closure);
          }
        });

        map.current!.on("mouseenter", layerId, () => {
          map.current!.getCanvas().style.cursor = "pointer";
        });

        map.current!.on("mouseleave", layerId, () => {
          map.current!.getCanvas().style.cursor = "";
        });
      }
    );
  }, [closures, mapLoaded, onClosureClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};
